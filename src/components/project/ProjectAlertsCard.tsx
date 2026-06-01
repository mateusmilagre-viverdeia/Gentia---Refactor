import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  AlertTriangle, 
  XCircle, 
  Clock, 
  Ban, 
  Activity,
  MoreVertical,
  Check,
  X,
  Bell
} from "lucide-react";
import { useProjectAlerts, ProjectAlert, ProjectAlertSeverity, ProjectAlertType } from "@/hooks/useProjectAlerts";

import { cn } from "@/lib/utils";
import { formatBRTRelative } from "@/lib/datetime";

interface ProjectAlertsCardProps {
  accountId: string;
  maxItems?: number;
  showActions?: boolean;
  compact?: boolean;
}

const severityConfig: Record<ProjectAlertSeverity, { icon: typeof AlertTriangle; color: string; label: string }> = {
  critical: { icon: XCircle, color: 'text-red-500', label: 'Crítico' },
  warning: { icon: AlertTriangle, color: 'text-yellow-500', label: 'Atenção' },
  info: { icon: Bell, color: 'text-blue-500', label: 'Info' },
};

const typeConfig: Record<ProjectAlertType, { icon: typeof Clock; label: string }> = {
  overdue: { icon: Clock, label: 'Atrasado' },
  blocked: { icon: Ban, label: 'Bloqueado' },
  inactivity: { icon: Clock, label: 'Inatividade' },
  health_critical: { icon: Activity, label: 'Health Crítico' },
  health_drop: { icon: Activity, label: 'Queda de Health' },
};

export function ProjectAlertsCard({
  accountId,
  maxItems = 5,
  showActions = true,
  compact = false,
}: ProjectAlertsCardProps) {
  const { 
    activeAlerts, 
    criticalCount, 
    activeCount,
    loading, 
    dismissAlert, 
    resolveAlert 
  } = useProjectAlerts(accountId);

  const displayAlerts = activeAlerts.slice(0, maxItems);

  if (loading) {
    return (
      <Card>
        <CardHeader className={compact ? "pb-2" : undefined}>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Alertas do Projeto
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-muted rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (activeCount === 0) {
    return (
      <Card>
        <CardHeader className={compact ? "pb-2" : undefined}>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-muted-foreground" />
            Alertas do Projeto
          </CardTitle>
          <CardDescription>Nenhum alerta ativo</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            <p>✨ Tudo em ordem!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className={compact ? "pb-2" : undefined}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className={cn(
              "h-5 w-5",
              criticalCount > 0 ? "text-red-500" : "text-yellow-500"
            )} />
            Alertas do Projeto
          </CardTitle>
          <div className="flex items-center gap-2">
            {criticalCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {criticalCount} crítico{criticalCount > 1 ? 's' : ''}
              </Badge>
            )}
            <Badge variant="secondary" className="text-xs">
              {activeCount} ativo{activeCount > 1 ? 's' : ''}
            </Badge>
          </div>
        </div>
        {!compact && (
          <CardDescription>
            Situações que precisam de atenção
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className={compact ? "pt-0" : "p-0"}>
        <ScrollArea className={compact ? "max-h-[200px]" : "h-[250px]"}>
          <div className={cn("space-y-2", !compact && "p-4 pt-0")}>
            {displayAlerts.map((alert) => (
              <AlertItem
                key={alert.id}
                alert={alert}
                showActions={showActions}
                compact={compact}
                onDismiss={() => dismissAlert(alert.id)}
                onResolve={() => resolveAlert(alert.id)}
              />
            ))}
            {activeCount > maxItems && (
              <p className="text-xs text-muted-foreground text-center pt-2">
                +{activeCount - maxItems} alerta(s) adicional(is)
              </p>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

interface AlertItemProps {
  alert: ProjectAlert;
  showActions: boolean;
  compact: boolean;
  onDismiss: () => void;
  onResolve: () => void;
}

function AlertItem({ alert, showActions, compact, onDismiss, onResolve }: AlertItemProps) {
  const severityInfo = severityConfig[alert.severity];
  const typeInfo = typeConfig[alert.alert_type];
  const SeverityIcon = severityInfo.icon;
  const TypeIcon = typeInfo.icon;

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg border transition-colors",
        alert.severity === 'critical' && "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800",
        alert.severity === 'warning' && "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800",
        alert.severity === 'info' && "bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800"
      )}
    >
      <div className="mt-0.5">
        <SeverityIcon className={cn("h-4 w-4", severityInfo.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm truncate">
            {alert.title}
          </span>
          <Badge variant="outline" className="text-xs shrink-0">
            {typeInfo.label}
          </Badge>
        </div>
        {!compact && alert.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {alert.description}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          Detectado {formatBRTRelative(new Date(alert.first_detected_at))}
        </p>
      </div>
      {showActions && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onResolve}>
              <Check className="h-4 w-4 mr-2" />
              Marcar como resolvido
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDismiss}>
              <X className="h-4 w-4 mr-2" />
              Dispensar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
