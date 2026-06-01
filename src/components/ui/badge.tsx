import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  cn(
    "inline-flex items-center rounded-full px-2.5 py-0.5",
    "text-[10px] font-medium tracking-wide uppercase",
    "transition-all duration-200"
  ),
  {
    variants: {
      variant: {
        default: "bg-primary/8 text-primary border-0 dark:bg-primary/15",
        secondary: "bg-muted/80 text-muted-foreground border-0",
        destructive: "bg-destructive/8 text-destructive border-0 dark:bg-destructive/15",
        outline: "border border-border/50 text-muted-foreground bg-transparent",
        // Variantes sutis - dessaturadas
        success: "text-emerald-600/90 bg-emerald-50/40 dark:text-emerald-400/90 dark:bg-emerald-950/25",
        warning: "text-amber-600/90 bg-amber-50/40 dark:text-amber-400/90 dark:bg-amber-950/25",
        info: "text-blue-600/90 bg-blue-50/40 dark:text-blue-400/90 dark:bg-blue-950/25",
        purple: "text-purple-600/90 bg-purple-50/40 dark:text-purple-400/90 dark:bg-purple-950/25",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
