import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TrendingUp, Clock, FileText, Users, Briefcase, Info } from "lucide-react";
import type { TalentPoolScore } from "@/hooks/useTalentPoolScoring";
import { cn } from "@/lib/utils";

interface TalentPoolScoreCardProps {
  score: TalentPoolScore;
  compact?: boolean;
}

const SCORE_LABELS = [
  { min: 80, label: "Excelente", color: "bg-green-500" },
  { min: 60, label: "Bom", color: "bg-blue-500" },
  { min: 40, label: "Regular", color: "bg-yellow-500" },
  { min: 0, label: "Baixo", color: "bg-red-500" },
];

function getScoreLabel(score: number) {
  return SCORE_LABELS.find((l) => score >= l.min) || SCORE_LABELS[SCORE_LABELS.length - 1];
}

export function TalentPoolScoreCard({ score, compact = false }: TalentPoolScoreCardProps) {
  const scoreLabel = getScoreLabel(score.overallScore);
  const { breakdown } = score;

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold",
                  scoreLabel.color
                )}
              >
                {score.overallScore}
              </div>
              <span className="text-xs text-muted-foreground">{scoreLabel.label}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="w-64 p-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Score Total</span>
                <Badge variant="secondary">{score.overallScore}/100</Badge>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Recência</span>
                  <span>{breakdown.recencyScore}/25</span>
                </div>
                <div className="flex justify-between">
                  <span>Completude</span>
                  <span>{breakdown.completenessScore}/25</span>
                </div>
                <div className="flex justify-between">
                  <span>Engajamento</span>
                  <span>{breakdown.engagementScore}/25</span>
                </div>
                <div className="flex justify-between">
                  <span>Match com vagas</span>
                  <span>{breakdown.matchScore}/25</span>
                </div>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Score de Potencial
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Score */}
        <div className="flex items-center gap-4">
          <div
            className={cn(
              "h-16 w-16 rounded-full flex items-center justify-center text-white text-xl font-bold",
              scoreLabel.color
            )}
          >
            {score.overallScore}
          </div>
          <div>
            <p className="font-medium text-lg">{scoreLabel.label}</p>
            <p className="text-sm text-muted-foreground">de 100 pontos</p>
          </div>
        </div>

        {/* Breakdown */}
        <div className="space-y-3">
          <BreakdownItem
            icon={Clock}
            label="Recência"
            value={breakdown.recencyScore}
            max={25}
            tooltip="Baseado em quanto tempo está no pool"
          />
          <BreakdownItem
            icon={FileText}
            label="Completude"
            value={breakdown.completenessScore}
            max={25}
            tooltip="Baseado nas informações preenchidas"
          />
          <BreakdownItem
            icon={Users}
            label="Engajamento"
            value={breakdown.engagementScore}
            max={25}
            tooltip="Baseado em interações e follow-ups"
          />
          <BreakdownItem
            icon={Briefcase}
            label="Match com Vagas"
            value={breakdown.matchScore}
            max={25}
            tooltip="Baseado na compatibilidade com vagas abertas"
          />
        </div>

        {/* Matching Jobs */}
        {score.matchingJobs.length > 0 && (
          <div className="pt-2 border-t">
            <p className="text-sm font-medium mb-2">Vagas Compatíveis</p>
            <div className="flex flex-wrap gap-1">
              {score.matchingJobs.map((job) => (
                <Badge key={job.jobId} variant="outline" className="text-xs">
                  {job.jobTitle} ({job.matchPercentage}%)
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {score.recommendations.length > 0 && (
          <div className="pt-2 border-t">
            <p className="text-sm font-medium mb-2 flex items-center gap-1">
              <Info className="h-3 w-3" />
              Recomendações
            </p>
            <ul className="space-y-1">
              {score.recommendations.map((rec, i) => (
                <li key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                  <span className="text-primary">•</span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface BreakdownItemProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  max: number;
  tooltip: string;
}

function BreakdownItem({ icon: Icon, label, value, max, tooltip }: BreakdownItemProps) {
  const percentage = (value / max) * 100;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{label}</span>
              </div>
              <span className="text-muted-foreground">
                {value}/{max}
              </span>
            </div>
            <Progress value={percentage} className="h-1.5" />
          </div>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p className="text-xs">{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
