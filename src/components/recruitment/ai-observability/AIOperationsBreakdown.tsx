import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  Brain,
  FileSearch,
  Lightbulb,
  Layers,
} from "lucide-react";
import type { AIOperationBreakdown } from "@/hooks/useAIPerformanceMetrics";

interface AIOperationsBreakdownProps {
  operations: AIOperationBreakdown[] | undefined;
  isLoading: boolean;
}

const iconMap: Record<string, React.ReactNode> = {
  MessageSquare: <MessageSquare className="h-5 w-5" />,
  Brain: <Brain className="h-5 w-5" />,
  FileSearch: <FileSearch className="h-5 w-5" />,
  Lightbulb: <Lightbulb className="h-5 w-5" />,
};

export function AIOperationsBreakdown({
  operations,
  isLoading,
}: AIOperationsBreakdownProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-28 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!operations || operations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Operações por Tipo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 flex items-center justify-center text-muted-foreground">
            Sem dados de operações disponíveis
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalOperations = operations.reduce((sum, op) => sum + op.count, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Layers className="h-4 w-4" />
          Operações por Tipo
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {operations.map((operation) => {
            const percentage =
              totalOperations > 0
                ? ((operation.count / totalOperations) * 100).toFixed(1)
                : 0;

            return (
              <div
                key={operation.operation}
                className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    {iconMap[operation.icon] || <Layers className="h-5 w-5" />}
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {percentage}%
                  </Badge>
                </div>

                <h4 className="font-medium text-sm mb-1">{operation.operation}</h4>

                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Chamadas</span>
                    <span className="font-medium text-foreground">
                      {operation.count}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tempo Médio</span>
                    <span className="font-medium text-foreground">
                      {operation.avgTime.toFixed(1)}s
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sucesso</span>
                    <span
                      className={`font-medium ${
                        operation.successRate >= 95
                          ? "text-green-600"
                          : operation.successRate >= 85
                          ? "text-yellow-600"
                          : "text-red-600"
                      }`}
                    >
                      {operation.successRate.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
