import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bot, CheckCircle2, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AutopilotShortlistCardProps {
  jobId: string;
  accountId: string;
}

interface JobAutopilotConfig {
  autopilot_enabled: boolean;
  autopilot_min_candidates: number;
  autopilot_min_score: number;
  autopilot_triggered_at: string | null;
  title: string | null;
}

export function AutopilotShortlistCard({ jobId, accountId }: AutopilotShortlistCardProps) {
  const queryClient = useQueryClient();
  const [generating, setGenerating] = useState(false);

  const { data: job, isLoading } = useQuery({
    queryKey: ["job-autopilot-full", jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recruitment_jobs")
        .select("autopilot_enabled, autopilot_min_candidates, autopilot_min_score, autopilot_triggered_at, title")
        .eq("id", jobId)
        .single();
      if (error) throw error;
      return data as JobAutopilotConfig;
    },
  });

  const { data: progress } = useQuery({
    queryKey: ["autopilot-progress", jobId, job?.autopilot_min_score],
    queryFn: async () => {
      if (!job) return 0;
      const { count } = await supabase
        .from("recruitment_applications")
        .select("id", { count: "exact", head: true })
        .eq("job_id", jobId)
        .eq("status", "shortlisted")
        .gte("score", job.autopilot_min_score);
      return count || 0;
    },
    enabled: !!job?.autopilot_enabled,
    refetchInterval: 30000,
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<JobAutopilotConfig>) => {
      const { error } = await supabase.from("recruitment_jobs").update(updates).eq("id", jobId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-autopilot-full", jobId] });
      queryClient.invalidateQueries({ queryKey: ["job-autopilot", jobId] });
    },
    onError: () => toast.error("Erro ao atualizar configuração"),
  });

  const handleGenerateNow = async () => {
    setGenerating(true);
    try {
      const { error } = await supabase.functions.invoke("generate-shortlist-report", {
        body: { jobId, accountId, autoTriggered: false },
      });
      if (error) throw error;
      toast.success("Shortlist gerada com sucesso");
      queryClient.invalidateQueries({ queryKey: ["job-autopilot-full", jobId] });
    } catch (e: any) {
      toast.error(e?.message || "Erro ao gerar shortlist");
    } finally {
      setGenerating(false);
    }
  };

  const enabled = job?.autopilot_enabled ?? false;
  const triggered = !!job?.autopilot_triggered_at;

  const { data: latestReport } = useQuery({
    queryKey: ["autopilot-latest-report", jobId],
    enabled: triggered,
    queryFn: async () => {
      const { data } = await supabase
        .from("shortlist_relatorios")
        .select("id, token_publico")
        .eq("vaga_id", jobId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  if (isLoading || !job) return null;
  const min = job.autopilot_min_candidates ?? 3;
  const score = Number(job.autopilot_min_score ?? 7.0);
  const progressCount = progress ?? 0;

  const cardClass = triggered
    ? "border-green-500/40 bg-green-500/5"
    : enabled
    ? "border-blue-500/40 bg-blue-500/5"
    : "border-border bg-muted/30";

  return (
    <Card className={cn("border-2", cardClass)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Bot className={cn("h-4 w-4", enabled ? "text-blue-600 animate-pulse" : "text-muted-foreground")} />
            Autopilot de Shortlist
          </CardTitle>
          <Switch
            checked={enabled}
            onCheckedChange={(v) => updateMutation.mutate({ autopilot_enabled: v })}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Quando X candidatos atingirem score ≥ Y, a shortlist é gerada e enviada automaticamente para o cliente.
        </p>

        {enabled && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Mín. candidatos</Label>
                <Select
                  value={String(min)}
                  onValueChange={(v) => updateMutation.mutate({ autopilot_min_candidates: parseInt(v) })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="4">4</SelectItem>
                    <SelectItem value="5">5</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Score mínimo: <span className="font-bold">{score.toFixed(1)}</span></Label>
                <Slider
                  value={[score]}
                  min={5.0}
                  max={9.0}
                  step={0.1}
                  onValueChange={([v]) => updateMutation.mutate({ autopilot_min_score: v })}
                  className="pt-2"
                />
              </div>
            </div>

            {triggered ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-2 rounded-md bg-green-500/10 text-green-700 dark:text-green-400 text-xs">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Shortlist gerada em {new Date(job.autopilot_triggered_at!).toLocaleString("pt-BR")}</span>
                </div>
                {latestReport?.token_publico && (
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs"
                    onClick={() => window.open(`/portal-shortlist/${latestReport.token_publico}`, "_blank")}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Ver shortlist gerada →
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between p-2 rounded-md bg-blue-500/10 text-xs">
                <span className="text-foreground">
                  <strong className="tabular-nums">{progressCount}</strong> de <strong>{min}</strong> candidatos com score ≥ {score.toFixed(1)}
                </span>
                {progressCount >= min && (
                  <Badge variant="default" className="bg-blue-600 text-[10px]">Pronto</Badge>
                )}
              </div>
            )}
          </>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={handleGenerateNow}
          disabled={generating}
          className="w-full"
        >
          {generating ? <Loader2 className="h-3 w-3 mr-2 animate-spin" /> : null}
          Gerar shortlist agora
        </Button>
      </CardContent>
    </Card>
  );
}
