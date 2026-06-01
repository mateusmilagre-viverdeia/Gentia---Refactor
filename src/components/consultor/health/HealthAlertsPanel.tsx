import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, XCircle, Clock, ArrowRight, Building2 } from "lucide-react";
import { ProjectHealthScore, HealthStatus } from "@/types/project-health.types";
import { ProjectHealthBadge } from "./ProjectHealthBadge";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface ProjectWithHealth extends ProjectHealthScore {
  company?: {
    id: string;
    name: string;
    slug: string | null;
  };
}

interface HealthAlertsPanelProps {
  projects: ProjectWithHealth[];
  loading?: boolean;
  maxItems?: number;
  onViewProject?: (accountId: string) => void;
}

interface Alert {
  id: string;
  accountId: string;
  companyName: string;
  type: 'critical' | 'at_risk' | 'inactive' | 'overdue_actions';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  healthScore: number;
  healthStatus: HealthStatus;
}

export function HealthAlertsPanel({
  projects,
  loading = false,
  maxItems = 5,
  onViewProject,
}: HealthAlertsPanelProps) {
  const navigate = useNavigate();

  // Generate alerts from projects
  const alerts: Alert[] = projects
    .flatMap((project) => {
      const alertsList: Alert[] = [];
      const companyName = project.company?.name || 'Projeto';

      // Critical health score
      if (project.health_status === 'critical') {
        alertsList.push({
          id: `${project.account_id}-critical`,
          accountId: project.account_id,
          companyName,
          type: 'critical',
          title: `${companyName} está crítico`,
          description: `Health Score caiu para ${project.health_score}. Intervenção urgente necessária.`,
          priority: 'high',
          healthScore: project.health_score,
          healthStatus: project.health_status,
        });
      }

      // At risk health score
      if (project.health_status === 'at_risk') {
        alertsList.push({
          id: `${project.account_id}-at_risk`,
          accountId: project.account_id,
          companyName,
          type: 'at_risk',
          title: `${companyName} requer atenção`,
          description: `Health Score em ${project.health_score}. Projeto precisa de acompanhamento.`,
          priority: 'medium',
          healthScore: project.health_score,
          healthStatus: project.health_status,
        });
      }

      // Long inactivity
      if (project.days_since_last_activity > 14) {
        alertsList.push({
          id: `${project.account_id}-inactive`,
          accountId: project.account_id,
          companyName,
          type: 'inactive',
          title: `${companyName} inativo há ${project.days_since_last_activity} dias`,
          description: 'Nenhum checkpoint ou atividade recente. Considere agendar uma reunião.',
          priority: project.days_since_last_activity > 30 ? 'high' : 'medium',
          healthScore: project.health_score,
          healthStatus: project.health_status,
        });
      }

      // Many pending actions
      if (project.pending_actions_count > 5) {
        alertsList.push({
          id: `${project.account_id}-actions`,
          accountId: project.account_id,
          companyName,
          type: 'overdue_actions',
          title: `${companyName} tem ${project.pending_actions_count} ações pendentes`,
          description: 'Muitas ações acumuladas. Revise as prioridades com o cliente.',
          priority: project.pending_actions_count > 10 ? 'high' : 'medium',
          healthScore: project.health_score,
          healthStatus: project.health_status,
        });
      }

      return alertsList;
    })
    .sort((a, b) => {
      // Sort by priority, then by health score
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return a.healthScore - b.healthScore;
    })
    .slice(0, maxItems);

  const handleViewProject = (accountId: string) => {
    if (onViewProject) {
      onViewProject(accountId);
    } else {
      navigate(`/consultor/projeto/${accountId}`);
    }
  };

  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'critical':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'at_risk':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'inactive':
        return <Clock className="h-4 w-4 text-orange-500" />;
      case 'overdue_actions':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    }
  };

  const getPriorityBadge = (priority: Alert['priority']) => {
    const variants = {
      high: 'bg-red-100 text-red-700 border-red-200',
      medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      low: 'bg-blue-100 text-blue-700 border-blue-200',
    };
    const labels = {
      high: 'Urgente',
      medium: 'Atenção',
      low: 'Info',
    };
    return (
      <Badge variant="outline" className={cn("text-xs", variants[priority])}>
        {labels[priority]}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Alertas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-muted-foreground" />
            Alertas
          </CardTitle>
          <CardDescription>Nenhum alerta no momento</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <p>✨ Todos os projetos estão saudáveis!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          Alertas
          <Badge variant="secondary" className="ml-auto">
            {alerts.length}
          </Badge>
        </CardTitle>
        <CardDescription>Projetos que precisam de atenção</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px]">
          <div className="space-y-1 p-4 pt-0">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
                onClick={() => handleViewProject(alert.accountId)}
              >
                <div className="mt-0.5">
                  {getAlertIcon(alert.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm truncate">
                      {alert.title}
                    </span>
                    {getPriorityBadge(alert.priority)}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {alert.description}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <ProjectHealthBadge
                    score={alert.healthScore}
                    status={alert.healthStatus}
                    size="sm"
                    showScore
                  />
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
