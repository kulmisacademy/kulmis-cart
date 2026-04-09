"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { VendorPublic } from "@/lib/approved-vendors";
import type { StoreEntitlements } from "@/lib/platform-db";
import type { VendorDashboardState } from "@/lib/vendor-types";
import { PlanLimitModal } from "./plan-limit-modal";
import type { PlanLimitKind } from "./plan-limit-modal";

export type { PlanLimitKind } from "./plan-limit-modal";

type VendorDashboardContextValue = {
  state: VendorDashboardState;
  vendor: VendorPublic;
  entitlements: StoreEntitlements;
  /** Returns false when save was blocked (e.g. plan limit); true when persisted. */
  persist: (next: VendorDashboardState) => Promise<boolean>;
  saving: boolean;
  refreshEntitlements: () => Promise<void>;
  /** Reload dashboard + entitlements from server (e.g. after plan change). */
  refreshDashboard: () => Promise<void>;
  openPlanLimitModal: (kind: PlanLimitKind) => void;
};

const VendorDashboardContext = createContext<VendorDashboardContextValue | null>(null);

export function VendorDashboardProvider({
  children,
  vendor,
  initialState,
  initialEntitlements,
}: {
  children: ReactNode;
  vendor: VendorPublic;
  initialState: VendorDashboardState;
  initialEntitlements: StoreEntitlements;
}) {
  const [state, setState] = useState(initialState);
  const [entitlements, setEntitlements] = useState(initialEntitlements);
  const [saving, setSaving] = useState(false);
  const [planLimitKind, setPlanLimitKind] = useState<PlanLimitKind | null>(null);

  const openPlanLimitModal = useCallback((kind: PlanLimitKind) => {
    setPlanLimitKind(kind);
  }, []);

  const persist = useCallback(async (next: VendorDashboardState) => {
    setSaving(true);
    try {
      const res = await fetch("/api/vendor/dashboard", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        subscriptionPlan?: VendorDashboardState["subscriptionPlan"];
        error?: string;
        code?: string;
      };
      if (!res.ok) {
        if (res.status === 403 && body.code === "PRODUCT_LIMIT") {
          setPlanLimitKind("product");
          return false;
        }
        if (res.status === 403 && body.code === "VIDEO_LIMIT") {
          setPlanLimitKind("video");
          return false;
        }
        throw new Error(body.error ?? "Save failed");
      }
      setState({
        ...next,
        subscriptionPlan: body.subscriptionPlan ?? next.subscriptionPlan,
      });
      return true;
    } finally {
      setSaving(false);
    }
  }, []);

  const refreshEntitlements = useCallback(async () => {
    const res = await fetch("/api/vendor/entitlements");
    if (!res.ok) return;
    const data = (await res.json()) as { entitlements: StoreEntitlements };
    if (data.entitlements) setEntitlements(data.entitlements);
  }, []);

  const refreshDashboard = useCallback(async () => {
    const [dashRes, entRes] = await Promise.all([
      fetch("/api/vendor/dashboard"),
      fetch("/api/vendor/entitlements"),
    ]);
    if (dashRes.ok) {
      const d = (await dashRes.json()) as VendorDashboardState;
      setState(d);
    }
    if (entRes.ok) {
      const e = (await entRes.json()) as { entitlements: StoreEntitlements };
      if (e.entitlements) setEntitlements(e.entitlements);
    }
  }, []);

  const value = useMemo(
    () => ({
      state,
      vendor,
      entitlements,
      persist,
      saving,
      refreshEntitlements,
      refreshDashboard,
      openPlanLimitModal,
    }),
    [state, vendor, entitlements, persist, saving, refreshEntitlements, refreshDashboard, openPlanLimitModal],
  );

  return (
    <VendorDashboardContext.Provider value={value}>
      {children}
      <PlanLimitModal
        open={planLimitKind !== null}
        kind={planLimitKind ?? "product"}
        onClose={() => setPlanLimitKind(null)}
        storeName={state.settings.storeName}
        phone={state.settings.phone}
        email={vendor.email}
      />
    </VendorDashboardContext.Provider>
  );
}

export function useVendorDashboard() {
  const ctx = useContext(VendorDashboardContext);
  if (!ctx) {
    throw new Error("useVendorDashboard must be used within VendorDashboardProvider");
  }
  return ctx;
}
