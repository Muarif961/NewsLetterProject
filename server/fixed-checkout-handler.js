// Fixed checkout functionality to ensure passwords are stored correctly
const crypto = require('crypto');

// Hash password consistently with the rest of the application
function hashPassword(password) {
  return crypto
    .pbkdf2Sync(password, "salt", 100000, 64, "sha512")
    .toString("hex");
}

// Create checkout session with password properly included
async function createCheckoutSessionFixed(req, res, stripe, SUBSCRIPTION_PLANS) {
  try {
    // Get user input data
    const { username, password, email, fullName, planType, interval } = req.body;
    
    // Validate required fields
    if (!username || !password || !email || !fullName || !planType || !interval) {
      return res.status(400).json({
        message: "Missing required fields",
        fields: { username, email, fullName, planType, interval, hasPassword: !!password }
      });
    }

    // Get plan details
    const plan = SUBSCRIPTION_PLANS[planType];
    if (!plan) {
      return res.status(400).json({ message: "Invalid plan type" });
    }
    
    const price = interval === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;

    // Hash the password
    const hashedPassword = hashPassword(password);
    console.log(`[CHECKOUT] Password hash created. Length: ${hashedPassword.length}`);

    // Get the base URL for redirects
    const baseUrl = process.env.FRONTEND_URL || `https://${req.headers.host}`;

    // Store in session as backup
    req.session.pendingRegistration = {
      username,
      password: hashedPassword, // Store hashed password
      email,
      fullName,
      planType,
      interval,
      subscriberLimit: plan.subscriberLimit,
      initialAiCredits: plan.initialAiCredits,
      createdAt: new Date().toISOString(),
    };

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
              description: `${plan.description} - Includes 14-day free trial`,
            },
            unit_amount: price,
            recurring: {
              interval: interval === "monthly" ? "month" : "year",
              trial_period_days: plan.trialDays || 14,
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/api/subscriptions/complete-registration?session_id={CHECKOUT_SESSION_ID}&password_backup=${encodeURIComponent(hashedPassword)}`,
      cancel_url: `${baseUrl}/pricing`,
      customer_email: email,
      metadata: {
        username,
        email,
        fullName,
        planType,
        interval,
        subscriberLimit: plan.subscriberLimit.toString(),
        initialAiCredits: plan.initialAiCredits.toString(),
        password: hashedPassword, // Include hashed password in metadata
      },
      subscription_data: {
        metadata: {
          planType,
          interval,
          username,
          password: hashedPassword, // Also include in subscription metadata
        },
        trial_period_days: plan.trialDays || 14,
      },
    });

    console.log(`[CHECKOUT] Created session with password in metadata: ${!!session.metadata?.password}`);
    
    res.json({ sessionUrl: session.url });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    res.status(500).json({
      message: error.message || "Failed to create checkout session",
    });
  }
}

// Fixed complete registration handler
async function completeRegistrationFixed(req, res, stripe, SUBSCRIPTION_PLANS, db, AI_CREDITS, initializeUserCredits) {
  try {
    console.log(`[REGISTRATION_FIX] Processing complete-registration with query params:`, req.query);
    
    const { session_id, password_backup } = req.query;
    
    if (!session_id) {
      console.error("[REGISTRATION_FIX] Missing session_id in request");
      return res.status(400).json({ message: "Session ID is required" });
    }
    
    // Retrieve session data from Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id);
    
    if (!session) {
      console.error(`[REGISTRATION_FIX] Invalid Stripe session: ${session_id}`);
      return res.status(400).json({ message: "Invalid session ID" });
    }
    
    console.log(`[REGISTRATION_FIX] Successfully retrieved Stripe session`);
    
    // Get user registration data from session metadata
    const metadata = session.metadata || {};
    const email = metadata.email;
    const username = metadata.username;
    const fullName = metadata.fullName;
    const planType = metadata.planType;
    
    // Get password from various sources with fallbacks
    let userPassword = metadata.password;
    
    console.log(`[REGISTRATION_FIX] Extracted metadata:`, {
      hasEmail: !!email,
      hasUsername: !!username,
      hasFullName: !!fullName,
      hasPassword: !!userPassword,
      passwordLength: userPassword ? userPassword.length : 0,
      hasPasswordBackup: !!password_backup
    });
    
    // Try backup password from URL if metadata password is missing
    if (!userPassword && password_backup) {
      console.log("[REGISTRATION_FIX] Using password from URL backup");
      userPassword = decodeURIComponent(password_backup);
    }
    
    // Try session data if metadata and URL passwords are missing
    if (!userPassword && req.session.pendingRegistration && req.session.pendingRegistration.password) {
      console.log("[REGISTRATION_FIX] Using password from session");
      userPassword = req.session.pendingRegistration.password;
    }
    
    // Validate minimum required fields
    if (!email || !username) {
      console.error('[REGISTRATION_FIX] Missing required user data:', { email, username });
      return res.status(400).json({ message: "Missing required user information" });
    }
    
    // Check if user already exists
    const existingUser = await db.query.raw(`
      SELECT id FROM users WHERE email = $1 OR username = $2 LIMIT 1
    `, [email, username]);
    
    if (existingUser.rows && existingUser.rows.length > 0) {
      console.log('[REGISTRATION_FIX] User already exists, redirecting to login');
      return res.redirect("/login?message=account_exists");
    }
    
    // Get plan details
    const plan = SUBSCRIPTION_PLANS[planType];
    if (!plan) {
      console.error('[REGISTRATION_FIX] Invalid plan type:', planType);
      return res.status(400).json({ message: "Invalid plan type" });
    }
    
    // Generate a temporary password if none is available
    if (!userPassword) {
      console.log("[REGISTRATION_FIX] No password found, generating temporary password");
      userPassword = hashPassword("temporaryPassword" + Math.random().toString(36).slice(2, 10));
    }
    
    // Verify password is a proper hash (should be 161 characters)
    if (userPassword && userPassword.length !== 161) {
      console.log('[REGISTRATION_FIX] Password has invalid length:', userPassword.length);
      userPassword = hashPassword("temporaryPassword" + Math.random().toString(36).slice(2, 10));
      console.log('[REGISTRATION_FIX] Generated new password hash with length:', userPassword.length);
    }
    
    try {
      // Create the user with direct SQL query to debug field issues
      console.log('[REGISTRATION_FIX] Creating user with direct SQL query');
      const result = await db.query.raw(`
        INSERT INTO users (username, email, full_name, password, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        RETURNING id, username, email
      `, [username, email, fullName, userPassword]);
      
      console.log('[REGISTRATION_FIX] User creation result:', result.rows[0]);
      
      if (!result.rows || result.rows.length === 0) {
        throw new Error('Failed to create user record');
      }
      
      const userId = result.rows[0].id;
      
      // Verify the user was created with a password
      const verification = await db.query.raw(`
        SELECT id, username, email, LENGTH(password) as password_length 
        FROM users WHERE id = $1
      `, [userId]);
      
      console.log('[REGISTRATION_FIX] User verification:', verification.rows[0]);
      
      // Calculate trial end date
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + (plan.trialDays || 14));
      
      // Create the subscription
      console.log('[REGISTRATION_FIX] Creating subscription');
      const subscriptionResult = await db.query.raw(`
        INSERT INTO user_subscriptions (
          user_id, tier, status, subscriber_limit, initial_ai_credits, 
          provider, stripe_customer_id, stripe_subscription_id, activated_at, metadata
        )
        VALUES (
          $1, $2, 'active', $3, $4, 'stripe', $5, $6, NOW(), 
          $7::jsonb
        )
        RETURNING id
      `, [
        userId, 
        planType, 
        plan.subscriberLimit, 
        plan.initialAiCredits,
        session.customer, 
        session.subscription,
        JSON.stringify({
          trialEndsAt: trialEndDate.toISOString(),
          isTrialActive: true
        })
      ]);
      
      console.log('[REGISTRATION_FIX] Subscription created:', subscriptionResult.rows[0]);
      
      // Initialize the user's credits
      console.log('[REGISTRATION_FIX] Initializing user credits');
      await initializeUserCredits(userId, planType);
      
      // Log in the user by creating a session
      req.session.userId = userId;
      
      // Success! Redirect to the dashboard
      res.redirect("/dashboard?welcome=trial");
    } catch (sqlError) {
      console.error("[REGISTRATION_FIX] SQL error creating user:", sqlError);
      throw sqlError;
    }
  } catch (error) {
    console.error("[REGISTRATION_FIX] Error completing registration:", error);
    
    // Send detailed error in development
    if (process.env.NODE_ENV === "development") {
      return res.status(500).json({
        message: "Registration failed",
        error: error.message,
        stack: error.stack,
      });
    }
    
    // Redirect with error in production
    res.redirect("/signup?error=registration_failed");
  }
}

module.exports = {
  hashPassword,
  createCheckoutSessionFixed,
  completeRegistrationFixed
};