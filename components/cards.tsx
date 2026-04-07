import type { Store } from "@/lib/data";
import { TopStoreCard } from "@/components/top-store-card";

export { ProductCard } from "@/components/product-card";
export type { ProductCardProps } from "@/components/product-card";

export { TopStoreCard };

/** Backward-compatible alias — pass `index` for stagger animation in grids */
export function StoreCard({ store, index = 0 }: { store: Store; index?: number }) {
  return <TopStoreCard store={store} staggerIndex={index} />;
}
