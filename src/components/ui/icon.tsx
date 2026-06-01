import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface IconProps {
  icon: LucideIcon;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  weight?: "thin" | "light" | "regular";
  className?: string;
}

const strokeWidths = {
  thin: 1.25,
  light: 1.5,
  regular: 2,
};

const sizes = {
  xs: 14,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
};

export function Icon({ 
  icon: LucideIcon, 
  size = "md", 
  weight = "light",
  className 
}: IconProps) {
  return (
    <LucideIcon 
      size={sizes[size]}
      strokeWidth={strokeWidths[weight]}
      className={cn("shrink-0 transition-colors duration-200", className)}
    />
  );
}
