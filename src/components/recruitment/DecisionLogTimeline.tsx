;
import {
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight,
  Bell,
  ChevronDown,
  ChevronUp,
  Bot,
  User,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useRecruitmentDecisionLog, DecisionLogEntry } from "@/hooks/useRecruitmentDecisionLog";
import { cn } from "@/lib/utils";
import { formatBRT } from "@/lib/datetime";

interface DecisionLogTimelineProps {
  accountId: string | undefined;
  candidateId?: string;
  applicationId?: string;
  jobId?: string;
  maxItems?: number;
  showTitle?: boolean;
}

const decisionTypeLabels: Record<string, string> = {
  advance: "Avanço de Etapa",
  reject: "Rejeição",
  threshold_check: "Verificação de Threshold",
  stage_transition: "Transição de Etapa",
  notification: "Notificação",
};

const stepTypeLabels: Record<string, string> = {
  cultural: "Entrevista Cultural",
  disc: "Análise DISC",
  technical: "Entrevista Técnica",
  orchestrator: "Orquestrador",
  manual: "Ação Manual",
};

const decisionLabels: Record<string, string> = {
  approved: "Aprovado",
  rejected: "Rejeitado",
  pending_review: "Revisão Pendente",
  advanced: "Avançado",
  notified: "Notificado",
};

const triggeredByLabels: Record<string, string> = {
  orchestrator: "Sistema",
  webhook: "Webhook",
  manual: "Manual",
  cron: "Agendado",
};

function getDecisionIcon(decision: string) {
  switch (decision) {
    case "approved":
    case "advanced":
      return <CheckCircle className="h-4 w-4 text-chart-2" />;
    case "rejected":
      return <XCircle className="h-4 w-4 text-destructive" />;
    case "pending_review":
      return <Clock className="h-4 w-4 text-chart-4" />;
    case "notified":
      return <Bell className="h-4 w-4 text-chart-1" />;
    default:
      return <ArrowRight className="h-4 w-4 text-muted-foreground" />;
  }
}

function getTriggeredByIcon(triggeredBy: string) {
  switch (triggeredBy) {
    case "orchestrator":
    case "cron":
      return <Bot className="h-3 w-3" />;
    case "manual":
      return <User className="h-3 w-3" />;
    case "webhook":
      return <Zap className="h-3 w-3" />;
    default:
      return <Bot className="h-3 w-3" />;
  }
}

function DecisionLogItem({ entry }: { entry: DecisionLogEntry }) {
  const [isOpen, setIsOpen] = useState(false);

  const hasDetails =
    Object.keys(entry.input_data).length > 0 ||
    Object.keys(entry.output_data).length > 0;

  return (
    <div className="relative pl-6 pb-4 last:pb-0">
      {/* Linha vertical */}
      <div className="absolute left-[7px] top-6 bottom-0 w-[2px] bg-border last:hidden" />

      {/* Ponto na timeline */}
      <div className="absolute left-0 top-1.5 h-4 w-4 rounded-full border-2 border-background bg-muted flex items-center justify-center">
        {getDecisionIcon(entry.decision)}
      </div>

      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="bg-card border rounded-lg p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">
                  {decisionTypeLabels[entry.decision_type] || entry.decision_type}
                </span>
                <Badge
                  variant={
                    entry.decision === "approved" || entry.decision === "advanced"
                      ? "default"
                      : entry.decision === "rejected"
                      ? "destructive"
                      : "secondary"
                  }
                  className="text-xs"
                >
                  {decisionLabels[entry.decision] || entry.decision}
                </Badge>
              </div>

              {entry.step_type && (
                <p className="text-xs text-muted-foreground mt-1">
                  {stepTypeLabels[entry.step_type] || entry.step_type}
                </p>
              )}

              {entry.justification && (
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                  {entry.justification}
                </p>
              )}

              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  {getTriggeredByIcon(entry.triggered_by)}
                  {triggeredByLabels[entry.triggered_by] || entry.triggered_by}
                </span>

                {entry.score !== null && entry.threshold !== null && (
                  <span
                    className={cn(
                      "font-mono",
                      entry.score >= entry.threshold
                        ? "text-chart-2"
                        : "text-destructive"
                    )}
                  >
                    Score: {entry.score}/{entry.threshold}
                  </span>
                )}

                {entry.processing_time_ms && (
                  <span>{entry.processing_time_ms}ms</span>
                )}

                <span>
                  {formatBRT(new Date(entry.created_at), "dd/MM HH:mm")}
                </span>
              </div>
            </div>

            {hasDetails && (
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
            )}
          </div>

          <CollapsibleContent>
            <div className="mt-3 pt-3 border-t space-y-3">
              {Object.keys(entry.input_data).length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Input:
                  </p>
                  <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                    {JSON.stringify(entry.input_data, null, 2)}
                  </pre>
                </div>
              )}

              {Object.keys(entry.output_data).length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Output:
                  </p>
                  <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                    {JSON.stringify(entry.output_data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </div>
  );
}

export function DecisionLogTimeline({
  accountId,
  candidateId,
  applicationId,
  jobId,
  maxItems = 10,
  showTitle = true,
}: DecisionLogTimelineProps) {
  const [showAll, setShowAll] = useState(false);

  const { data: logs, isLoading } = useRecruitmentDecisionLog(accountId, {
    candidateId,
    applicationId,
    jobId,
    limit: 100,
  });

  if (isLoading) {
    return (
      <Card>
        {showTitle && (
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Histórico de Decisões</CardTitle>
          </CardHeader>
        )}
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-4 w-4 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <Card>
        {showTitle && (
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Histórico de Decisões</CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhuma decisão automatizada registrada ainda.
          </p>
        </CardContent>
      </Card>
    );
  }

  const displayedLogs = showAll ? logs : logs.slice(0, maxItems);
  const hasMore = logs.length > maxItems;

  return (
    <Card>
      {showTitle && (
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Histórico de Decisões</CardTitle>
            <Badge variant="outline" className="text-xs">
              {logs.length} registro{logs.length !== 1 && "s"}
            </Badge>
          </div>
        </CardHeader>
      )}
      <CardContent>
        <div className="relative">
          {displayedLogs.map((entry) => (
            <DecisionLogItem key={entry.id} entry={entry} />
          ))}
        </div>

        {hasMore && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-2"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? "Mostrar menos" : `Ver mais ${logs.length - maxItems} registros`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
