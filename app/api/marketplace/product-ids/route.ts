import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";
import { getMarketplaceProductIds } from "@/lib/marketplace-catalog";

const getCachedMarketplaceProductIds = unstable_cache(
  async () => getMarketplaceProductIds(),
  ["marketplace-product-ids"],
  { revalidate: 60 },
);

/**
 * Public list of product IDs currently in the marketplace (for client cart validation).
 *
 * Optional: set `LAAS24_BACKEND_URL` (e.g. `http://localhost:8787`) to delegate to the Express
 * backend during cutover testing. If unset or unreachable, uses the Next implementation.
 */
export async function GET() {
  const upstream = process.env.LAAS24_BACKEND_URL?.trim();
  if (upstream) {
    try {
      const r = await fetch(`${upstream.replace(/\/$/, "")}/api/marketplace/product-ids`, {
        next: { revalidate: 60 },
      });
      if (r.ok) {
        const body = (await r.json()) as { ids?: string[] };
        if (Array.isArray(body.ids)) {
          return NextResponse.json({ ids: body.ids });
        }
      }
    } catch (e) {
      console.error("[marketplace/product-ids] LAAS24_BACKEND_URL delegate failed:", e);
    }
  }

  const ids = await getCachedMarketplaceProductIds();
  return NextResponse.json({ ids });
}
