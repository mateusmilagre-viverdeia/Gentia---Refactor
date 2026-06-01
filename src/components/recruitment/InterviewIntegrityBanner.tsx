import { AlertTriangle, AudioLines, FileText, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

type InterviewType = "cultural" | "technical";

interface Props {
  type: InterviewType;
  sessionId: string;
  status: string | null | undefined;
  isPartial?: boolean | null;
  completedNaturally?: boolean | null;
  abandonedReason?: string | null;
  audioStatus?: string | null;
  hasAudio: boolean;
  hasTranscript: boolean;
  hasEvaluation: boolean;
  canReprocess?: boolean;
  onReprocessed?: () => void;
}

const REASON_LABEL: Record<string, string> = {
  watchdog_stale_partial: "Sessão encerrada automaticamente após inatividade — avaliação parcial gerada com o conteúdo disponível.",
  watchdog_no_content: "Sessão encerrada automaticamente após inatividade. Nenhum conteúdo útil foi capturado.",
  no_transcript: "Não foi possível gerar transcrição suficiente para avaliar.",
  no_content_timeout: "Tempo esgotado sem conteúdo capturado.",
  failed_technical_no_audio: "Falha técnica: o candidato conectou mas o áudio nunca chegou ao servidor (provável bloqueio de microfone, firewall ou rede instável). Nenhum crédito foi consumido — peça ao candidato para repetir a entrevista, preferencialmente em outro navegador ou rede.",
};


export function InterviewIntegrityBanner({
  type,
  sessionId,
  status,
  isPartial,
  completedNaturally,
  abandonedReason,
  audioStatus,
  hasAudio,
  hasTranscript,
  hasEvaluation,
  canReprocess = true,
  onReprocessed,
}: Props) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const isFailedTechnical = status === "failed_technical";

  const showWarning =
    isFailedTechnical ||
    status === "abandoned" ||
    isPartial === true ||
    completedNaturally === false ||
    !hasAudio ||
    !hasTranscript ||
    !hasEvaluation;

  if (!showWarning) return null;

  const reasonText = isFailedTechnical
    ? REASON_LABEL.failed_technical_no_audio
    : abandonedReason
      ? REASON_LABEL[abandonedReason] ?? abandonedReason
      : null;

  const handleReprocess = async () => {
    setBusy(true);
    try {
      const fnName = type === "cultural" ? "reprocess-culture-evaluation" : "technical-interview-complete";
      const body: Record<string, unknown> = { sessionId };
      if (type === "technical") {
        body.fromWatchdog = true;
        body.completedNaturally = false;
      }
      const { error } = await supabase.functions.invoke(fnName, { body });
      if (error) throw error;
      toast({ title: "Avaliação reprocessada", description: "Atualize a página para ver o resultado." });
      onReprocessed?.();
    } catch (e) {
      toast({
        title: "Falha ao reprocessar",
        description: e instanceof Error ? e.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const bannerClasses = isFailedTechnical
    ? "rounded-lg border border-rose-300 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-800 p-3 space-y-2"
    : "rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-3 space-y-2";

  const iconClasses = isFailedTechnical ? "h-4 w-4 text-rose-600 mt-0.5 shrink-0" : "h-4 w-4 text-amber-600 mt-0.5 shrink-0";
  const titleClasses = isFailedTechnical
    ? "font-medium text-rose-900 dark:text-rose-200"
    : "font-medium text-amber-900 dark:text-amber-200";
  const reasonClasses = isFailedTechnical
    ? "text-xs text-rose-800 dark:text-rose-300 mt-1"
    : "text-xs text-amber-800 dark:text-amber-300 mt-1";

  return (
    <div className={bannerClasses}>
      <div className="flex items-start gap-2">
        <AlertTriangle className={iconClasses} />
        <div className="flex-1 text-sm">
          <p className={titleClasses}>
            {isFailedTechnical
              ? "Falha técnica — entrevista não computada (sem cobrança de créditos)"
              : status === "abandoned"
              ? "Entrevista abandonada"
              : isPartial
              ? "Avaliação parcial — entrevista não foi concluída pelo candidato"
              : "Entrevista com material incompleto"}
          </p>
          {reasonText && (
            <p className={reasonClasses}>{reasonText}</p>
          )}

          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <Chip ok={hasAudio} icon={<AudioLines className="h-3 w-3" />} label={`Áudio: ${hasAudio ? "ok" : audioStatus === "missing" ? "perdido" : "indisponível"}`} />
            <Chip ok={hasTranscript} icon={<FileText className="h-3 w-3" />} label={`Transcrição: ${hasTranscript ? "ok" : "indisponível"}`} />
            <Chip ok={hasEvaluation} icon={<Sparkles className="h-3 w-3" />} label={`Avaliação: ${hasEvaluation ? (isPartial ? "parcial" : "ok") : "pendente"}`} />
          </div>
        </div>
      </div>
      {canReprocess && hasTranscript && !isFailedTechnical && (
        <div className="flex justify-end">
          <Button size="sm" variant="outline" onClick={handleReprocess} disabled={busy}>
            {busy ? "Reprocessando..." : "Reprocessar avaliação"}
          </Button>
        </div>
      )}
    </div>
  );
}

function Chip({ ok, icon, label }: { ok: boolean; icon: React.ReactNode; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${
        ok
          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
          : "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300"
      }`}
    >
      {icon}
      {label}
    </span>
  );
}
