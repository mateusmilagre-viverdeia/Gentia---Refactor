import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  MoreHorizontal,
  Mail,
  MessageCircle,
  MoveRight,
  StickyNote,
  History,
  XCircle,
  ExternalLink,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { useBulkActions } from "@/hooks/useBulkActions";
import { useAccount } from "@/hooks/useAccount";
import { useEPRole } from "@/hooks/useEPRole";
import { ResetStepDialog } from "@/components/recruitment/ResetStepDialog";
import { GenerateTestLinkDialog } from "@/components/recruitment/GenerateTestLinkDialog";
import { useOrganization } from "@/contexts/OrganizationContext";

interface CandidateQuickActionsProps {
  applicationId: string;
  candidateId: string;
  candidateName: string;
  candidateEmail?: string;
  candidatePhone?: string;
  currentStage: string;
  jobId?: string;
  onViewDetails: () => void;
  onAddNote?: () => void;
  onViewTimeline?: () => void;
  stages?: Array<{ value: string; label: string }>;
}

const DEFAULT_STAGES = [
  { value: "applied", label: "Aplicado" },
  { value: "cultural_fit", label: "Fit Cultural" },
  { value: "disc", label: "DISC" },
  { value: "technical", label: "Fit Técnico" },
  { value: "final_evaluation", label: "Avaliação Final" },
  { value: "references", label: "Referências" },
  { value: "offer", label: "Proposta" },
  { value: "hired", label: "Contratado" },
];

export function CandidateQuickActions({
  applicationId,
  candidateId,
  candidateName,
  candidateEmail,
  candidatePhone,
  currentStage,
  jobId,
  onViewDetails,
  onAddNote,
  onViewTimeline,
  stages = DEFAULT_STAGES,
}: CandidateQuickActionsProps) {
  const { moveToStage, rejectApplications, isMoving, isRejecting } = useBulkActions();
  const { isAdminRH } = useAccount();
  const { isSuperAdmin, isEPConsultant } = useEPRole();
  const canManageRecruitment = isAdminRH || isSuperAdmin || isEPConsultant;
  const { currentAccount } = useOrganization();
  const [open, setOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [testLinkDialogOpen, setTestLinkDialogOpen] = useState(false);

  const handleMoveToStage = (newStage: string) => {
    if (newStage === currentStage) {
      toast.info("O candidato já está nesta etapa");
      return;
    }

    moveToStage(
      { applicationIds: [applicationId], newStatus: newStage },
      {
        onSuccess: () => {
          setOpen(false);
        },
      }
    );
  };

  const handleReject = () => {
    rejectApplications(
      { applicationIds: [applicationId], sendEmail: false },
      {
        onSuccess: () => {
          setOpen(false);
        },
      }
    );
  };

  const handleSendEmail = () => {
    if (!candidateEmail) {
      toast.error("Candidato não possui email cadastrado");
      return;
    }
    window.open(`mailto:${candidateEmail}?subject=Processo Seletivo - ${candidateName}`, "_blank");
    setOpen(false);
  };

  const handleSendWhatsApp = () => {
    if (!candidatePhone) {
      toast.error("Candidato não possui telefone cadastrado");
      return;
    }
    const cleanPhone = candidatePhone.replace(/\D/g, "");
    const phone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
    window.open(`https://wa.me/${phone}`, "_blank");
    setOpen(false);
  };

  const isLoading = isMoving || isRejecting;

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onClick={onViewDetails}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Ver Detalhes
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={handleSendEmail} disabled={!candidateEmail}>
            <Mail className="h-4 w-4 mr-2" />
            Enviar Email
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleSendWhatsApp} disabled={!candidatePhone}>
            <MessageCircle className="h-4 w-4 mr-2" />
            Enviar WhatsApp
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuSub>
            <DropdownMenuSubTrigger disabled={isLoading}>
              <MoveRight className="h-4 w-4 mr-2" />
              Mover para Etapa
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {stages.map((stage) => (
                <DropdownMenuItem
                  key={stage.value}
                  onClick={() => handleMoveToStage(stage.value)}
                  disabled={stage.value === currentStage}
                  className={stage.value === currentStage ? "bg-muted" : ""}
                >
                  {stage.label}
                  {stage.value === currentStage && (
                    <span className="ml-auto text-xs text-muted-foreground">(atual)</span>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          {/* Reset Step - only for admins */}
          {canManageRecruitment && jobId && (
            <DropdownMenuItem onClick={() => { setOpen(false); setResetDialogOpen(true); }}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Liberar para Refazer Etapa
            </DropdownMenuItem>
          )}

          {/* Generate Test Link - only for admins */}
          {canManageRecruitment && jobId && currentAccount && (
            <DropdownMenuItem onClick={() => { setOpen(false); setTestLinkDialogOpen(true); }}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Gerar Link de Teste
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          {onAddNote && (
            <DropdownMenuItem onClick={onAddNote}>
              <StickyNote className="h-4 w-4 mr-2" />
              Adicionar Nota
            </DropdownMenuItem>
          )}
          {onViewTimeline && (
            <DropdownMenuItem onClick={onViewTimeline}>
              <History className="h-4 w-4 mr-2" />
              Ver Timeline
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={handleReject}
            disabled={isLoading}
            className="text-destructive focus:text-destructive"
          >
            <XCircle className="h-4 w-4 mr-2" />
            Rejeitar Candidato
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Reset Step Dialog */}
      {jobId && (
        <ResetStepDialog
          open={resetDialogOpen}
          onOpenChange={setResetDialogOpen}
          candidateId={candidateId}
          candidateName={candidateName}
          jobId={jobId}
          applicationId={applicationId}
        />
      )}

      {/* Generate Test Link Dialog */}
      {jobId && currentAccount && (
        <GenerateTestLinkDialog
          open={testLinkDialogOpen}
          onOpenChange={setTestLinkDialogOpen}
          candidateId={candidateId}
          candidateName={candidateName}
          jobId={jobId}
          accountId={currentAccount.id}
        />
      )}
    </>
  );
}
