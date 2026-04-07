import type { Product } from "./data";

export function getStockBadge(product: Product): { label: string; className: string } {
  const status =
    product.stockStatus ??
    (Number(product.id.replace(/\D/g, "")) % 2 === 0 ? "limited" : "in-stock");
  if (status === "limited") {
    return { label: "LIMITED", className: "bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-200" };
  }
  return { label: "IN STOCK", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200" };
}
