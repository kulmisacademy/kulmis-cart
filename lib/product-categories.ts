/** Marketplace product categories for vendor forms */
export const PRODUCT_CATEGORIES = [
  "Sports",
  "Electronics",
  "Fashion",
  "Food",
  "Accessories",
  "Home",
  "Beauty",
  "Other",
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];
