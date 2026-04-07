import type { StoreEntitlements } from "@/lib/platform-db";

export type UiSubscriptionPlan = "free" | "pro" | "premium";

/** Maps DB plan slug → dashboard UI plan key. */
export function uiPlanFromEntitlements(e: StoreEntitlements): UiSubscriptionPlan {
  if (e.planSlug === "premium") return "premium";
  if (e.planSlug === "pro") return "pro";
  return "free";
}

export function aiEnabledFromEntitlements(e: StoreEntitlements): boolean {
  return e.aiEnabled;
}

/** Prefer `aiEnabledFromEntitlements` when entitlements are available. */
export function aiEnabledForPlan(plan: UiSubscriptionPlan): boolean {
  return plan === "pro" || plan === "premium";
}
