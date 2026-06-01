import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Brain, Sparkles, AlertTriangle, CheckCircle2, Target, Coins, Loader2, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { invokeAuthenticatedFunction } from "@/lib/authenticatedFetch";
import { formatBRT } from "@/lib/datetime";


interface Props {
  candidateId: string | null | undefined;
  jobId: string | null | undefined;
}

const ESTIMATED_CREDITS = 0.3;

export function CVDeepAnalysisCard({ candidateId, jobId }: Props) {
  const qc = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [forceRefresh, setForceRefresh] = useState(false);
  const [running, setRunning] = useState(false);

  const enabled = !!candidateId && !!jobId;

  const { data: match, isLoading } = useQuery({
    queryKey: ["cv-job-match", candidateId, jobId],
    queryFn: async () => {
      if (!enabled) return null;
      const { data } = await supabase
        .from("candidate_cv_job_match")
        .select("*")
        .eq("candidate_id", candidateId!)
        .eq("job_id", jobId!)
        .maybeSingle();
      return data;
    },
    enabled,
  });

  const { data: hasCv } = useQuery({
    queryKey: ["cv-intelligence-exists", candidateId],
    queryFn: async () => {
      if (!candidateId) return false;
      const { data } = await supabase
        .from("candidate_cv_intelligence")
        .select("id")
        .eq("candidate_id", candidateId)
        .maybeSingle();
      return !!data;
    },
    enabled: !!candidateId,
  });

  const cached = !!match && new Date(match.expires_at).getTime() > Date.now();

  const runAnalysis = async () => {
    if (!candidateId || !jobId) return;
    setRunning(true);
    try {
      const { data, error } = await invokeAuthenticatedFunction<any>("analyze-cv-job-match", {
        candidate_id: candidateId,
        job_id: jobId,
        force: forceRefresh,
      });
      if (error) {
        if (error === "payment_required") {
          toast.error("Créditos insuficientes para Análise Profunda.");
        } else {
          toast.error(error);
        }
        return;
      }
      if (data?.cached) {
        toast.info("Análise recuperada do cache (válida por 30 dias).");
      } else {
        toast.success(`Análise concluída. ${data?.credits_consumed || 0} créditos consumidos.`);
      }
      qc.invalidateQueries({ queryKey: ["cv-job-match", candidateId, jobId] });
    } catch (e: any) {
      toast.error(e.message || "Erro ao executar análise");
    } finally {
      setRunning(false);
      setConfirmOpen(false);
      setForceRefresh(false);
    }
  };

  if (!enabled) return null;

  return (
    <>
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Brain className="h-4 w-4 text-primary" />
              Análise Profunda (IA)
            </CardTitle>
            {cached ? (
              <Button
                size="sm" variant="outline"
                onClick={() => { setForceRefresh(true); setConfirmOpen(true); }}
                disabled={running}
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Re-analisar
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => { setForceRefresh(false); setConfirmOpen(true); }}
                disabled={running || isLoading || !hasCv}
              >
                {running ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                )}
                Analisar
                <Badge variant="secondary" className="ml-2 gap-1">
                  <Coins className="h-3 w-3 text-amber-500" />
                  ~{ESTIMATED_CREDITS}
                </Badge>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!hasCv && (
            <p className="text-sm text-muted-foreground">
              CV ainda não foi processado. A análise profunda fica disponível após o parsing automático do currículo.
            </p>
          )}

          {hasCv && !match && !running && (
            <p className="text-sm text-muted-foreground">
              Cruza o currículo com o ICP e a descrição da vaga para gerar pontos fortes, red flags e tópicos de foco para a entrevista.
            </p>
          )}

          {match && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="text-3xl font-bold">{match.match_score ?? "—"}</div>
                <div>
                  <div className="text-xs text-muted-foreground">Match Score</div>
                  <Badge variant={
                    match.recommendation?.includes("yes") ? "success" :
                    match.recommendation === "maybe" ? "secondary" : "destructive"
                  }>
                    {recLabel(match.recommendation)}
                  </Badge>
                </div>
                <div className="ml-auto text-xs text-muted-foreground">
                  {formatBRT(new Date(match.created_at), "dd/MM/yyyy HH:mm")}
                </div>
              </div>

              {match.summary && (
                <p className="text-sm">{match.summary}</p>
              )}

              {Array.isArray(match.highlights) && match.highlights.length > 0 && (
                <div>
                  <div className="text-xs font-medium uppercase text-muted-foreground mb-1.5 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    Destaques
                  </div>
                  <ul className="text-sm space-y-1 list-disc pl-5">
                    {match.highlights.map((h: string, i: number) => <li key={i}>{h}</li>)}
                  </ul>
                </div>
              )}

              {Array.isArray(match.red_flags) && match.red_flags.length > 0 && (
                <div>
                  <div className="text-xs font-medium uppercase text-muted-foreground mb-1.5 flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                    Pontos de atenção
                  </div>
                  <ul className="text-sm space-y-1">
                    {match.red_flags.map((f: any, i: number) => (
                      <li key={i} className="flex gap-2">
                        <Badge variant={f.severity === "high" ? "destructive" : "outline"} className="text-[10px] uppercase shrink-0">
                          {f.severity}
                        </Badge>
                        <span>{f.description}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(Array.isArray(match.skills_matched) || Array.isArray(match.skills_missing)) && (
                <div className="grid grid-cols-2 gap-3">
                  {Array.isArray(match.skills_matched) && match.skills_matched.length > 0 && (
                    <div>
                      <div className="text-xs font-medium uppercase text-muted-foreground mb-1.5">Skills no perfil</div>
                      <div className="flex flex-wrap gap-1">
                        {(match.skills_matched as string[]).map((s, i) => (
                          <Badge key={i} variant="success" className="text-[10px]">{s}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {Array.isArray(match.skills_missing) && match.skills_missing.length > 0 && (
                    <div>
                      <div className="text-xs font-medium uppercase text-muted-foreground mb-1.5">Skills faltando</div>
                      <div className="flex flex-wrap gap-1">
                        {(match.skills_missing as string[]).map((s, i) => (
                          <Badge key={i} variant="outline" className="text-[10px]">{s}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {Array.isArray(match.interview_focus_points) && match.interview_focus_points.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <div className="text-xs font-medium uppercase text-muted-foreground mb-1.5 flex items-center gap-1.5">
                      <Target className="h-3.5 w-3.5 text-primary" />
                      Para a entrevista
                    </div>
                    <ul className="text-sm space-y-1 list-disc pl-5">
                      {match.interview_focus_points.map((p: string, i: number) => <li key={i}>{p}</li>)}
                    </ul>
                  </div>
                </>
              )}

              <div className="text-[11px] text-muted-foreground">
                Cache válido até {formatBRT(new Date(match.expires_at), "dd/MM/yyyy")} · Custo: {Number(match.credits_consumed).toFixed(1)} créditos
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Executar Análise Profunda?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação consome <strong>~{ESTIMATED_CREDITS} créditos</strong> da sua conta. O resultado fica em cache por 30 dias para esta vaga e este candidato.
              {forceRefresh && " O cache atual será substituído."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={running}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={runAnalysis} disabled={running}>
              {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function recLabel(r?: string | null) {
  switch (r) {
    case "strong_yes": return "Forte recomendação";
    case "yes": return "Recomendado";
    case "maybe": return "Talvez";
    case "no": return "Não recomendado";
    case "strong_no": return "Não recomendado (forte)";
    default: return "—";
  }
}
