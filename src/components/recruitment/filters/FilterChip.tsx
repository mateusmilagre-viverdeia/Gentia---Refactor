import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FilterChipProps {
  label: string;
  value: string;
  onRemove: () => void;
  className?: string;
}

export function FilterChip({ label, value, onRemove, className }: FilterChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-3 py-1 text-sm font-medium",
        className
      )}
    >
      <span className="text-muted-foreground text-xs">{label}:</span>
      {value}
      <button
        type="button"
        onClick={onRemove}
        className="ml-1 rounded-full p-0.5 hover:bg-primary/20 transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </span>
  );
}
