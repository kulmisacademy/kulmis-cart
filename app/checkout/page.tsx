import dynamic from "next/dynamic";

/** Separate chunk so Turbopack/HMR does not pull checkout into unrelated routes (e.g. vendor dashboard). */
const CheckoutClient = dynamic(
  () => import("@/components/checkout-client").then((m) => m.CheckoutClient),
  {
    ssr: true,
    loading: () => (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading checkout…</p>
      </div>
    ),
  },
);

export default function CheckoutPage() {
  return <CheckoutClient />;
}
