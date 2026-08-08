import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400/60 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-pink-500 text-white hover:bg-pink-400 shadow-lg shadow-pink-500/25",
        secondary:
          "bg-white text-pink-900 hover:bg-pink-50 border border-pink-200",
        ghost: "hover:bg-pink-100/80 text-pink-900",
        outline:
          "border border-pink-200 bg-white/70 hover:bg-pink-50 text-pink-900",
        danger:
          "bg-rose-100 text-rose-600 border border-rose-200 hover:bg-rose-200/70",
        favorite:
          "bg-fuchsia-100 text-fuchsia-700 border border-fuchsia-200 hover:bg-fuchsia-200/70",
        save:
          "bg-pink-500 text-white hover:bg-pink-400 shadow-lg shadow-pink-400/30",
      },
      size: {
        default: "h-11 px-5 py-2",
        sm: "h-9 rounded-lg px-3",
        lg: "h-12 rounded-2xl px-6 text-base",
        icon: "h-14 w-14 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
