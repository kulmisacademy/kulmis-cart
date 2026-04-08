import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "relative inline-flex touch-manipulation items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-md text-sm font-semibold transition-all duration-300 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-brand-accent text-white shadow-md hover:scale-105 hover:shadow-xl hover:brightness-105 active:scale-[0.98]",
        destructive: "bg-red-600 text-white shadow-sm hover:bg-red-700",
        outline:
          "border border-border bg-background shadow-sm hover:scale-105 hover:border-brand-primary/40 hover:bg-muted/50 hover:shadow-xl active:scale-[0.98]",
        secondary:
          "bg-muted text-foreground shadow-sm hover:bg-muted/80 dark:hover:bg-muted/70",
        ghost: "hover:bg-muted hover:scale-105 active:scale-[0.98]",
        link: "text-brand-primary underline-offset-4 hover:underline active:scale-100 dark:text-brand-primary/90",
      },
      size: {
        default: "h-11 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-12 rounded-xl px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** Shows spinner, disables clicks, and sets `aria-busy` (use with try/finally to clear). */
  loading?: boolean;
}

function loadingIconClass(
  variant: NonNullable<VariantProps<typeof buttonVariants>["variant"]> | undefined,
): string {
  switch (variant) {
    case "destructive":
    case "default":
      return "text-white";
    case "link":
      return "text-brand-primary";
    default:
      return "text-foreground";
  }
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, disabled, children, ...props }, ref) => {
    const Comp = asChild && !loading ? Slot : "button";
    const busy = Boolean(loading);
    const v = variant ?? "default";
    return (
      <Comp
        className={cn(
          buttonVariants({ variant, size, className }),
          busy && "cursor-not-allowed opacity-80",
        )}
        ref={ref}
        disabled={loading || disabled}
        aria-busy={busy || undefined}
        {...props}
      >
        {loading ? (
          <Loader2
            className={cn("size-4 shrink-0 animate-spin motion-reduce:animate-none", loadingIconClass(v))}
            aria-hidden
          />
        ) : null}
        {children}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
