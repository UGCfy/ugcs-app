// app/lib/usage-limits.js
// Usage limits enforcement for billing plans

import { BILLING_PLANS, getPlan } from "../config/billing";
import prisma from "../db.server";

/**
 * Get current usage stats for a shop
 */
export async function getUsageStats(shop) {
  const [mediaCount, widgetCount, monthlyImports] = await Promise.all([
    // Total media items
    prisma.media.count(),
    
    // Approximate widget count (can be tracked in a separate table later)
    Promise.resolve(3), // Placeholder - track actual widget instances later
    
    // Monthly imports (media created in last 30 days from Instagram/TikTok)
    prisma.media.count({
      where: {
        sourceType: { in: ["INSTAGRAM", "TIKTOK"] },
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
    }),
  ]);

  return {
    mediaItems: mediaCount,
    widgets: widgetCount,
    imports: monthlyImports,
  };
}

/**
 * Get shop's current plan
 * TODO: Store plan in database after billing is set up
 * For now, returns PRO plan as default for testing
 */
export async function getShopPlan(shop) {
  // In production, fetch from database or Shopify billing API
  // For now, default to PRO for development
  return BILLING_PLANS.PRO;
}

/**
 * Check if shop can perform an action based on their plan limits
 */
export async function canPerformAction(shop, action, currentUsage) {
  const plan = await getShopPlan(shop);
  const usage = currentUsage || (await getUsageStats(shop));

  switch (action) {
    case "create_media":
      const limit = plan.limits.mediaItems;
      if (limit === -1) return { allowed: true }; // Unlimited
      return {
        allowed: usage.mediaItems < limit,
        current: usage.mediaItems,
        limit,
        plan: plan.name,
      };

    case "create_widget":
      const widgetLimit = plan.limits.widgets;
      if (widgetLimit === -1) return { allowed: true };
      return {
        allowed: usage.widgets < widgetLimit,
        current: usage.widgets,
        limit: widgetLimit,
        plan: plan.name,
      };

    case "import_media":
      const importLimit = plan.limits.imports;
      if (importLimit === -1) return { allowed: true };
      return {
        allowed: usage.imports < importLimit,
        current: usage.imports,
        limit: importLimit,
        plan: plan.name,
      };

    default:
      return { allowed: true };
  }
}

/**
 * Get usage percentage for progress bars
 */
export function getUsagePercentage(current, limit) {
  if (limit === -1) return 0; // Unlimited
  return Math.min(100, Math.round((current / limit) * 100));
}

/**
 * Get usage status color
 */
export function getUsageColor(percentage) {
  if (percentage >= 90) return "#dc3545"; // Red - critical
  if (percentage >= 75) return "#f49342"; // Orange - warning
  return "#008060"; // Green - good
}

