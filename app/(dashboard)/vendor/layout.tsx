import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { findApprovedVendorById } from "@/lib/approved-vendors";
import { uiPlanFromEntitlements } from "@/lib/entitlements";
import { getEntitlementsForStore } from "@/lib/platform-db";
import { LOCALE_COOKIE_NAME, parseLocaleCookie } from "@/lib/i18n/types";
import { loadDashboard } from "@/lib/vendor-dashboard-repository";
import { toVendorPublic } from "@/lib/vendor-public";
import { getVendorSessionCookieName, verifyVendorSession } from "@/lib/vendor-session";
import { VendorDashboardProvider } from "@/components/vendor/vendor-dashboard-provider";
import { VendorShell } from "@/components/vendor/vendor-shell";
import { LocaleProvider } from "@/lib/locale-context";

export default async function VendorLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const initialLocale = parseLocaleCookie(cookieStore.get(LOCALE_COOKIE_NAME)?.value);
  const session = verifyVendorSession(cookieStore.get(getVendorSessionCookieName())?.value);
  if (!session) {
    redirect("/auth?tab=store&mode=login&next=%2Fvendor&reason=session");
  }
  const vendor = await findApprovedVendorById(session.vid);
  if (!vendor) {
    redirect("/auth?tab=store&mode=login&next=%2Fvendor&reason=vendor");
  }
  const [loaded, entitlements] = await Promise.all([
    loadDashboard(vendor),
    getEntitlementsForStore(vendor.storeSlug),
  ]);
  const initialState = { ...loaded, subscriptionPlan: uiPlanFromEntitlements(entitlements) };
  const publicVendor = toVendorPublic(vendor);

  return (
    <LocaleProvider initialLocale={initialLocale}>
      <VendorDashboardProvider
        vendor={publicVendor}
        initialState={initialState}
        initialEntitlements={entitlements}
      >
        <VendorShell>{children}</VendorShell>
      </VendorDashboardProvider>
    </LocaleProvider>
  );
}
