import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ThumbsUp, ThumbsDown, HelpCircle, ChevronDown, User, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Evaluation, useDeleteEvaluation } from "@/hooks/useRecruitmentEvaluations";
import { stageLabels, weightLabels } from "@/hooks/useRecruitmentScorecards";
import { useState } from "react";
import { formatBRT } from "@/lib/datetime";

interface ScorecardSummaryProps {
  evaluations: Evaluation[];
  applicationId: string;
}

export function ScorecardSummary({ evaluations, applicationId }: ScorecardSummaryProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const deleteEvaluation = useDeleteEvaluation();

  if (evaluations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
          <User className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="font-medium mb-1">Nenhuma avaliação</h3>
        <p className="text-sm text-muted-foreground">
          Este candidato ainda não foi avaliado
        </p>
      </div>
    );
  }

  // Calculate summary
  const scoresWithValues = evaluations.filter(e => e.overall_score !== null);
  const averageScore = scoresWithValues.length > 0
    ? scoresWithValues.reduce((sum, e) => sum + (e.overall_score || 0), 0) / scoresWithValues.length
    : null;

  const recommendations = evaluations.reduce(
    (acc, e) => {
      if (e.recommendation) acc[e.recommendation]++;
      return acc;
    },
    { approve: 0, reject: 0, maybe: 0 }
  );

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getScoreColor = (value: number) => {
    if (value >= 8) return "text-green-600";
    if (value >= 6) return "text-yellow-600";
    if (value >= 4) return "text-orange-600";
    return "text-red-600";
  };

  const getRecommendationIcon = (rec: string | null) => {
    switch (rec) {
      case 'approve':
        return <ThumbsUp className="h-4 w-4 text-green-600" />;
      case 'reject':
        return <ThumbsDown className="h-4 w-4 text-red-600" />;
      default:
        return <HelpCircle className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getRecommendationLabel = (rec: string | null) => {
    switch (rec) {
      case 'approve': return 'Aprovar';
      case 'reject': return 'Rejeitar';
      default: return 'Talvez';
    }
  };

  return (
    <div className="space-y-4">
      {/* Summary Header */}
      <div className="p-4 border rounded-lg bg-muted/30">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Score Médio</p>
            <p className={cn("text-2xl font-bold", averageScore ? getScoreColor(averageScore) : "")}>
              {averageScore ? averageScore.toFixed(1) : "-"}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Avaliações</p>
            <p className="text-2xl font-bold">{evaluations.length}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Aprovar</p>
            <div className="flex items-center gap-2">
              <ThumbsUp className="h-4 w-4 text-green-600" />
              <span className="text-lg font-semibold">{recommendations.approve}</span>
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Rejeitar</p>
            <div className="flex items-center gap-2">
              <ThumbsDown className="h-4 w-4 text-red-600" />
              <span className="text-lg font-semibold">{recommendations.reject}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Evaluations List */}
      <ScrollArea className="h-[300px]">
        <div className="space-y-3 pr-4">
          {evaluations.map((evaluation) => (
            <Collapsible
              key={evaluation.id}
              open={expandedIds.has(evaluation.id)}
              onOpenChange={() => toggleExpanded(evaluation.id)}
            >
              <div className="border rounded-lg overflow-hidden">
                <CollapsibleTrigger asChild>
                  <button className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={evaluation.evaluator?.avatar_url || undefined} />
                        <AvatarFallback>
                          {evaluation.evaluator?.full_name?.charAt(0) || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-left">
                        <p className="font-medium text-sm">
                          {evaluation.evaluator?.full_name || "Avaliador"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatBRT(new Date(evaluation.created_at), "d 'de' MMMM, HH:mm")}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-xs">
                        {stageLabels[evaluation.stage] || evaluation.stage}
                      </Badge>
                      {getRecommendationIcon(evaluation.recommendation)}
                      {evaluation.overall_score !== null && (
                        <span className={cn("font-bold", getScoreColor(evaluation.overall_score))}>
                          {evaluation.overall_score.toFixed(1)}
                        </span>
                      )}
                      <ChevronDown className={cn(
                        "h-4 w-4 transition-transform",
                        expandedIds.has(evaluation.id) && "rotate-180"
                      )} />
                    </div>
                  </button>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <div className="px-4 pb-4 space-y-4 border-t pt-4">
                    {/* Recommendation */}
                    <div className="flex items-center gap-2">
                      {getRecommendationIcon(evaluation.recommendation)}
                      <span className="font-medium">
                        {getRecommendationLabel(evaluation.recommendation)}
                      </span>
                    </div>

                    {/* Criteria Scores */}
                    {evaluation.scores && evaluation.scores.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">
                          Scores por Critério
                        </p>
                        <div className="grid gap-2">
                          {evaluation.scores.map((score) => (
                            <div 
                              key={score.id}
                              className="flex items-center justify-between p-2 bg-muted/30 rounded"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-sm">
                                  {score.criterion?.name || "Critério"}
                                </span>
                                {score.criterion?.weight && (
                                  <Badge variant="outline" className="text-xs">
                                    {weightLabels[score.criterion.weight]}
                                  </Badge>
                                )}
                              </div>
                              <span className={cn(
                                "font-bold text-sm",
                                getScoreColor(score.score)
                              )}>
                                {score.score.toFixed(1)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {evaluation.notes && (
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">
                          Observações
                        </p>
                        <p className="text-sm whitespace-pre-wrap">
                          {evaluation.notes}
                        </p>
                      </div>
                    )}

                    {/* Delete button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => deleteEvaluation.mutate({ 
                        evaluationId: evaluation.id, 
                        applicationId 
                      })}
                      disabled={deleteEvaluation.isPending}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir Avaliação
                    </Button>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
