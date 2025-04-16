// Stripe payment link configuration
export const STRIPE_PLANS = {
  "starter": {
    id: "starter",
    name: "Starter Plan",
    stripeMonthlyLink: "https://buy.stripe.com/test_14k3eUbZQ1Z44ZW5kk", // Replace with your actual Stripe payment links
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