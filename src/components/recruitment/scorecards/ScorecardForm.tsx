import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, ThumbsUp, ThumbsDown, HelpCircle } from "lucide-react";
import { ScorecardCriterion } from "./ScorecardCriterion";
import { 
  ScorecardTemplateWithCriteria, 
  weightMultipliers 
} from "@/hooks/useRecruitmentScorecards";
import { useSubmitEvaluation } from "@/hooks/useRecruitmentEvaluations";
import { cn } from "@/lib/utils";

interface CriterionScore {
  criterionId: string;
  score: number;
  comment: string;
}

interface ScorecardFormProps {
  applicationId: string;
  template: ScorecardTemplateWithCriteria;
  stage: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ScorecardForm({
  applicationId,
  template,
  stage,
  onSuccess,
  onCancel,
}: ScorecardFormProps) {
  const [scores, setScores] = useState<CriterionScore[]>([]);
  const [recommendation, setRecommendation] = useState<'approve' | 'reject' | 'maybe'>('maybe');
  const [notes, setNotes] = useState("");
  
  const submitEvaluation = useSubmitEvaluation();

  // Initialize scores when template loads
  useEffect(() => {
    if (template?.criteria) {
      setScores(
        template.criteria.map(c => ({
          criterionId: c.id,
          score: 5,
          comment: "",
        }))
      );
    }
  }, [template]);

  const updateScore = (criterionId: string, score: number) => {
    setScores(prev => 
      prev.map(s => s.criterionId === criterionId ? { ...s, score } : s)
    );
  };

  const updateComment = (criterionId: string, comment: string) => {
    setScores(prev => 
      prev.map(s => s.criterionId === criterionId ? { ...s, comment } : s)
    );
  };

  // Calculate overall score
  const calculateOverallScore = () => {
    if (!template?.criteria || scores.length === 0) return 0;
    
    const totalWeight = template.criteria.reduce(
      (sum, c) => sum + weightMultipliers[c.weight],
      0
    );

    const weightedSum = scores.reduce((sum, score) => {
      const criterion = template.criteria.find(c => c.id === score.criterionId);
      if (!criterion) return sum;
      return sum + score.score * weightMultipliers[criterion.weight];
    }, 0);

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  };

  const overallScore = calculateOverallScore();

  const handleSubmit = async () => {
    await submitEvaluation.mutateAsync({
      applicationId,
      templateId: template.id,
      stage,
      scores: scores.map(s => ({
        criterionId: s.criterionId,
        score: s.score,
        comment: s.comment || undefined,
      })),
      recommendation,
      notes: notes || undefined,
      criteria: template.criteria,
    });
    onSuccess?.();
  };

  const getScoreColor = (value: number) => {
    if (value >= 8) return "text-green-600";
    if (value >= 6) return "text-yellow-600";
    if (value >= 4) return "text-orange-600";
    return "text-red-600";
  };

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 pr-4">
        <div className="space-y-6 pb-4">
          {/* Overall Score Preview */}
          <div className="p-4 border rounded-lg bg-muted/30">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Score Geral</h3>
                <p className="text-sm text-muted-foreground">
                  Média ponderada dos critérios
                </p>
              </div>
              <div className="text-right">
                <span className={cn("text-3xl font-bold", getScoreColor(overallScore))}>
                  {overallScore.toFixed(1)}
                </span>
                <span className="text-lg text-muted-foreground">/10</span>
              </div>
            </div>
          </div>

          {/* Criteria */}
          <div className="space-y-4">
            <h3 className="font-semibold">Critérios de Avaliação</h3>
            {template.criteria
              .sort((a, b) => a.order_index - b.order_index)
              .map(criterion => {
                const scoreData = scores.find(s => s.criterionId === criterion.id);
                return (
                  <ScorecardCriterion
                    key={criterion.id}
                    name={criterion.name}
                    description={criterion.description}
                    weight={criterion.weight}
                    score={scoreData?.score || 5}
                    comment={scoreData?.comment || ""}
                    onScoreChange={(score) => updateScore(criterion.id, score)}
                    onCommentChange={(comment) => updateComment(criterion.id, comment)}
                  />
                );
              })}
          </div>

          {/* Recommendation */}
          <div className="space-y-3">
            <Label className="font-semibold">Recomendação</Label>
            <RadioGroup
              value={recommendation}
              onValueChange={(value) => setRecommendation(value as 'approve' | 'reject' | 'maybe')}
              className="grid grid-cols-3 gap-3"
            >
              <Label
                htmlFor="approve"
                className={cn(
                  "flex flex-col items-center gap-2 p-4 border rounded-lg cursor-pointer transition-all",
                  recommendation === 'approve' 
                    ? "border-green-500 bg-green-500/10" 
                    : "hover:border-green-500/50"
                )}
              >
                <RadioGroupItem value="approve" id="approve" className="sr-only" />
                <ThumbsUp className={cn(
                  "h-6 w-6",
                  recommendation === 'approve' ? "text-green-600" : "text-muted-foreground"
                )} />
                <span className={cn(
                  "text-sm font-medium",
                  recommendation === 'approve' ? "text-green-600" : ""
                )}>
                  Aprovar
                </span>
              </Label>
              
              <Label
                htmlFor="maybe"
                className={cn(
                  "flex flex-col items-center gap-2 p-4 border rounded-lg cursor-pointer transition-all",
                  recommendation === 'maybe' 
                    ? "border-yellow-500 bg-yellow-500/10" 
                    : "hover:border-yellow-500/50"
                )}
              >
                <RadioGroupItem value="maybe" id="maybe" className="sr-only" />
                <HelpCircle className={cn(
                  "h-6 w-6",
                  recommendation === 'maybe' ? "text-yellow-600" : "text-muted-foreground"
                )} />
                <span className={cn(
                  "text-sm font-medium",
                  recommendation === 'maybe' ? "text-yellow-600" : ""
                )}>
                  Talvez
                </span>
              </Label>
              
              <Label
                htmlFor="reject"
                className={cn(
                  "flex flex-col items-center gap-2 p-4 border rounded-lg cursor-pointer transition-all",
                  recommendation === 'reject' 
                    ? "border-red-500 bg-red-500/10" 
                    : "hover:border-red-500/50"
                )}
              >
                <RadioGroupItem value="reject" id="reject" className="sr-only" />
                <ThumbsDown className={cn(
                  "h-6 w-6",
                  recommendation === 'reject' ? "text-red-600" : "text-muted-foreground"
                )} />
                <span className={cn(
                  "text-sm font-medium",
                  recommendation === 'reject' ? "text-red-600" : ""
                )}>
                  Rejeitar
                </span>
              </Label>
            </RadioGroup>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="font-semibold">Observações Gerais</Label>
            <Textarea
              id="notes"
              placeholder="Adicione observações gerais sobre o candidato..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
        </div>
      </ScrollArea>

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t mt-4">
        {onCancel && (
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Cancelar
          </Button>
        )}
        <Button 
          onClick={handleSubmit} 
          disabled={submitEvaluation.isPending}
          className="flex-1"
        >
          {submitEvaluation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Enviando...
            </>
          ) : (
            "Enviar Avaliação"
          )}
        </Button>
      </div>
    </div>
  );
}
