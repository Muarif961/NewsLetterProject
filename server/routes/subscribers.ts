import { Router } from 'express';
import multer from 'multer';
import { parse } from 'csv-parse';
import { createReadStream } from 'fs';
import { z } from 'zod';
import { db } from '../db';
import { subscribers } from '../db/schema';
import { checkSubscriberLimit, canAddSubscribers } from '../lib/subscription-limits';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// Generate unique unsubscribe token
function generateUnsubscribeToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

const router = Router();

// Ensure uploads directory exists
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for CSV uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + '.csv');
    }
  }),
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'text/csv') {
      cb(new Error('Only CSV files are allowed'));
      return;
    }
    cb(null, true);
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Schema for validating CSV data
const subscriberSchema = z.object({
  email: z.string().email('Invalid email format'),
  name: z.string().optional(),
});

// Helper function to validate CSV headers
const validateHeaders = (headers: string[]) => {
  const requiredHeaders = ['email'];
  const missingHeaders = requiredHeaders.filter(
    header => !headers.map(h => h.toLowerCase()).includes(header.toLowerCase())
  );

  if (missingHeaders.length > 0) {
    throw new Error(`Missing required headers: ${missingHeaders.join(', ')}`);
  }
  return true;
};

// Endpoint for CSV upload
router.post('/import-csv', upload.single('file'), async (req, res) => {
  try {
    // Set proper content type
    res.setHeader('Content-Type', 'application/json');

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // First validate the CSV structure
    const fileContent = fs.readFileSync(req.file.path, 'utf-8');
    console.log('CSV Content:', fileContent); // Debug log

    // Check subscription limits before processing
    const { canAdd, remaining, reason } = await canAddSubscribers(userId);
    if (!canAdd) {
      return res.status(400).json({
        error: 'Subscription limit reached',
        details: reason
      });
    }

    // Parse CSV file and validate data
    const results: any[] = [];
    const errors: any[] = [];
    let processedCount = 0;
    let totalRows = 0;

    // First pass: Count total rows and validate headers
    const countStream = createReadStream(req.file.path)
      .pipe(parse({
        columns: (headers) => {
          console.log('CSV Headers:', headers); // Debug log
          try {
            validateHeaders(headers);
            return headers.map((h: string) => h.toLowerCase().trim());
          } catch (error: any) {
            throw new Error(`Invalid CSV format: ${error.message}`);
          }
        },
        skip_empty_lines: true,
        trim: true,
        skip_records_with_empty_values: true
      }));

    for await (const record of countStream) {
      totalRows++;
      console.log('Processing row:', record); // Debug log
    }

    // Check if adding all records would exceed the limit
    const limitCheck = await canAddSubscribers(userId, totalRows);
    if (!limitCheck.canAdd) {
      return res.status(400).json({
        error: 'Batch would exceed subscription limit',
        details: limitCheck.reason
      });
    }

    // Second pass: Process and insert valid records
    const parseStream = createReadStream(req.file.path)
      .pipe(parse({
        columns: (headers) => headers.map((h: string) => h.toLowerCase().trim()),
        skip_empty_lines: true,
        trim: true,
        skip_records_with_empty_values: true
      }));

    const existingEmails = new Set();
    const batchSize = 100;
    let currentBatch: any[] = [];
    const importedIds: number[] = []; // Track imported subscriber IDs

    for await (const record of parseStream) {
      try {
        console.log('Validating record:', record); // Debug log

        // Validate record
        const validatedData = subscriberSchema.parse({
          email: record.email?.trim(),
          name: record.name?.trim()
        });

        // Check for duplicates within current import
        if (existingEmails.has(validatedData.email.toLowerCase())) {
          errors.push({
            row: processedCount + 1,
            email: validatedData.email,
            error: 'Duplicate email in CSV'
          });
          continue;
        }

        // Check for existing subscriber in database
        const existing = await db.select()
          .from(subscribers)
          .where(eq(subscribers.email, validatedData.email.toLowerCase()))
          .limit(1);

        if (existing.length > 0) {
          errors.push({
            row: processedCount + 1,
            email: validatedData.email,
            error: 'Email already exists in database'
          });
          continue;
        }

        existingEmails.add(validatedData.email.toLowerCase());
        currentBatch.push({
          userId,
          email: validatedData.email.toLowerCase(),
          name: validatedData.name || null,
          active: true,
          createdAt: new Date()
        });

        // Process in batches
        if (currentBatch.length >= batchSize) {
          const insertedSubscribers = await db.insert(subscribers)
            .values(currentBatch)
            .returning({ id: subscribers.id });

          importedIds.push(...insertedSubscribers.map(s => s.id));
          results.push(...currentBatch);
          currentBatch = [];
        }

      } catch (error: any) {
        console.error('Error processing record:', error);
        errors.push({
          row: processedCount + 1,
          data: record,
          error: error.message
        });
      }

      processedCount++;
    }

    // Insert remaining records
    if (currentBatch.length > 0) {
      const insertedSubscribers = await db.insert(subscribers)
        .values(currentBatch)
        .returning({ id: subscribers.id });

      importedIds.push(...insertedSubscribers.map(s => s.id));
      results.push(...currentBatch);
    }

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    return res.json({
      success: true,
      totalProcessed: processedCount,
      successfulImports: results.length,
      errors: errors,
      importedIds: importedIds, // Include the IDs of imported subscribers
      details: {
        remainingQuota: remaining - results.length
      }
    });

  } catch (error: any) {
    console.error('Error processing CSV upload:', error);
    return res.status(500).json({
      error: 'Error processing CSV file',
      details: error.message
    });
  }
});

// Validate unsubscribe token and get subscriber info
router.get('/unsubscribe/:token', async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Missing unsubscribe token'
      });
    }

    const [subscriber] = await db
      .select({
        id: subscribers.id,
        email: subscribers.email,
        name: subscribers.name,
        active: subscribers.active,
        unsubscribeToken: subscribers.unsubscribeToken
      })
      .from(subscribers)
      .where(eq(subscribers.unsubscribeToken, token))
      .limit(1);

    if (!subscriber) {
      return res.status(404).json({
        success: false,
        error: 'Invalid or expired unsubscribe token'
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        email: subscriber.email,
        name: subscriber.name || '',
        status: subscriber.active ? 'active' : 'unsubscribed'
      }
    });
  } catch (error) {
    console.error('Error validating unsubscribe token:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error processing unsubscribe request'
    });
  }
});

// Process unsubscribe request
router.post('/unsubscribe/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { reason } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Missing unsubscribe token'
      });
    }

    const [subscriber] = await db
      .select()
      .from(subscribers)
      .where(eq(subscribers.unsubscribeToken, token))
      .limit(1);

    if (!subscriber) {
      return res.status(404).json({
        success: false,
        error: 'Invalid or expired unsubscribe token'
      });
    }

    if (!subscriber.active) {
      return res.status(400).json({
        success: false,
        error: 'Already unsubscribed'
      });
    }

    await db
      .update(subscribers)
      .set({
        active: false,
        unsubscribeDate: new Date(),
        unsubscribeReason: reason || null,
        updatedAt: new Date()
      })
      .where(eq(subscribers.unsubscribeToken, token));

    return res.status(200).json({
      success: true,
      message: 'Successfully unsubscribed'
    });
  } catch (error) {
    console.error('Error processing unsubscribe request:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error processing unsubscribe request'
    });
  }
});

// Generate unsubscribe token for a subscriber
router.post('/generate-unsubscribe-token', async (req, res) => {
  try {
    const { subscriberId } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = generateUnsubscribeToken();

    const result = await db
      .update(subscribers)
      .set({
        unsubscribeToken: token,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(subscribers.id, subscriberId),
          eq(subscribers.userId, userId)
        )
      )
      .returning();

    if (!result.length) {
      return res.status(404).json({ error: 'Subscriber not found' });
    }

    return res.json({
      success: true,
      token
    });
  } catch (error) {
    console.error('Error generating unsubscribe token:', error);
    return res.status(500).json({ error: 'Server error generating token' });
  }
});

export default router;