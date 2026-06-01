import { useMemo } from "react";

import { Crown, TrendingUp, TrendingDown, Minus, Target, Brain, Heart } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { StatusBadge } from "@/components/recruitment/StatusBadge";
import { cn } from "@/lib/utils";
import type { CandidateComparisonData, ComparisonCriterion } from "@/types/candidate-comparison.types";
import { getNestedValue, findBestCandidateId } from "@/hooks/useCandidateComparison";
import { formatBRT } from "@/lib/datetime";

interface ComparisonTableViewProps {
  candidates: CandidateComparisonData[];
  criteria: ComparisonCriterion[];
}

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
];

const CRITERION_ICONS: Record<string, { icon: React.ComponentType<any>; className: string }> = {
  cultural: { icon: Heart, className: "text-pink-500" },
  disc: { icon: Brain, className: "text-blue-500" },
  technical: { icon: Target, className: "text-green-500" },
};

function ScoreCell({
  value,
  isBest,
  type,
  higherIsBetter,
}: {
  value: any;
  isBest: boolean;
  type: string;
  higherIsBetter?: boolean;
}) {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground">—</span>;
  }

  const displayValue = type === "score" ? `${value}%` : value;
  
  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          "font-medium",
          isBest && "text-primary font-semibold"
        )}
      >
        {displayValue}
      </span>
      {isBest && (
        <Crown className="h-4 w-4 text-chart-1" />
      )}
    </div>
  );
}

function getInitials(name: string): string {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function ComparisonTableView({ candidates, criteria }: ComparisonTableViewProps) {
  // Pre-calculate best candidate for each criterion
  const bestBycriterion = useMemo(() => {
    const result: Record<string, string | null> = {};
    criteria.forEach((criterion) => {
      result[criterion.key] = findBestCandidateId(
        candidates,
        criterion.key,
        criterion.higherIsBetter ?? true
      );
    });
    return result;
  }, [candidates, criteria]);

  // Calculate overall winner
  const overallWinner = useMemo(() => {
    const scores: Record<string, number> = {};
    candidates.forEach((c) => {
      scores[c.id] = 0;
    });

    Object.entries(bestBycriterion).forEach(([_, winnerId]) => {
      if (winnerId) {
        scores[winnerId] = (scores[winnerId] || 0) + 1;
      }
    });

    const maxScore = Math.max(...Object.values(scores));
    const winner = Object.entries(scores).find(([_, score]) => score === maxScore);
    return winner?.[0] || null;
  }, [bestBycriterion, candidates]);

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-5 w-5" />
            Comparativo Detalhado
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Critério</TableHead>
                {candidates.map((candidate, idx) => (
                  <TableHead
                    key={candidate.id}
                    className="min-w-[200px]"
                    style={{ borderTop: `3px solid ${CHART_COLORS[idx % CHART_COLORS.length]}` }}
                  >
                    <div className="flex items-center gap-3 py-2">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={candidate.avatarUrl || undefined} />
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {getInitials(candidate.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-medium flex items-center gap-1">
                          {candidate.name}
                          {overallWinner === candidate.id && (
                            <Tooltip>
                              <TooltipTrigger>
                                <Crown className="h-4 w-4 text-chart-1" />
                              </TooltipTrigger>
                              <TooltipContent>Melhor candidato geral</TooltipContent>
                            </Tooltip>
                          )}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {candidate.email}
                        </span>
                      </div>
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Stage row */}
              <TableRow>
                <TableCell className="font-medium">Etapa Atual</TableCell>
                {candidates.map((candidate) => (
                  <TableCell key={candidate.id}>
                    <StatusBadge status={candidate.currentStage} />
                  </TableCell>
                ))}
              </TableRow>

              {/* Tags row */}
              <TableRow>
                <TableCell className="font-medium">Tags</TableCell>
                {candidates.map((candidate) => (
                  <TableCell key={candidate.id}>
                    <div className="flex flex-wrap gap-1">
                      {candidate.tags.length > 0 ? (
                        candidate.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                      {candidate.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{candidate.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                ))}
              </TableRow>

              {/* Applied date row */}
              <TableRow>
                <TableCell className="font-medium">Data de Aplicação</TableCell>
                {candidates.map((candidate) => (
                  <TableCell key={candidate.id}>
                    {formatBRT(new Date(candidate.appliedAt), "dd MMM yyyy")}
                  </TableCell>
                ))}
              </TableRow>

              {/* Dynamic criteria rows */}
              {criteria.map((criterion) => (
                <TableRow key={criterion.key}>
                  <TableCell className="font-medium flex items-center gap-2">
              {criterion.key.includes("cultural") && <Heart className="h-4 w-4 text-muted-foreground" />}
                    {criterion.key.includes("disc") && <Brain className="h-4 w-4 text-muted-foreground" />}
                    {criterion.key.includes("technical") && <Target className="h-4 w-4 text-muted-foreground" />}
                    {criterion.label}
                  </TableCell>
                  {candidates.map((candidate) => {
                    const value = getNestedValue(candidate, criterion.key);
                    const isBest = bestBycriterion[criterion.key] === candidate.id;

                    return (
                      <TableCell key={candidate.id}>
                        <ScoreCell
                          value={value}
                          isBest={isBest}
                          type={criterion.type}
                          higherIsBetter={criterion.higherIsBetter}
                        />
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}

              {/* DISC Profile row (if any candidate has DISC) */}
              {candidates.some((c) => c.scores.disc) && (
                <TableRow>
                  <TableCell className="font-medium">Perfil DISC</TableCell>
                  {candidates.map((candidate) => (
                    <TableCell key={candidate.id}>
                    {candidate.scores.disc ? (
                        <div className="flex items-center gap-1">
                          <Badge variant="secondary">
                            {candidate.scores.disc.primary}
                          </Badge>
                          {candidate.scores.disc.secondary && (
                            <Badge variant="outline">
                              {candidate.scores.disc.secondary}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              )}

              {/* Source row */}
              <TableRow>
                <TableCell className="font-medium">Fonte</TableCell>
                {candidates.map((candidate) => (
                  <TableCell key={candidate.id} className="capitalize">
                    {candidate.source || "—"}
                  </TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
