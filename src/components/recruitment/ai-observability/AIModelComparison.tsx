import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Cpu, Clock, CheckCircle, AlertTriangle, DollarSign } from "lucide-react";
import type { AIModelMetrics } from "@/hooks/useAIPerformanceMetrics";

interface AIModelComparisonProps {
  models: AIModelMetrics[] | undefined;
  isLoading: boolean;
}

export function AIModelComparison({ models, isLoading }: AIModelComparisonProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!models || models.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Comparação de Modelos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 flex items-center justify-center text-muted-foreground">
            Sem dados de modelos disponíveis
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxCalls = Math.max(...models.map((m) => m.totalCalls));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Cpu className="h-4 w-4" />
          Comparação de Modelos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {models.map((model) => (
          <div
            key={model.model}
            className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="font-medium">{model.model}</span>
                <Badge variant="outline" className="text-xs">
                  {model.totalCalls} chamadas
                </Badge>
              </div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <DollarSign className="h-3 w-3" />
                <span>${model.estimatedCost.toFixed(2)}</span>
              </div>
            </div>

            <Progress
              value={(model.totalCalls / maxCalls) * 100}
              className="h-2 mb-3"
            />

            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground text-xs">Tempo Médio</p>
                  <p className="font-medium">{model.avgResponseTime.toFixed(1)}s</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-muted-foreground text-xs">Taxa de Sucesso</p>
                  <p className="font-medium">{model.successRate.toFixed(1)}%</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-accent-foreground" />
                <div>
                  <p className="text-muted-foreground text-xs">Erros</p>
                  <p className="font-medium">{model.errorCount}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
