/**
 * Subscription plan limits.
 * Change the numbers here — enforced everywhere automatically.
 */

export const PLAN_LIMITS = {
  free: {
    companies:       1,
    invoicesPerMonth: 10,
    priceEur:        0,
  },
  pro: {
    companies:        Infinity,
    invoicesPerMonth: Infinity,
    priceEur:         10,
  },
} as const;

export type Plan = keyof typeof PLAN_LIMITS;

export function getPlanLimits(plan: string) {
  return PLAN_LIMITS[plan as Plan] ?? PLAN_LIMITS.free;
}