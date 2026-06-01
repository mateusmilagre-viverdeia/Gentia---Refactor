import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { weightLabels } from "@/hooks/useRecruitmentScorecards";

interface ScorecardCriterionProps {
  name: string;
  description?: string | null;
  weight: string;
  score: number;
  comment: string;
  onScoreChange: (score: number) => void;
  onCommentChange: (comment: string) => void;
}

export function ScorecardCriterion({
  name,
  description,
  weight,
  score,
  comment,
  onScoreChange,
  onCommentChange,
}: ScorecardCriterionProps) {
  const getScoreColor = (value: number) => {
    if (value >= 8) return "text-green-600";
    if (value >= 6) return "text-yellow-600";
    if (value >= 4) return "text-orange-600";
    return "text-red-600";
  };

  const getWeightBadgeClass = (w: string) => {
    switch (w) {
      case 'critical':
        return "bg-red-500/10 text-red-600 border-red-500/20";
      case 'important':
        return "bg-orange-500/10 text-orange-600 border-orange-500/20";
      case 'moderate':
        return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="p-4 border rounded-lg space-y-4 bg-card">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium">{name}</h4>
            <Badge variant="outline" className={cn("text-xs", getWeightBadgeClass(weight))}>
              {weightLabels[weight] || weight}
            </Badge>
          </div>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        <div className="text-right">
          <span className={cn("text-2xl font-bold", getScoreColor(score))}>
            {score.toFixed(1)}
          </span>
          <span className="text-sm text-muted-foreground">/10</span>
        </div>
      </div>

      <div className="space-y-2">
        <Slider
          value={[score]}
          onValueChange={([value]) => onScoreChange(value)}
          max={10}
          min={0}
          step={0.5}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0</span>
          <span>5</span>
          <span>10</span>
        </div>
      </div>

      <Textarea
        placeholder="Comentário opcional sobre este critério..."
        value={comment}
        onChange={(e) => onCommentChange(e.target.value)}
        className="min-h-[60px] text-sm"
      />
    </div>
  );
}
