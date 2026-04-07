"use client";

import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SOMALI_REGIONS } from "@/lib/somali-regions";
import type { VendorStoreSettings } from "@/lib/vendor-types";
import { useTranslations } from "@/lib/locale-context";
import { useVendorDashboard } from "./vendor-dashboard-provider";
import { VendorVerificationSettings } from "./vendor-verification-settings";

type FormValues = VendorStoreSettings;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(typeof r.result === "string" ? r.result : "");
    r.onerror = () => reject(new Error("read"));
    r.readAsDataURL(file);
  });
}

export function VendorSettingsPage() {
  const { t } = useTranslations();
  const { state, persist, saving } = useVendorDashboard();

  const form = useForm<FormValues>({
    defaultValues: state.settings,
    values: state.settings,
  });

  async function onSubmit(values: FormValues) {
    await persist({ ...state, settings: values });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{t("vendor.settings.title")}</h1>
      </div>

      <VendorVerificationSettings />

      <form onSubmit={form.handleSubmit(onSubmit)} className="mx-auto max-w-xl space-y-5">
        <div className="space-y-2">
          <Label htmlFor="storeName">{t("vendor.settings.fields.name")}</Label>
          <Input id="storeName" className="rounded-xl" {...form.register("storeName", { required: true })} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="phone">{t("vendor.settings.fields.phone")}</Label>
            <Input id="phone" className="rounded-xl" {...form.register("phone")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="whatsApp">{t("vendor.settings.fields.whatsapp")}</Label>
            <Input id="whatsApp" className="rounded-xl" {...form.register("whatsAppNumber")} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>{t("vendor.settings.fields.region")}</Label>
            <Select {...form.register("region")}>
              {SOMALI_REGIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="district">{t("vendor.settings.fields.district")}</Label>
            <Input id="district" className="rounded-xl" {...form.register("district")} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">{t("vendor.settings.fields.description")}</Label>
          <Textarea id="description" rows={4} className="rounded-xl" {...form.register("description")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="logo">{t("vendor.settings.fields.logo")}</Label>
          {form.watch("logoDataBase64") && form.watch("logoMime") ? (
            <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt=""
                className="size-16 shrink-0 rounded-lg object-cover"
                src={`data:${form.watch("logoMime")};base64,${form.watch("logoDataBase64")}`}
              />
              <p className="text-xs text-muted-foreground">{t("vendor.settings.logoCurrent")}</p>
            </div>
          ) : null}
          <Input
            id="logo"
            type="file"
            accept="image/*"
            className="rounded-xl file:mr-3 file:rounded-lg file:border-0 file:bg-muted file:px-3 file:py-2"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const dataUrl = await readFileAsDataUrl(f);
              const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
              if (m) {
                form.setValue("logoMime", m[1]);
                form.setValue("logoDataBase64", m[2]);
              }
            }}
          />
          <p className="text-xs text-muted-foreground">{t("vendor.settings.logoHint")}</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="banner">{t("vendor.settings.fields.banner")}</Label>
          {form.watch("bannerDataBase64") && form.watch("bannerMime") ? (
            <div className="overflow-hidden rounded-xl border border-border bg-muted/30">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt=""
                className="max-h-36 w-full object-cover"
                src={`data:${form.watch("bannerMime")};base64,${form.watch("bannerDataBase64")}`}
              />
              <p className="px-3 py-2 text-xs text-muted-foreground">{t("vendor.settings.bannerCurrent")}</p>
            </div>
          ) : null}
          <Input
            id="banner"
            type="file"
            accept="image/*"
            className="rounded-xl file:mr-3 file:rounded-lg file:border-0 file:bg-muted file:px-3 file:py-2"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const dataUrl = await readFileAsDataUrl(f);
              const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
              if (m) {
                form.setValue("bannerMime", m[1]);
                form.setValue("bannerDataBase64", m[2]);
              }
            }}
          />
          <p className="text-xs text-muted-foreground">{t("vendor.settings.bannerHint")}</p>
        </div>

        <Button type="submit" className="w-full rounded-xl sm:w-auto" disabled={saving}>
          {saving ? t("vendor.common.saving") : t("vendor.settings.save")}
        </Button>
      </form>
    </div>
  );
}
