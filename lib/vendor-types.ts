import type { Product } from "@/lib/data";

export type VendorDashboardProduct = Omit<Product, "storeSlug" | "storeName" | "vendorId">;

export type VendorOrderItem = {
  productId: string;
  title: string;
  qty: number;
  price: number;
};

export type VendorOrder = {
  id: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  status: "pending" | "accepted" | "completed";
  items: VendorOrderItem[];
  total: number;
};

export type VendorStoreSettings = {
  storeName: string;
  logoMime?: string;
  logoDataBase64?: string;
  bannerMime?: string;
  bannerDataBase64?: string;
  phone: string;
  whatsAppNumber: string;
  region: string;
  district: string;
  description: string;
};

export type VendorDashboardState = {
  products: VendorDashboardProduct[];
  orders: VendorOrder[];
  settings: VendorStoreSettings;
  subscriptionPlan: "free" | "pro" | "premium";
  /** Optional counters for analytics UI */
  analytics?: {
    totalViews: number;
    productClicks: number;
  };
};
