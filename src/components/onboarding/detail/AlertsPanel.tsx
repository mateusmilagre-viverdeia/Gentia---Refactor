import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Bell, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  MoreVertical,
  CheckCheck,
  Trash2,
  Eye,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { useOnboardingAlerts } from '@/hooks/useOnboardingAlerts';
import type { OnboardingAlert } from '@/types/onboarding.types';
import { 
  getAlertTypeLabel, 
  getAlertSeverityLabel,
  getAlertSeverityColor,
} from '@/types/onboarding.types';
import { formatBRTRelative } from "@/lib/datetime";

interface AlertsPanelProps {
  processId: string;
}

function getAlertIcon(severity: OnboardingAlert['severity']) {
  switch (severity) {
    case 'critical':
    case 'high':
      return <AlertTriangle className="h-4 w-4 text-red-600" />;
    case 'medium':
      return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
}

export function AlertsPanel({ processId }: AlertsPanelProps) {
  const {
    alerts,
    activeAlerts,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    resolveAlert,
    deleteAlert,
  } = useOnboardingAlerts(processId);

  const [showResolved, setShowResolved] = useState(false);

  const displayAlerts = showResolved ? alerts : activeAlerts;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-pulse text-muted-foreground">Carregando alertas...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <CardTitle className="text-base">Alertas</CardTitle>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center text-xs">
                {unreadCount}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowResolved(!showResolved)}
              className="text-xs"
            >
              {showResolved ? 'Ocultar resolvidos' : 'Mostrar resolvidos'}
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAllAsRead.mutate()}
                disabled={markAllAsRead.isPending}
              >
                <CheckCheck className="h-4 w-4 mr-1" />
                Marcar todas
              </Button>
            )}
          </div>
        </div>
        <CardDescription>
          {activeAlerts.length === 0 
            ? 'Nenhum alerta ativo' 
            : `${activeAlerts.length} alerta${activeAlerts.length > 1 ? 's' : ''} ativo${activeAlerts.length > 1 ? 's' : ''}`
          }
        </CardDescription>
      </CardHeader>

      <CardContent>
        {displayAlerts.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhum alerta para exibir</p>
          </div>
        ) : (
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {displayAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={cn(
                    'p-3 rounded-lg border transition-colors',
                    !alert.is_read && 'bg-muted/50 border-primary/20',
                    alert.resolved_at && 'opacity-60',
                  )}
                >
                  <div className="flex items-start gap-3">
                    {getAlertIcon(alert.severity)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{alert.title}</span>
                        <Badge 
                          variant="outline" 
                          className={cn('text-xs', getAlertSeverityColor(alert.severity))}
                        >
                          {getAlertSeverityLabel(alert.severity)}
                        </Badge>
                        {alert.resolved_at && (
                          <Badge variant="outline" className="text-xs text-green-600">
                            Resolvido
                          </Badge>
                        )}
                      </div>
                      {alert.message && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {alert.message}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <Badge variant="secondary" className="text-xs">
                          {getAlertTypeLabel(alert.alert_type)}
                        </Badge>
                        <span>•</span>
                        <span>
                          {formatBRTRelative(new Date(alert.created_at))}
                        </span>
                      </div>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {!alert.is_read && (
                          <DropdownMenuItem onClick={() => markAsRead.mutate(alert.id)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Marcar como lido
                          </DropdownMenuItem>
                        )}
                        {!alert.resolved_at && (
                          <DropdownMenuItem onClick={() => resolveAlert.mutate(alert.id)}>
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Marcar como resolvido
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem 
                          onClick={() => deleteAlert.mutate(alert.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
