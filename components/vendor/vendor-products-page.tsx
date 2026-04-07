"use client";

import Image from "next/image";
import Link from "next/link";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslations } from "@/lib/locale-context";
import { useVendorDashboard } from "./vendor-dashboard-provider";

export function VendorProductsPage() {
  const { t } = useTranslations();
  const { state, persist } = useVendorDashboard();

  async function remove(id: string) {
    if (!confirm(t("vendor.products.confirmDelete"))) return;
    await persist({ ...state, products: state.products.filter((p) => p.id !== id) });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{t("vendor.products.pageTitle")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("vendor.products.title")}</p>
        </div>
        <Button asChild className="h-11 w-full rounded-xl sm:w-auto">
          <Link href="/vendor/products/new" className="gap-2">
            <Plus className="size-4" />
            {t("vendor.products.add")}
          </Link>
        </Button>
      </div>

      {state.products.length === 0 ? (
        <Card className="rounded-2xl border-dashed border-border bg-muted/30">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">{t("vendor.products.empty")}</CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {state.products.map((p) => (
            <Card
              key={p.id}
              className="group overflow-hidden rounded-2xl border-border shadow-sm transition-all hover:shadow-md"
            >
              <div className="relative flex aspect-[4/3] items-center justify-center bg-gray-100 dark:bg-slate-800/80">
                <Image
                  src={p.image}
                  alt=""
                  fill
                  className="object-contain object-center p-2"
                  sizes="(max-width: 768px) 100vw, 33vw"
                  unoptimized={p.image.startsWith("data:")}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                <div className="absolute bottom-2 right-2 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button size="icon" variant="secondary" className="size-9 rounded-lg" asChild>
                    <Link href={`/vendor/products/${p.id}/edit`} aria-label={t("vendor.products.edit")}>
                      <Pencil className="size-4" />
                    </Link>
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    className="size-9 rounded-lg"
                    onClick={() => void remove(p.id)}
                    aria-label={t("vendor.products.delete")}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
              <CardContent className="p-4">
                <p className="line-clamp-1 font-semibold text-foreground">{p.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{p.category}</p>
                <p className="mt-2 text-lg font-bold text-brand-primary">${p.price.toFixed(2)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
