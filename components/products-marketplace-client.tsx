"use client";

import { useCallback, useMemo, useState } from "react";
import { ProductCard } from "@/components/product-card";
import type { Product, Store } from "@/lib/data";
import { cn } from "@/lib/utils";

type Props = {
  products: Product[];
  stores: Store[];
};

function parsePrice(raw: string): number | undefined {
  const t = raw.trim();
  if (t === "") return undefined;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

export function ProductsMarketplaceClient({ products, stores }: Props) {
  const [category, setCategory] = useState<string>("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [region, setRegion] = useState("");
  const [selectedStores, setSelectedStores] = useState<Set<string>>(() => new Set());

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) {
      const c = p.category?.trim();
      if (c) set.add(c);
    }
    return ["", ...[...set].sort((a, b) => a.localeCompare(b))];
  }, [products]);

  const categoryLabels = useMemo(() => {
    const labels = new Map<string, string>();
    labels.set("", "All Items");
    for (const c of categories) {
      if (c) labels.set(c, c);
    }
    return labels;
  }, [categories]);

  const regions = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) {
      const r = p.region?.trim();
      if (r) set.add(r);
    }
    return ["", ...[...set].sort((a, b) => a.localeCompare(b))];
  }, [products]);

  const filtered = useMemo(() => {
    const min = parsePrice(minPrice);
    const max = parsePrice(maxPrice);
    let lo = min;
    let hi = max;
    if (lo != null && hi != null && lo > hi) {
      [lo, hi] = [hi, lo];
    }

    return products.filter((p) => {
      if (category) {
        const c = p.category?.trim() ?? "";
        if (c.toLowerCase() !== category.toLowerCase()) return false;
      }
      if (lo != null && p.price < lo) return false;
      if (hi != null && p.price > hi) return false;
      if (region) {
        const r = p.region?.trim() ?? "";
        if (r.toLowerCase() !== region.toLowerCase()) return false;
      }
      if (selectedStores.size > 0 && !selectedStores.has(p.storeSlug)) return false;
      return true;
    });
  }, [products, category, minPrice, maxPrice, region, selectedStores]);

  const toggleStore = useCallback((slug: string) => {
    setSelectedStores((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setCategory("");
    setMinPrice("");
    setMaxPrice("");
    setRegion("");
    setSelectedStores(new Set());
  }, []);

  const storeBySlug = useMemo(
    () => Object.fromEntries(stores.map((s) => [s.slug, s] as const)),
    [stores],
  );

  return (
    <main className="mx-auto w-full min-w-0 max-w-brand px-3 py-5 text-foreground sm:px-6">
      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,260px)_1fr] lg:gap-5">
        <aside className="h-fit min-w-0 w-full max-w-full overflow-hidden rounded-2xl border border-border bg-card p-4 text-card-foreground sm:p-4.5 lg:sticky lg:top-20">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-[19px] leading-none font-bold text-foreground">Filters</h2>
            <button
              type="button"
              onClick={clearAll}
              className="text-[11px] font-semibold text-brand-primary hover:underline"
            >
              CLEAR ALL
            </button>
          </div>

          <div className="space-y-4 text-sm">
            <div>
              <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground">CATEGORY</p>
              <div className="flex flex-wrap gap-2">
                {categories.map((c) => {
                  const active = category === c;
                  const label = categoryLabels.get(c) ?? c;
                  return (
                    <button
                      key={c || "all"}
                      type="button"
                      onClick={() => setCategory(c)}
                      className={cn(
                        "rounded-full px-3 py-1 text-xs transition-colors",
                        active
                          ? "bg-orange-100 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400"
                          : "bg-muted text-muted-foreground hover:bg-muted/80",
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="min-w-0">
              <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground">PRICE RANGE</p>
              {/* Stacked so narrow sidebar never overflows (number inputs have large intrinsic min-width). */}
              <div className="flex flex-col gap-2">
                <input
                  suppressHydrationWarning
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  className="box-border w-full min-w-0 max-w-full rounded-lg border border-border bg-muted px-2 py-1.5 text-sm text-foreground outline-none"
                  placeholder="Min price"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                />
                <input
                  suppressHydrationWarning
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  className="box-border w-full min-w-0 max-w-full rounded-lg border border-border bg-muted px-2 py-1.5 text-sm text-foreground outline-none"
                  placeholder="Max price"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                />
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground">REGION</p>
              <select
                className="w-full rounded-lg border border-border bg-muted px-2 py-1.5 text-foreground outline-none"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
              >
                <option value="">All regions</option>
                {regions
                  .filter((r) => r !== "")
                  .map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground">STORES</p>
              <p className="mb-2 text-[11px] text-muted-foreground">Select one or more, or leave empty for all.</p>
              <div className="max-h-48 space-y-1.5 overflow-y-auto text-foreground/90 pr-1">
                {stores.map((store) => {
                  const checked = selectedStores.has(store.slug);
                  return (
                    <label key={store.slug} className="flex cursor-pointer items-center gap-2 text-[14px]">
                      <input
                        suppressHydrationWarning
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleStore(store.slug)}
                      />
                      <span className="line-clamp-1">{store.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          <div className="mb-5 flex flex-col gap-2 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-[24px] leading-none font-bold text-foreground sm:text-[27px]">Global Marketplace</h1>
            <p className="text-xs font-medium text-muted-foreground sm:text-sm">
              Showing {filtered.length} of {products.length} product{products.length === 1 ? "" : "s"}
            </p>
          </div>

          {products.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center text-sm text-muted-foreground">
              No products yet. Vendors can add listings from the vendor dashboard.
            </p>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center text-sm text-muted-foreground">
              <p>
                No products match these filters. Category, store, region, and price filters all apply together.
              </p>
              <button
                type="button"
                onClick={clearAll}
                className="mt-3 font-semibold text-brand-primary hover:underline"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 items-stretch gap-3 sm:gap-4 md:gap-6 lg:grid-cols-3 [&>article]:min-h-0">
              {filtered.map((product) => {
                const phone = storeBySlug[product.storeSlug]?.phone ?? "";
                return <ProductCard key={product.id} product={product} phone={phone} />;
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
