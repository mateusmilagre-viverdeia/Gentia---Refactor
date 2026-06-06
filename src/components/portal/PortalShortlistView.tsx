import { useState } from "react";
import { ArrowLeft, Users, MessageSquarePlus, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ShortlistCandidateCard } from "./ShortlistCandidateCard";
import { FeedbackDialog } from "./FeedbackDialog";
import { usePortalShortlist, usePortalFeedbacks, useSubmitFeedback } from "@/hooks/usePortalData";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { PortalAuthData } from "@/hooks/usePortalAuth";

interface PortalShortlistViewProps {
  auth: PortalAuthData;
  jobId: string;
  jobTitle: string;
  onBack: () => void;
}

export function PortalShortlistView({ auth, jobId, jobTitle, onBack }: PortalShortlistViewProps) {
  const { data: shortlist = [], isLoading } = usePortalShortlist(auth.access.token_acesso, jobId);
  const { data: feedbacks = [] } = usePortalFeedbacks(auth.access.token_acesso);
  const submitFeedback = useSubmitFeedback();

  const [feedbackDialog, setFeedbackDialog] = useState<{
    open: boolean;
    candidateId: string;
    candidateName: string;
    decisao: string;
  }>({ open: false, candidateId: "", candidateName: "", decisao: "" });

  const [moreDialogOpen, setMoreDialogOpen] = useState(false);
  const [moreMessage, setMoreMessage] = useState("");
  const [moreLoading, setMoreLoading] = useState(false);
  const [doubtDialogOpen, setDoubtDialogOpen] = useState(false);
  const [doubtMessage, setDoubtMessage] = useState("");
  const [doubtLoading, setDoubtLoading] = useState(false);

  const handleFeedback = (candidateId: string, candidateName: string, decisao: string) => {
    if (decisao === "aprovado") {
      submitFeedback.mutate({
        token: auth.access.token_acesso,
        vaga_id: jobId,
        candidato_id: candidateId,
        decisao: "aprovado",
      });
    } else {
      setFeedbackDialog({ open: true, candidateId, candidateName, decisao });
    }
  };

  const handleSubmitRejection = (motivo: string) => {
    submitFeedback.mutate({
      token: auth.access.token_acesso,
      vaga_id: jobId,
      candidato_id: feedbackDialog.candidateId,
      decisao: "reprovado",
      motivo: motivo || undefined,
    });
    setFeedbackDialog({ open: false, candidateId: "", candidateName: "", decisao: "" });
  };

  const getCandidateFeedback = (candidateId: string) => {
    return feedbacks.find((f: any) => f.candidato_id === candidateId && f.vaga_id === jobId);
  };

  const sendMessageToRecruiter = async (message: string, type: "mais_candidatos" | "duvida") => {
    try {
      // Telefone/destinatário e o envio ficam no SERVIDOR (portal-data → whatsapp-send).
      await supabase.functions.invoke("portal-data", {
        body: {
          token: auth.access.token_acesso,
          resource: "notify_recruiter",
          params: { jobId, message, type },
        },
      });
    } catch {
      // best effort
    }
  };

  const handleMoreCandidates = async () => {
    if (!moreMessage.trim()) { toast.error("Descreva o que precisa"); return; }
    setMoreLoading(true);
    await sendMessageToRecruiter(moreMessage, "mais_candidatos");
    toast.success("Solicitação enviada ao recrutador!");
    setMoreLoading(false);
    setMoreDialogOpen(false);
    setMoreMessage("");
  };

  const handleDoubt = async () => {
    if (!doubtMessage.trim()) { toast.error("Descreva sua dúvida"); return; }
    setDoubtLoading(true);
    await sendMessageToRecruiter(doubtMessage, "duvida");
    toast.success("Dúvida enviada ao recrutador!");
    setDoubtLoading(false);
    setDoubtDialogOpen(false);
    setDoubtMessage("");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold">Shortlist</h2>
          <p className="text-muted-foreground">{jobTitle} · {shortlist.length} candidato(s)</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setMoreDialogOpen(true)} className="gap-1.5">
            <MessageSquarePlus className="h-4 w-4" />
            Preciso de mais candidatos
          </Button>
          <Button variant="outline" size="sm" onClick={() => setDoubtDialogOpen(true)} className="gap-1.5">
            <HelpCircle className="h-4 w-4" />
            Tenho dúvidas
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 w-full" />)}
        </div>
      ) : shortlist.length === 0 ? (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">Shortlist em preparação</h3>
          <p className="text-muted-foreground">Os candidatos selecionados aparecerão aqui em breve.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {shortlist.map((app: any) => {
            const candidate = app.recruitment_candidates;
            if (!candidate) return null;
            const existingFeedback = getCandidateFeedback(candidate.id);
            
            return (
              <ShortlistCandidateCard
                key={app.id}
                candidate={candidate}
                existingFeedback={existingFeedback}
                onApprove={() => handleFeedback(candidate.id, candidate.name, "aprovado")}
                onReject={() => handleFeedback(candidate.id, candidate.name, "reprovado")}
                jobId={jobId}
              />
            );
          })}
        </div>
      )}

      <FeedbackDialog
        open={feedbackDialog.open}
        candidateName={feedbackDialog.candidateName}
        onClose={() => setFeedbackDialog({ open: false, candidateId: "", candidateName: "", decisao: "" })}
        onSubmit={handleSubmitRejection}
      />

      {/* More candidates dialog */}
      <Dialog open={moreDialogOpen} onOpenChange={setMoreDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Preciso de mais candidatos</DialogTitle>
            <DialogDescription>Descreva o perfil ou ajuste que gostaria para receber mais opções.</DialogDescription>
          </DialogHeader>
          <Textarea value={moreMessage} onChange={e => setMoreMessage(e.target.value)} placeholder="Ex: Preciso de candidatos com mais experiência em..." rows={4} />
          <Button onClick={handleMoreCandidates} disabled={moreLoading} className="w-full">
            {moreLoading ? "Enviando..." : "Enviar solicitação"}
          </Button>
        </DialogContent>
      </Dialog>

      {/* Doubt dialog */}
      <Dialog open={doubtDialogOpen} onOpenChange={setDoubtDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tenho dúvidas</DialogTitle>
            <DialogDescription>Descreva sua dúvida e o recrutador entrará em contato.</DialogDescription>
          </DialogHeader>
          <Textarea value={doubtMessage} onChange={e => setDoubtMessage(e.target.value)} placeholder="Sua dúvida..." rows={4} />
          <Button onClick={handleDoubt} disabled={doubtLoading} className="w-full">
            {doubtLoading ? "Enviando..." : "Enviar dúvida"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
