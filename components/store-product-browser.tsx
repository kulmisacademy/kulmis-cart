"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Product } from "@/lib/data";
import { ProductCard } from "@/components/product-card";
import { useOptionalStoreInventorySearch } from "@/components/store-inventory-search-context";
import { useTranslations } from "@/lib/locale-context";
import { cn } from "@/lib/utils";

type SortKey = "newest" | "oldest" | "price-asc" | "price-desc";

type Props = {
  products: Product[];
  phone: string;
};

function parsePrice(raw: string): number | undefined {
  const t = raw.trim();
  if (t === "") return undefined;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

export function StoreProductBrowser({ products, phone }: Props) {
  const { t } = useTranslations();
  const inventorySearch = useOptionalStoreInventorySearch();
  const [localSearch, setLocalSearch] = useState("");
  const search = inventorySearch?.search ?? localSearch;
  const setSearch = inventorySearch?.setSearch ?? setLocalSearch;

  const [category, setCategory] = useState<string>("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");
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
    labels.set("", t("store.inventory.allItems"));
    for (const c of categories) {
      if (c) labels.set(c, c);
    }
    return labels;
  }, [categories, t]);

  const filtered = useMemo(() => {
    const min = parsePrice(minPrice);
    const max = parsePrice(maxPrice);
    let lo = min;
    let hi = max;
    if (lo != null && hi != null && lo > hi) {
      [lo, hi] = [hi, lo];
    }

    const q = search.trim().toLowerCase();

    let list = products.filter((p) => {
      if (q) {
        const title = (p.title ?? "").toLowerCase();
        const desc = (p.description ?? "").toLowerCase();
        const cat = (p.category ?? "").toLowerCase();
        if (!title.includes(q) && !desc.includes(q) && !cat.includes(q)) return false;
      }
      if (category) {
        const c = p.category?.trim() ?? "";
        if (c.toLowerCase() !== category.toLowerCase()) return false;
      }
      if (lo != null && p.price < lo) return false;
      if (hi != null && p.price > hi) return false;
      return true;
    });

    list = [...list].sort((a, b) => {
      switch (sort) {
        case "newest":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "oldest":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "price-asc":
          return a.price - b.price;
        case "price-desc":
          return b.price - a.price;
        default:
          return 0;
      }
    });

    return list;
  }, [products, search, category, minPrice, maxPrice, sort]);

  const clearAll = useCallback(() => {
    setCategory("");
    setMinPrice("");
    setMaxPrice("");
    setSort("newest");
    setSearch("");
    setShowMobileFilters(false);
  }, [setSearch]);

  const pickCategory = useCallback((c: string) => {
    setCategory(c);
    setShowMobileFilters(false);
  }, []);

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
        <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground">{t("store.inventory.category")}</p>
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
        <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground">{t("store.inventory.priceRange")}</p>
        <div className="flex flex-col gap-2">
          <input
            suppressHydrationWarning
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            className="box-border w-full min-w-0 max-w-full rounded-lg border border-border bg-muted px-2 py-1.5 text-sm text-foreground outline-none"
            placeholder={t("store.inventory.minPrice")}
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
            placeholder={t("store.inventory.maxPrice")}
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
          />
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground">{t("store.inventory.sort")}</p>
        <select
          suppressHydrationWarning
          className="w-full rounded-lg border border-border bg-muted px-2 py-1.5 text-foreground outline-none"
          value={sort}
          onChange={(e) => {
            setSort(e.target.value as SortKey);
            setShowMobileFilters(false);
          }}
        >
          <option value="newest">{t("store.inventory.sortNewest")}</option>
          <option value="oldest">{t("store.inventory.sortOldest")}</option>
          <option value="price-asc">{t("store.inventory.sortPriceAsc")}</option>
          <option value="price-desc">{t("store.inventory.sortPriceDesc")}</option>
        </select>
      </div>
    </div>
  );

  const countLabel =
    products.length === 1
      ? `${t("store.inventory.showing")} ${filtered.length} ${t("store.inventory.of")} ${products.length} ${t("store.inventory.product")}`
      : `${t("store.inventory.showing")} ${filtered.length} ${t("store.inventory.of")} ${products.length} ${t("store.inventory.products")}`;

  return (
    <section id="inventory" className="scroll-mt-24">
      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,260px)_1fr] lg:gap-5">
        <aside className="hidden h-fit min-w-0 w-full max-w-full overflow-hidden rounded-2xl border border-border bg-card p-4 text-card-foreground sm:p-4.5 lg:sticky lg:top-20 lg:block">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-[19px] leading-none font-bold text-foreground">{t("store.inventory.filters")}</h2>
            <button
              type="button"
              onClick={clearAll}
              className="text-[11px] font-semibold text-brand-primary hover:underline"
            >
              {t("store.inventory.clearAll")}
            </button>
          </div>
          {renderFilterControls()}
        </aside>

        <div className="min-w-0 space-y-4">
          <div className="flex flex-col gap-2 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-[24px] leading-none font-bold text-foreground sm:text-[27px]">{t("nav.products")}</h2>
            {products.length > 0 ? (
              <p className="text-xs font-medium text-muted-foreground sm:text-sm">{countLabel}</p>
            ) : null}
          </div>

          <label className="block">
            <span className="sr-only">{t("store.inventory.searchPlaceholder")}</span>
            <input
              suppressHydrationWarning
              type="search"
              enterKeyHint="search"
              autoComplete="off"
              placeholder={t("store.inventory.searchPlaceholder")}
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
            {t("store.inventory.filters")}
          </button>

          {products.length > 0 ? (
            <div className="-mx-1 px-1">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {t("store.inventory.quickFilters")}
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
                          ? "bg-brand-secondary text-black shadow-sm dark:bg-brand-secondary/90"
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
              {t("store.inventory.emptyStore")}
            </p>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center text-sm text-muted-foreground">
              <p>{t("store.inventory.noMatch")}</p>
              <button
                type="button"
                onClick={() => {
                  clearAll();
                  setShowMobileFilters(false);
                }}
                className="mt-3 font-semibold text-brand-primary hover:underline"
              >
                {t("store.inventory.clearFilters")}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 items-stretch gap-3 sm:gap-4 md:gap-6 lg:grid-cols-3 [&>article]:min-h-0">
              {filtered.map((product) => (
                <ProductCard key={product.id} product={product} phone={phone} />
              ))}
            </div>
          )}
        </div>
      </div>

      {showMobileFilters ? (
        <div className="fixed inset-0 z-[100] lg:hidden" role="dialog" aria-modal="true" aria-label={t("store.inventory.filters")}>
          <button
            type="button"
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            aria-label={t("store.inventory.closeFilters")}
            onClick={() => setShowMobileFilters(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 max-h-[min(88vh,720px)] overflow-hidden rounded-t-2xl border border-border bg-card shadow-2xl">
            <div className="flex max-h-[min(88vh,720px)] flex-col">
              <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
                <h2 className="text-lg font-bold text-foreground">{t("store.inventory.filters")}</h2>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      clearAll();
                      setShowMobileFilters(false);
                    }}
                    className="text-xs font-semibold text-brand-primary hover:underline"
                  >
                    {t("store.inventory.clearAllShort")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowMobileFilters(false)}
                    className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label={t("store.inventory.closeFilters")}
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
                  {t("store.inventory.done")}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
