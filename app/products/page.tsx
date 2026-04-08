import { ProductsMarketplaceClient } from "@/components/products-marketplace-client";
import { getMarketplaceProducts, getMarketplaceStores } from "@/lib/marketplace-catalog";

export const revalidate = 60;

export default async function ProductsPage() {
  const [products, stores] = await Promise.all([getMarketplaceProducts(), getMarketplaceStores()]);
  return <ProductsMarketplaceClient products={products} stores={stores} />;
}
