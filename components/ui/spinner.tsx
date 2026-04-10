import { cn } from "@/lib/utils";

export type SpinnerProps = {
  className?: string;
  /** Primary = green spin, secondary = gold accent. */
  variant?: "primary" | "secondary";
  /** Visually hidden label for screen readers. */
  label?: string;
};

export function Spinner({ className, variant = "primary", label = "Loading" }: SpinnerProps) {
  return (
    <span className="inline-flex items-center justify-center" role="status" aria-label={label}>
      <span
        className={cn(
          "inline-block size-4 shrink-0 animate-spin rounded-full border-2 border-t-transparent motion-reduce:animate-none",
          variant === "primary" ? "border-brand-primary" : "border-secondary",
          className,
        )}
        aria-hidden
      />
    </span>
  );
}
