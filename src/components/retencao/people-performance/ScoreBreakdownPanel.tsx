import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, UserCheck, BarChart3, TrendingUp, CheckCircle2, XCircle } from 'lucide-react';
import { PeoplePerformanceScore, PeoplePerformanceWeights, getPerformanceLevel } from '@/types/people-performance.types';
import { cn } from '@/lib/utils';

interface ScoreBreakdownPanelProps {
  person: PeoplePerformanceScore | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weights: PeoplePerformanceWeights;
}

export function ScoreBreakdownPanel({ person, open, onOpenChange, weights }: ScoreBreakdownPanelProps) {
  if (!person) return null;

  const level = getPerformanceLevel(person.peoplePerformanceIndex);

  const dimensions = [
    {
      key: 'cultural',
      label: 'Cultural',
      icon: UserCheck,
      score: person.culturalScore,
      weight: weights.cultural,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500',
      source: person.sources.peopleAnalysis ? 'Analisador de Pessoas' : null,
    },
    {
      key: 'performance',
      label: 'Desempenho',
      icon: BarChart3,
      score: person.performanceScore,
      weight: weights.performance,
      color: 'text-green-500',
      bgColor: 'bg-green-500',
      source: person.sources.performanceAssessment ? 'Avaliação de Desempenho' : null,
    },
    {
      key: 'maturity',
      label: 'Maturidade',
      icon: TrendingUp,
      score: person.maturityScore,
      weight: weights.maturity,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500',
      source: person.sources.teamMaturity ? 'Maturidade do Time' : null,
    },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <span className="block">{person.displayName}</span>
              <Badge variant="outline" className={cn('text-xs', level.color, level.bgClass)}>
                {level.label}
              </Badge>
            </div>
          </SheetTitle>
          <SheetDescription>
            Detalhamento do índice People Performance
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Main Index */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">People Performance Index</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <span className={cn('text-4xl font-bold', level.color)}>
                  {person.peoplePerformanceIndex.toFixed(1)}%
                </span>
                <span className="text-sm text-muted-foreground">
                  {person.availableAssessments} de 3 avaliações
                </span>
              </div>
              <Progress value={person.peoplePerformanceIndex} className="h-3" />
            </CardContent>
          </Card>

          <Separator />

          {/* Dimension Breakdown */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              Detalhamento por Dimensão
            </h3>

            {dimensions.map(({ key, label, icon: Icon, score, weight, color, bgColor, source }) => (
              <Card key={key} className={cn(!source && 'opacity-60')}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={cn('p-2 rounded-lg', bgColor, 'bg-opacity-10')}>
                        <Icon className={cn('h-4 w-4', color)} />
                      </div>
                      <div>
                        <span className="font-medium">{label}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          (peso: {weight}%)
                        </span>
                      </div>
                    </div>
                    {source ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>

                  {score !== null ? (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <span className={cn('text-2xl font-bold', color)}>
                          {score.toFixed(1)}%
                        </span>
                        <span className="text-sm text-muted-foreground">
                          Contribuição: {((score * weight) / 100).toFixed(1)} pts
                        </span>
                      </div>
                      <Progress value={score} className="h-2" />
                      {source && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Fonte: {source}
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="py-2 text-center text-muted-foreground text-sm">
                      Avaliação não encontrada para esta pessoa
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <Separator />

          {/* Calculation Formula */}
          <div className="space-y-2">
            <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              Fórmula de Cálculo
            </h3>
            <div className="p-3 bg-muted/50 rounded-lg font-mono text-sm">
              <p>PP = Σ (Score × Peso) / Σ Pesos disponíveis</p>
              <div className="mt-2 text-xs text-muted-foreground space-y-1">
                {dimensions.map(({ label, score, weight }) => (
                  score !== null && (
                    <p key={label}>
                      {label}: {score.toFixed(1)} × {weight}% = {((score * weight) / 100).toFixed(2)}
                    </p>
                  )
                ))}
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
