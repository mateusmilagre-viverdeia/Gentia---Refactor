import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Sparkles,
  Send,
  Eye,
  Edit3,
  Check,
  AlertCircle,
  MessageCircle,
} from "lucide-react";
import { toast } from "sonner";

interface TalentReactivationModalProps {
  open: boolean;
  onClose: () => void;
  jobId: string;
  accountId: string;
  candidateIds: string[];
}

interface MessagePreview {
  candidate_id: string;
  candidate_name: string;
  candidate_phone?: string;
  message: string;
  match_score: number;
  history_count: number;
  last_process?: string;
  status: string;
  edited?: boolean;
}

export function TalentReactivationModal({
  open,
  onClose,
  jobId,
  accountId,
  candidateIds,
}: TalentReactivationModalProps) {
  const [previews, setPreviews] = useState<MessagePreview[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [step, setStep] = useState<"generate" | "review" | "sending" | "done">("generate");

  const generateMessages = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("talent-reactivation-agent", {
        body: { job_id: jobId, account_id: accountId, candidate_ids: candidateIds, mode: "preview" },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setPreviews(data.results || []);
      setStep("review");
    },
    onError: () => {
      toast.error("Erro ao gerar mensagens de reativação");
    },
  });

  const sendMessages = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("talent-reactivation-agent", {
        body: {
          job_id: jobId,
          account_id: accountId,
          candidate_ids: previews.filter((p) => p.status === "generated").map((p) => p.candidate_id),
          mode: "send",
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      const sent = data.results?.filter((r: any) => r.status === "sent").length || 0;
      toast.success(`${sent} mensagens de reativação enviadas`);
      setStep("done");
    },
    onError: () => {
      toast.error("Erro ao enviar mensagens");
    },
  });

  const startEditing = (preview: MessagePreview) => {
    setEditingId(preview.candidate_id);
    setEditText(preview.message);
  };

  const saveEdit = () => {
    if (!editingId) return;
    setPreviews((prev) =>
      prev.map((p) =>
        p.candidate_id === editingId ? { ...p, message: editText, edited: true } : p
      )
    );
    setEditingId(null);
    setEditText("");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Reativação de Candidatos do Banco
          </DialogTitle>
        </DialogHeader>

        {step === "generate" && (
          <div className="text-center py-8 space-y-4">
            <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground/30" />
            <div>
              <p className="font-medium">
                {candidateIds.length} candidato(s) selecionado(s) para reativação
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                A IA vai gerar mensagens personalizadas com base no histórico de cada candidato.
              </p>
            </div>
            <Button onClick={() => generateMessages.mutate()} disabled={generateMessages.isPending}>
              {generateMessages.isPending ? (
                <>
                  <Sparkles className="h-4 w-4 mr-2 animate-pulse" />
                  Gerando mensagens...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Gerar Mensagens
                </>
              )}
            </Button>
          </div>
        )}

        {step === "review" && (
          <ScrollArea className="max-h-[55vh]">
            <div className="space-y-4 pr-4">
              {previews.map((preview) => (
                <div key={preview.candidate_id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{preview.candidate_name}</span>
                      <Badge variant="outline" className="text-xs">
                        {Math.round(preview.match_score * 100)}% fit
                      </Badge>
                      {preview.last_process && (
                        <Badge variant="secondary" className="text-xs">
                          Último: {preview.last_process}
                        </Badge>
                      )}
                      {preview.edited && (
                        <Badge className="text-xs bg-amber-100 text-amber-800">Editado</Badge>
                      )}
                    </div>
                    {!preview.candidate_phone && (
                      <Badge variant="destructive" className="text-xs">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Sem telefone
                      </Badge>
                    )}
                  </div>

                  {editingId === preview.candidate_id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        rows={6}
                        className="text-sm"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={saveEdit}>
                          <Check className="h-3 w-3 mr-1" /> Salvar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingId(null)}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="relative group">
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/50 p-3 rounded">
                        {preview.message || "Erro ao gerar mensagem"}
                      </p>
                      {preview.message && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => startEditing(preview)}
                        >
                          <Edit3 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {step === "sending" && (
          <div className="text-center py-8">
            <Send className="h-12 w-12 mx-auto text-primary animate-pulse" />
            <p className="mt-4 font-medium">Enviando mensagens...</p>
          </div>
        )}

        {step === "done" && (
          <div className="text-center py-8 space-y-4">
            <Check className="h-12 w-12 mx-auto text-green-500" />
            <p className="font-medium">Reativação concluída!</p>
            <p className="text-sm text-muted-foreground">
              As mensagens foram enviadas. Acompanhe as respostas na aba Outreach.
            </p>
          </div>
        )}

        <DialogFooter>
          {step === "review" && (
            <div className="flex gap-2 w-full justify-end">
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  setStep("sending");
                  sendMessages.mutate();
                }}
                disabled={
                  sendMessages.isPending ||
                  previews.filter((p) => p.status === "generated" && p.candidate_phone).length === 0
                }
              >
                <Send className="h-4 w-4 mr-2" />
                Enviar{" "}
                {previews.filter((p) => p.status === "generated" && p.candidate_phone).length}{" "}
                mensagens
              </Button>
            </div>
          )}
          {step === "done" && (
            <Button onClick={onClose}>Fechar</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
