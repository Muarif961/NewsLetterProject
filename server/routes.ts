import { Express } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { sql, eq } from "drizzle-orm";
import { subscribers } from "./db/schema";
import { setupAuth } from "./auth";
import { db } from "./db/index";
import { setupWebSockets } from "./lib/websockets";
import {
  newsletters,
  templates,
  subscribers,
  subscriber_groups,
  subscriber_group_members,
  type Newsletter,
  type Template,
} from "./db/schema";
import { eq, and, desc, or, inArray } from "drizzle-orm";
import {
  summarizeArticle,
  getNewsContent,
  generateAINewsletter,
} from "./newsletter";
import {
  getVerifiedEmails,
  verifyEmail,
  checkEmailVerification,
  testEmailSettings,
} from "./routes/smtp";
import {
  getApiKeys,
  updateApiKeys,
  testGptConfiguration,
} from "./routes/api-keys";
import { sendNewsletter } from "./lib/email";
import { NotificationService } from "./lib/notifications";
import express from "express";
import {
  users,
  user_feedback,
  appsumo_codes,
  user_subscriptions,
  user_redeemed_codes,
  user_credits,
  credit_transactions,
  credit_purchases,
  api_keys,
  notifications,
  verified_emails,
  form_styles,
} from "./db/schema";
import { fromZodError } from "zod-validation-error"; //Import for error handling
import crypto from "crypto";
import { handleAppSumoRegistration,validateAppSumoCode } from "./routes/appsumo";
import { checkSubscriberLimit } from "./lib/subscription-limits";
import {
  getSubscriptionDetails,
  checkAICredits,
  updateAICreditsUsage,
} from "./lib/subscription-tracker";

import creditsRouter, { handleStripeWebhook } from "./routes/credits";
import subscribersRouter from "./routes/subscribers"; // Import the subscribers router
import groupsRouter from "./routes/groups"; // Add this import
import subscriptionsRouter from "./routes/subscriptions"; // Import the subscriptions router
import { subscriber_group_members } from "./db/schema"; //Add this import
import Stripe from "stripe";
import { webhookLogger } from "./middleware/webhook-logger";
import { generateEmailContent } from "./lib/email-generator"; // Import from the correct file
import templatesRouter from './routes/templates'; // Added import for templates router

import imagesRouter from "./routes/images"; 
// Import the images router

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

// Define subscription plans configuration
const SUBSCRIPTION_PLANS = {
  starter: {
    name: "Starter Plan",
    description: "Basic features for small newsletters",
    monthlyPrice: 2900,
    yearlyPrice: 28800,
    trialDays: 14,
    subscriberLimit: 1000,
    initialAiCredits: 100,
  },
  growth: {
    name: "Growth Plan",
    description: "Advanced features for growing newsletters",
    monthlyPrice: 4900,
    yearlyPrice: 46800,
    trialDays: 14,
    subscriberLimit: 5000,
    initialAiCredits: 250,
  },
  professional: {
    name: "Professional Plan",
    description: "Premium features for established newsletters",
    monthlyPrice: 9900,
    yearlyPrice: 94800,
    trialDays: 14,
    subscriberLimit: 25000,
    initialAiCredits: 500,
  },
  "professional-plus": {
    name: "Professional Plus",
    description: "Enterprise-grade features for large audiences",
    monthlyPrice: 12900,
    yearlyPrice: 130800,
    trialDays: 14,
    subscriberLimit: 50000,
    initialAiCredits: 1000,
  },
};

function getTierForCodeCount(codeCount: number): string {
  switch (codeCount) {
    case 3:
      return "professional";
    case 2:
      return "growth";
    case 1:
      return "starter";
    default:
      throw new Error("Invalid number of codes. Must be between 1 and 3.");
  }
}

export function registerRoutes(app: Express) {
  // Register webhook route before body parser and auth middleware
  app.post(
    "/api/credits/webhook",
    express.raw({ type: "application/json" }),
    webhookLogger,
    handleStripeWebhook,
  );
  // AppSumo validation route
  app.post("/api/validate-appsumo-codes", async (req, res) => {
    try {
      const result = await validateAppSumoCode(req.body.codes);
      res.json(result);
    } catch (error) {
      console.error("AppSumo code validation error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to validate codes"
      });
    }
  });

  // Auth diagnostic route (for checking/fixing password issues)
  app.get("/api/auth/diagnostic", async (req, res) => {
    try {
      // Get overall password stats
      const passwordStats = await db.query.raw(`
        SELECT 
          COUNT(*) as total_users,
          SUM(CASE WHEN password IS NULL THEN 1 ELSE 0 END) as missing_passwords,
          SUM(CASE WHEN password = '' THEN 1 ELSE 0 END) as empty_passwords,
          SUM(CASE WHEN LENGTH(password) = 161 THEN 1 ELSE 0 END) as valid_passwords,
          SUM(CASE WHEN LENGTH(password) != 161 AND password IS NOT NULL AND password != '' THEN 1 ELSE 0 END) as invalid_passwords
        FROM users
      `);

      res.json({
        message: "Authentication diagnostic results",
        passwordStats: passwordStats.rows[0],
        checkUser: "Use /api/auth/diagnostic/:userId to check specific users",
        fixUser:
          "Use /api/auth/fix-password/:userId with POST to fix a user's password",
      });
    } catch (error: any) {
      console.error("Auth diagnostic error:", error);
      res.status(500).json({
        message: "Error running authentication diagnostics",
        error: error.message,
      });
    }
  });

  // Check specific user's password
  app.get("/api/auth/diagnostic/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const result = await db.query.raw(
        `SELECT * FROM diagnose_user_password($1)`,
        [userId],
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        message: "User password diagnostic",
        user: result.rows[0],
      });
    } catch (error: any) {
      console.error("User diagnostic error:", error);
      res.status(500).json({
        message: "Error checking user password",
        error: error.message,
      });
    }
  });

  // Fix a user's password
  app.post("/api/auth/fix-password/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const { password } = req.body;
      if (!password) {
        return res.status(400).json({ message: "Password is required" });
      }

      // Hash password with the consistent method
      const hashedPassword = crypto
        .pbkdf2Sync(password, "salt", 100000, 64, "sha512")
        .toString("hex");

      // Update the user's password
      const result = await db.query.raw(
        `
        UPDATE users 
        SET password = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING id, username, email, LENGTH(password) as password_length
      `,
        [hashedPassword, userId],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        message: "User password updated successfully",
        user: result.rows[0],
      });
    } catch (error: any) {
      console.error("Password fix error:", error);
      res.status(500).json({
        message: "Error fixing user password",
        error: error.message,
      });
    }
  });

  // Use JSON body parser for all other routes
  app.use(express.json());

  const { requireAuth } = setupAuth(app);

  // Register the subscribers router
  app.use("/api/subscribers", subscribersRouter);

  // Add the groups router with authentication
  app.use("/api/groups", requireAuth, groupsRouter);

  // Add the images router
  app.use("/api/images", requireAuth, imagesRouter);

  // Add the subscriptions router
  app.use("/api/subscriptions", subscriptionsRouter);

  // Configure multer for file uploads
  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      const avatarsDir = path.join(process.cwd(), "uploads", "avatars");
      // Create avatars directory if it doesn't exist
      if (!fs.existsSync(avatarsDir)) {
        fs.mkdirSync(avatarsDir, { recursive: true });
      }
      cb(null, avatarsDir);
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(
        null,
        file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname),
      );
    },
  });

  const upload = multer({
    storage: storage,
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.startsWith("image/")) {
        cb(new Error("Only image files are allowed"));
        return;
      }
      cb(null, true);
    },
  });

  // Profile update endpoint
  app.put("/api/user/profile", requireAuth, async (req, res) => {
    try {
      const { fullName, email } = req.body;

      if (!fullName || !email) {
        return res
          .status(400)
          .json({ message: "Full name and email are required" });
      }

      const [updatedUser] = await db
        .update(users)
        .set({
          fullName,
          email,
          updatedAt: new Date(),
        })
        .where(eq(users.id, req.user!.id))
        .returning();

      res.json(updatedUser);
    } catch (error: any) {
      console.error("Failed to update profile:", error);
      res.status(500).json({
        message: "Failed to update profile",
        error: error.message,
      });
    }
  });

  // Avatar upload endpoint
  app.post(
    "/api/user/avatar",
    requireAuth,
    upload.single("avatar"),
    async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ message: "No file uploaded" });
        }

        // Generate public URL for the uploaded file
        const imageUrl = `/uploads/avatars/${req.file.filename}`;

        // Update user's avatar URL in database
        const [updatedUser] = await db
          .update(users)
          .set({
            imageUrl,
            updatedAt: new Date(),
          })
          .where(eq(users.id, req.user!.id))
          .returning();

        res.json(updatedUser);
      } catch (error: any) {
        console.error("Failed to upload avatar:", error);
        res.status(500).json({
          message: "Failed to upload avatar",
          error: error.message,
        });
      }
    },
  );

  // Serve uploaded files
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

  // Subscriber Routes
  app.get("/api/subscribers", requireAuth, async (req, res) => {
    try {
      const userSubscribers = await db
        .select({
          id: subscribers.id,
          email: subscribers.email,
          name: subscribers.name,
          active: subscribers.active,
          userId: subscribers.userId,
          createdAt: subscribers.createdAt
        })
        .from(subscribers)
        .where(eq(subscribers.userId, req.user!.id));
      res.json(userSubscribers);
    } catch (error: any) {
      console.error("Failed to fetch subscribers:", error);
      res.status(500).json({ message: "Failed to fetch subscribers" });
    }
  });

  app.post("/api/subscribers", requireAuth, async (req, res) => {
    try {
      const { email, name } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Check subscriber limit before adding
      const { hasReachedLimit, currentCount, limit, tierName } =
        await checkSubscriberLimit(req.user!.id);

      if (hasReachedLimit) {
        return res.status(403).json({
          message: `You have reached the maximum limit of ${limit} subscribers for your ${tierName} plan. Please upgrade to add more subscribers.`,
        });
      }

      // Check for existing subscriber
      const [existingSubscriber] = await db
        .select()
        .from(subscribers)
        .where(
          and(
            eq(subscribers.email, email),
            eq(subscribers.userId, req.user!.id),
          ),
        )
        .limit(1);

      if (existingSubscriber) {
        return res.status(400).json({ message: "Subscriber already exists" });
      }

      const [subscriber] = await db
        .insert(subscribers)
        .values({
          userId: req.user!.id,
          email,
          name,
          active: true,
        })
        .returning();

      // Create notification for new subscriber
      await NotificationService.createNotification(
        req.user!.id,
        "subscriber",
        "New subscriber joined",
        `${email} has subscribed to your newsletter`,
      );

      res.status(201).json({
        subscriber,
        subscriberCount: currentCount + 1,
        limit,
        tierName,
      });
    } catch (error: any) {
      console.error("Failed to add subscriber:", error);
      res.status(500).json({ message: "Failed to add subscriber" });
    }
  });

  app.delete("/api/subscribers/batch", requireAuth, async (req, res) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: "No subscribers selected" });
      }

      // Verify ownership of all subscribers
      const subscribersToDelete = await db
        .select()
        .from(subscribers)
        .where(
          and(
            eq(subscribers.userId, req.user!.id),
            sql`${subscribers.id} = ANY(${ids})`,
          ),
        );

      if (subscribersToDelete.length !== ids.length) {
        return res.status(403).json({
          message: "One or more subscribers do not belong to the current user",
        });
      }

      // Delete subscribers one by one instead of in a transaction
      for (const id of ids) {
        await db
          .update(subscribers)
          .set({
            active: false,
            updatedAt: new Date(),
          })
          .where(eq(subscribers.id, id));
      }

      // Create notification for batch removal
      await NotificationService.createNotification(
        req.user!.id,
        "subscriber",
        "Batch subscriber removal",
        `${ids.length} subscribers have been removed`,
      );

      res.json({
        message: "Subscribers removed successfully",
        count: ids.length,
      });
    } catch (error: any) {
      console.error("Failed to remove subscribers:", error);
      res.status(500).json({
        message: "Failed to remove subscribers",
        error: error.message,
      });
    }
  });

  app.delete("/api/subscribers/:id", requireAuth, async (req, res) => {
    try {
      const subscriberId = parseInt(req.params.id);
      if (isNaN(subscriberId)) {
        return res.status(400).json({ message: "Invalid subscriber ID" });
      }

      // First verify the subscriber exists and belongs to the user
      const [subscriber] = await db
        .select()
        .from(subscribers)
        .where(
          and(
            eq(subscribers.id, subscriberId),
            eq(subscribers.userId, req.user!.id),
          ),
        )
        .limit(1);

      if (!subscriber) {
        return res.status(404).json({ message: "Subscriber not found" });
      }

      // Actually delete the subscriber
      await db.delete(subscribers).where(eq(subscribers.id, subscriberId));

      // Create notification for subscriber removal
      await NotificationService.createNotification(
        req.user!.id,
        "subscriber",
        "Subscriber removed",
        `${subscriber.email} has been removed from your subscribers`,
      );

      return res.json({
        message: "Subscriber removed successfully",
      });
    } catch (error: any) {
      console.error("Failed to remove subscriber:", error);
      return res.status(500).json({
        message: "Failed to remove subscriber",
        error: error.message,
      });
    }
  });

  // Email verification routes with authentication
  app.get("/api/verified-emails", requireAuth, getVerifiedEmails);
  app.post("/api/verified-emails/verify", requireAuth, verifyEmail);
  app.get("/api/verified-emails/status", requireAuth, checkEmailVerification);
  app.post("/api/verified-emails/test", requireAuth, testEmailSettings);

  // API Keys Routes with authentication
  app.get("/api/api-keys", requireAuth, getApiKeys);
  app.put("/api/api-keys", requireAuth, updateApiKeys);

  // Update the newsletter sending endpoint to support group targeting
  app.post("/api/newsletters/send", requireAuth, async (req, res) => {
    try {
      const {
        subject,
        content,
        test = false,
        testEmail,
        scheduleType,
        scheduledAt,
        selectedGroupId = undefined, // Group targeting with single group selection
      } = req.body;

      if (!subject || !content) {
        return res.status(400).json({
          message: "Subject and content are required",
        });
      }

      // For scheduled newsletters
      if (scheduleType === "later") {
        if (!scheduledAt) {
          return res.status(400).json({
            message: "Schedule date is required for scheduled newsletters",
          });
        }

        const scheduledDate = new Date(scheduledAt);
        if (scheduledDate <= new Date()) {
          return res.status(400).json({
            message: "Schedule date must be in the future",
          });
        }

        // Create a scheduled newsletter
        const [newsletter] = await db
          .insert(newsletters)
          .values({
            userId: req.user!.id,
            title: subject,
            content: {
              html: content,
              isTest: test,
              testEmail: testEmail,
              targetGroupId: selectedGroupId, // Store target group
            },
            status: "scheduled",
            scheduledAt: scheduledDate,
          })
          .returning();

        return res.json({
          success: true,
          message: "Newsletter scheduled successfully",
          scheduledAt: scheduledDate,
          newsletter,
        });
      }

      // If this is a test email, only send to the test email address
      if (test) {
        if (!testEmail) {
          return res.status(400).json({
            message: "Test email address is required for test sends",
          });
        }

        const result = await sendNewsletter(
          req.user!.id,
          [testEmail],
          subject,
          content,
        );

        return res.json({
          success: true,
          message: "Test email sent successfully",
          info: result.info,
        });
      }

      // Build the query to get subscribers based on selected group (if any)
      let subscribersQuery = db
        .select({
          email: subscribers.email,
          id: subscribers.id,
          name: subscribers.name,
        })
        .from(subscribers)
        .where(
          and(
            eq(subscribers.userId, req.user!.id),
            eq(subscribers.active, true)
          )
        );
      
      // If a specific group is selected, filter subscribers by that group
      if (selectedGroupId && selectedGroupId !== "all") {
        const groupId = parseInt(selectedGroupId);
        
        // Verify the group exists and belongs to the user
        const [group] = await db
          .select()
          .from(subscriber_groups)
          .where(
            and(
              eq(subscriber_groups.id, groupId),
              eq(subscriber_groups.userId, req.user!.id)
            )
          );

        if (!group) {
          return res.status(404).json({ message: "Group not found" });
        }

        // Get subscribers who are part of this group
        const groupSubscriberIds = await db
          .select({
            subscriberId: subscriber_group_members.subscriberId,
          })
          .from(subscriber_group_members)
          .where(eq(subscriber_group_members.groupId, groupId))
          .then(results => results.map(r => r.subscriberId));

        // Filter subscribers to only include those in the group
        if (groupSubscriberIds.length > 0) {
          // Final subscriber list is intersection of active user subscribers and group members
          subscribersQuery = db
            .select({
              email: subscribers.email,
              id: subscribers.id,
              name: subscribers.name,
            })
            .from(subscribers)
            .where(
              and(
                eq(subscribers.userId, req.user!.id),
                eq(subscribers.active, true),
                inArray(subscribers.id, groupSubscriberIds)
              )
            );
        } else {
          // If no subscribers in the group, return early
          return res.status(400).json({
            message: `No subscribers found in the selected group`,
          });
        }
      }

      // Execute the query to get the final list of subscribers
      const userSubscribers = await subscribersQuery;

      if (userSubscribers.length === 0) {
        return res.status(400).json({
          message: selectedGroupId 
            ? "No active subscribers found in the selected group" 
            : "No subscribers found to send the newsletter to",
        });
      }

      const recipientEmails = userSubscribers.map(sub => sub.email);

      // Send newsletter directly
      const result = await sendNewsletter(
        req.user!.id,
        recipientEmails,
        subject,
        content
      );

      // Only store in database after successful send
      const [newsletter] = await db
        .insert(newsletters)
        .values({
          userId: req.user!.id,
          title: subject,
          content: { 
            html: content,
            targetGroupId: selectedGroupId 
          },
          status: "sent",
        })
        .returning();

      if (!newsletter) {
        throw new Error("Failed to create newsletter record");
      }

      // Get group name for notification if applicable
      let groupName = "";
      if (selectedGroupId && selectedGroupId !== "all") {
        const [group] = await db
          .select({ name: subscriber_groups.name })
          .from(subscriber_groups)
          .where(eq(subscriber_groups.id, parseInt(selectedGroupId)));
          
        if (group) {
          groupName = group.name;
        }
      }

      // Create notification for successful newsletter send
      await NotificationService.createNotification(
        req.user!.id,
        "newsletter",
        "Newsletter sent successfully",
        `"${subject}" was sent to ${recipientEmails.length} subscribers${
          selectedGroupId ? ` in group "${groupName}"` : ""
        }`,
      );

      return res.json({
        success: true,
        message: `Newsletter sent successfully to ${recipientEmails.length} subscribers${
          selectedGroupId ? ` in group "${groupName}"` : ""
        }`,
        info: result.info,
        newsletter,
      });
    } catch (error: any) {
      console.error("Failed to send newsletter:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to send newsletter",
      });
    }
  });

  
  // Delete newsletter endpoint
  app.delete("/api/newsletters/:id", requireAuth, async (req, res) => {
    try {
      const newsletterId = parseInt(req.params.id);
      if (isNaN(newsletterId)) {
        return res.status(400).json({ message: "Invalid newsletter ID" });
      }

      // First verify the newsletter exists and belongs to the user
      const [newsletter] = await db
        .select()
        .from(newsletters)
        .where(
          and(
            eq(newsletters.id, newsletterId),
            eq(newsletters.userId, req.user!.id),
          ),
        )
        .limit(1);

      if (!newsletter) {
        return res.status(404).json({ message: "Newsletter not found" });
      }

      // Delete the newsletter
      await db.delete(newsletters).where(eq(newsletters.id, newsletterId));

      // Create notification for newsletter deletion
      await NotificationService.createNotification(
        req.user!.id,
        "newsletter",
        "Newsletter deleted",
        `"${newsletter.title}" has been deleted`,
      );

      return res.json({ message: "Newsletter deleted successfully" });
    } catch (error: any) {
      console.error("Failed to delete newsletter:", error);
      return res.status(500).json({
        message: "Failed to delete newsletter",
        error: error.message,
      });
    }
  });

  app.get("/api/newsletters", requireAuth, async (req, res) => {
    try {
      console.log(`[API] Fetching newsletters for user ${req.user!.id}`);

      const userNewsletters = await db
        .select()
        .from(newsletters)
        .where(eq(newsletters.userId, req.user!.id))
        .orderBy(newsletters.createdAt, "desc");

      console.log(
        `[API] Found ${userNewsletters.length} newsletters for user ${req.user!.id}`,
      );

      res.json(userNewsletters);
    } catch (error) {
      console.error("[API] Error fetching newsletters:", error);
      res.status(500).json({
        message: "Failed to fetch newsletters",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  app.get("/api/newsletters/:id", requireAuth, async (req, res) => {
    const [newsletter] = await db
      .select()
      .from(newsletters)
      .where(eq(newsletters.id, parseInt(req.params.id)))
      .limit(1);

    if (!newsletter)
      return res.status(404).json({ message: "Newsletter not found" });
    if (newsletter.userId !== req.user!.id)
      return res.status(403).json({ message: "Forbidden" });

    res.json(newsletter);
  });

  app.post("/api/newsletters/generate", requireAuth, async (req, res) => {
    try {
      const { topics } = req.body;
      if (!Array.isArray(topics) || topics.length === 0) {
        return res.status(400).json({
          message: "Invalid input: topics must be a non-empty array",
        });
      }

      const content = await generateAINewsletter(topics);
      res.json(content);
    } catch (error: any) {
      console.error("Newsletter generation error:", error);
      res.status(500).json({
        message: "Failed to generate newsletter content",
        error: error.message,
        details: error.stack,
      });
    }
  });

  app.post("/api/newsletters", requireAuth, async (req, res) => {
    const newsletterData = {
      userId: req.user!.id,
      title: req.body.title,
      content: req.body.content,
      templateId: req.body.templateId,
      status: "draft",
    };

    const [created] = await db
      .insert(newsletters)
      .values(newsletterData)
      .returning();

    // Create notification for draft saved
    await NotificationService.createNotification(
      req.user!.id,
      "newsletter",
      "Newsletter draft saved",
      `"${newsletterData.title}" was saved as a draft`,
    );

    res.json(created);
  });

  app.put("/api/newsletters/:id", requireAuth, async (req, res) => {
    const [newsletter] = await db
      .select()
      .from(newsletters)
      .where(eq(newsletters.id, parseInt(req.params.id)))
      .limit(1);

    if (!newsletter)
      return res.status(404).json({ message: "Newsletter not found" });
    if (newsletter.userId !== req.user!.id)
      return res.status(403).json({ message: "Forbidden" });

    const [updated] = await db
      .update(newsletters)
      .set({
        title: req.body.title,
        content: req.body.content,
        templateId: req.body.templateId,
        updatedAt: new Date(),
      })
      .where(eq(newsletters.id, newsletter.id))
      .returning();

    res.json(updated);
  });

  app.post("/api/curate", requireAuth, async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) {
        return res.status(400).json({ message: "URL is required" });
      }

      const content = await summarizeContent(url);
      res.json(content);
    } catch (error: any) {
      console.error("Content curation error:", error);
      res.status(500).json({
        message: "Failed to curate content",
        error: error.message,
        details: error.stack,
      });
    }
  });

  app.post("/api/curate/news", requireAuth, async (req, res) => {
    try {
      const { topic } = req.body;
      if (!topic) {
        return res.status(400).json({ message: "Topic is required" });
      }

      const content = await getNewsContent(topic);
      res.json(content);
    } catch (error: any) {
      console.error("News content error:", error);
      res.status(500).json({
        message: "Failed to fetch news content",
        error: error.message,
        details: error.stack,
      });
    }
  });

  // Public subscription endpoint for widget
  app.post("/api/subscribe/external", async (req, res) => {
    try {
      const { email, name, userId } = req.body;

      if (!email || !userId) {
        return res
          .status(400)
          .json({ message: "Email and userId are required" });
      }

      // Check subscriber limit
      const { hasReachedLimit, limit, tierName } =
        await checkSubscriberLimit(userId);

      if (hasReachedLimit) {
        return res.status(403).json({
          message: `This newsletter has reached its maximum subscriber limit for the ${tierName} plan.`,
        });
      }

      // Check for existing subscriber
      const [existingSubscriber] = await db
        .select()
        .from(subscribers)
        .where(
          and(eq(subscribers.email, email), eq(subscribers.userId, userId)),
        )
        .limit(1);

      if (existingSubscriber) {
        return res.status(400).json({ message: "Already subscribed" });
      }

      const [subscriber] = await db
        .insert(subscribers)
        .values({
          userId,
          email,
          name: name || null,
          active: true,
        })
        .returning();

      res.status(201).json({
        success: true,
        message: "Successfully subscribed to the newsletter",
        subscriber,
      });
    } catch (error: any) {
      console.error("Failed to add external subscriber:", error);
      res.status(500).json({ message: "Failed to subscribe" });
    }
  });

  // Add this route before the widget.js route
  app.get("/api/forms/:userId/styles", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      console.log(`[Form Styles] Fetching styles for user ID: ${userId}`);

      if (isNaN(userId)) {
        console.log(
          `[Form Styles] Invalid user ID provided: ${req.params.userId}`,
        );
        return res.status(400).json({ message: "Invalid user ID" });
      }

      // Fetch the user's form styles
      console.log(
        `[Form Styles] Querying database for user ${userId}'s styles`,
      );
      const [userStyles] = await db        .select()
        .from(form_styles)
        .where(eq(form_styles.userId, userId))
        .limit(1);

      console.log(`[Form Styles] Query result:`, userStyles);

      if (!userStyles) {
        console.log(
          `[Form Styles] No styles found for user ${userId}, returning defaults`,
        );
        // Return default styles if none exist
        return res.json({
          styles: {
            backgroundColor: "white",
            textColor: "#000000",
            borderColor: "#e2e8f0",
            borderRadius: 8,
            fontFamily: "Arial",
            fontSize: "16px",
            buttonBackgroundColor: "#6366f1",
            buttonTextColor: "#ffffff",
            titleColor: "#000000",
            descriptionColor: "#64748b",
            formMaxWidth: 400,
            formPadding: 24,
            formBackgroundOpacity: 100,
            formShadow: "medium",
          },
          content: {
            title: "Subscribe to our Newsletter",
            description: "Stay updated with our latest content",
            buttonText: "Subscribe",
            emailLabel: "Email Address",
            emailPlaceholder: "your@email.com",
            nameLabel: "Name",
            namePlaceholder: "John Doe",
            showNameField: true,
            successMessage: "Thanks for subscribing!",
            errorMessage: "Something went wrong. Please try again.",
          },
        });
      }

      console.log(`[Form Styles] Returning custom styles for user ${userId}`);
      // Return the user's custom styles
      return res.json({
        styles: userStyles.styles,
        content: userStyles.content,
      });
    } catch (error) {
      console.error("[Form Styles] Error fetching form styles:", error);
      return res.status(500).json({
        message: "Failed to fetch form styles",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Update the widget.js endpoint code
  app.get("/widget.js", (req, res) => {
    const widgetCode = `
      window.NewsletterWidget = {
        init: function(config) {
          if (!config || !config.userId || !config.containerId) {
            console.error('Invalid widget configuration');
            return;
          }

          console.log('Initializing widget with config:', config);
          const container = document.getElementById(config.containerId);
          if (!container) {
            console.error('Container element not found:', config.containerId);
            return;
          }

          // Create a loading container
          const loadingContainer = document.createElement('div');
          loadingContainer.className = 'newsletter-widget-loading';
          loadingContainer.innerHTML = '<p style="text-align: center; color: #666;">Loading subscription form...</p>';
          container.innerHTML = '';
          container.appendChild(loadingContainer);

          const styles = config.styles || {};

          const widgetStyles = {
            padding: styles.padding || '20px',
            maxWidth: styles.maxWidth || '500px',
            width: styles.width || '100%',
            margin: '0 auto',
            backgroundColor: styles.backgroundColor || '#ffffff',
            borderRadius: (styles.borderRadius || 8) + 'px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            fontSize: styles.fontSize || '16px'
          };

          Object.assign(container.style, widgetStyles);

          const form = document.createElement('form');
          form.className = 'space-y-4';
          form.innerHTML = \`
            <div class="text-center mb-4">
              <h2 style="color: \${styles.textColor || '#000000'}; font-size: 1.5rem; margin-bottom: 1rem;">Subscribe to Newsletter</h2>
            </div>
            <div class="space-y-2">
              <label style="color: \${styles.textColor || '#000000'}">Email Address</label>
              <input
                type="email"
                name="email"
                required
                placeholder="your@email.com"
                style="
                  border-color: \${styles.borderColor || '#e2e8f0'};
                  border-radius: \${styles.borderRadius || 4}px;
                  color: \${styles.textColor || '#000000'};
                  background: \${styles.backgroundColor || '#ffffff'};
                  width: 100%;
                  padding: 8px;
                  border: 1px solid;
                  margin: 8px 0;
                  font-size: \${styles.fontSize || '16px'};
                "
              />
            </div>
            <div class="space-y-2">
              <label style="color: \${styles.textColor || '#000000'}">Name (Optional)</label>
              <input
                type="text"
                name="name"
                placeholder="John Doe"
                style="
                  border-color: \${styles.borderColor || '#e2e8f0'};
                  border-radius: \${styles.borderRadius || 4}px;
                  color: \${styles.textColor || '#000000'};
                  background: \${styles.backgroundColor || '#ffffff'};
                  width: 100%;
                  padding: 8px;
                  border: 1px solid;
                  margin: 8px 0;
                  font-size: \${styles.fontSize || '16px'};
                "
              />
            </div>
            <button
              type="submit"
              style="
                background-color: \${styles.buttonBackgroundColor || '#2563eb'};
                color: \${styles.buttonTextColor || '#ffffff'};
                border-radius: \${styles.borderRadius || 4}px;
                width: 100%;
                padding: 12px;
                cursor: pointer;
                margin-top: 1rem;
                font-size: \${styles.fontSize || '16px'};
                border: none;
              "
            >
              Subscribe
            </button>
          \`;

          form.onsubmit = async function(e) {
            e.preventDefault();
            const formData = new FormData(form);
            const submitButton = form.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.textContent = 'Subscribing...';

            try {
              const response = await fetch('/api/subscribe/external', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  email: formData.get('email'),
                  name: formData.get('name'),
                  userId: config.userId
                })
              });

              if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to subscribe');
              }

              container.innerHTML = '<div style="text-align: center; padding: 20px;"><p style="color: ' + (styles.textColor || '#000000') + '">Thanks for subscribing!</p></div>';
            } catch (error) {
              console.error('Subscription error:', error);
              submitButton.disabled = false;
              submitButton.textContent = 'Subscribe';
              const errorMessage = document.createElement('p');
              errorMessage.style.color = 'red';
              errorMessage.style.textAlign = 'center';
              errorMessage.style.marginTop = '10px';
              errorMessage.textContent = error.message;
              form.appendChild(errorMessage);
            }
          };

          // Remove loading container and add the form
          container.removeChild(loadingContainer);
          container.appendChild(form);
          console.log('Widget form added to container');
        }
      };
    `;

    res.setHeader("Content-Type", "application/javascript");
    res.setHeader("Cache-Control", "no-cache");
    res.send(widgetCode);
  });

  app.post("/api/subscribers/widget", async (req, res) => {
    try {
      const { email, name, userId } = req.body;

      if (!email || !userId) {
        return res
          .status(400)
          .json({ message: "Email and userId are required" });
      }

      // Check for existing subscriber
      const [existingSubscriber] = await db
        .select()
        .from(subscribers)
        .where(
          and(eq(subscribers.email, email), eq(subscribers.userId, userId)),
        )
        .limit(1);

      if (existingSubscriber) {
        return res.status(400).json({ message: "Already subscribed" });
      }

      // Add new subscriber
      const [subscriber] = await db
        .insert(subscribers)
        .values({
          userId,
          email,
          name: name || null,
          active: true,
          createdAt: new Date(),
        })
        .returning();

      res.status(201).json({ message: "Subscribed successfully" });
    } catch (error) {
      console.error("Widget subscription error:", error);
      res.status(500).json({ message: "Failed to subscribe" });
    }
  });

  app.get("/api/widget", (req, res) => {
    const widgetCode = `
      window.NewsletterWidget = {
        init: function(config) {
          const container = document.getElementById(config.containerId);
          const styles = config.styles || {};

          const form = document.createElement('form');          form.className = 'space-y-4';
          form.innerHTML = \`
            <div class="space-y-2">
              <label style="color: \${styles.textColor}">Email Address</label>
              <input
                type="email"
                name="email"
                required
                placeholder="your@email.com"
                style="
                  border-color: \${styles.borderColor};
                  border-radius: \${styles.borderRadius}px;
                  color: \${styles.textColor};
                  background: \${styles.backgroundColor};
                  width: 100%;
                  padding: 8px;
                  border: 1px solid;
                "
              />
            </div>
            <div class="space-y-2">
              <label style="color: \${styles.textColor}">Name (Optional)</label>
              <input
                type="text"
                name="name"
                placeholder="John Doe"
                style="
                  border-color: \${styles.borderColor};
                  border-radius: \${styles.borderRadius}px;
                  color: \${styles.textColor};
                  background: \${styles.backgroundColor};
                  width: 100%;
                  padding: 8px;
                  border: 1px solid;
                "
              />
            </div>
            <button
              type="submit"
              style="
                background-color: \${styles.buttonBackgroundColor};
                color: \${styles.buttonTextColor};
                border-radius: \${styles.borderRadius}px;
                width: 100%;
                padding: 8px;
                cursor: pointer;
              "
            >
              Subscribe
            </button>
          \`;

          form.onsubmit = async function(e) {
            e.preventDefault();
            const formData = new FormData(form);

            try {
              const response = await fetch('${process.env.API_URL}/api/subscribers/widget', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  email: formData.get('email'),
                  name: formData.get('name'),
                  userId: config.userId
                })
              });

              if (!response.ok) {
                throw new Error('Failed to subscribe');
              }

              form.innerHTML = '<p style="color: ' + styles.textColor + '">Thanks for subscribing!</p>';
            } catch (error) {
              alert('Failed to subscribe. Please try again.');
            }
          };

          container.appendChild(form);
        }
      };
    `;

    res.setHeader("Content-Type", "application/javascript");
    res.send(widgetCode);
  });

  // Mount credits router for authenticated routes
  app.use("/api/credits", requireAuth, creditsRouter);

  app.post("/api/keys", updateApiKeys);
  app.post("/api/test-gpt", testGptConfiguration);
  // Improved logout handling
  app.delete("/api/user/profile", requireAuth, async (req, res) => {
    try {
      // First verify the user exists
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, req.user!.id))
        .limit(1);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Start a transaction to handle all deletions
      await db.transaction(async (tx) => {
        // 1. Delete newsletters and related records first
        await tx
          .delete(newsletters)
          .where(eq(newsletters.userId, req.user!.id));

        // 2. Delete subscribers
        await tx
          .delete(subscribers)
          .where(eq(subscribers.userId, req.user!.id));

        // 3. Delete API keys
        await tx.delete(api_keys).where(eq(api_keys.userId, req.user!.id));

        // 4. Delete verified emails
        await tx
          .delete(verified_emails)
          .where(eq(verified_emails.userId, req.user!.id));

        // 5. Delete notifications
        await tx
          .delete(notifications)
          .where(eq(notifications.userId, req.user!.id));

        // 6. Delete user feedback
        await tx
          .delete(user_feedback)
          .where(eq(user_feedback.userId, req.user!.id));

        // 7. Update appsumo codes references
        await tx
          .update(appsumo_codes)
          .set({ redeemedBy: null })
          .where(eq(appsumo_codes.redeemedBy, req.user!.id));

        // 8. Delete credit purchases first (due to foreign key constraint)
        await tx
          .delete(credit_purchases)
          .where(eq(credit_purchases.userId, req.user!.id));

        // 9. Delete credit transactions
        await tx
          .delete(credit_transactions)
          .where(eq(credit_transactions.userId, req.user!.id));

        // 10. Delete user credits
        await tx
          .delete(user_credits)
          .where(eq(user_credits.userId, req.user!.id));

        // 11. Delete user redeemed codes
        await tx
          .delete(user_redeemed_codes)
          .where(eq(user_redeemed_codes.userId, req.user!.id));

        // 12. Delete user subscriptions
        await tx
          .delete(user_subscriptions)
          .where(eq(user_subscriptions.userId, req.user!.id));

        // Delete the user's avatar file if it exists
        if (user.imageUrl) {
          const avatarPath = path.join(process.cwd(), user.imageUrl);
          if (fs.existsSync(avatarPath)) {
            fs.unlinkSync(avatarPath);
          }
        }

        // Finally delete the user
        await tx.delete(users).where(eq(users.id, req.user!.id));
      });

      // Destroy the session and logout
      req.session.destroy((err) => {
        if (err) {
          console.error(
            "Error destroying session after profile deletion:",
            err,
          );
        }
        req.logout((logoutErr) => {
          if (logoutErr) {
            console.error(
              "Error logging out after profile deletion:",
              logoutErr,
            );
          }
          res.clearCookie("connect.sid"); // Clear the session cookie
          res.json({ message: "Profile deleted successfully" });
        });
      });
    } catch (error: any) {
      console.error("Failed to delete profile:", error);
      res.status(500).json({
        message: "Failed to delete profile",
        error: error.message,
      });
    }
  });
  // Feedback Routes
  app.post("/api/feedback", requireAuth, async (req, res) => {
    try {
      const { message, category, rating, feedbackType } = req.body;

      if (!message?.trim()) {
        return res.status(400).json({
          success: false,
          message: "Feedback message is required",
        });
      }

      // Insert feedback into database
      await db.insert(user_feedback).values({
        userId: req.user!.id,
        message,
        category,
        rating,
        feedbackType,
        status: "pending",
        createdAt: new Date(),
      });

      // Create notification for new feedback
      await NotificationService.createNotification(
        req.user!.id,
        "feedback",
        "Feedback submitted",
        `Thank you for your ${feedbackType} feedback regarding ${category}`,
      );

      res.json({
        success: true,
        message: "Feedback submitted successfully",
      });
    } catch (error: any) {
      console.error("Failed to submit feedback:", error);
      res.status(500).json({
        success: false,
        message: "Failed to submit feedback",
        error: error.message,
      });
    }
  });

  app.get("/api/feedback", requireAuth, async (req, res) => {
    try {
      const userFeedback = await db
        .select()
        .from(user_feedback)
        .where(eq(user_feedback.userId, req.user!.id))
        .orderBy(desc(user_feedback.createdAt));

      res.json({
        success: true,
        data: userFeedback,
      });
    } catch (error: any) {
      console.error("Failed to fetch feedback:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch feedback",
        error: error.message,
      });
    }
  });

  app.get("/api/admin/feedback", requireAuth, async (req, res) => {
    try {
      // First check if user has admin privileges
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, req.user!.id))
        .limit(1);

      if (!user) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to view feedback",
        });
      }

      // Fetch all feedback with user information
      const allFeedback = await db
        .select({
          id: user_feedback.id,
          userId: user_feedback.userId,
          feedbackType: user_feedback.feedbackType,
          message: user_feedback.message,
          rating: user_feedback.rating,
          status: user_feedback.status,
          category: user_feedback.category,
          createdAt: user_feedback.createdAt,
        })
        .from(user_feedback)
        .orderBy(desc(user_feedback.createdAt));

      res.json({
        success: true,
        data: allFeedback,
      });
    } catch (error: any) {
      console.error("Failed to fetch admin feedback:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch feedback",
        error: error.message,
      });
    }
  });
  // Add new endpoint for subscription details
  app.get("/api/subscription/details", requireAuth, async (req, res) => {
    try {
      const details = await getSubscriptionDetails(req.user!.id);
      res.json(details);
    } catch (error: any) {
      console.error("Error fetching subscription details:", error);
      res.status(500).json({
        message: "Failed to fetch subscription details",
        error: error.message,
      });
    }
  });
  // // Credit management routes
  // app.post("/api/credits/validate", requireAuth, async (req, res) => {
  //   try {
  //     const { action } = req.body;
  //     if (!action) {
  //       return res.status(400).json({ message: "Action is required" });
  //     }

  //     const hasCredits = await checkAICredits(req.user!.id);

  //     if (!hasCredits) {
  //       return res.status(403).json({
  //         message:
  //           "Insufficient AI credits. Please check your subscription plan.",
  //       });
  //     }

  //     res.json({ success: true });
  //   } catch (error: any) {
  //     console.error("Failed to validate credits:", error);
  //     res.status(500).json({
  //       message: "Failed to validate credits",
  //       error: error.message,
  //     });
  //   }
  // });

  // app.post("/api/credits/deduct", requireAuth, async (req, res) => {
  //   try {
  //     const { action, description } = req.body;
  //     if (!action) {
  //       return res.status(400).json({ message: "Action is required" });
  //     }

  //     await updateAICreditsUsage(
  //       req.user!.id,
  //       action,
  //       description || `AI credit used for ${action}`,
  //     );

  //     // Get updated credit balance
  //     const [userCredits] = await db
  //       .select()
  //       .from(user_credits)
  //       .where(eq(user_credits.userId, req.user!.id))
  //       .limit(1);

  //     res.json({
  //       success: true,
  //       creditsRemaining: userCredits?.creditsRemaining || 0,
  //     });
  //   } catch (error: any) {
  //     console.error("Failed to deduct credits:", error);
  //     res.status(500).json({
  //       message: "Failed to deduct credits",
  //       error: error.message,
  //     });
  //   }
  // });

  app.post("/api/create-checkout-session", async (req, res) => {
    try {
      const {
        username,
        password,
        email,
        fullName,
        provider,
        planType,
        interval,
      } = req.body;
      const baseUrl =
        process.env.FRONTEND_URL ||
        `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;

      // Store registration data in session
      req.session.pendingRegistration = {
        username,
        password,
        email,
        fullName,
        provider,
      };

      // Define price IDs based on plan and interval
      const priceConfig = {
        starter: {
          monthly: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID,
          yearly: process.env.STRIPE_STARTER_YEARLY_PRICE_ID,
        },
        growth: {
          monthly: process.env.STRIPE_GROWTH_MONTHLY_PRICE_ID,
          yearly: process.env.STRIPE_GROWTH_YEARLY_PRICE_ID,
        },
        business: {
          monthly: process.env.STRIPE_BUSINESS_MONTHLY_PRICE_ID,
          yearly: process.env.STRIPE_BUSINESS_YEARLY_PRICE_ID,
        },
        enterprise: {
          monthly: process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID,
          yearly: process.env.STRIPE_ENTERPRISE_YEARLY_PRICE_ID,
        },
      };

      const priceId = priceConfig[planType][interval];
      if (!priceId) {
        throw new Error("Invalid plan type or interval");
      }

      // Get plan details to include trial period
      const plan =
        SUBSCRIPTION_PLANS[planType as keyof typeof SUBSCRIPTION_PLANS];
      if (!plan) {
        throw new Error("Invalid plan type");
      }

      // Create Stripe checkout session with trial period
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "subscription",
        billing_address_collection: "auto",
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: plan.name,
                description: `${plan.description} - Includes ${plan.trialDays || 14}-day free trial`,
              },
              unit_amount:
                interval === "yearly" ? plan.yearlyPrice : plan.monthlyPrice,
              recurring: {
                interval: interval === "monthly" ? "month" : "year",
              },
            },
            quantity: 1,
          },
        ],
        success_url: `${baseUrl}/api/subscriptions/complete-registration?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/signup`,
        customer_email: email,
        metadata: {
          username,
          email,
          fullName,
          planType,
          interval,
          password,
          origin_url: baseUrl, // Include the origin URL for debugging
          subscriberLimit: plan.subscriberLimit.toString(),
          initialAiCredits: plan.initialAiCredits.toString(),
        },
        subscription_data: {
          metadata: {
            planType,
            interval,
            username,
            email,
          },
          trial_period_days: plan.trialDays || 14, // Trial period should only be defined here
        },
      });

      res.json({ sessionUrl: session.url });
    } catch (error: any) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Checkout completion is handled by the subscriptions router at /api/subscriptions/complete-registration

// Email content generation endpoint
  app.post("/api/generate/email", requireAuth, async (req, res) => {
    try {
      const { prompt } = req.body;
      if (!prompt) {
        return res.status(400).json({ message: "Prompt is required" });
      }

      const { subject, blocks } = await generateEmailContent(prompt); // Call the new function

      res.json({ subject, blocks });
    } catch (error: any) {
      console.error("Error generating email content:", error);
      res.status(500).json({
        message: "Failed to generate email content",
        error: error.message
      });
    }
  });
  app.use('/api/templates', templatesRouter); // Added templates router
}