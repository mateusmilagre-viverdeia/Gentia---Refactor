import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { invokeAuthenticatedFunction } from "@/lib/authenticatedFetch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Trophy, Sparkles, RefreshCw, Users, TrendingUp, Brain, Bot, TestTubeDiagonal, Filter, CheckCircle2, FileText } from "lucide-react";
import { CandidateComparisonDialog } from "../comparison/CandidateComparisonDialog";
import { cn } from "@/lib/utils";
import { getCompositeScoreBadgeVariant } from "@/lib/compositeScore";

interface ShortlistRankingViewProps {
  jobId: string;
  onGenerateReport?: () => void;
}

interface RankedCandidate {
  candidate_id: string;
  candidate_name: string;
  application_id: string | null;
  composite_score: number;
  cultural_score: number | null;
  disc_score: number | null;
  technical_score: number | null;
  success_probability: number | null;
  strengths: string[];
  rank_justification: string;
}

interface RankingResult {
  candidates: RankedCandidate[];
  generated_at: string;
  job_title: string;
}

const RANK_BADGES = ["🥇", "🥈", "🥉"];

export function ShortlistRankingView({ jobId, onGenerateReport }: ShortlistRankingViewProps) {
  const { currentAccount } = useOrganization();
  const [selectedForComparison, setSelectedForComparison] = useState<string[]>([]);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [minScore, setMinScore] = useState(0);
  const [onlyComplete, setOnlyComplete] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const { data: ranking, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["candidate-ranking", jobId],
    queryFn: async () => {
      const result = await invokeAuthenticatedFunction<RankingResult>(
        "generate-candidate-ranking",
        { job_id: jobId }
      );
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    enabled: !!jobId && !!currentAccount?.id,
    staleTime: 5 * 60 * 1000,
  });

  const filteredCandidates = useMemo(() => {
    if (!ranking) return [];
    let list = ranking.candidates;
    if (minScore > 0) {
      list = list.filter(c => c.composite_score >= minScore);
    }
    if (onlyComplete) {
      list = list.filter(c => c.cultural_score !== null && c.disc_score !== null && c.technical_score !== null);
    }
    return list;
  }, [ranking, minScore, onlyComplete]);

  const toggleComparison = (appId: string) => {
    setSelectedForComparison((prev) => {
      if (prev.includes(appId)) return prev.filter((id) => id !== appId);
      if (prev.length >= 4) return prev;
      return [...prev, appId];
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  if (!ranking || ranking.candidates.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Trophy className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-medium text-lg">Nenhum candidato para ranquear</h3>
          <p className="text-muted-foreground mt-2 text-sm max-w-md">
            É necessário que candidatos tenham completado pelo menos uma etapa de avaliação para gerar o ranking.
          </p>
          <Button variant="outline" className="mt-4" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-500" />
          <h3 className="font-semibold text-base">Shortlist IA</h3>
          <Badge variant="secondary" className="text-[10px]">
            {filteredCandidates.length}/{ranking.candidates.length} candidatos
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={showFilters ? "default" : "outline"}
            onClick={() => setShowFilters(prev => !prev)}
            className="h-8 text-xs gap-1.5"
          >
            <Filter className="h-3.5 w-3.5" />
            Filtros
          </Button>
          {selectedForComparison.length >= 2 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setComparisonOpen(true)}
              className="h-8 text-xs gap-1.5"
            >
              <Users className="h-3.5 w-3.5" />
              Comparar ({selectedForComparison.length})
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-8 text-xs gap-1.5"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
            Atualizar
          </Button>
          {onGenerateReport && filteredCandidates.length > 0 && (
            <Button
              size="sm"
              variant="default"
              onClick={onGenerateReport}
              className="h-8 text-xs gap-1.5"
            >
              <FileText className="h-3.5 w-3.5" />
              Gerar Relatório
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex flex-col gap-2 min-w-[200px]">
                <Label className="text-xs text-muted-foreground">Score mínimo: {minScore}%</Label>
                <Slider
                  value={[minScore]}
                  onValueChange={(v) => setMinScore(v[0])}
                  min={0}
                  max={100}
                  step={5}
                  className="w-48"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="only-complete"
                  checked={onlyComplete}
                  onCheckedChange={setOnlyComplete}
                />
                <Label htmlFor="only-complete" className="text-xs cursor-pointer">
                  Apenas perfis completos (3 avaliações)
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ranked Cards */}
      <div className="space-y-3">
        {filteredCandidates.map((candidate, idx) => {
          const isSelected = candidate.application_id
            ? selectedForComparison.includes(candidate.application_id)
            : false;
          const isComplete = candidate.cultural_score !== null && candidate.disc_score !== null && candidate.technical_score !== null;

          return (
            <RankedCandidateCard
              key={candidate.candidate_id}
              candidate={candidate}
              rank={idx + 1}
              isSelected={isSelected}
              isComplete={isComplete}
              onToggleComparison={() =>
                candidate.application_id && toggleComparison(candidate.application_id)
              }
            />
          );
        })}
      </div>

      {/* Comparison Dialog */}
      <CandidateComparisonDialog
        open={comparisonOpen}
        onOpenChange={setComparisonOpen}
        applicationIds={selectedForComparison}
      />
    </div>
  );
}

function RankedCandidateCard({
  candidate,
  rank,
  isSelected,
  isComplete,
  onToggleComparison,
}: {
  candidate: RankedCandidate;
  rank: number;
  isSelected: boolean;
  isComplete: boolean;
  onToggleComparison: () => void;
}) {
  const initials = candidate.candidate_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const rankBadge = RANK_BADGES[rank - 1];
  const scoreBadgeVariant = getCompositeScoreBadgeVariant(candidate.composite_score);

  return (
    <Card
      className={cn(
        "transition-all hover:shadow-md cursor-pointer",
        isSelected && "ring-2 ring-primary",
        rank === 1 && "border-amber-200 dark:border-amber-800 bg-amber-50/20 dark:bg-amber-950/10"
      )}
      onClick={onToggleComparison}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Rank */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-2xl">{rankBadge || `#${rank}`}</span>
            <Badge variant={scoreBadgeVariant} className="text-xs font-bold tabular-nums">
              {candidate.composite_score}%
            </Badge>
          </div>

          {/* Candidate info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="font-medium text-sm">{candidate.candidate_name}</p>
                  {isComplete && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        </TooltipTrigger>
                        <TooltipContent>Perfil completo (3 avaliações)</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
                {candidate.success_probability !== null && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <TrendingUp className="h-3 w-3 text-emerald-500" />
                    <span className="text-[10px] text-emerald-600 font-medium">
                      {candidate.success_probability}% prob. de sucesso
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Score bars */}
            <div className="grid grid-cols-3 gap-3 mb-2">
              <ScoreBar
                icon={Bot}
                label="Cultural"
                score={candidate.cultural_score}
                weight="50%"
                color="bg-purple-500"
              />
              <ScoreBar
                icon={Brain}
                label="DISC"
                score={candidate.disc_score}
                weight="25%"
                color="bg-indigo-500"
              />
              <ScoreBar
                icon={TestTubeDiagonal}
                label="Técnico"
                score={candidate.technical_score}
                weight="25%"
                color="bg-cyan-500"
              />
            </div>

            {/* Strengths */}
            {candidate.strengths.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {candidate.strengths.slice(0, 4).map((s, i) => (
                  <Badge key={i} variant="secondary" className="text-[9px] px-1.5 py-0">
                    <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                    {s}
                  </Badge>
                ))}
              </div>
            )}

            {/* AI Justification */}
            <p className="text-xs text-muted-foreground line-clamp-2">
              {candidate.rank_justification}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ScoreBar({
  icon: Icon,
  label,
  score,
  weight,
  color,
}: {
  icon: typeof Bot;
  label: string;
  score: number | null;
  weight: string;
  color: string;
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Icon className="h-3 w-3 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">{label}</span>
                <span className="text-[8px] text-muted-foreground/60">({weight})</span>
              </div>
              <span className="text-[10px] font-medium tabular-nums">
                {score !== null ? `${score}%` : "—"}
              </span>
            </div>
            <Progress
              value={score ?? 0}
              className="h-1.5"
            />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{label} (peso {weight}): {score !== null ? `${score}%` : "Não avaliado"}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
