import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { SortDirection } from "@/hooks/useTableSort";

interface SortableHeaderProps {
  label: string;
  sortKey: string;
  currentSortKey: string;
  direction: SortDirection;
  onSort: (key: string) => void;
  className?: string;
}

export function SortableHeader({
  label,
  sortKey,
  currentSortKey,
  direction,
  onSort,
  className,
}: SortableHeaderProps) {
  const isActive = currentSortKey === sortKey && direction !== null;

  const renderIcon = () => {
    if (!isActive) {
      return <ArrowUpDown className="h-3 w-3 opacity-50" />;
    }
    if (direction === "asc") {
      return <ArrowUp className="h-3 w-3" />;
    }
    return <ArrowDown className="h-3 w-3" />;
  };

  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          "flex items-center gap-1 hover:text-foreground transition-colors",
          isActive && "text-foreground font-medium"
        )}
      >
        {label}
        {renderIcon()}
      </button>
    </TableHead>
  );
}
