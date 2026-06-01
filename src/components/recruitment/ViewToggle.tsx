import { Table2, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ViewMode = "table" | "kanban";

interface ViewToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export const ViewToggle = ({ viewMode, onViewModeChange }: ViewToggleProps) => {
  return (
    <div className="flex items-center border rounded-lg p-1 bg-muted/50">
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-8 px-3 gap-2",
          viewMode === "table" && "bg-background shadow-sm"
        )}
        onClick={() => onViewModeChange("table")}
      >
        <Table2 className="h-4 w-4" />
        <span className="hidden sm:inline">Tabela</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-8 px-3 gap-2",
          viewMode === "kanban" && "bg-background shadow-sm"
        )}
        onClick={() => onViewModeChange("kanban")}
      >
        <LayoutGrid className="h-4 w-4" />
        <span className="hidden sm:inline">Kanban</span>
      </Button>
    </div>
  );
};
