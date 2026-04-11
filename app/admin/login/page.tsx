import Link from "next/link";
import { AdminLoginForm } from "@/components/admin-login-form";
import { BrandLogo } from "@/components/brand-logo";

export default function AdminLoginPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-[#0F172A] px-4 py-12">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#16A34A]/20 via-transparent to-transparent"
        aria-hidden
      />
      <div className="relative z-10 flex w-full max-w-lg flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <BrandLogo href="/" size="md" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Admin</h1>
            <p className="mt-1 text-sm text-slate-400">
              Platform administration. Store owners use{" "}
              <Link href="/auth?tab=store" className="font-medium text-[#4ade80] hover:underline">
                vendor sign in
              </Link>
              .
            </p>
          </div>
        </div>
        <AdminLoginForm />
      </div>
    </div>
  );
}
