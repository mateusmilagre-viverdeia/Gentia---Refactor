import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TableIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { AutomatedStepMetrics } from "@/hooks/useAutomatedStepsAnalytics";

interface StepConversionDetailsProps {
  steps: AutomatedStepMetrics[];
  isLoading?: boolean;
}

export function StepConversionDetails({ steps, isLoading }: StepConversionDetailsProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const getConversionBadge = (rate: number) => {
    if (rate >= 70) {
      return (
        <Badge variant="default" className="bg-green-500/10 text-green-600 hover:bg-green-500/20">
          <TrendingUp className="h-3 w-3 mr-1" />
          {rate.toFixed(0)}%
        </Badge>
      );
    }
    if (rate >= 50) {
      return (
        <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20">
          <Minus className="h-3 w-3 mr-1" />
          {rate.toFixed(0)}%
        </Badge>
      );
    }
    return (
      <Badge variant="destructive" className="bg-red-500/10 text-red-600 hover:bg-red-500/20">
        <TrendingDown className="h-3 w-3 mr-1" />
        {rate.toFixed(0)}%
      </Badge>
    );
  };

  const getScoreColor = (score: number, threshold: number) => {
    if (score >= threshold) return "text-green-600";
    if (score >= threshold - 10) return "text-amber-600";
    return "text-red-600";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TableIcon className="h-5 w-5" />
          Detalhamento por Etapa
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Etapa</TableHead>
              <TableHead className="text-center">Total</TableHead>
              <TableHead className="text-center">Pendentes</TableHead>
              <TableHead className="text-center">Aprovados</TableHead>
              <TableHead className="text-center">Reprovados</TableHead>
              <TableHead className="text-center">Taxa</TableHead>
              <TableHead className="text-center">Score Médio</TableHead>
              <TableHead className="text-center">Threshold</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {steps.map((step) => (
              <TableRow key={step.stepType}>
                <TableCell className="font-medium">{step.label}</TableCell>
                <TableCell className="text-center">{step.totalSessions}</TableCell>
                <TableCell className="text-center">
                  {step.pending > 0 ? (
                    <span className="text-amber-600">{step.pending}</span>
                  ) : (
                    <span className="text-muted-foreground">0</span>
                  )}
                </TableCell>
                <TableCell className="text-center text-green-600 font-medium">{step.approved}</TableCell>
                <TableCell className="text-center text-red-600">{step.rejected}</TableCell>
                <TableCell className="text-center">{getConversionBadge(step.conversionRate)}</TableCell>
                <TableCell className={`text-center font-medium ${getScoreColor(step.avgScore, step.avgThreshold)}`}>
                  {step.avgScore.toFixed(0)}
                </TableCell>
                <TableCell className="text-center text-muted-foreground">{step.avgThreshold.toFixed(0)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Score Distribution */}
        <div className="mt-6 pt-4 border-t">
          <p className="text-sm font-medium mb-3">Distribuição de Scores</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {steps.map((step) => (
              <div key={step.stepType} className="space-y-2">
                <p className="text-sm text-muted-foreground">{step.label}</p>
                <div className="flex gap-1">
                  {step.scoreDistribution.map((dist) => {
                    const maxCount = Math.max(...step.scoreDistribution.map((d) => d.count), 1);
                    const heightPercent = (dist.count / maxCount) * 100;
                    const isHighRange = parseInt(dist.range.split("-")[0]) >= 60;

                    return (
                      <div key={dist.range} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full h-16 flex items-end">
                          <div
                            className={`w-full rounded-t transition-all ${
                              isHighRange ? "bg-green-500/70" : "bg-muted-foreground/30"
                            }`}
                            style={{ height: `${Math.max(heightPercent, 5)}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground">{dist.range}</span>
                        <span className="text-xs font-medium">{dist.count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
