"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type CustomerSessionUser = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  region: string;
  district: string;
};

type Ctx = {
  customer: CustomerSessionUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

const CustomerAuthContext = createContext<Ctx | null>(null);

export function CustomerProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<CustomerSessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/customer/me", { credentials: "include" });
      if (!res.ok) {
        setCustomer(null);
        return;
      }
      const data = (await res.json()) as { customer: CustomerSessionUser | null };
      setCustomer(data.customer ?? null);
    } catch {
      setCustomer(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(() => ({ customer, loading, refresh }), [customer, loading, refresh]);

  return <CustomerAuthContext.Provider value={value}>{children}</CustomerAuthContext.Provider>;
}

export function useCustomerAuth(): Ctx {
  const ctx = useContext(CustomerAuthContext);
  if (!ctx) {
    throw new Error("useCustomerAuth must be used within CustomerProvider");
  }
  return ctx;
}
