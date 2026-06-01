import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { getTagCategory } from "@/hooks/useCandidateTags";

interface TagBadgeProps {
  tag: string;
  onRemove?: () => void;
  className?: string;
  size?: "sm" | "md";
}

export function TagBadge({ tag, onRemove, className, size = "sm" }: TagBadgeProps) {
  const { color } = getTagCategory(tag);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-medium",
        color,
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm",
        className
      )}
    >
      {tag}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 rounded-full p-0.5 hover:bg-black/10 transition-colors"
        >
          <X className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
        </button>
      )}
    </span>
  );
}
