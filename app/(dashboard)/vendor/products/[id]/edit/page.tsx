"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { deferRouterAction } from "@/lib/next-router-safe";
import { ArrowLeft } from "lucide-react";
import { VendorProductForm } from "@/components/vendor/vendor-product-form";
import { useTranslations } from "@/lib/locale-context";
import { useVendorDashboard } from "@/components/vendor/vendor-dashboard-provider";

export default function EditProductPage() {
  const { t } = useTranslations();
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";
  const { state } = useVendorDashboard();
  const exists = id && state.products.some((p) => p.id === id);

  useEffect(() => {
    if (id && !exists) {
      deferRouterAction(() => {
        router.replace("/vendor/products");
      });
    }
  }, [id, exists, router]);

  if (!id || !exists) {
    return null;
  }

  return (
    <div className="space-y-6">
      <Link
        href="/vendor/products"
        className="inline-flex items-center gap-2 text-sm font-medium text-brand-primary hover:underline"
      >
        <ArrowLeft className="size-4" />
        {t("vendor.common.back")}
      </Link>
      <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{t("vendor.products.editTitle")}</h1>
      <VendorProductForm mode="edit" productId={id} />
    </div>
  );
}
