import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Clock, XCircle } from "lucide-react";
import { formatBRT } from "@/lib/datetime";
import type { AIErrorLog } from "@/hooks/useAIPerformanceMetrics";

interface AIErrorsLogProps {
  errors: AIErrorLog[] | undefined;
  isLoading: boolean;
}

export function AIErrorsLog({ errors, isLoading }: AIErrorsLogProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          Erros Recentes
          {errors && errors.length > 0 && (
            <Badge variant="destructive" className="ml-2">
              {errors.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!errors || errors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-primary mb-3" />
            <p className="text-sm font-medium text-primary">
              Nenhum erro recente
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Todos os sistemas operando normalmente
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {errors.map((error) => (
              <div
                key={error.id}
                className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {error.errorType === "timeout" ? (
                      <Clock className="h-4 w-4 text-accent-foreground" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                    <span className="font-medium text-sm">{error.operation}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={error.resolved ? "default" : "destructive"}
                      className="text-xs"
                    >
                      {error.resolved ? "Resolvido" : "Pendente"}
                    </Badge>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground mb-2">
                  {error.errorMessage}
                </p>

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>Modelo: {error.model}</span>
                  <span>
                    {formatBRT(error.timestamp, "dd/MM HH:mm")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
