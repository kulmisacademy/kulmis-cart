import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";

export function FullScreenLoader({
  label,
  className,
}: {
  /** Optional status line under the spinner. */
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm dark:bg-background/80",
        className,
      )}
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-3">
        <Spinner className="size-10 border-4" label={label ?? "Loading"} />
        {label ? (
          <p className="text-sm text-muted-foreground" aria-hidden>
            {label}
          </p>
        ) : null}
      </div>
    </div>
  );
}
