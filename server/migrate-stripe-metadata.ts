/**
 * This script migrates Stripe customer and subscription IDs from columns to metadata
 * It's designed to run once to update existing database entries
 */
import { db } from "./db";
import { user_subscriptions, users } from "./db/schema";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Initialize Stripe with API key from environment
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";
if (!STRIPE_SECRET_KEY) {
  console.error("Error: STRIPE_SECRET_KEY environment variable not set");
  process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

async function migrateStripeData() {
  console.log("Starting Stripe metadata migration...");
  
  try {
    // Get all Stripe subscriptions
    const stripeSubscriptions = await db.select()
      .from(user_subscriptions)
      .where(eq(user_subscriptions.provider, "stripe"));
    
    console.log(`Found ${stripeSubscriptions.length} Stripe subscriptions to update`);
    
    if (stripeSubscriptions.length === 0) {
      console.log("No Stripe subscriptions found. Nothing to migrate.");
      return;
    }
    
    // Lookup table for user emails
    const userEmailCache = new Map();
    
    // Process each subscription
    for (const subscription of stripeSubscriptions) {
      const { id, userId, metadata } = subscription;
      
      console.log(`\nProcessing subscription ${id} for user ${userId}...`);
      
      // Skip if already has stripeCustomerId in metadata
      if (metadata && metadata.stripeCustomerId) {
        console.log(`- Already has Stripe customer ID in metadata, skipping`);
        continue;
      }
      
      // Get user email (with caching to reduce DB queries)
      let userEmail;
      if (userEmailCache.has(userId)) {
        userEmail = userEmailCache.get(userId);
      } else {
        const userResult = await db.select({ email: users.email })
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);
        
        if (userResult.length === 0 || !userResult[0].email) {
          console.log(`- Could not find user email for userId ${userId}, skipping`);
          continue;
        }
        
        userEmail = userResult[0].email;
        userEmailCache.set(userId, userEmail);
      }
      
      console.log(`- Found user email: ${userEmail}`);
      
      try {
        // Search for customer in Stripe by email
        console.log(`- Searching Stripe for customer with email: ${userEmail}`);
        
        const customers = await stripe.customers.list({
          email: userEmail,
          limit: 1
        });
        
        if (customers.data.length === 0) {
          console.log(`- No Stripe customer found for email ${userEmail}`);
          console.log(`- Creating a new Stripe customer for ${userEmail}`);
          
          // Create a new customer in Stripe
          const newCustomer = await stripe.customers.create({
            email: userEmail,
            metadata: { userId: userId.toString() }
          });
          
          const customerId = newCustomer.id;
          console.log(`- Created new Stripe customer with ID: ${customerId}`);
          
          // Update metadata in the database
          const updatedMetadata = {
            ...metadata,
            stripeCustomerId: customerId
          };
          
          await db.update(user_subscriptions)
            .set({ metadata: updatedMetadata })
            .where(eq(user_subscriptions.id, id));
          
          console.log(`- Updated subscription ${id} metadata with new Stripe customer ID`);
        } else {
          const customerId = customers.data[0].id;
          console.log(`- Found existing Stripe customer ID: ${customerId}`);
          
          // Update metadata in the database
          const updatedMetadata = {
            ...metadata,
            stripeCustomerId: customerId
          };
          
          await db.update(user_subscriptions)
            .set({ metadata: updatedMetadata })
            .where(eq(user_subscriptions.id, id));
          
          console.log(`- Updated subscription ${id} metadata with existing Stripe customer ID`);
        }
      } catch (error) {
        console.error(`- Error updating subscription ${id}:`, error.message);
      }
    }
    
    console.log("\nMigration completed!");
    console.log("Run the verification script to confirm all subscriptions have been updated:\n");
    console.log("npx tsx verify-portal-fix.ts");
  } catch (error) {
    console.error("Error migrating Stripe data:", error);
  }
}

// Run the migration
migrateStripeData();
