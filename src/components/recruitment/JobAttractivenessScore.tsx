import { useState } from "react";
import {
  RefreshCw,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  useJobAttractiveness,
  useCalculateJobAttractiveness,
  getAttractivenessColor,
  getAttractivenessVariant,
  getCategoryLabel,
  getCategoryMaxScore,
  AttractivenessBreakdown,
} from "@/hooks/useJobAttractiveness";
import { cn } from "@/lib/utils";

interface JobAttractivenessScoreProps {
  jobId: string;
  accountId: string;
  showDetails?: boolean;
  compact?: boolean;
}

function ScoreBadge({ score }: { score: number }) {
  const variant = getAttractivenessVariant(score);
  const color = getAttractivenessColor(score);
  const Icon = score >= 50 ? TrendingUp : TrendingDown;

  return (
    <Badge variant={variant} className="gap-1">
      <Icon className={cn("h-3 w-3", color)} />
      <span>{score}/100</span>
    </Badge>
  );
}

function CompactScore({ score, onClick }: { score: number; onClick?: () => void }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            className="inline-flex items-center gap-1 hover:opacity-80 transition-opacity"
          >
            <Sparkles className={cn("h-3.5 w-3.5", getAttractivenessColor(score))} />
            <span className={cn("text-sm font-medium", getAttractivenessColor(score))}>
              {score}
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Score de atratividade: {score}/100</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function BreakdownItem({
  category,
  score,
}: {
  category: keyof AttractivenessBreakdown;
  score: number;
}) {
  const maxScore = getCategoryMaxScore(category);
  const percentage = (score / maxScore) * 100;
  const label = getCategoryLabel(category);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">
          {score}/{maxScore}
        </span>
      </div>
      <Progress value={percentage} className="h-1.5" />
    </div>
  );
}

export function JobAttractivenessScore({
  jobId,
  accountId,
  showDetails = true,
  compact = false,
}: JobAttractivenessScoreProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { data, isLoading } = useJobAttractiveness(jobId);
  const { mutate: calculate, isPending } = useCalculateJobAttractiveness();

  const handleCalculate = () => {
    calculate({ jobId, accountId });
  };

  if (isLoading) {
    return compact ? (
      <Skeleton className="h-4 w-10" />
    ) : (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-20" />
        </CardContent>
      </Card>
    );
  }

  // If no score calculated yet, show calculate button
  if (!data || !data.calculatedAt) {
    if (compact) {
      return (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCalculate}
          disabled={isPending}
          className="h-6 px-2 text-xs"
        >
          {isPending ? (
            <RefreshCw className="h-3 w-3 animate-spin" />
          ) : (
            <>
              <Sparkles className="h-3 w-3 mr-1" />
              Calcular
            </>
          )}
        </Button>
      );
    }

    return (
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Score de Atratividade</p>
              <p className="text-sm text-muted-foreground">
                Calcule o score para ver como sua vaga se compara
              </p>
            </div>
            <Button onClick={handleCalculate} disabled={isPending}>
              {isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Calcular Score
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Compact view for listing
  if (compact) {
    return <CompactScore score={data.score} onClick={() => setIsOpen(true)} />;
  }

  // Full card view
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Score de Atratividade
          </CardTitle>
          <div className="flex items-center gap-2">
            <ScoreBadge score={data.score} />
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCalculate}
              disabled={isPending}
              className="h-8 w-8"
            >
              <RefreshCw
                className={cn("h-4 w-4", isPending && "animate-spin")}
              />
            </Button>
          </div>
        </div>
      </CardHeader>

      {showDetails && (
        <CardContent className="space-y-4">
          {/* Score Bar */}
          <div className="space-y-2">
            <Progress value={data.score} className="h-2" />
            <p className="text-xs text-muted-foreground text-right">
              {data.score >= 80
                ? "Excelente! Sua vaga é muito atrativa"
                : data.score >= 50
                ? "Bom, mas pode melhorar"
                : "Atenção: baixa atratividade"}
            </p>
          </div>

          {/* Breakdown Collapsible */}
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between">
                <span>Ver detalhes</span>
                {isOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>

            <CollapsibleContent className="space-y-4 pt-4">
              {/* Breakdown */}
              <div className="space-y-3">
                {Object.entries(data.breakdown).map(([key, value]) => (
                  <BreakdownItem
                    key={key}
                    category={key as keyof AttractivenessBreakdown}
                    score={value}
                  />
                ))}
              </div>

              {/* Suggestions */}
              {data.suggestions.length > 0 && (
                <div className="pt-4 border-t">
                  <p className="text-sm font-medium flex items-center gap-2 mb-2">
                    <Lightbulb className="h-4 w-4 text-chart-4" />
                    Sugestões de melhoria
                  </p>
                  <ul className="space-y-2">
                    {data.suggestions.map((suggestion, index) => (
                      <li
                        key={index}
                        className="text-sm text-muted-foreground pl-4 border-l-2 border-muted"
                      >
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      )}
    </Card>
  );
}
