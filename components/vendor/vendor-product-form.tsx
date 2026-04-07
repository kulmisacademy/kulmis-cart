"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Trash2, Upload } from "lucide-react";
import { useForm, type Resolver } from "react-hook-form";
import { useMemo, useRef, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { aiEnabledFromEntitlements } from "@/lib/entitlements";
import { canAddProduct, canAddVideo, countProductVideos } from "@/lib/plan-limits";
import { PRODUCT_CATEGORIES } from "@/lib/product-categories";
import { SOMALI_REGIONS } from "@/lib/somali-regions";
import type { VendorDashboardProduct } from "@/lib/vendor-types";
import { AiProductAssist } from "@/components/vendor/ai-product-assist";
import { useTranslations } from "@/lib/locale-context";
import { ProductVideo } from "@/components/product-video";
import { readVendorProductVideoFile } from "@/lib/vendor-product-video";
import { isValidProductVideoUrl } from "@/lib/video-embed";
import { useVendorDashboard } from "./vendor-dashboard-provider";

function videoUploadErrorMessage(code: string, t: (key: string) => string): string {
  switch (code) {
    case "VIDEO_TYPE":
      return t("vendor.products.errors.videoInvalidType");
    case "VIDEO_SIZE":
      return t("vendor.products.errors.videoTooLarge");
    case "VIDEO_DURATION":
      return t("vendor.products.errors.videoTooLong");
    case "VIDEO_METADATA":
    case "VIDEO_LOAD":
    case "VIDEO_READ":
      return t("vendor.products.errors.videoUnreadable");
    default:
      return t("vendor.products.errors.videoUnreadable");
  }
}

function buildProductSchema(t: (key: string) => string) {
  return z.object({
    title: z.string().min(1, "Required"),
    description: z.string().min(1, "Required"),
    price: z.preprocess((val) => {
      if (typeof val === "number" && !Number.isNaN(val)) return val;
      const n = parseFloat(String(val ?? ""));
      return Number.isNaN(n) ? 0 : n;
    }, z.number().nonnegative()),
    oldPrice: z.string().optional(),
    category: z.string().min(1),
    region: z.string().min(1),
    features: z.string().optional(),
    stockStatus: z.enum(["in-stock", "limited", ""]).optional(),
    videoUrl: z.string().trim().refine((s) => isValidProductVideoUrl(s), {
      message: t("vendor.products.errors.invalidVideo"),
    }),
    images: z
      .array(z.string())
      .min(1, t("vendor.products.errors.imagesMin"))
      .max(4, t("vendor.products.errors.imagesMax")),
  });
}

type FormValues = {
  title: string;
  description: string;
  price: number;
  oldPrice?: string;
  category: string;
  region: string;
  features?: string;
  stockStatus?: "" | "in-stock" | "limited";
  videoUrl?: string;
  images: string[];
};

function readFilesAsDataUrls(files: FileList | null, max: number): Promise<string[]> {
  if (!files?.length) return Promise.resolve([]);
  const list = Array.from(files).slice(0, max);
  return Promise.all(
    list.map(
      (file) =>
        new Promise<string>((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(typeof r.result === "string" ? r.result : "");
          r.onerror = () => reject(new Error("read"));
          r.readAsDataURL(file);
        }),
    ),
  );
}

type Props = { mode: "new" | "edit"; productId?: string };

export function VendorProductForm({ mode, productId }: Props) {
  const { t } = useTranslations();
  const router = useRouter();
  const { state, persist, saving, entitlements } = useVendorDashboard();
  const schema = useMemo(() => buildProductSchema(t), [t]);

  const existing =
    mode === "edit" && productId ? state.products.find((p) => p.id === productId) : undefined;

  const productBlocked =
    mode === "new" && !canAddProduct(entitlements, state.products.length);

  const videoCount = countProductVideos(state.products);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: existing
        ? {
          title: existing.title,
          description: existing.description,
          price: existing.price,
          oldPrice: existing.oldPrice != null ? String(existing.oldPrice) : "",
          category: existing.category,
          region: existing.region,
          features: existing.features ?? "",
          stockStatus: existing.stockStatus ?? "",
          videoUrl: existing.videoUrl ?? "",
          images: (existing.images?.length ? existing.images : [existing.image]).slice(0, 4),
        }
      : {
          title: "",
          description: "",
          price: 0,
          oldPrice: "",
          category: PRODUCT_CATEGORIES[0] ?? "Other",
          region: SOMALI_REGIONS[0] ?? "Banaadir",
          features: "",
          stockStatus: "in-stock",
          videoUrl: "",
          images: [],
        },
  });

  const images = form.watch("images");
  const videoUrl = form.watch("videoUrl") ?? "";
  const [videoBusy, setVideoBusy] = useState(false);
  const [videoClientError, setVideoClientError] = useState<string | null>(null);
  const videoFileRef = useRef<HTMLInputElement>(null);

  const legacyVideoUrl = Boolean(videoUrl.trim() && /^https?:\/\//i.test(videoUrl.trim()));

  async function onSubmit(values: FormValues) {
    if (productBlocked) return;
    const imgs = values.images.slice(0, 4);
    const oldPriceNum = values.oldPrice?.trim() ? Number(values.oldPrice) : undefined;
    const videoTrim = values.videoUrl?.trim() || undefined;
    if (videoTrim) {
      const nextList =
        mode === "edit" && productId
          ? state.products.map((p) =>
              p.id === productId ? { ...p, videoUrl: videoTrim } : p,
            )
          : [...state.products, { videoUrl: videoTrim } as VendorDashboardProduct];
      if (!canAddVideo(entitlements, nextList)) {
        const lim = entitlements.videoLimit ?? 0;
        form.setError("videoUrl", {
          message: `Your plan allows up to ${lim} product video${lim === 1 ? "" : "s"} across your catalog.`,
        });
        return;
      }
    }
    const base: VendorDashboardProduct = {
      id: existing?.id ?? crypto.randomUUID(),
      title: values.title.trim(),
      description: values.description.trim(),
      features: values.features?.trim() || undefined,
      price: values.price,
      oldPrice: oldPriceNum != null && !Number.isNaN(oldPriceNum) ? oldPriceNum : undefined,
      image: imgs[0]!,
      images: imgs,
      videoUrl: videoTrim,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      category: values.category,
      region: values.region,
      stockStatus:
        values.stockStatus === "in-stock" || values.stockStatus === "limited" ? values.stockStatus : undefined,
    };

    let nextProducts: VendorDashboardProduct[];
    if (mode === "edit" && productId) {
      nextProducts = state.products.map((p) => (p.id === productId ? base : p));
    } else {
      nextProducts = [...state.products, base];
    }

    await persist({ ...state, products: nextProducts });
    router.push("/vendor/products");
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="mx-auto max-w-2xl space-y-6">
      {productBlocked ? (
        <div className="rounded-2xl border border-brand-accent/40 bg-brand-accent/10 px-4 py-3 text-sm text-foreground">
          {t("vendor.products.freeLimit")}
        </div>
      ) : null}

      {aiEnabledFromEntitlements(entitlements) ? (
        <AiProductAssist
          disabled={productBlocked}
          onApply={(draft) => {
            form.setValue("title", draft.title);
            form.setValue("description", draft.description);
            form.setValue("features", draft.features);
          }}
        />
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">{t("vendor.products.aiHeading")}</p>
          <p className="mt-1 text-xs">{t("vendor.products.aiFreeHint")}</p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="title">{t("vendor.products.fields.name")}</Label>
        <Input id="title" className="rounded-xl" {...form.register("title")} />
        {form.formState.errors.title ? (
          <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">{t("vendor.products.fields.description")}</Label>
        <Textarea id="description" rows={4} className="rounded-xl" {...form.register("description")} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="features">{t("vendor.products.fields.features")}</Label>
        <Textarea id="features" rows={3} className="rounded-xl" placeholder="One feature per line" {...form.register("features")} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="price">{t("vendor.products.fields.price")}</Label>
          <Input id="price" type="number" step="0.01" min={0} className="rounded-xl" {...form.register("price")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="oldPrice">{t("vendor.products.fields.oldPrice")}</Label>
          <Input id="oldPrice" type="number" step="0.01" min={0} className="rounded-xl" {...form.register("oldPrice")} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>{t("vendor.products.fields.category")}</Label>
          <Select {...form.register("category")}>
            {PRODUCT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{t("vendor.products.fields.region")}</Label>
          <Select {...form.register("region")}>
            {SOMALI_REGIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t("vendor.products.fields.stock")}</Label>
        <Select {...form.register("stockStatus")}>
          <option value="">{t("vendor.products.fields.stockUnset")}</option>
          <option value="in-stock">{t("vendor.products.stock.in")}</option>
          <option value="limited">{t("vendor.products.stock.limited")}</option>
        </Select>
      </div>

      <div className="space-y-3">
        <div>
          <Label>{t("vendor.products.fields.images")}</Label>
          <p className="mt-1 text-xs text-muted-foreground">{t("vendor.products.fields.imagesHint")}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {images.map((src, i) => (
            <div key={i} className="relative size-24 overflow-hidden rounded-xl border border-border bg-muted">
              <Image src={src} alt="" fill className="object-cover" unoptimized />
              <button
                type="button"
                className="absolute right-1 top-1 rounded-md bg-background/90 p-1 text-destructive shadow"
                onClick={() => {
                  const next = images.filter((_, j) => j !== i);
                  form.setValue("images", next, { shouldValidate: true });
                }}
                aria-label={t("vendor.products.removeImage")}
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
          {images.length < 4 ? (
            <label className="flex size-24 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/50 text-muted-foreground transition-colors hover:border-brand-primary/50 hover:text-brand-primary">
              <Upload className="size-6" />
              <span className="mt-1 text-[10px] font-medium">{t("vendor.products.upload")}</span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                onChange={async (e) => {
                  const urls = await readFilesAsDataUrls(e.target.files, 4 - images.length);
                  form.setValue("images", [...images, ...urls].slice(0, 4), { shouldValidate: true });
                  e.target.value = "";
                }}
              />
            </label>
          ) : null}
        </div>
        {form.formState.errors.images ? (
          <p className="text-xs text-destructive">{form.formState.errors.images.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="product-video-file">{t("vendor.products.fields.video")}</Label>
        <input type="hidden" {...form.register("videoUrl")} />
        <p className="text-xs text-muted-foreground">
          {t("vendor.products.fields.videoHint")}
          {entitlements.videoLimit != null ? (
            <span className="mt-1 block">
              Videos in catalog: {videoCount} / {entitlements.videoLimit} (plan limit).
            </span>
          ) : null}
        </p>

        {videoUrl.trim() ? (
          <div className="space-y-3">
            {legacyVideoUrl ? (
              <p className="text-xs text-amber-700 dark:text-amber-400">{t("vendor.products.fields.legacyVideoNote")}</p>
            ) : null}
            <div className="max-w-lg">
              <ProductVideo url={videoUrl} />
            </div>
            <div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl"
                disabled={productBlocked}
                onClick={() => {
                  form.setValue("videoUrl", "", { shouldValidate: true, shouldDirty: true });
                  setVideoClientError(null);
                  if (videoFileRef.current) videoFileRef.current.value = "";
                }}
              >
                {t("vendor.products.removeVideo")}
              </Button>
            </div>
          </div>
        ) : (
          <label
            htmlFor="product-video-file"
            className={`flex min-h-[5.5rem] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/50 px-4 py-6 text-center text-muted-foreground transition-colors hover:border-brand-primary/50 hover:text-brand-primary ${productBlocked || videoBusy ? "pointer-events-none opacity-60" : ""}`}
          >
            <Upload className="size-8" />
            <span className="text-sm font-medium text-foreground">
              {videoBusy ? t("vendor.products.videoProcessing") : t("vendor.products.uploadVideo")}
            </span>
            <span className="text-xs">{t("vendor.products.uploadVideoSub")}</span>
            <input
              ref={videoFileRef}
              id="product-video-file"
              type="file"
              accept="video/*"
              className="sr-only"
              disabled={productBlocked || videoBusy}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                setVideoClientError(null);
                setVideoBusy(true);
                try {
                  const dataUrl = await readVendorProductVideoFile(file);
                  form.setValue("videoUrl", dataUrl, { shouldValidate: true, shouldDirty: true });
                } catch (err) {
                  const code = err instanceof Error ? err.message : "";
                  setVideoClientError(videoUploadErrorMessage(code, t));
                } finally {
                  setVideoBusy(false);
                }
              }}
            />
          </label>
        )}

        {videoClientError ? <p className="text-xs text-destructive">{videoClientError}</p> : null}
        {form.formState.errors.videoUrl ? (
          <p className="text-xs text-destructive">{form.formState.errors.videoUrl.message}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          className="rounded-xl"
          onClick={() => router.push("/vendor/products")}
        >
          {t("vendor.common.cancel")}
        </Button>
        <Button type="submit" className="rounded-xl" disabled={saving || productBlocked}>
          {saving ? t("vendor.common.saving") : t("vendor.products.save")}
        </Button>
      </div>
    </form>
  );
}
