import {
  pgTable,
  text,
  integer,
  timestamp,
  jsonb,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  email: text("email").unique().notNull(),
  imageUrl: text("image_url"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  resetPasswordToken: text("reset_password_token"),
  resetPasswordExpires: timestamp("reset_password_expires"),
});

export const newsletters = pgTable("newsletters", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  title: text("title").notNull(),
  content: jsonb("content").notNull(),
  templateId: integer("template_id")
    .references(() => templates.id),
  status: text("status").notNull().default("draft"),
  scheduledAt: timestamp("scheduled_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const templates = pgTable("templates", {
  id: text("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  name: text("name").notNull(),
  description: text("description"),
  html: text("html").notNull(),
  preview: text("preview"),
  blocks: jsonb("blocks"),
  structure: jsonb("structure"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const subscribers = pgTable("subscribers", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  email: text("email").notNull(),
  name: text("name"),
  active: boolean("active").notNull().default(true),
  unsubscribeToken: text("unsubscribe_token"),
  unsubscribeDate: timestamp("unsubscribe_date", { withTimezone: true }),
  unsubscribeReason: text("unsubscribe_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
export const notifications = pgTable("notifications", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  type: text("type").notNull(), // 'newsletter', 'subscriber', 'system'
  message: text("message").notNull(),
  detail: text("detail"),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sentNewsletters = pgTable("sent_newsletters", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  newsletterId: integer("newsletter_id")
    .references(() => newsletters.id)
    .notNull(),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
  recipientCount: integer("recipient_count").notNull(),
});

export const api_keys = pgTable("api_keys", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  openaiKey: text("openai_key"),
  newsApiKey: text("news_api_key"),
  useCustomOpenai: boolean("use_custom_openai").notNull().default(false),
  useCustomNewsApi: boolean("use_custom_news_api").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const verified_emails = pgTable("verified_emails", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  email: text("email").notNull(),
  verificationToken: text("verification_token").notNull(),
  verificationStatus: text("verification_status").notNull().default("pending"),
  isDomain: boolean("is_domain").notNull().default(false),
  dnsRecords: jsonb("dns_records"),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const user_feedback = pgTable("user_feedback", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").references(() => users.id),
  feedbackType: text("feedback_type"),
  message: text("message").notNull(),
  rating: integer("rating"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  status: text("status").default("pending"),
  category: text("category"),
});

export const appsumo_codes = pgTable("appsumo_codes", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  code: text("code").notNull().unique(),
  isRedeemed: boolean("is_redeemed").notNull().default(false),
  redeemedAt: timestamp("redeemed_at", { withTimezone: true }),
  redeemedBy: integer("redeemed_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const user_subscriptions = pgTable("user_subscriptions", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  tier: text("tier").notNull(),
  totalCodesRedeemed: integer("total_codes_redeemed").notNull().default(0),
  activatedAt: timestamp("activated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  status: text("status").notNull().default("active"),
  provider: text("provider").notNull().default("appsumo"),
  metadata: jsonb("metadata"),
  initialAiCredits: integer("initial_ai_credits").notNull(),
  subscriberLimit: integer("subscriber_limit").notNull(),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  stripePaymentMethodId: text("stripe_payment_method_id"),
});

export const user_redeemed_codes = pgTable("user_redeemed_codes", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  codeId: integer("code_id")
    .references(() => appsumo_codes.id)
    .notNull(),
  redeemedAt: timestamp("redeemed_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const user_credits = pgTable("user_credits", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull()
    .unique(),
  totalCreditsAllocated: integer("total_credits_allocated").notNull(),
  creditsRemaining: integer("credits_remaining").notNull(),
  lastUpdated: timestamp("last_updated", { withTimezone: true }).defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const credit_transactions = pgTable("credit_transactions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  amount: integer("amount").notNull(),
  creditsBefore: integer("credits_before").notNull(),
  creditsAfter: integer("credits_after").notNull(),
  type: text("type").notNull(), // 'initialize', 'use', 'add'
  action: text("action").notNull(), // 'newsletter_edit', 'subscription_renewal', etc.
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const credit_purchases = pgTable("credit_purchases", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  packageId: text("package_id").notNull(),
  creditsAmount: integer("credits_amount").notNull(),
  pricePaid: integer("price_paid").notNull(),
  currency: text("currency").notNull(),
  stripeSessionId: text("stripe_session_id").notNull().unique(),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const form_submissions = pgTable("form_submissions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  groupId: integer("group_id")
    .references(() => subscriber_groups.id),
  email: text("email").notNull(),
  name: text("name"),
  formId: text("form_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const form_styles = pgTable("form_styles", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  styles: jsonb("styles").notNull().default({}),
  content: jsonb("content").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const subscriber_groups = pgTable("subscriber_groups", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const subscriber_group_members = pgTable("subscriber_group_members", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  groupId: integer("group_id")
    .references(() => subscriber_groups.id)
    .notNull(),
  subscriberId: integer("subscriber_id")
    .references(() => subscribers.id)
    .notNull(),
  addedAt: timestamp("added_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(50),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain at least one uppercase letter, one lowercase letter, and one number",
    ),
  fullName: z
    .string()
    .min(2, "Full name must be at least 2 characters")
    .max(100),
  email: z.string().email("Invalid email format"),
  imageUrl: z.string().optional(),
  appSumoCodes: z
    .array(z.string())
    .min(1, "At least one AppSumo code is required")
    .max(3, "Maximum 3 codes allowed"),
});
export const selectUserSchema = createSelectSchema(users);
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = z.infer<typeof selectUserSchema>;

export const insertNewsletterSchema = createInsertSchema(newsletters);
export const selectNewsletterSchema = createSelectSchema(newsletters);
export type InsertNewsletter = z.infer<typeof insertNewsletterSchema>;
export type Newsletter = z.infer<typeof selectNewsletterSchema>;

export const insertTemplateSchema = createInsertSchema(templates);
export const selectTemplateSchema = createSelectSchema(templates);
export type InsertTemplate = z.infer<typeof insertTemplateSchema>;
export type Template = z.infer<typeof selectTemplateSchema>;

export const insertSubscriberSchema = createInsertSchema(subscribers);
export const selectSubscriberSchema = createSelectSchema(subscribers);
export type InsertSubscriber = z.infer<typeof insertSubscriberSchema>;
export type Subscriber = z.infer<typeof selectSubscriberSchema>;

export const insertAppSumoCodeSchema = createInsertSchema(appsumo_codes);
export const selectAppSumoCodeSchema = createSelectSchema(appsumo_codes);
export type InsertAppSumoCode = z.infer<typeof insertAppSumoCodeSchema>;
export type AppSumoCode = z.infer<typeof selectAppSumoCodeSchema>;

export const insertUserSubscriptionSchema =
  createInsertSchema(user_subscriptions);
export const selectUserSubscriptionSchema =
  createSelectSchema(user_subscriptions);
export type InsertUserSubscription = z.infer<
  typeof insertUserSubscriptionSchema
>;
export type UserSubscription = z.infer<typeof selectUserSubscriptionSchema>;

export const insertUserCreditsSchema = createInsertSchema(user_credits);
export const selectUserCreditsSchema = createSelectSchema(user_credits);
export type UserCredits = z.infer<typeof selectUserCreditsSchema>;

export const insertCreditPurchaseSchema = createInsertSchema(credit_purchases);
export const selectCreditPurchaseSchema = createSelectSchema(credit_purchases);
export type InsertCreditPurchase = z.infer<typeof insertCreditPurchaseSchema>;
export type CreditPurchase = z.infer<typeof selectCreditPurchaseSchema>;

export const insertVerifiedEmailSchema = createInsertSchema(verified_emails);
export const selectVerifiedEmailSchema = createSelectSchema(verified_emails);
export type InsertVerifiedEmail = z.infer<typeof insertVerifiedEmailSchema>;
export type VerifiedEmail = z.infer<typeof selectVerifiedEmailSchema>;

export const insertSubscriberGroupSchema =
  createInsertSchema(subscriber_groups);
export const selectSubscriberGroupSchema =
  createSelectSchema(subscriber_groups);
export type InsertSubscriberGroup = z.infer<typeof insertSubscriberGroupSchema>;
export type SubscriberGroup = z.infer<typeof selectSubscriberGroupSchema>;

export const insertSubscriberGroupMemberSchema = createInsertSchema(
  subscriber_group_members,
);
export const selectSubscriberGroupMemberSchema = createSelectSchema(
  subscriber_group_members,
);
export type InsertSubscriberGroupMember = z.infer<
  typeof insertSubscriberGroupMemberSchema
>;
export type SubscriberGroupMember = z.infer<
  typeof selectSubscriberGroupMemberSchema
>;
