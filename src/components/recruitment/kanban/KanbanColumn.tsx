import { useDroppable } from "@dnd-kit/core";
import { KanbanCard } from "./KanbanCard";
import type { ApplicationData } from "./KanbanBoard";
import { cn } from "@/lib/utils";

interface KanbanColumnProps {
  id: string;
  title: string;
  color: string;
  applications: ApplicationData[];
  onViewDetails: (candidateId: string) => void;
  onHire: (application: ApplicationData) => void;
  onReject: (applicationId: string) => void;
}

export const KanbanColumn = ({
  id,
  title,
  color,
  applications,
  onViewDetails,
  onHire,
  onReject,
}: KanbanColumnProps) => {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col w-72 min-h-[500px] rounded-lg border bg-muted/30 transition-colors",
        isOver && "ring-2 ring-primary ring-offset-2 bg-muted/50"
      )}
    >
      {/* Column Header */}
      <div className="flex items-center gap-2 p-3 border-b">
        <div className={cn("w-2 h-2 rounded-full", color)} />
        <span className="font-medium text-sm">{title}</span>
        <span className="ml-auto text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
          {applications.length}
        </span>
      </div>

      {/* Cards Container */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto">
        {applications.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-xs text-muted-foreground">
            Arraste candidatos aqui
          </div>
        ) : (
          applications.map(application => (
            <KanbanCard
              key={application.id}
              application={application}
              onViewDetails={onViewDetails}
              onHire={onHire}
              onReject={onReject}
            />
          ))
        )}
      </div>
    </div>
  );
};
