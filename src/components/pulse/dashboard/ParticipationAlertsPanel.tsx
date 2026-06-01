import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  usePulseParticipationAlerts, 
  ParticipationAlert 
} from '@/hooks/usePulseParticipationAlerts';
import { 
  AlertTriangle, 
  UserX, 
  Users, 
  Check, 
  X,
  Clock,
  TrendingDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatBRTRelative } from "@/lib/datetime";


interface ParticipationAlertsPanelProps {
  accountId: string | null;
}

function AlertIcon({ isMemberAlert }: { isMemberAlert: boolean }) {
  if (isMemberAlert) {
    return <UserX className="h-4 w-4" />;
  }
  return <Users className="h-4 w-4" />;
}

function SeverityBadge({ severity }: { severity: string }) {
  const variants: Record<string, { className: string; label: string }> = {
    critical: { className: 'bg-red-500 text-white', label: 'Crítico' },
    high: { className: 'bg-orange-500 text-white', label: 'Alto' },
    medium: { className: 'bg-amber-500 text-white', label: 'Médio' },
    low: { className: 'bg-blue-500 text-white', label: 'Baixo' },
  };

  const variant = variants[severity] || variants.low;

  return (
    <Badge className={cn('text-xs', variant.className)}>
      {variant.label}
    </Badge>
  );
}

function AlertCard({ 
  alert, 
  onResolve, 
  onDismiss 
}: { 
  alert: ParticipationAlert;
  onResolve: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  const timeAgo = formatBRTRelative(new Date(alert.created_at));

  return (
    <div className={cn(
      "p-4 rounded-lg border transition-colors",
      !alert.is_read && "bg-muted/50 border-primary/20",
      alert.severity === 'critical' && "border-red-500/30"
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          <div className={cn(
            "p-2 rounded-full",
            alert.related_user_id !== null
              ? "bg-amber-100 text-amber-600"
              : "bg-red-100 text-red-600"
          )}>
            <AlertIcon isMemberAlert={alert.related_user_id !== null} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-medium text-sm">{alert.title}</h4>
              <SeverityBadge severity={alert.severity} />
              {!alert.is_read && (
                <Badge variant="outline" className="text-xs">Novo</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {alert.description}
            </p>
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {timeAgo}
              </span>
              {alert.metadata?.days_inactive && (
                <span className="flex items-center gap-1">
                  <TrendingDown className="h-3 w-3" />
                  {alert.metadata.days_inactive} dias sem resposta
                </span>
              )}
              {alert.metadata?.participation_rate !== undefined && (
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {alert.metadata.participation_rate}% participação
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-100"
            onClick={() => onResolve(alert.id)}
            title="Marcar como resolvido"
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => onDismiss(alert.id)}
            title="Dispensar"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ParticipationAlertsPanel({ accountId }: ParticipationAlertsPanelProps) {
  const {
    alerts,
    loading,
    fetchAlerts,
    resolveAlert,
    dismissAlert,
    inactiveCount,
    teamAlertCount,
    criticalAlerts,
  } = usePulseParticipationAlerts(accountId);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-24" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Alertas de Participação
            </CardTitle>
            <CardDescription>
              Membros inativos e times com baixa participação
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {criticalAlerts.length > 0 && (
              <Badge variant="destructive">
                {criticalAlerts.length} crítico{criticalAlerts.length > 1 ? 's' : ''}
              </Badge>
            )}
            <Badge variant="outline">
              {alerts.length} alerta{alerts.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
            <div className="flex items-center gap-2">
              <UserX className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-800">Membros Inativos</span>
            </div>
            <p className="text-2xl font-bold text-amber-700 mt-1">{inactiveCount}</p>
          </div>
          <div className="p-3 rounded-lg bg-red-50 border border-red-200">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium text-red-800">Times em Alerta</span>
            </div>
            <p className="text-2xl font-bold text-red-700 mt-1">{teamAlertCount}</p>
          </div>
        </div>

        {/* Alert list */}
        {alerts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Check className="h-12 w-12 mx-auto mb-3 text-green-500" />
            <p className="font-medium">Nenhum alerta pendente</p>
            <p className="text-sm">Todos os membros estão participando ativamente!</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {alerts.map(alert => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  onResolve={resolveAlert}
                  onDismiss={dismissAlert}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
