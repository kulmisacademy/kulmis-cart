import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";
import { getMarketplaceProductIds } from "@/lib/marketplace-catalog";

const getCachedMarketplaceProductIds = unstable_cache(
  async () => getMarketplaceProductIds(),
  ["marketplace-product-ids"],
  { revalidate: 60 },
);

/** Public list of product IDs currently in the marketplace (for client cart validation). */
export async function GET() {
  const ids = await getCachedMarketplaceProductIds();
  return NextResponse.json({ ids });
}
