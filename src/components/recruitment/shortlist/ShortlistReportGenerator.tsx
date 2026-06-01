import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, FileText, Copy, ExternalLink, ChevronDown, ChevronUp, Save } from "lucide-react";
import { useShortlistReports } from "@/hooks/useShortlistReports";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { sendWhatsAppMessage } from "@/lib/whatsapp/sendWhatsAppMessage";

interface Candidate {
  candidate_id: string;
  candidate_name: string;
  composite_score: number;
}

interface ShortlistReportGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string;
  jobTitle: string;
  candidates: Candidate[];
}

export function ShortlistReportGenerator({
  open,
  onOpenChange,
  jobId,
  jobTitle,
  candidates,
}: ShortlistReportGeneratorProps) {
  const [titulo, setTitulo] = useState(`Shortlist - ${jobTitle}`);
  const [customMessage, setCustomMessage] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>(candidates.map(c => c.candidate_id));
  const [showScores, setShowScores] = useState(true);
  const [showTranscripts, setShowTranscripts] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<{ id: string; token: string; conteudo: any } | null>(null);
  const [editedSummaries, setEditedSummaries] = useState<Record<string, string>>({});
  const [editedRecommendations, setEditedRecommendations] = useState<Record<string, string>>({});
  const [expandedCandidate, setExpandedCandidate] = useState<string | null>(null);
  const [savingEdits, setSavingEdits] = useState(false);

  const { generateReport } = useShortlistReports(jobId);

  const toggleCandidate = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleGenerate = async () => {
    if (!selectedIds.length) {
      toast.error("Selecione ao menos um candidato");
      return;
    }

    const result = await generateReport.mutateAsync({
      candidate_ids: selectedIds,
      custom_message: customMessage || undefined,
      titulo,
      show_scores: showScores,
      show_transcripts: showTranscripts,
      show_contact: showContact,
    });

    setGeneratedReport({ id: result.id, token: result.token_publico, conteudo: result.conteudo_json });

    // Pre-fill edits with AI-generated summaries
    const summaries: Record<string, string> = {};
    const recs: Record<string, string> = {};
    if (result.conteudo_json?.candidates) {
      for (const c of result.conteudo_json.candidates) {
        summaries[c.candidate_id] = c.summary || "";
        recs[c.candidate_id] = c.recommendation || "";
      }
    }
    setEditedSummaries(summaries);
    setEditedRecommendations(recs);

    // Send WhatsApp notification to client's primary contact
    try {
      const { data: job } = await supabase
        .from("recruitment_jobs")
        .select("cliente_id")
        .eq("id", jobId)
        .maybeSingle();

      if (job?.cliente_id) {
        const { data: contato } = await supabase
          .from("clientes_contatos")
          .select("whatsapp, nome")
          .eq("cliente_id", job.cliente_id)
          .eq("eh_contato_principal", true)
          .maybeSingle();

        if (contato?.whatsapp) {
          const reportLink = `${window.location.origin}/relatorio/${result.token_publico}`;
          await sendWhatsAppMessage({
            toPhoneE164: contato.whatsapp,
            message: `Olá ${contato.nome || ""}! O relatório de shortlist "${titulo}" está pronto. Acesse aqui: ${reportLink}`,
          }).catch(() => {/* silent - best effort */});
        }
      }
    } catch {
      // Best effort
    }
  };

  const handleSaveEdits = async () => {
    if (!generatedReport) return;
    setSavingEdits(true);
    try {
      const updatedConteudo = { ...generatedReport.conteudo };
      if (updatedConteudo.candidates) {
        updatedConteudo.candidates = updatedConteudo.candidates.map((c: any) => ({
          ...c,
          summary: editedSummaries[c.candidate_id] ?? c.summary,
          recommendation: editedRecommendations[c.candidate_id] ?? c.recommendation,
        }));
      }
      const { error } = await supabase
        .from("shortlist_relatorios")
        .update({ conteudo_json: updatedConteudo, updated_at: new Date().toISOString() })
        .eq("id", generatedReport.id);
      if (error) throw error;
      setGeneratedReport({ ...generatedReport, conteudo: updatedConteudo });
      toast.success("Edições salvas no relatório!");
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar edições");
    } finally {
      setSavingEdits(false);
    }
  };

  const reportUrl = generatedReport
    ? `${window.location.origin}/relatorio/${generatedReport.token}`
    : null;

  const handleCopyLink = () => {
    if (reportUrl) {
      navigator.clipboard.writeText(reportUrl);
      toast.success("Link copiado!");
    }
  };

  const reportCandidates: any[] = generatedReport?.conteudo?.candidates || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Gerar Relatório de Shortlist
          </DialogTitle>
          <DialogDescription>
            Crie um relatório profissional com resumos gerados por IA para enviar ao cliente.
          </DialogDescription>
        </DialogHeader>

        {generatedReport ? (
          <div className="space-y-4">
            <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
                ✅ Relatório gerado com sucesso!
              </p>
              <p className="text-xs text-green-600 dark:text-green-400 mb-3">
                Edite os resumos e recomendações abaixo se desejar, depois compartilhe o link com o cliente.
              </p>
              <div className="flex gap-2">
                <Input value={reportUrl || ""} readOnly className="text-xs" />
                <Button size="icon" variant="outline" onClick={handleCopyLink}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="outline" onClick={() => window.open(reportUrl!, '_blank')}>
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Editable summaries per candidate */}
            {reportCandidates.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Editar resumos e recomendações
                </Label>
                {reportCandidates.map((c: any) => {
                  const isExpanded = expandedCandidate === c.candidate_id;
                  return (
                    <div key={c.candidate_id} className="border rounded-md">
                      <button
                        type="button"
                        onClick={() => setExpandedCandidate(isExpanded ? null : c.candidate_id)}
                        className="w-full flex items-center justify-between p-3 hover:bg-muted/50 text-left"
                      >
                        <span className="text-sm font-medium">{c.candidate_name}</span>
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                      {isExpanded && (
                        <div className="p-3 pt-0 space-y-3 border-t">
                          <div>
                            <Label className="text-xs">Resumo do candidato</Label>
                            <Textarea
                              value={editedSummaries[c.candidate_id] || ""}
                              onChange={(e) => setEditedSummaries(prev => ({ ...prev, [c.candidate_id]: e.target.value }))}
                              rows={4}
                              className="mt-1 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Recomendação do recrutador</Label>
                            <Textarea
                              value={editedRecommendations[c.candidate_id] || ""}
                              onChange={(e) => setEditedRecommendations(prev => ({ ...prev, [c.candidate_id]: e.target.value }))}
                              rows={3}
                              placeholder="Ex: Recomendo fortemente para entrevista presencial..."
                              className="mt-1 text-sm"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                <Button
                  onClick={handleSaveEdits}
                  disabled={savingEdits}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  {savingEdits ? (
                    <><Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />Salvando...</>
                  ) : (
                    <><Save className="h-3.5 w-3.5 mr-2" />Salvar edições no relatório</>
                  )}
                </Button>
              </div>
            )}

            <Button variant="outline" className="w-full" onClick={() => {
              setGeneratedReport(null);
              setEditedSummaries({});
              setEditedRecommendations({});
              onOpenChange(false);
            }}>
              Fechar
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label>Título do relatório</Label>
              <Input value={titulo} onChange={e => setTitulo(e.target.value)} className="mt-1" />
            </div>

            <div>
              <Label>Mensagem de abertura (opcional)</Label>
              <Textarea
                value={customMessage}
                onChange={e => setCustomMessage(e.target.value)}
                placeholder="Mensagem personalizada para o início do relatório..."
                className="mt-1"
                rows={3}
              />
            </div>

            <div>
              <Label className="mb-2 block">Candidatos ({selectedIds.length}/{candidates.length})</Label>
              <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-2">
                {candidates.map(c => (
                  <label key={c.candidate_id} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded px-2 py-1">
                    <Checkbox
                      checked={selectedIds.includes(c.candidate_id)}
                      onCheckedChange={() => toggleCandidate(c.candidate_id)}
                    />
                    <span className="text-sm flex-1">{c.candidate_name}</span>
                    <span className="text-xs text-muted-foreground">{c.composite_score}%</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-3 border-t pt-3">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Opções de exibição</Label>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Mostrar notas/scores</Label>
                <Switch checked={showScores} onCheckedChange={setShowScores} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Incluir trechos de entrevista</Label>
                <Switch checked={showTranscripts} onCheckedChange={setShowTranscripts} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Mostrar contato do candidato</Label>
                <Switch checked={showContact} onCheckedChange={setShowContact} />
              </div>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={generateReport.isPending || !selectedIds.length}
              className="w-full"
            >
              {generateReport.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Gerando com IA...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Gerar Relatório
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
