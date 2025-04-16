
import { Router } from 'express';
import { db } from '../db';
import { form_submissions, subscribers, subscriber_group_members } from '../db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

const router = Router();

// Handle form submission
router.post('/submit/:userId', async (req, res) => {
  try {
    const { email, name, formId, groupId } = req.body;
    const userId = parseInt(req.params.userId);

    if (!email || !formId) {
      return res.status(400).json({ error: 'Email and form ID are required' });
    }

    // Create submission record
    const [submission] = await db.insert(form_submissions)
      .values({
        userId,
        email,
        name,
        formId,
        groupId: groupId ? parseInt(groupId) : null
      })
      .returning();

    // Add to subscribers if not exists
    const [existingSubscriber] = await db.select()
      .from(subscribers)
      .where(eq(subscribers.email, email.toLowerCase()));

    if (!existingSubscriber) {
      const [subscriber] = await db.insert(subscribers)
        .values({
          userId,
          email: email.toLowerCase(),
          name,
          active: true,
          unsubscribeToken: crypto.randomBytes(32).toString('hex')
        })
        .returning();

      // Add to group if specified
      if (groupId) {
        await db.insert(subscriber_group_members)
          .values({
            groupId: parseInt(groupId),
            subscriberId: subscriber.id
          });
      }
    }

    res.status(201).json({ success: true });
  } catch (error) {
    console.error('Form submission error:', error);
    res.status(500).json({ error: 'Failed to process form submission' });
  }
});

export default router;
