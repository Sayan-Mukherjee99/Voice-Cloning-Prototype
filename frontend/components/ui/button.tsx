import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-xs font-mono font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/30 hover:text-white shadow-sm",
        destructive:
          "bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 hover:text-white shadow-sm",
        outline:
          "border border-white/10 bg-white/5 hover:bg-white/10 text-white shadow-sm",
        secondary:
          "bg-white/10 text-white hover:bg-white/15",
        ghost: "hover:bg-white/5 text-white/70 hover:text-white",
        success:
          "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 hover:text-white shadow-sm",
        warning:
          "bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 hover:text-white shadow-sm",
      },
      size: {
        default: "h-8 px-3 py-1.5",
        sm: "h-7 rounded-md px-2.5 text-[11px]",
        lg: "h-9 rounded-md px-4 text-xs font-semibold",
        icon: "h-8 w-8",
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
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
