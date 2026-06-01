import { useState } from "react";
import { 
  DndContext, 
  DragEndEvent, 
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanCard } from "./KanbanCard";
import { useRecruitmentActions } from "@/hooks/useRecruitmentActions";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export interface ApplicationData {
  id: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  jobId: string;
  jobTitle: string;
  jobDepartment: string;
  status: string;
  stageId?: string | null;
  interviewStatus: string | null;
  appliedAt: Date;
  evaluatedAt: Date | null;
  matchingScore?: number | null;
}

export interface PipelineStage {
  id: string;
  name: string;
  color: string;
  icon?: string | null;
  position: number;
  isSystemStage?: boolean;
}

interface KanbanBoardProps {
  applications: ApplicationData[];
  stages?: PipelineStage[];
  onViewDetails: (candidateId: string) => void;
  onHire: (application: ApplicationData) => void;
  onReject: (applicationId: string) => void;
}

// Default stages when no custom stages are provided
// Follows: Aplicado → Fit Cultural → DISC → Fit Técnico → Avaliação Final → Referências → Proposta → Contratado → Desqualificado
const DEFAULT_PIPELINE_STAGES: PipelineStage[] = [
  { id: "applied", name: "Aplicado", color: "bg-blue-500", position: 0, isSystemStage: true },
  { id: "cultural", name: "Fit Cultural", color: "bg-purple-500", position: 1 },
  { id: "disc", name: "Fit Comportamental (DISC)", color: "bg-indigo-500", position: 2 },
  { id: "technical", name: "Fit Técnico", color: "bg-cyan-500", position: 3 },
  { id: "evaluation", name: "Avaliação Final", color: "bg-amber-500", position: 4 },
  { id: "references", name: "Referências", color: "bg-teal-500", position: 5 },
  { id: "offer", name: "Proposta", color: "bg-emerald-500", position: 6 },
  { id: "hired", name: "Contratado", color: "bg-green-600", position: 7, isSystemStage: true },
  { id: "desqualificado", name: "Desqualificado", color: "bg-rose-600", position: 8, isSystemStage: true },
];

export const KanbanBoard = ({ 
  applications,
  stages: customStages,
  onViewDetails, 
  onHire,
  onReject 
}: KanbanBoardProps) => {
  // Use custom stages if provided, otherwise use default
  const pipelineStages = customStages && customStages.length > 0 ? customStages : DEFAULT_PIPELINE_STAGES;
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pendingMove, setPendingMove] = useState<{ id: string; newStatus: string } | null>(null);
  const [notifyCandidate, setNotifyCandidate] = useState(true);
  const { updateApplicationStatus } = useRecruitmentActions();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const activeApplication = activeId 
    ? applications.find(app => app.id === activeId) 
    : null;

  const getApplicationsByStatus = (status: string) => {
    return applications.filter(app => app.status === status);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const applicationId = active.id as string;
    const newStatus = over.id as string;
    
    const application = applications.find(app => app.id === applicationId);
    if (!application || application.status === newStatus) return;

    // Confirm before moving to rejected / disqualified
    if (newStatus === "rejected" || newStatus === "desqualificado") {
      setPendingMove({ id: applicationId, newStatus });
      return;
    }

    // For "hired" we MUST collect financial data — open the HireCandidateDialog
    if (newStatus === "hired") {
      onHire(application);
      return;
    }

    // Direct update for other statuses
    updateApplicationStatus.mutate({
      applicationId,
      status: newStatus,
      candidateId: application.candidateId,
      jobId: application.jobId,
      previousStatus: application.status,
    });
  };

  const handleConfirmReject = () => {
    if (pendingMove) {
      const application = applications.find(app => app.id === pendingMove.id);
      updateApplicationStatus.mutate({ 
        applicationId: pendingMove.id, 
        status: pendingMove.newStatus,
        candidateId: application?.candidateId,
        jobId: application?.jobId,
        previousStatus: application?.status,
        notifyCandidate,
      });
      setPendingMove(null);
      setNotifyCandidate(true);
    }
  };

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <ScrollArea className="w-full">
          <div className="flex gap-4 pb-4 min-w-max">
            {pipelineStages.map(stage => (
              <KanbanColumn
                key={stage.id}
                id={stage.id}
                title={stage.name}
                color={stage.color}
                applications={getApplicationsByStatus(stage.id)}
                onViewDetails={onViewDetails}
                onHire={onHire}
                onReject={onReject}
              />
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        <DragOverlay>
          {activeApplication && (
            <KanbanCard
              application={activeApplication}
              onViewDetails={onViewDetails}
              onHire={onHire}
              onReject={onReject}
              isDragging
            />
          )}
        </DragOverlay>
      </DndContext>

      {/* Status change confirmation dialog */}
      <AlertDialog open={!!pendingMove} onOpenChange={(open) => { if (!open) { setPendingMove(null); setNotifyCandidate(true); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingMove?.newStatus === "desqualificado"
                ? "Mover para Desqualificado?"
                : "Mover para Rejeitado?"}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  {pendingMove?.newStatus === "desqualificado"
                    ? "Esta ação marcará a candidatura como desqualificada pelo corte de nota."
                    : "Esta ação marcará a candidatura como rejeitada."}
                </p>
                {notifyCandidate && (
                  <p className="text-sm text-muted-foreground">
                    O candidato receberá <strong>e-mail</strong> e <strong>WhatsApp</strong> de reprovação.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex items-center gap-2 px-1">
            <Checkbox
              id="notify-candidate"
              checked={notifyCandidate}
              onCheckedChange={(v) => setNotifyCandidate(v === true)}
            />
            <Label htmlFor="notify-candidate" className="text-sm font-normal cursor-pointer">
              Notificar o candidato (e-mail + WhatsApp)
            </Label>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmReject}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
