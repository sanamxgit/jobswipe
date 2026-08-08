import * as React from "react";
import { cn } from "@/lib/utils";

const Badge = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    variant?: "default" | "outline" | "muted";
  }
>(({ className, variant = "default", ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
      variant === "default" &&
        "bg-pink-100 text-pink-700 border border-pink-200",
      variant === "outline" && "border border-pink-200 text-pink-700 bg-white/60",
      variant === "muted" && "bg-rose-50 text-pink-500",
      className
    )}
    {...props}
  />
));
Badge.displayName = "Badge";

export { Badge };
