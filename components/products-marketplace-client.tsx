"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  const [search, setSearch] = useState("");
  const [showMobileFilters, setShowMobileFilters] = useState(false);

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
    labels.set("", "All items");
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

    const q = search.trim().toLowerCase();

    return products.filter((p) => {
      if (q) {
        const title = (p.title ?? "").toLowerCase();
        const desc = (p.description ?? "").toLowerCase();
        if (!title.includes(q) && !desc.includes(q)) return false;
      }
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
  }, [products, category, minPrice, maxPrice, region, selectedStores, search]);

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
    setSearch("");
  }, []);

  const pickCategory = useCallback((c: string) => {
    setCategory(c);
    setShowMobileFilters(false);
  }, []);

  const storeBySlug = useMemo(
    () => Object.fromEntries(stores.map((s) => [s.slug, s] as const)),
    [stores],
  );

  useEffect(() => {
    if (!showMobileFilters) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [showMobileFilters]);

  const renderFilterControls = () => (
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
                onClick={() => {
                  setCategory(c);
                  setShowMobileFilters(false);
                }}
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
          onChange={(e) => {
            setRegion(e.target.value);
            setShowMobileFilters(false);
          }}
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
        <div className="max-h-48 space-y-1.5 overflow-y-auto pr-1 text-foreground/90">
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
  );

  return (
    <main className="mx-auto w-full min-w-0 max-w-brand px-3 py-5 text-foreground sm:px-6">
      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,260px)_1fr] lg:gap-5">
        <aside className="hidden h-fit min-w-0 w-full max-w-full overflow-hidden rounded-2xl border border-border bg-card p-4 text-card-foreground sm:p-4.5 lg:sticky lg:top-20 lg:block">
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
          {renderFilterControls()}
        </aside>

        <div className="min-w-0 space-y-4">
          <div className="flex flex-col gap-2 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-[24px] leading-none font-bold text-foreground sm:text-[27px]">
              Global Marketplace
            </h1>
            <p className="text-xs font-medium text-muted-foreground sm:text-sm">
              Showing {filtered.length} of {products.length} product{products.length === 1 ? "" : "s"}
            </p>
          </div>

          <label className="block">
            <span className="sr-only">Search products</span>
            <input
              type="search"
              enterKeyHint="search"
              autoComplete="off"
              placeholder="Search products…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-border bg-muted/80 px-4 py-2.5 text-sm text-foreground outline-none ring-brand-primary/30 placeholder:text-muted-foreground focus:border-brand-primary/40 focus:ring-2"
            />
          </label>

          <button
            type="button"
            onClick={() => setShowMobileFilters(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card py-2.5 text-sm font-semibold text-foreground shadow-sm transition hover:bg-muted/50 lg:hidden"
          >
            <SlidersHorizontal className="size-4 shrink-0 text-brand-primary" aria-hidden />
            Filters
          </button>

          {products.length > 0 ? (
            <div className="-mx-1 px-1">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Quick filters
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {categories.map((c) => {
                  const active = category === c;
                  const label = categoryLabels.get(c) ?? c;
                  return (
                    <button
                      key={`quick-${c || "all"}`}
                      type="button"
                      onClick={() => pickCategory(c)}
                      className={cn(
                        "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                        active
                          ? "bg-brand-secondary text-white shadow-sm dark:bg-brand-secondary/90"
                          : "bg-muted text-muted-foreground hover:bg-muted/80 dark:bg-slate-800",
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {products.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center text-sm text-muted-foreground">
              No products yet. Vendors can add listings from the vendor dashboard.
            </p>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center text-sm text-muted-foreground">
              <p>
                No products match these filters. Category, store, region, search, and price filters all apply
                together.
              </p>
              <button
                type="button"
                onClick={() => {
                  clearAll();
                  setShowMobileFilters(false);
                }}
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

      {showMobileFilters ? (
        <div className="fixed inset-0 z-[100] lg:hidden" role="dialog" aria-modal="true" aria-label="Filters">
          <button
            type="button"
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            aria-label="Close filters"
            onClick={() => setShowMobileFilters(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 max-h-[min(88vh,720px)] overflow-hidden rounded-t-2xl border border-border bg-card shadow-2xl">
            <div className="flex max-h-[min(88vh,720px)] flex-col">
              <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
                <h2 className="text-lg font-bold text-foreground">Filters</h2>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      clearAll();
                      setShowMobileFilters(false);
                    }}
                    className="text-xs font-semibold text-brand-primary hover:underline"
                  >
                    Clear all
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowMobileFilters(false)}
                    className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label="Close"
                  >
                    <X className="size-5" />
                  </button>
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2">
                {renderFilterControls()}
              </div>
              <div className="shrink-0 border-t border-border bg-card p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                <button
                  type="button"
                  onClick={() => setShowMobileFilters(false)}
                  className="w-full rounded-xl bg-brand-primary py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-105 active:scale-[0.99]"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
