import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Full-page shell: ties all routes to CSS theme variables (light/dark toggle). */
export function PageScaffold({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("min-h-screen bg-background text-foreground", className)}>{children}</div>;
}
