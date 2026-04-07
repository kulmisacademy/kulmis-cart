"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { VendorProductForm } from "@/components/vendor/vendor-product-form";
import { useTranslations } from "@/lib/locale-context";

export default function NewProductPage() {
  const { t } = useTranslations();

  return (
    <div className="space-y-6">
      <Link
        href="/vendor/products"
        className="inline-flex items-center gap-2 text-sm font-medium text-brand-primary hover:underline"
      >
        <ArrowLeft className="size-4" />
        {t("vendor.common.back")}
      </Link>
      <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{t("vendor.products.newTitle")}</h1>
      <VendorProductForm mode="new" />
    </div>
  );
}
