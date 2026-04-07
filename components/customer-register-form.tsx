"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { customerRegisterSchema, type CustomerRegisterInput } from "@/lib/customer-registration-schema";
import { useCustomerAuth } from "@/lib/customer-auth-context";
import { customerPostLoginPath } from "@/lib/internal-nav";
import { SOMALI_REGIONS } from "@/lib/somali-regions";

const touchInput =
  "h-12 rounded-lg px-3 py-3 text-base sm:h-11 sm:rounded-xl sm:px-3.5 sm:py-2 sm:text-sm";

type Props = {
  nextPath: string;
  embedded?: boolean;
  onSwitchToLogin?: () => void;
};

export function CustomerRegisterForm({ nextPath, embedded, onSwitchToLogin }: Props) {
  const router = useRouter();
  const { refresh } = useCustomerAuth();
  const form = useForm<CustomerRegisterInput>({
    resolver: zodResolver(customerRegisterSchema),
    defaultValues: {
      fullName: "",
      phone: "",
      email: "",
      password: "",
      confirmPassword: "",
      region: SOMALI_REGIONS[0] ?? "Banaadir",
      district: "",
    },
  });

  async function onSubmit(values: CustomerRegisterInput) {
    form.clearErrors("root");
    const res = await fetch("/api/customer/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(values),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      form.setError("root", {
        message:
          data.error ??
          (res.status === 404
            ? "Server API not found. Run npm run dev from the kulmiscart app folder (or from the repo root)."
            : "Registration failed"),
      });
      return;
    }
    await refresh();
    router.push(customerPostLoginPath(nextPath));
  }

  const rootErr = form.formState.errors.root?.message;

  const shell = embedded
    ? "space-y-4"
    : "mx-auto max-w-md space-y-4 rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-sm";

  return (
    <form suppressHydrationWarning onSubmit={form.handleSubmit(onSubmit)} className={shell}>
      <div>
        <h2 className={embedded ? "text-lg font-semibold text-foreground" : "text-2xl font-bold text-foreground"}>
          {embedded ? "Create your account" : "Create customer account"}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Register to place orders and track them here.{" "}
          {embedded ? (
            <>
              Selling? Switch to the{" "}
              <span className="font-medium text-foreground">Store</span> tab above.
            </>
          ) : (
            <>
              Vendors can{" "}
              <Link href="/auth?tab=store&mode=register" className="font-medium text-brand-primary hover:underline">
                open a store
              </Link>
              .
            </>
          )}
        </p>
      </div>

      {rootErr ? <p className="text-sm text-red-600 dark:text-red-400">{rootErr}</p> : null}

      <div className="space-y-2">
        <Label htmlFor="fullName">Full name</Label>
        <Input id="fullName" autoComplete="name" className={touchInput} {...form.register("fullName")} />
        {form.formState.errors.fullName ? (
          <p className="text-xs text-red-600">{form.formState.errors.fullName.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" type="tel" autoComplete="tel" className={touchInput} {...form.register("phone")} />
        {form.formState.errors.phone ? (
          <p className="text-xs text-red-600">{form.formState.errors.phone.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" autoComplete="email" className={touchInput} {...form.register("email")} />
        {form.formState.errors.email ? (
          <p className="text-xs text-red-600">{form.formState.errors.email.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          className={touchInput}
          {...form.register("password")}
        />
        {form.formState.errors.password ? (
          <p className="text-xs text-red-600">{form.formState.errors.password.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          className={touchInput}
          {...form.register("confirmPassword")}
        />
        {form.formState.errors.confirmPassword ? (
          <p className="text-xs text-red-600">{form.formState.errors.confirmPassword.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="region">Region</Label>
        <Select id="region" className={touchInput} {...form.register("region")}>
          {SOMALI_REGIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </Select>
        {form.formState.errors.region ? (
          <p className="text-xs text-red-600">{form.formState.errors.region.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="district">District</Label>
        <Input id="district" className={touchInput} {...form.register("district")} placeholder="e.g. Hodan" />
        {form.formState.errors.district ? (
          <p className="text-xs text-red-600">{form.formState.errors.district.message}</p>
        ) : null}
      </div>

      <Button
        type="submit"
        className="h-12 w-full rounded-lg text-base font-semibold sm:h-11 sm:rounded-xl sm:text-sm"
        disabled={form.formState.isSubmitting}
      >
        {form.formState.isSubmitting ? "Creating account…" : "Register & continue"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already registered?{" "}
        {onSwitchToLogin ? (
          <button
            type="button"
            className="font-semibold text-brand-primary hover:underline"
            onClick={onSwitchToLogin}
          >
            Log in
          </button>
        ) : (
          <Link
            href={`/auth?tab=customer&mode=login&next=${encodeURIComponent(nextPath)}`}
            className="font-semibold text-brand-primary hover:underline"
          >
            Log in
          </Link>
        )}
      </p>
    </form>
  );
}
