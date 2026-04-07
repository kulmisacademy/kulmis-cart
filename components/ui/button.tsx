import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-all duration-300 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-brand-accent text-white shadow-md hover:scale-105 hover:shadow-xl hover:brightness-105 active:scale-95",
        destructive: "bg-red-600 text-white shadow-sm hover:bg-red-700",
        outline:
          "border border-border bg-background shadow-sm hover:scale-105 hover:border-brand-primary/40 hover:bg-muted/50 hover:shadow-xl active:scale-95",
        secondary:
          "bg-muted text-foreground shadow-sm hover:bg-muted/80 dark:hover:bg-muted/70",
        ghost: "hover:bg-muted hover:scale-105 active:scale-95",
        link: "text-brand-primary underline-offset-4 hover:underline dark:text-brand-primary/90",
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
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
