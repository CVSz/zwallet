import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        neutral: "border-white/20 bg-white/10 text-slate-200",
        success: "border-emerald-300/40 bg-emerald-400/10 text-emerald-200",
        warning: "border-amber-300/40 bg-amber-400/10 text-amber-100",
        danger: "border-rose-300/40 bg-rose-500/10 text-rose-200",
        info: "border-cyan-300/40 bg-cyan-400/10 text-cyan-100",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  }
);

export interface BadgeProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
