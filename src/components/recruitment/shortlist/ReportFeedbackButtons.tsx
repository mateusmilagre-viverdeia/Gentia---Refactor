import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ThumbsUp, ThumbsDown, Loader2 } from "lucide-react";
import { sendWhatsAppMessage } from "@/lib/whatsapp/sendWhatsAppMessage";

interface ReportFeedbackButtonsProps {
  candidateId: string;
  candidateName: string;
  accountId: string;
  jobId: string;
  clienteId?: string | null;
}

async function notifyRecruiterOnApproval(jobId: string, candidateName: string) {
  try {
    const jobRes = await supabase.from("recruitment_jobs").select("title, account_id").eq("id", jobId).maybeSingle();
    const job = jobRes.data;
    if (!job?.account_id) return;

    const membersRes = await supabase.from("account_members").select("user_id, role").eq("account_id", job.account_id);
    const owner = (membersRes.data || []).find((m) => m.role === "owner") || (membersRes.data || [])[0];
    if (!owner?.user_id) return;

    const empRes: { data: any } = await (supabase as any).from("employees").select("phone").eq("user_id", owner.user_id).maybeSingle();
    const empPhone = empRes.data?.phone;
    if (!empPhone) return;

    await sendWhatsAppMessage({
      toPhoneE164: empPhone,
      message: `🎯 O cliente aprovou o candidato "${candidateName}" para a vaga "${job.title}". Acesse a plataforma para dar andamento.`,
    });
  } catch {
    // Best effort - silent fail
  }
}

export function ReportFeedbackButtons({ candidateId, candidateName, accountId, jobId, clienteId }: ReportFeedbackButtonsProps) {
  const [feedbackGiven, setFeedbackGiven] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [loading, setLoading] = useState(false);

  const submitFeedback = async (decisao: "aprovado" | "reprovado", motivo?: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.from("portal_feedbacks").insert({
        account_id: accountId,
        candidato_id: candidateId,
        vaga_id: jobId,
        cliente_id: clienteId || null,
        decisao,
        motivo: motivo || null,
      });

      if (error) throw error;
      setFeedbackGiven(decisao);
      toast.success(decisao === "aprovado" ? "Interesse registrado!" : "Feedback registrado!");
      setRejectOpen(false);

      // Notify recruiter via WhatsApp when candidate is approved (best effort)
      if (decisao === "aprovado" && jobId) {
        notifyRecruiterOnApproval(jobId, candidateName).catch(() => {});
      }
    } catch {
      toast.error("Erro ao salvar feedback");
    } finally {
      setLoading(false);
    }
  };

  if (feedbackGiven) {
    return (
      <div className={`text-xs font-medium px-3 py-1.5 rounded-md ${
        feedbackGiven === "aprovado" 
          ? "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400" 
          : "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400"
      }`}>
        {feedbackGiven === "aprovado" ? "✅ Interesse registrado" : "❌ Feedback enviado"}
      </div>
    );
  }

  return (
    <>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          className="text-green-600 border-green-200 hover:bg-green-50 dark:border-green-800 dark:hover:bg-green-950/30"
          onClick={() => submitFeedback("aprovado")}
          disabled={loading}
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ThumbsUp className="h-3.5 w-3.5 mr-1" />}
          Tenho interesse
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/30"
          onClick={() => setRejectOpen(true)}
          disabled={loading}
        >
          <ThumbsDown className="h-3.5 w-3.5 mr-1" />
          Não é o perfil
        </Button>
      </div>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Feedback sobre {candidateName}</DialogTitle>
            <DialogDescription>Por que este candidato não é adequado?</DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            placeholder="Motivo (opcional)..."
            rows={3}
          />
          <Button
            onClick={() => submitFeedback("reprovado", rejectReason)}
            disabled={loading}
            className="w-full"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Enviar feedback
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
