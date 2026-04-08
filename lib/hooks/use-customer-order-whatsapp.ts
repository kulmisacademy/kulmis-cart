"use client";

import { useRouter } from "next/navigation";
import { useCustomerAuth } from "@/lib/customer-auth-context";
import { toast } from "@/lib/toast";

/**
 * Opens WhatsApp with a tracked order after ensuring the shopper is registered.
 * @param nextPath - path to return to after registration (e.g. `/products/abc`)
 */
export function useCustomerOrderWhatsApp(nextPath: string) {
  const router = useRouter();
  const { customer, loading, refresh } = useCustomerAuth();

  async function placeOrder(productId: string): Promise<void> {
    if (loading) return;
    if (!customer) {
      const next = nextPath || `/products/${productId}`;
      router.push(`/auth?tab=customer&mode=register&next=${encodeURIComponent(next)}`);
      return;
    }
    const res = await fetch("/api/customer/orders", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    });
    const data = (await res.json()) as { whatsappUrl?: string; error?: string };
    if (!res.ok) {
      toast.error(data.error ?? "Could not start order.");
      return;
    }
    if (data.whatsappUrl) {
      window.open(data.whatsappUrl, "_blank", "noopener,noreferrer");
    }
    await refresh();
  }

  return { placeOrder, customer, loading, isAuthenticated: Boolean(customer) };
}
