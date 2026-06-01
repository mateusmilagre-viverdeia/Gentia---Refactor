import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  X, 
  ChevronDown, 
  MoveRight, 
  XCircle, 
  Mail,
  Loader2,
  MessageSquare,
  Tag,
  UserCheck,
  Bell,
  Archive,
  Download,
  GitCompare,
} from "lucide-react";
import { useBulkActions } from "@/hooks/useBulkActions";
import { SendEmailDialog } from "./SendEmailDialog";
import { BulkTagDialog } from "./bulk/BulkTagDialog";
import { BulkAssignDialog } from "./bulk/BulkAssignDialog";
import { BulkReminderDialog, type ReminderData } from "./bulk/BulkReminderDialog";
import { CandidateComparisonDialog } from "./comparison/CandidateComparisonDialog";
import { useOrganization } from "@/contexts/OrganizationContext";
import { invokeAuthenticatedFunction } from "@/lib/authenticatedFetch";
import { toast } from "sonner";

interface BulkActionsBarProps {
  selectedCount: number;
  selectedApplicationIds: string[];
  onClearSelection: () => void;
  showEmailAction?: boolean;

  // Optional DISC bulk actions (selection-based)
  discTargets?: Array<{
    applicationId: string;
    candidateId?: string | null;
    jobId?: string | null;
    sessionId?: string | null;
  }>;

  // For tag removal - existing tags across selected items
  existingTags?: string[];

  // For export
  onExportSelected?: () => void;
}

const STAGE_OPTIONS = [
  { value: "screening", label: "Triagem" },
  { value: "interview", label: "Entrevista" },
  { value: "evaluation", label: "Avaliação" },
  { value: "offer", label: "Proposta" },
];

export function BulkActionsBar({
  selectedCount,
  selectedApplicationIds,
  onClearSelection,
  showEmailAction = true,
  discTargets,
  existingTags = [],
  onExportSelected,
}: BulkActionsBarProps) {
  const { 
    moveToStage, 
    rejectApplications, 
    addTags,
    removeTags,
    assignEvaluator,
    createReminders,
    archiveApplications,
    isMoving, 
    isRejecting,
    isAddingTags,
    isRemovingTags,
    isAssigning,
    isCreatingReminders,
    isArchiving,
    isLoading,
  } = useBulkActions();

  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [rejectWithEmailDialogOpen, setRejectWithEmailDialogOpen] = useState(false);
  const [addTagDialogOpen, setAddTagDialogOpen] = useState(false);
  const [removeTagDialogOpen, setRemoveTagDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [comparisonDialogOpen, setComparisonDialogOpen] = useState(false);

  const { currentAccount } = useOrganization();
  
  const canCompare = selectedCount >= 2 && selectedCount <= 4;

  const handleMoveToStage = (status: string) => {
    moveToStage(
      { applicationIds: selectedApplicationIds, newStatus: status },
      { onSuccess: onClearSelection }
    );
  };

  const handleRejectWithoutEmail = () => {
    rejectApplications(
      { applicationIds: selectedApplicationIds, sendEmail: false },
      { onSuccess: onClearSelection }
    );
  };

  const handleRejectWithEmail = () => {
    setRejectWithEmailDialogOpen(true);
  };

  const handleAddTags = async (tags: string[]) => {
    return new Promise<void>((resolve, reject) => {
      addTags(
        { applicationIds: selectedApplicationIds, tags },
        {
          onSuccess: () => {
            onClearSelection();
            resolve();
          },
          onError: reject,
        }
      );
    });
  };

  const handleRemoveTags = async (tags: string[]) => {
    return new Promise<void>((resolve, reject) => {
      removeTags(
        { applicationIds: selectedApplicationIds, tags },
        {
          onSuccess: () => {
            onClearSelection();
            resolve();
          },
          onError: reject,
        }
      );
    });
  };

  const handleAssignEvaluator = async (evaluatorId: string) => {
    return new Promise<void>((resolve, reject) => {
      assignEvaluator(
        { applicationIds: selectedApplicationIds, evaluatorId },
        {
          onSuccess: () => {
            onClearSelection();
            resolve();
          },
          onError: reject,
        }
      );
    });
  };

  const handleCreateReminder = async (reminder: ReminderData) => {
    return new Promise<void>((resolve, reject) => {
      createReminders(
        { applicationIds: selectedApplicationIds, reminder },
        {
          onSuccess: () => {
            onClearSelection();
            resolve();
          },
          onError: reject,
        }
      );
    });
  };

  const handleArchive = () => {
    archiveApplications(
      { applicationIds: selectedApplicationIds },
      { onSuccess: onClearSelection }
    );
  };

  const canRunDisc = Boolean(currentAccount?.id && discTargets?.length);

  const validDiscTargets = useMemo(() => {
    return (discTargets || []).filter((t) => t.candidateId && t.jobId);
  }, [discTargets]);

  const validReminderTargets = useMemo(() => {
    return (discTargets || []).filter((t) => t.sessionId);
  }, [discTargets]);

  const runInChunks = async <T,>(items: T[], chunkSize: number, fn: (item: T) => Promise<void>) => {
    for (let i = 0; i < items.length; i += chunkSize) {
      const chunk = items.slice(i, i + chunkSize);
      // eslint-disable-next-line no-await-in-loop
      await Promise.allSettled(chunk.map((x) => fn(x)));
    }
  };

  const bulkResendDiscInvite = async () => {
    if (!currentAccount?.id) return;
    if (validDiscTargets.length === 0) {
      toast.error("Seleção sem candidato/vaga suficientes para reenviar convite DISC.");
      return;
    }

    toast.message(`Enviando ${validDiscTargets.length} convite(s) DISC…`);
    let ok = 0;
    let fail = 0;

    await runInChunks(validDiscTargets, 10, async (t) => {
      const { error } = await invokeAuthenticatedFunction("send-disc-invitation", {
        accountId: currentAccount.id,
        candidateId: t.candidateId,
        jobId: t.jobId,
        manual: true,
        force: false,
      });
      if (error) fail++;
      else ok++;
    });

    toast.success(`Convites DISC: ${ok} enviado(s), ${fail} falha(s).`);
    onClearSelection();
  };

  const bulkResendDiscReminder = async (reminder_day: 1 | 3 | 5) => {
    if (!currentAccount?.id) return;
    if (validReminderTargets.length === 0) {
      toast.error("Seleção sem session_id suficiente para reenviar lembretes DISC.");
      return;
    }

    toast.message(`Enviando lembretes DISC D+${reminder_day} (${validReminderTargets.length})…`);
    let ok = 0;
    let fail = 0;

    await runInChunks(validReminderTargets, 10, async (t) => {
      const { error } = await invokeAuthenticatedFunction("send-disc-reminder-manual", {
        accountId: currentAccount.id,
        sessionId: t.sessionId,
        reminder_day,
        force: false,
      });
      if (error) fail++;
      else ok++;
    });

    toast.success(`Lembretes D+${reminder_day}: ${ok} enviado(s), ${fail} falha(s).`);
    onClearSelection();
  };

  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
        >
          <div className="flex items-center gap-2 bg-background border shadow-lg rounded-full px-4 py-2">
            <span className="text-sm font-medium text-muted-foreground">
              {selectedCount} selecionado{selectedCount > 1 ? "s" : ""}
            </span>

            <div className="h-4 w-px bg-border" />

            {/* Compare candidates */}
            {canCompare && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setComparisonDialogOpen(true)}
                disabled={isLoading}
              >
                <GitCompare className="h-4 w-4 mr-1" />
                Comparar
              </Button>
            )}

            {/* Move to stage */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" disabled={isLoading}>
                  {isMoving ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <MoveRight className="h-4 w-4 mr-1" />
                  )}
                  Mover
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {STAGE_OPTIONS.map((stage) => (
                  <DropdownMenuItem
                    key={stage.value}
                    onClick={() => handleMoveToStage(stage.value)}
                  >
                    {stage.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Tags */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" disabled={isLoading}>
                  {(isAddingTags || isRemovingTags) ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Tag className="h-4 w-4 mr-1" />
                  )}
                  Tags
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setAddTagDialogOpen(true)}>
                  Adicionar tags
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setRemoveTagDialogOpen(true)}
                  disabled={existingTags.length === 0}
                >
                  Remover tags
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Assign evaluator */}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setAssignDialogOpen(true)}
              disabled={isLoading}
            >
              {isAssigning ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <UserCheck className="h-4 w-4 mr-1" />
              )}
              Atribuir
            </Button>

            {/* Reminder */}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setReminderDialogOpen(true)}
              disabled={isLoading}
            >
              {isCreatingReminders ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Bell className="h-4 w-4 mr-1" />
              )}
              Lembrete
            </Button>

            {/* Send email */}
            {showEmailAction && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEmailDialogOpen(true)}
                disabled={isLoading}
              >
                <Mail className="h-4 w-4 mr-1" />
                Email
              </Button>
            )}

            {/* DISC bulk */}
            {discTargets && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" disabled={isLoading || !canRunDisc}>
                    <MessageSquare className="h-4 w-4 mr-1" />
                    DISC
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => void bulkResendDiscInvite()}>
                    Reenviar convite DISC
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void bulkResendDiscReminder(1)}>
                    Reenviar lembrete D+1
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void bulkResendDiscReminder(3)}>
                    Reenviar lembrete D+3
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void bulkResendDiscReminder(5)}>
                    Reenviar lembrete D+5
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <div className="h-4 w-px bg-border" />

            {/* More actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" disabled={isLoading}>
                  Mais
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {onExportSelected && (
                  <DropdownMenuItem onClick={onExportSelected}>
                    <Download className="h-4 w-4 mr-2" />
                    Exportar selecionados
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={handleArchive} disabled={isArchiving}>
                  <Archive className="h-4 w-4 mr-2" />
                  Arquivar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleRejectWithoutEmail} className="text-destructive">
                  <XCircle className="h-4 w-4 mr-2" />
                  Rejeitar sem email
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleRejectWithEmail} className="text-destructive">
                  <XCircle className="h-4 w-4 mr-2" />
                  Rejeitar e enviar email
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Clear selection */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onClearSelection}
              disabled={isLoading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Dialogs */}
          <SendEmailDialog
            open={emailDialogOpen}
            onOpenChange={setEmailDialogOpen}
            applicationIds={selectedApplicationIds}
            onSuccess={onClearSelection}
          />

          <SendEmailDialog
            open={rejectWithEmailDialogOpen}
            onOpenChange={setRejectWithEmailDialogOpen}
            applicationIds={selectedApplicationIds}
            templateType="rejection"
            onSuccess={() => {
              rejectApplications(
                { applicationIds: selectedApplicationIds, sendEmail: false },
                { onSuccess: onClearSelection }
              );
            }}
          />

          <BulkTagDialog
            open={addTagDialogOpen}
            onOpenChange={setAddTagDialogOpen}
            selectedCount={selectedCount}
            mode="add"
            existingTags={[]}
            onConfirm={handleAddTags}
            isLoading={isAddingTags}
          />

          <BulkTagDialog
            open={removeTagDialogOpen}
            onOpenChange={setRemoveTagDialogOpen}
            selectedCount={selectedCount}
            mode="remove"
            existingTags={existingTags}
            onConfirm={handleRemoveTags}
            isLoading={isRemovingTags}
          />

          <BulkAssignDialog
            open={assignDialogOpen}
            onOpenChange={setAssignDialogOpen}
            selectedCount={selectedCount}
            onConfirm={handleAssignEvaluator}
            isLoading={isAssigning}
          />

          <BulkReminderDialog
            open={reminderDialogOpen}
            onOpenChange={setReminderDialogOpen}
            selectedCount={selectedCount}
            onConfirm={handleCreateReminder}
            isLoading={isCreatingReminders}
          />

          <CandidateComparisonDialog
            open={comparisonDialogOpen}
            onOpenChange={setComparisonDialogOpen}
            applicationIds={selectedApplicationIds}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
