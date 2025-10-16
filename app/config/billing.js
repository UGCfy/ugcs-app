// app/config/billing.js
// Billing plans for UGCfy

export const BILLING_PLANS = {
  STARTER: {
    id: "starter",
    name: "Starter",
    price: 49,
    currency: "USD",
    interval: "EVERY_30_DAYS",
    trialDays: 7,
    features: [
      "Up to 500 media items",
      "Basic gallery widget",
      "Manual Instagram import",
      "Basic analytics",
      "Email support",
    ],
    limits: {
      mediaItems: 500,
      widgets: 3,
      imports: 100, // per month
    },
  },
  PRO: {
    id: "pro",
    name: "Pro",
    price: 199,
    currency: "USD",
    interval: "EVERY_30_DAYS",
    trialDays: 14,
    features: [
      "Up to 5,000 media items",
      "All widget types (gallery, carousel, stories)",
      "Auto Instagram import",
      "Advanced analytics & insights",
      "Product tagging",
      "Priority support",
      "Custom branding",
    ],
    limits: {
      mediaItems: 5000,
      widgets: 10,
      imports: 1000, // per month
    },
    popular: true, // Badge shown on UI
  },
  ENTERPRISE: {
    id: "enterprise",
    name: "Enterprise",
    price: 299,
    currency: "USD",
    interval: "EVERY_30_DAYS",
    trialDays: 14,
    features: [
      "Unlimited media items",
      "All widget types + custom widgets",
      "Auto Instagram + TikTok import",
      "Full analytics suite",
      "API access",
      "Dedicated account manager",
      "White-label options",
      "99.9% uptime SLA",
    ],
    limits: {
      mediaItems: -1, // unlimited
      widgets: -1, // unlimited
      imports: -1, // unlimited
    },
  },
};

// Helper to get plan by ID
export function getPlan(planId) {
  return Object.values(BILLING_PLANS).find((p) => p.id === planId);
}

// Helper to check if feature is available in plan
export function hasFeature(planId, featureName) {
  const plan = getPlan(planId);
  return plan?.features.includes(featureName) || false;
}

// Helper to check usage limits
export function isWithinLimit(planId, limitType, currentUsage) {
  const plan = getPlan(planId);
  if (!plan) return false;
  
  const limit = plan.limits[limitType];
  if (limit === -1) return true; // unlimited
  
  return currentUsage < limit;
}

