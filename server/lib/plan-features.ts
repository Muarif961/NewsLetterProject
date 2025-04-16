
// Define features available for each plan tier
export const PLAN_FEATURES = {
  starter: {
    maxContacts: 500,
    monthlyEmails: 2000,
    templates: true,
    customBranding: false,
    aiCuration: 'basic',
    maxTemplates: 3
  },
  growth: {
    maxContacts: 5000,
    monthlyEmails: 10000,
    templates: true,
    customBranding: false,
    aiCuration: 'full',
    maxTemplates: 10
  },
  professional: {
    maxContacts: 15000,
    monthlyEmails: -1, // unlimited
    templates: true,
    customBranding: true,
    aiCuration: 'full',
    maxTemplates: -1 // unlimited
  }
};

export function checkPlanPermission(feature: keyof typeof PLAN_FEATURES.starter, userTier: string) {
  return PLAN_FEATURES[userTier]?.[feature] ?? false;
}
