import { cn } from "@/lib/utils";

interface ValueBadgeProps {
  label: string;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
}

export function ValueBadge({ label, selected = false, onClick, className }: ValueBadgeProps) {
  return (
    <button
      type="button"
      className={cn(
        "w-full px-4 py-3 rounded-lg border text-left transition-all text-sm",
        "hover:shadow-md hover:border-primary/50",
        selected
          ? "bg-primary/10 border-primary text-primary font-medium"
          : "bg-background border-border hover:bg-accent",
        className
      )}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
