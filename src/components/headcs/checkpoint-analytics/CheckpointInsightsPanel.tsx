import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, AlertTriangle, AlertCircle, Info, CheckCircle } from "lucide-react";
import type { CheckpointAlert } from "@/types/checkpoint-analytics.types";
import { cn } from "@/lib/utils";

interface CheckpointInsightsPanelProps {
  alerts: CheckpointAlert[];
}

const severityConfig = {
  high: {
    icon: AlertCircle,
    color: 'text-red-500',
    bgColor: 'bg-red-50 dark:bg-red-950/30',
    badgeVariant: 'destructive' as const,
  },
  medium: {
    icon: AlertTriangle,
    color: 'text-amber-500',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    badgeVariant: 'warning' as const,
  },
  low: {
    icon: Info,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    badgeVariant: 'info' as const,
  },
};

export function CheckpointInsightsPanel({ alerts }: CheckpointInsightsPanelProps) {
  const sortedAlerts = [...alerts].sort((a, b) => {
    const severityOrder = { high: 0, medium: 1, low: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  if (sortedAlerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            Alertas e Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
            <CheckCircle className="h-5 w-5 text-emerald-500" />
            <div>
              <p className="font-medium text-emerald-700 dark:text-emerald-400">
                Tudo em ordem!
              </p>
              <p className="text-sm text-emerald-600 dark:text-emerald-500">
                Nenhum alerta ou ação necessária no momento.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Lightbulb className="h-4 w-4" />
          Alertas e Insights
          <Badge variant="outline" className="ml-auto">{sortedAlerts.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sortedAlerts.map((alert, index) => {
            const config = severityConfig[alert.severity];
            const Icon = config.icon;

            return (
              <div
                key={`${alert.type}-${index}`}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg",
                  config.bgColor
                )}
              >
                <Icon className={cn("h-5 w-5 flex-shrink-0 mt-0.5", config.color)} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{alert.title}</span>
                    {alert.count && (
                      <Badge variant={config.badgeVariant} className="text-[10px]">
                        {alert.count}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {alert.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
