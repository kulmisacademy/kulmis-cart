import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const TOOLTIP = "Verified store — identity checked by LAAS24";

export type VerifiedBadgeProps = {
  className?: string;
  /** `sm` for dense cards, `md` default, `lg` for store headers */
  size?: "sm" | "md" | "lg";
};

export function VerifiedBadge({ className, size = "md" }: VerifiedBadgeProps) {
  const icon =
    size === "sm" ? "size-3" : size === "lg" ? "size-4" : "size-3.5";
  const text =
    size === "sm" ? "text-[10px]" : size === "lg" ? "text-sm" : "text-xs";
  const pad =
    size === "sm" ? "gap-0.5 px-1.5 py-0.5" : size === "lg" ? "gap-1.5 px-3 py-1" : "gap-1 px-2 py-0.5";

  return (
    <span
      data-verified-badge
      title={TOOLTIP}
      className={cn(
        "inline-flex shrink-0 items-center rounded-full bg-secondary font-semibold text-black shadow-[0_0_12px_-2px_rgba(250,204,21,0.45)] ring-1 ring-secondary/50",
        "dark:text-black dark:shadow-[0_0_14px_-2px_rgba(253,224,71,0.35)] dark:ring-secondary/40",
        pad,
        text,
        className,
      )}
      role="img"
      aria-label={TOOLTIP}
    >
      <BadgeCheck className={cn(icon, "shrink-0 text-primary")} strokeWidth={2.5} aria-hidden />
      <span>Verified</span>
    </span>
  );
}
