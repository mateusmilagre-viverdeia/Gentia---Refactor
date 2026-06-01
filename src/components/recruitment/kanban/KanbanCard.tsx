import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { UserCheck, Eye, XCircle, GripVertical } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { ApplicationData } from "./KanbanBoard";
import { CandidateQuickActions } from "./CandidateQuickActions";
import { formatBRT } from "@/lib/datetime";

interface KanbanCardProps {
  application: ApplicationData;
  onViewDetails: (candidateId: string) => void;
  onHire: (application: ApplicationData) => void;
  onReject: (applicationId: string) => void;
  isDragging?: boolean;
}

export const KanbanCard = ({
  application,
  onViewDetails,
  onHire,
  onReject,
  isDragging = false,
}: KanbanCardProps) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: application.id,
  });

  const style = transform ? {
    transform: CSS.Translate.toString(transform),
  } : undefined;

  const initials = application.candidateName
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "bg-card border rounded-lg p-3 shadow-sm transition-shadow cursor-grab active:cursor-grabbing",
        isDragging && "shadow-lg opacity-90 ring-2 ring-primary",
        "hover:shadow-md"
      )}
    >
      <div className="flex items-start gap-2">
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="mt-1 text-muted-foreground hover:text-foreground cursor-grab"
        >
          <GripVertical className="h-4 w-4" />
        </div>

        {/* Avatar */}
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarFallback className="text-xs bg-primary/10 text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <p className="font-medium text-sm truncate">
                  {application.candidateName}
                </p>
              </TooltipTrigger>
              <TooltipContent>
                <p>{application.candidateEmail}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <p className="text-xs text-muted-foreground truncate">
            {application.jobTitle}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-xs text-muted-foreground">
              {formatBRT(application.appliedAt, "dd/MM/yyyy")}
            </p>
            {(() => {
              const score = application.matchingScore ?? 0;
              return (
                <Badge
                  variant={
                    score >= 70
                      ? "success"
                      : score >= 40
                      ? "warning"
                      : "destructive"
                  }
                  className="text-[9px] px-1.5 py-0"
                >
                  {score}%
                </Badge>
              );
            })()}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewDetails(application.candidateId);
                  }}
                >
                  <Eye className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Ver detalhes</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {application.status !== "hired" && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-green-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      onHire(application);
                    }}
                  >
                    <UserCheck className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Contratar candidato</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onReject(application.id);
                  }}
                >
                  <XCircle className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Rejeitar candidatura</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div onClick={(e) => e.stopPropagation()}>
            <CandidateQuickActions
              applicationId={application.id}
              candidateId={application.candidateId}
              candidateName={application.candidateName}
              candidateEmail={application.candidateEmail}
              currentStage={application.status}
              jobId={application.jobId}
              onViewDetails={() => onViewDetails(application.candidateId)}
            />
          </div>
        </div>

      </div>
    </div>
  );
};
