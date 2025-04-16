// Patch for scheduler to support subscriber groups

import { db } from "./db/index";
import { 
  newsletters, 
  subscribers, 
  subscriber_groups,
  subscriber_group_members,
  type Newsletter, 
  type Subscriber 
} from "./db/schema";
import { and, eq, lte, inArray } from "drizzle-orm";
import { sendNewsletter } from "./lib/email";

export async function processScheduledNewslettersWithGroups() {
  try {
    const currentTime = new Date();
    console.log(`[Scheduler] Processing scheduled newsletters`);
    console.log(`[Scheduler] Current time (ISO): ${currentTime.toISOString()}`);
    console.log(`[Scheduler] Current time (Local): ${currentTime.toLocaleString()}`);

    // Check if newsletters table exists
    try {
      await db.select().from(newsletters).limit(1);
    } catch (error) {
      console.error('[Scheduler] Error accessing newsletters table:', error);
      return;
    }

    // Find all newsletters that are scheduled and due to be sent
    const scheduledNewsletters = await db
      .select()
      .from(newsletters)
      .where(and(
        eq(newsletters.status, "scheduled"),
        lte(newsletters.scheduledAt!, currentTime)
      ));

    console.log(`[Scheduler] Found ${scheduledNewsletters.length} newsletters to process`);

    for (const newsletter of scheduledNewsletters) {
      try {
        console.log(`[Scheduler] Processing newsletter ${newsletter.id} scheduled for ${newsletter.scheduledAt?.toISOString()}`);
        
        // Get all subscribers for the newsletter's user
        let subscribersQuery = db
          .select()
          .from(subscribers)
          .where(
            and(
              eq(subscribers.userId, newsletter.userId),
              eq(subscribers.active, true)
            )
          );
        
        // Check if newsletter targets a specific group
        const content = newsletter.content as { 
          html?: string; 
          sections?: Array<{ title: string; content: string }>;
          isTest?: boolean; 
          testEmail?: string;
          targetGroupId?: string;
        };
        
        if (content.targetGroupId) {
          console.log(`[Scheduler] Newsletter ${newsletter.id} targets group ${content.targetGroupId}`);
          
          const groupId = parseInt(content.targetGroupId);
          
          // Verify the group exists
          const [group] = await db
            .select()
            .from(subscriber_groups)
            .where(
              and(
                eq(subscriber_groups.id, groupId),
                eq(subscriber_groups.userId, newsletter.userId)
              )
            );

          if (!group) {
            console.error(`[Scheduler] Group ${groupId} not found for newsletter ${newsletter.id}`);
            
            // Update newsletter status to failed
            await db
              .update(newsletters)
              .set({
                status: "failed",
                updatedAt: new Date()
              })
              .where(eq(newsletters.id, newsletter.id));
              
            continue;
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
              .select()
              .from(subscribers)
              .where(
                and(
                  eq(subscribers.userId, newsletter.userId),
                  eq(subscribers.active, true),
                  inArray(subscribers.id, groupSubscriberIds)
                )
              );
          } else {
            console.log(`[Scheduler] No subscribers found in group ${groupId} for newsletter ${newsletter.id}`);
            
            // Update newsletter status to failed
            await db
              .update(newsletters)
              .set({
                status: "failed",
                updatedAt: new Date()
              })
              .where(eq(newsletters.id, newsletter.id));
              
            continue;
          }
        }
        
        // Execute the query to get the final list of subscribers
        const subscriberList = await subscribersQuery;
        
        const recipientEmails = subscriberList
          .filter((sub: Subscriber) => sub.active)
          .map((sub: Subscriber) => sub.email);

        if (recipientEmails.length === 0) {
          console.log(`[Scheduler] No active subscribers found for newsletter ${newsletter.id}`);
          await db
            .update(newsletters)
            .set({
              status: "failed",
              updatedAt: new Date()
            })
            .where(eq(newsletters.id, newsletter.id));
          continue;
        }

        console.log(`[Scheduler] Preparing to send newsletter ${newsletter.id} to ${recipientEmails.length} recipients`);

        // Parse newsletter content if it's stored as JSON
        let parsedContent: string;
        try {
          if (content.html) {
            parsedContent = content.html;
          } else if (Array.isArray(content.sections)) {
            parsedContent = content.sections
              .map(section => `<h2>${section.title}</h2>${section.content}`)
              .join('\n\n');
          } else {
            parsedContent = JSON.stringify(content);
          }
        } catch (parseError) {
          console.error(`[Scheduler] Error parsing newsletter content:`, parseError);
          throw new Error('Invalid newsletter content format');
        }
        
        // Send the newsletter
        await sendNewsletter(
          newsletter.userId,
          recipientEmails,
          newsletter.title,
          parsedContent,
          content.isTest || false,
          content.testEmail
        );

        // Update newsletter status to sent
        await db
          .update(newsletters)
          .set({
            status: "sent",
            updatedAt: new Date()
          })
          .where(eq(newsletters.id, newsletter.id));

        console.log(`[Scheduler] Successfully sent newsletter ${newsletter.id}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[Scheduler] Failed to send newsletter ${newsletter.id}:
          Error: ${errorMessage}
          Title: ${newsletter.title}
          Scheduled for: ${newsletter.scheduledAt?.toISOString()}
          User ID: ${newsletter.userId}`);

        // Update newsletter status to failed
        await db
          .update(newsletters)
          .set({
            status: "failed",
            updatedAt: new Date()
          })
          .where(eq(newsletters.id, newsletter.id));
      }
    }
  } catch (error) {
    console.error('[Scheduler] Error processing scheduled newsletters:', error);
  }
}
