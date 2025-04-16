/**
 * 14-Day Free Trial Implementation
 * 
 * This file contains implementation references for adding
 * 14-day free trials to all subscription plans.
 */

// 1. Update Stripe Plans
const stripePlansWithTrial = {
  "starter": {
    id: "starter",
    name: "Starter Plan",
    stripeMonthlyLink: "https://buy.stripe.com/test_14k3eUbZQ1Z44ZW5kk",
    stripeYearlyLink: "https://buy.stripe.com/test_6oEcPE6JA9tu5416op",
    description: "Perfect for beginners and small newsletters",
    trial: true // Has 14-day free trial
  },
  "growth": {
    id: "growth",
    name: "Growth Plan",
    stripeMonthlyLink: "https://buy.stripe.com/test_9AQ5n26JAeli8de4gk",
    stripeYearlyLink: "https://buy.stripe.com/test_00g7ve97Y1Z45034gr",
    description: "Ideal for growing newsletters",
    recommended: true,
    trial: true // Has 14-day free trial
  },
  "professional": {
    id: "professional",
    name: "Professional Plan",
    stripeMonthlyLink: "https://buy.stripe.com/test_cN2cPEfg64Zg9hi4gs",
    stripeYearlyLink: "https://buy.stripe.com/test_28o7vefdYfpq6589AU",
    description: "For serious newsletter creators",
    trial: true // Has 14-day free trial
  },
  "professional-plus": {
    id: "professional-plus",
    name: "Professional+ Plan",
    stripeMonthlyLink: "https://buy.stripe.com/test_5kI7ve83Ufpq9hi7sx",
    stripeYearlyLink: "https://buy.stripe.com/test_eVacPE97Y6do8de8wB",
    description: "Our most comprehensive option",
    trial: true // Has 14-day free trial
  }
};

// 2. Subscription Plans on Server Side
const serverSubscriptionPlans = {
  'starter': {
    id: 'starter',
    name: 'Starter Plan',
    description: 'Perfect for beginners and small newsletters',
    monthlyPrice: 2900,
    yearlyPrice: 28800,
    features: [
      '5,000 Subscribers/Contacts',
      'Unlimited email sends',
      'Customizable newsletter templates',
      '50 Free credits for AI-powered Features',
      '24/7 support'
    ],
    subscriberLimit: 5000,
    initialAiCredits: 50,
    trialDays: 14 // Add 14-day free trial
  },
  'growth': {
    id: 'growth',
    name: 'Growth Plan',
    description: 'Ideal for growing newsletters',
    monthlyPrice: 4900,
    yearlyPrice: 46800,
    features: [
      '10,000 Subscribers/Contacts',
      'Unlimited email sends',
      'Customizable newsletter templates',
      '120 Free credits for AI-powered Features',
      '24/7 support'
    ],
    subscriberLimit: 10000,
    initialAiCredits: 120,
    recommended: true,
    trialDays: 14 // Add 14-day free trial
  },
  'professional': {
    id: 'professional',
    name: 'Professional Plan',
    description: 'For serious newsletter creators',
    monthlyPrice: 9900,
    yearlyPrice: 94800,
    features: [
      '20,000 Subscribers/Contacts',
      'Unlimited email sends',
      'Customizable newsletter templates',
      '150 Free credits for AI-powered Features',
      '24/7 support'
    ],
    subscriberLimit: 20000,
    initialAiCredits: 150,
    trialDays: 14 // Add 14-day free trial
  },
  'professional-plus': {
    id: 'professional-plus',
    name: 'Professional+ Plan',
    description: 'Our most comprehensive option',
    monthlyPrice: 12900,
    yearlyPrice: 130800,
    features: [
      '25,000 Subscribers/Contacts',
      'Unlimited email sends',
      'Customizable newsletter templates',
      '200 Free credits for AI-powered Features',
      '24/7 support'
    ],
    subscriberLimit: 25000,
    initialAiCredits: 200,
    trialDays: 14 // Add 14-day free trial
  }
};

// 3. Stripe Checkout Session for Trial Implementation
const createCheckoutSessionWithTrial = async (planType, interval, userInfo) => {
  // Get plan details
  const plan = serverSubscriptionPlans[planType];
  const price = interval === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
  
  // Create Stripe checkout session with trial period
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'subscription',
    billing_address_collection: 'auto',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: plan.name,
            description: `${plan.description} - Includes 14-day free trial`,
          },
          unit_amount: price,
          recurring: {
            interval: interval === 'monthly' ? 'month' : 'year',
            trial_period_days: plan.trialDays || 14
          }
        },
        quantity: 1,
      },
    ],
    success_url: `${baseUrl}/api/complete-registration?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/pricing`,
    customer_email: userInfo.email,
    metadata: {
      username: userInfo.username,
      email: userInfo.email,
      fullName: userInfo.fullName,
      planType,
      interval,
      subscriberLimit: plan.subscriberLimit.toString(),
      initialAiCredits: plan.initialAiCredits.toString(),
    },
    subscription_data: {
      metadata: {
        planType,
        interval,
        username: userInfo.username
      },
      trial_period_days: plan.trialDays || 14
    },
  });
  
  return session;
};

// 4. React Component - Trial Badge for Pricing Cards
/*
React component to add to pricing cards:

function TrialBadge() {
  return (
    <div className="mb-4 flex items-center justify-center px-3 py-2 rounded-md 
                  bg-gradient-to-r from-green-50 to-green-100 
                  dark:from-green-900/20 dark:to-green-800/20 
                  border border-green-200 dark:border-green-800">
      <span className="text-sm font-medium text-green-700 dark:text-green-400">
        Start with a 14-day free trial
      </span>
    </div>
  );
}
*/

// 5. Trial User Welcome Component
/*
React component for welcoming new trial users on dashboard:

function TrialWelcomeMessage({ onCreateNewsletter }) {
  return (
    <div className="p-6 mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 
                    dark:from-blue-900/20 dark:to-indigo-900/20 
                    rounded-lg border border-blue-200 dark:border-blue-800">
      <h2 className="text-xl font-semibold mb-2">Welcome to your free trial!</h2>
      <p className="text-muted-foreground mb-4">
        You're all set with your 14-day free trial. Explore all premium features 
        and start creating amazing newsletters.
      </p>
      <button 
        className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
        onClick={onCreateNewsletter}
      >
        Create Your First Newsletter
      </button>
    </div>
  );
}
*/

// 6. Trial Status Component
/*
React component to show trial status:

function TrialStatusIndicator({ trialEndDate }) {
  const daysRemaining = Math.max(0, Math.ceil((new Date(trialEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  
  return (
    <div className="p-4 rounded-lg border border-amber-200 dark:border-amber-800
                    bg-amber-50 dark:bg-amber-900/20">
      <div className="flex items-center space-x-3">
        <div>
          <p className="font-medium">
            Trial Period: {daysRemaining} days remaining
          </p>
          <p className="text-sm text-muted-foreground">
            Your trial ends on {new Date(trialEndDate).toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
}
*/

// 7. Additional helper functions for trial handling

// Check if user is in trial period
const isInTrialPeriod = (subscription) => {
  if (!subscription?.metadata?.trialEndsAt) return false;
  const trialEndDate = new Date(subscription.metadata.trialEndsAt);
  return trialEndDate > new Date();
};

// Get days remaining in trial
const getTrialDaysRemaining = (subscription) => {
  if (!subscription?.metadata?.trialEndsAt) return 0;
  const trialEndDate = new Date(subscription.metadata.trialEndsAt);
  const now = new Date();
  if (trialEndDate <= now) return 0;
  
  return Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
};

// Format date for display
const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// 8. HTML/JSX Snippets for Various Components

// Trial badge for pricing card
const trialBadgeHTML = `
<div class="flex items-center justify-center px-3 py-2 rounded-md bg-gradient-to-r from-green-50 to-green-100 border border-green-200">
  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-green-600" viewBox="0 0 20 20" fill="currentColor">
    <path fill-rule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723c.655.123 1.33.272 1.83.772.5.5.649 1.175.772 1.83.123.655.327 1.306.723 1.745.396.439.396 1.15 0 1.59-.396.438-.6 1.09-.723 1.744-.123.655-.272 1.33-.772 1.83-.5.5-1.175.649-1.83.772-.655.123-1.306.327-1.745.723a1.578 1.578 0 01-1.59 0c-.438-.396-1.09-.6-1.744-.723-.655-.123-1.33-.272-1.83-.772-.5-.5-.649-1.175-.772-1.83a6.666 6.666 0 00-.723-1.745 1.578 1.578 0 010-1.59c.396-.438.6-1.09.723-1.744.123-.655.272-1.33.772-1.83.5-.5 1.175-.649 1.83-.772z" clip-rule="evenodd" />
    <path fill-rule="evenodd" d="M10 9a1 1 0 00-1 1v2a1 1 0 002 0v-2a1 1 0 00-1-1z" clip-rule="evenodd" />
    <path fill-rule="evenodd" d="M10 6a1 1 0 100 2 1 1 0 000-2z" clip-rule="evenodd" />
  </svg>
  <span class="text-sm font-medium text-green-700">Start with a 14-day free trial</span>
</div>
`;

// Enhanced signup button for trial emphasis
const enhancedSignupButtonHTML = `
<button 
  type="submit" 
  class="w-full py-4 bg-primary text-white rounded-md flex items-center justify-center space-x-2 hover:bg-primary-dark transition-colors"
>
  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fill-rule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clip-rule="evenodd" />
  </svg>
  <span>Start Your 14-Day Free Trial</span>
</button>
`;

// Trial indicator for dashboard
const trialIndicatorHTML = `
<div class="p-4 rounded-lg border border-amber-200 bg-amber-50 mb-6">
  <div class="flex items-center space-x-3">
    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    <div>
      <p class="font-medium">Trial Period: {{daysRemaining}} days remaining</p>
      <p class="text-sm text-gray-600">Your trial ends on {{trialEndDate}}</p>
    </div>
  </div>
</div>
`;

// Welcome banner for new trial users
const welcomeBannerHTML = `
<div class="p-6 rounded-lg border border-blue-200 bg-blue-50 mb-6">
  <h2 class="text-xl font-semibold mb-2">Welcome to your newsletter dashboard!</h2>
  <p class="text-gray-600 mb-4">
    You're all set with your free 14-day trial. Explore the features and start creating your first newsletter.
  </p>
  <button class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
    Create Your First Newsletter
  </button>
</div>
`;