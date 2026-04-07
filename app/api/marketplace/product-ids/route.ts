import { NextResponse } from "next/server";
import { getMarketplaceProductIds } from "@/lib/marketplace-catalog";

/** Public list of product IDs currently in the marketplace (for client cart validation). */
export async function GET() {
  const ids = await getMarketplaceProductIds();
  return NextResponse.json({ ids });
}
