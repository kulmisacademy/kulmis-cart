"use client";

import { useMemo, useState } from "react";
import type { Product } from "@/lib/data";
import { ProductCard } from "@/components/product-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useOptionalStoreInventorySearch } from "@/components/store-inventory-search-context";
import { Search } from "lucide-react";

type SortKey = "newest" | "oldest" | "price-asc" | "price-desc";

type Props = {
  products: Product[];
  phone: string;
};

export function StoreProductBrowser({ products, phone }: Props) {
  const inventorySearch = useOptionalStoreInventorySearch();
  const [localSearch, setLocalSearch] = useState("");
  const search = inventorySearch?.search ?? localSearch;
  const setSearch = inventorySearch?.setSearch ?? setLocalSearch;
  const [category, setCategory] = useState<string>("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category));
    return ["all", ...Array.from(set).sort()];
  }, [products]);

  const filtered = useMemo(() => {
    let list = [...products];
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q),
      );
    }
    if (category !== "all") {
      list = list.filter((p) => p.category === category);
    }
    const min = minPrice === "" ? null : Number(minPrice);
    const max = maxPrice === "" ? null : Number(maxPrice);
    if (min !== null && !Number.isNaN(min)) {
      list = list.filter((p) => p.price >= min);
    }
    if (max !== null && !Number.isNaN(max)) {
      list = list.filter((p) => p.price <= max);
    }
    list.sort((a, b) => {
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

  return (
    <section id="inventory" className="scroll-mt-24">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">Products</h2>
      </div>

      <Card className="mb-6 shadow-sm">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-base font-semibold">Search & filters</CardTitle>
          <p className="text-sm text-muted-foreground">Filter by name, category, and price. Results update as you type.</p>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              suppressHydrationWarning
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products by name or description…"
              className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-brand-primary/30 dark:focus-visible:ring-brand-primary/40"
              aria-label="Search products"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Category
              <select
                suppressHydrationWarning
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-normal text-card-foreground outline-none transition hover:border-brand-primary/40"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c === "all" ? "All categories" : c}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Min price
              <input
                suppressHydrationWarning
                type="number"
                inputMode="decimal"
                min={0}
                placeholder="Min"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none transition hover:border-brand-primary/40"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Max price
              <input
                suppressHydrationWarning
                type="number"
                inputMode="decimal"
                min={0}
                placeholder="Max"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none transition hover:border-brand-primary/40"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Sort
              <select
                suppressHydrationWarning
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-normal outline-none transition hover:border-brand-primary/40"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="price-asc">Price: Low → High</option>
                <option value="price-desc">Price: High → Low</option>
              </select>
            </label>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 items-stretch gap-3 sm:gap-4 md:gap-6 lg:grid-cols-3 [&>article]:min-h-0">
        {filtered.map((product) => (
          <ProductCard key={product.id} product={product} phone={phone} />
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="mt-10 text-center text-sm font-medium text-muted-foreground">No products found.</p>
      ) : null}
    </section>
  );
}
