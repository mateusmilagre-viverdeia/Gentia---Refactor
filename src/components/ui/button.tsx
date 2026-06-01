import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  cn(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "rounded-lg text-sm font-medium",
    "ring-offset-background transition-all duration-300",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0"
  ),
  {
    variants: {
      variant: {
        default: cn(
          "bg-primary text-primary-foreground",
          "hover:bg-primary/85",
          "shadow-sm hover:shadow"
        ),
        destructive: cn(
          "bg-destructive/90 text-destructive-foreground",
          "hover:bg-destructive/80",
          "shadow-sm"
        ),
        outline: cn(
          "border border-border/60 bg-background",
          "hover:bg-muted/50 hover:border-border",
          "text-foreground"
        ),
        secondary: cn(
          "bg-secondary text-secondary-foreground",
          "hover:bg-secondary/70"
        ),
        ghost: "hover:bg-muted/60 text-foreground/80 hover:text-foreground",
        link: "text-foreground/70 underline-offset-4 hover:underline hover:text-foreground",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-10 rounded-lg px-6",
        icon: "h-9 w-9",
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
