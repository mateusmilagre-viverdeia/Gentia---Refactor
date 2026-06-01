import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, Inbox, Target, TrendingUp, Loader2, RefreshCw } from "lucide-react";
import { useCrossMatchSuggestions, type CrossMatchSuggestion, type CrossMatchStatus } from "@/hooks/useCrossMatchSuggestions";
import { CrossMatchSuggestionCard } from "./CrossMatchSuggestionCard";
import { ForwardCandidateDrawer } from "./ForwardCandidateDrawer";

interface Props {
  accountId: string;
}

export function CrossMatchTab({ accountId }: Props) {
  const [jobId, setJobId] = useState<string>("all");
  const [status, setStatus] = useState<CrossMatchStatus | "all">("pending");
  const [minScore, setMinScore] = useState<number>(60);

  const [drawerSuggestion, setDrawerSuggestion] = useState<CrossMatchSuggestion | null>(null);
  const [drawerMode, setDrawerMode] = useState<"forward" | "reject">("forward");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const filters = useMemo(
    () => ({
      jobId: jobId === "all" ? null : jobId,
      status,
      minScore,
    }),
    [jobId, status, minScore],
  );

  const { suggestions, isLoading, refetch, stats, forward, reject, isForwarding, isRejecting } =
    useCrossMatchSuggestions(accountId, filters);

  const { data: jobs = [] } = useQuery({
    queryKey: ["crossmatch-jobs", accountId],
    queryFn: async () => {
      const { data } = await supabase
        .from("recruitment_jobs")
        .select("id, title")
        .eq("account_id", accountId)
        .in("status", ["active", "published", "draft"])
        .order("title");
      return data || [];
    },
    enabled: !!accountId,
  });

  const handleOpen = (s: CrossMatchSuggestion, mode: "forward" | "reject") => {
    setDrawerSuggestion(s);
    setDrawerMode(mode);
    setDrawerOpen(true);
  };

  const handleConfirm = async (text: string) => {
    if (!drawerSuggestion) return;
    if (drawerMode === "forward") {
      await forward({ suggestionId: drawerSuggestion.id, note: text });
    } else {
      await reject({ suggestionId: drawerSuggestion.id, reason: text });
    }
    setDrawerOpen(false);
    setDrawerSuggestion(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Cross-match de Talentos
          </h2>
          <p className="text-muted-foreground text-sm">
            Reaproveite candidatos qualificados em outras vagas compatíveis
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Inbox className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.pending}</p>
              <p className="text-xs text-muted-foreground">Sugestões pendentes</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <Sparkles className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.reused}</p>
              <p className="text-xs text-muted-foreground">Reaproveitados no mês</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.benefitedJobs}</p>
              <p className="text-xs text-muted-foreground">Vagas beneficiadas</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.rate}%</p>
              <p className="text-xs text-muted-foreground">Taxa de aproveitamento</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Vaga destino</Label>
            <Select value={jobId} onValueChange={setJobId}>
              <SelectTrigger>
                <SelectValue placeholder="Todas as vagas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as vagas</SelectItem>
                {jobs.map((j: any) => (
                  <SelectItem key={j.id} value={j.id}>
                    {j.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="aprovado">Encaminhados</SelectItem>
                <SelectItem value="rejeitado">Ignorados</SelectItem>
                <SelectItem value="imported">Importados</SelectItem>
                <SelectItem value="all">Todos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              Score mínimo: <span className="font-medium text-foreground">{minScore}%</span>
            </Label>
            <Slider
              value={[minScore]}
              onValueChange={(v) => setMinScore(v[0])}
              min={0}
              max={100}
              step={5}
              className="mt-2"
            />
          </div>
        </CardContent>
      </Card>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : suggestions.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Sparkles className="h-12 w-12 mx-auto text-muted-foreground/20 mb-4" />
            <h3 className="text-lg font-medium mb-1">Nenhuma sugestão encontrada</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              As sugestões de cross-match são geradas automaticamente quando candidatos qualificados
              são reprovados em uma vaga ou quando novas vagas compatíveis são publicadas.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {suggestions.map((s) => (
            <CrossMatchSuggestionCard
              key={s.id}
              suggestion={s}
              onForward={() => handleOpen(s, "forward")}
              onReject={() => handleOpen(s, "reject")}
              disabled={isForwarding || isRejecting}
            />
          ))}
        </div>
      )}

      <ForwardCandidateDrawer
        suggestion={drawerSuggestion}
        mode={drawerMode}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onConfirm={handleConfirm}
        loading={isForwarding || isRejecting}
      />
    </div>
  );
}
