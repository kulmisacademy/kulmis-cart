"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import Link from "next/link";
import { ChevronLeft, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SOMALI_REGIONS } from "@/lib/somali-regions";
import { vendorRegistrationSchema, type VendorRegistrationFormValues } from "@/lib/vendor-registration-schema";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api-client";

const STEP1_FIELDS = [
  "storeName",
  "primaryPhone",
  "region",
  "district",
  "email",
  "password",
  "confirmPassword",
] as const satisfies readonly (keyof VendorRegistrationFormValues)[];

type VendorRegistrationFormProps = {
  /** Link target after successful registration (unified auth). */
  signInHref?: string;
};

export function VendorRegistrationForm({
  signInHref = "/auth?tab=store&mode=login",
}: VendorRegistrationFormProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [rootError, setRootError] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<VendorRegistrationFormValues>({
    resolver: zodResolver(vendorRegistrationSchema),
    defaultValues: {
      storeName: "",
      primaryPhone: "",
      region: "",
      district: "",
      email: "",
      password: "",
      confirmPassword: "",
      logo: undefined,
      banner: undefined,
    },
    mode: "onBlur",
  });

  const logoFile = form.watch("logo");
  const bannerFile = form.watch("banner");

  useEffect(() => {
    if (logoFile instanceof File) {
      const url = URL.createObjectURL(logoFile);
      setLogoPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setLogoPreview(null);
    return undefined;
  }, [logoFile]);

  useEffect(() => {
    if (bannerFile instanceof File && bannerFile.size > 0) {
      const url = URL.createObjectURL(bannerFile);
      setBannerPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setBannerPreview(null);
    return undefined;
  }, [bannerFile]);

  async function goToStep2() {
    const ok = await form.trigger([...STEP1_FIELDS]);
    if (ok) setStep(2);
  }

  async function onSubmit(values: VendorRegistrationFormValues) {
    setSubmitting(true);
    setRootError(null);
    setSuccess(null);
    try {
      if (!(values.logo instanceof File)) {
        setRootError("Please upload a store logo.");
        setSubmitting(false);
        return;
      }
      const fd = new FormData();
      fd.append("storeName", values.storeName);
      fd.append("primaryPhone", values.primaryPhone);
      fd.append("region", values.region);
      fd.append("district", values.district);
      fd.append("email", values.email);
      fd.append("password", values.password);
      fd.append("confirmPassword", values.confirmPassword);
      fd.append("logo", values.logo);
      if (values.banner instanceof File && values.banner.size > 0) {
        fd.append("banner", values.banner);
      }

      const res = await apiFetch("/api/vendor/register", { method: "POST", body: fd });
      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        fieldErrors?: Record<string, string[]>;
      };

      if (!res.ok) {
        setRootError(data.message ?? "Something went wrong.");
        if (data.fieldErrors?.email?.[0]) {
          form.setError("email", { message: data.fieldErrors.email[0] });
        }
        setStep(1);
        return;
      }

      setSuccess(data.message ?? "Registration submitted.");
      form.reset();
      setStep(1);
      setLogoPreview(null);
      setBannerPreview(null);
      if (logoInputRef.current) logoInputRef.current.value = "";
      if (bannerInputRef.current) bannerInputRef.current.value = "";
    } catch {
      setRootError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form suppressHydrationWarning onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex gap-2" role="tablist" aria-label="Registration steps">
          <button
            type="button"
            role="tab"
            aria-selected={step === 1}
            onClick={() => setStep(1)}
            className={cn(
              "min-h-10 flex-1 rounded-xl border px-3 py-2 text-center text-xs font-semibold transition-colors sm:text-sm",
              step === 1
                ? "border-brand-primary bg-brand-primary/10 text-foreground"
                : "border-border bg-muted/60 text-muted-foreground hover:bg-muted",
            )}
          >
            1 · Store &amp; account
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={step === 2}
            onClick={() => void goToStep2()}
            className={cn(
              "min-h-10 flex-1 rounded-xl border px-3 py-2 text-center text-xs font-semibold transition-colors sm:text-sm",
              step === 2
                ? "border-brand-primary bg-brand-primary/10 text-foreground"
                : "border-border bg-muted/60 text-muted-foreground hover:bg-muted",
            )}
          >
            2 · Logo
          </button>
        </div>

        {success ? (
          <div
            role="status"
            className="rounded-xl border border-brand-secondary/35 bg-brand-secondary/10 px-4 py-3 text-sm font-medium leading-relaxed text-foreground"
          >
            <p>{success}</p>
            <p className="mt-3">
              <Link
                href={signInHref}
                className="font-semibold text-brand-primary underline underline-offset-2 hover:text-brand-primary/90"
              >
                Go to vendor login
              </Link>
            </p>
          </div>
        ) : null}

        {rootError ? (
          <div
            role="alert"
            className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm font-medium leading-relaxed text-red-800 dark:border-red-500/35 dark:bg-red-950/40 dark:text-red-200"
          >
            {rootError}
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-4 rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-sm sm:p-5">
            <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
              <FormField
                control={form.control}
                name="storeName"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Store name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Your store name" autoComplete="organization" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="primaryPhone"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>WhatsApp / phone *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <MessageCircle
                          className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-brand-secondary"
                          aria-hidden
                        />
                        <Input
                          className="pl-10"
                          placeholder="+252 61 234 5678"
                          inputMode="tel"
                          autoComplete="tel"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormDescription>Used for calls and order messages.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="region"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Region *</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      >
                        <option value="">Select region</option>
                        {SOMALI_REGIONS.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="district"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>District *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Hodan" autoComplete="address-level2" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Email *</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="you@example.com" autoComplete="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password *</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Min. 6 characters" autoComplete="new-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm *</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Repeat" autoComplete="new-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button type="button" className="h-11 w-full rounded-xl sm:w-auto" onClick={() => void goToStep2()}>
              Continue to logo
            </Button>
          </div>
        ) : (
          <div className="space-y-4 rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-sm sm:p-5">
            <p className="text-sm text-muted-foreground">
              Logo required (JPG/PNG, max 2 MB). Banner is optional — shown at the top of your store.
            </p>

            <FormField
              control={form.control}
              name="logo"
              render={({ field: { onChange, onBlur, name, ref } }) => (
                <FormItem>
                  <FormLabel>Store logo *</FormLabel>
                  <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                    <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-border bg-muted">
                      {logoPreview ? (
                        // eslint-disable-next-line @next/next/no-img-element -- blob preview
                        <img src={logoPreview} alt="Logo preview" className="h-full w-full object-cover" />
                      ) : (
                        <span className="px-2 text-center text-[10px] font-medium text-muted-foreground">Preview</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <FormControl>
                        <Input
                          ref={(el) => {
                            logoInputRef.current = el;
                            ref(el);
                          }}
                          type="file"
                          accept="image/jpeg,image/png"
                          name={name}
                          onBlur={onBlur}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            onChange(file ?? undefined);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </div>
                  </div>
                </FormItem>
              )}
            />

            <details className="group rounded-xl border border-border bg-muted/40 p-3 open:bg-muted/60">
              <summary className="cursor-pointer list-none text-sm font-semibold text-foreground outline-none [&::-webkit-details-marker]:hidden">
                Optional store banner
                <span className="ml-2 font-normal text-muted-foreground">(wide header image)</span>
              </summary>
              <div className="mt-3 space-y-3 border-t border-border pt-3">
                <FormField
                  control={form.control}
                  name="banner"
                  render={({ field: { onChange, onBlur, name, ref } }) => (
                    <FormItem>
                      <FormDescription>JPG or PNG, max 2 MB.</FormDescription>
                      <div className="relative aspect-[21/9] w-full max-w-xl overflow-hidden rounded-xl border-2 border-dashed border-border bg-background">
                        {bannerPreview ? (
                          // eslint-disable-next-line @next/next/no-img-element -- blob preview
                          <img src={bannerPreview} alt="Banner preview" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full min-h-[88px] items-center justify-center px-4 text-center text-xs text-muted-foreground">
                            Preview after upload
                          </div>
                        )}
                      </div>
                      <FormControl>
                        <Input
                          ref={(el) => {
                            bannerInputRef.current = el;
                            ref(el);
                          }}
                          type="file"
                          accept="image/jpeg,image/png"
                          name={name}
                          onBlur={onBlur}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            onChange(file ?? undefined);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </details>

            <div className="rounded-xl border border-border bg-muted/50 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
              No admin approval step — your store is saved as soon as you submit. Use the same email and password on{" "}
              <Link href={signInHref} className="font-medium text-brand-primary hover:underline">
                Vendor login
              </Link>
              .
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full rounded-xl border-border sm:w-auto"
                onClick={() => setStep(1)}
              >
                <ChevronLeft className="size-4" aria-hidden />
                Back
              </Button>
              <Button
                type="submit"
                className="h-11 flex-1 rounded-xl text-base font-semibold shadow-md shadow-brand-primary/20"
                disabled={submitting}
              >
                {submitting ? "Submitting…" : "Submit registration"}
              </Button>
            </div>
          </div>
        )}
      </form>
    </Form>
  );
}
