import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  AlertTriangle, 
  TrendingDown, 
  Users, 
  CheckCircle2,
  Eye,
  RefreshCw,
  Bell,
  Activity
} from 'lucide-react';
import { usePulseRetentionAlerts, RetentionAlert, TeamRiskSummary } from '@/hooks/usePulseRetentionAlerts';
import { useOrganization } from '@/contexts/OrganizationContext';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatBRTRelative } from "@/lib/datetime";

export function RetentionAlertsDashboard() {
  const { currentOrganization } = useOrganization();
  const accountId = currentOrganization?.id || null;
  
  const { 
    alerts, 
    teamRisks, 
    summary, 
    isLoading,
    generateAlerts,
    markAsRead,
    resolveAlert,
    refetchAlerts,
  } = usePulseRetentionAlerts(accountId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard
          title="Alertas Ativos"
          value={summary.totalAlerts}
          icon={<Bell className="h-4 w-4" />}
          variant={summary.criticalAlerts > 0 ? 'critical' : 'default'}
        />
        <SummaryCard
          title="Alertas Críticos"
          value={summary.criticalAlerts}
          icon={<AlertTriangle className="h-4 w-4" />}
          variant={summary.criticalAlerts > 0 ? 'critical' : 'default'}
        />
        <SummaryCard
          title="Equipes em Risco"
          value={summary.highRiskTeams}
          icon={<Users className="h-4 w-4" />}
          variant={summary.highRiskTeams > 0 ? 'warning' : 'default'}
        />
        <SummaryCard
          title="Não Lidos"
          value={summary.unreadAlerts}
          icon={<Eye className="h-4 w-4" />}
          variant="default"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => generateAlerts.mutate()}
          disabled={generateAlerts.isPending}
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", generateAlerts.isPending && "animate-spin")} />
          Analisar Riscos
        </Button>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => refetchAlerts()}
        >
          Atualizar
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Alerts List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Alertas de Retenção
            </CardTitle>
            <CardDescription>
              Alertas gerados com base nos dados do Pulse
            </CardDescription>
          </CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Nenhum alerta de retenção ativo</p>
                <p className="text-sm">Os indicadores do Pulse estão saudáveis</p>
              </div>
            ) : (
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-3">
                  {alerts.map((alert) => (
                    <AlertItem
                      key={alert.id}
                      alert={alert}
                      onMarkRead={() => markAsRead.mutate(alert.id)}
                      onResolve={() => resolveAlert.mutate(alert.id)}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Team Risks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Risco por Equipe
            </CardTitle>
            <CardDescription>
              Nível de risco de retenção por equipe
            </CardDescription>
          </CardHeader>
          <CardContent>
            {teamRisks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Nenhuma equipe cadastrada</p>
              </div>
            ) : (
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-3">
                  {teamRisks.map((team) => (
                    <TeamRiskItem key={team.team_id} team={team} />
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface SummaryCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  variant: 'default' | 'warning' | 'critical';
}

function SummaryCard({ title, value, icon, variant }: SummaryCardProps) {
  const variants = {
    default: 'bg-card',
    warning: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
    critical: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
  };

  return (
    <Card className={cn(variants[variant])}>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
          <div className={cn(
            "p-2 rounded-full",
            variant === 'critical' && "bg-red-100 text-red-600 dark:bg-red-900/50",
            variant === 'warning' && "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/50",
            variant === 'default' && "bg-muted text-muted-foreground"
          )}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface AlertItemProps {
  alert: RetentionAlert;
  onMarkRead: () => void;
  onResolve: () => void;
}

function AlertItem({ alert, onMarkRead, onResolve }: AlertItemProps) {
  const severityConfig = {
    critical: { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: AlertTriangle },
    high: { color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', icon: TrendingDown },
    medium: { color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Activity },
    low: { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Bell },
  };

  const config = severityConfig[alert.severity] || severityConfig.medium;
  const Icon = config.icon;

  return (
    <div className={cn(
      "p-3 rounded-lg border",
      !alert.is_read && "bg-muted/50"
    )}>
      <div className="flex items-start gap-3">
        <div className={cn("p-1.5 rounded", config.color)}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-sm truncate">{alert.title}</h4>
            {!alert.is_read && (
              <Badge variant="secondary" className="text-xs">Novo</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {alert.description}
          </p>
          {alert.team_name && (
            <Badge variant="outline" className="mt-1 text-xs">
              {alert.team_name}
            </Badge>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            {formatBRTRelative(new Date(alert.created_at))}
          </p>
        </div>
        <div className="flex gap-1">
          {!alert.is_read && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onMarkRead}>
              <Eye className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onResolve}>
            <CheckCircle2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

interface TeamRiskItemProps {
  team: TeamRiskSummary;
}

function TeamRiskItem({ team }: TeamRiskItemProps) {
  const riskConfig = {
    critical: { color: 'bg-red-500', text: 'Crítico' },
    high: { color: 'bg-orange-500', text: 'Alto' },
    medium: { color: 'bg-yellow-500', text: 'Médio' },
    low: { color: 'bg-green-500', text: 'Baixo' },
  };

  const config = riskConfig[team.risk_level];

  return (
    <div className="p-3 rounded-lg border">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-sm">{team.team_name}</h4>
        <Badge className={cn(config.color, "text-white")}>
          {config.text}
        </Badge>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <span className="text-muted-foreground">Engajamento</span>
          <p className="font-medium">{team.avg_engagement}%</p>
        </div>
        <div>
          <span className="text-muted-foreground">Participação</span>
          <p className="font-medium">{team.participation_rate}%</p>
        </div>
        <div>
          <span className="text-muted-foreground">Em Risco</span>
          <p className="font-medium">{team.at_risk_members}/{team.total_members}</p>
        </div>
      </div>
      {team.alerts_count > 0 && (
        <div className="mt-2 flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400">
          <AlertTriangle className="h-3 w-3" />
          {team.alerts_count} alerta(s) ativo(s)
        </div>
      )}
    </div>
  );
}
