import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, Clock, Play, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PulseAction } from '@/hooks/usePulseActions';

interface CultureActionPlanProps {
  actions: PulseAction[];
  loading: boolean;
  onFetch: () => void;
  onUpdateStatus: (id: string, status: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  planned: { label: 'Planejado', icon: Clock, color: 'text-blue-600' },
  in_progress: { label: 'Em Andamento', icon: Play, color: 'text-amber-600' },
  completed: { label: 'Concluído', icon: CheckCircle2, color: 'text-green-600' },
};

const PRIORITY_BADGE: Record<string, 'destructive' | 'warning' | 'info'> = {
  high: 'destructive',
  medium: 'warning',
  low: 'info',
};

export function CultureActionPlan({ actions, loading, onFetch, onUpdateStatus, onDelete }: CultureActionPlanProps) {
  useEffect(() => {
    onFetch();
  }, [onFetch]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (actions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Planos de Ação</CardTitle>
          <CardDescription>Ações vinculadas aos alertas de cultura</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">Nenhum plano de ação criado ainda.</p>
            <p className="text-xs mt-1">Crie ações a partir dos alertas acima.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const nextStatus: Record<string, string> = {
    planned: 'in_progress',
    in_progress: 'completed',
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Planos de Ação</CardTitle>
        <CardDescription>{actions.length} ação(ões) registrada(s)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {actions.map(action => {
          const statusCfg = STATUS_CONFIG[action.status] || STATUS_CONFIG.planned;
          const StatusIcon = statusCfg.icon;
          const next = nextStatus[action.status];

          return (
            <div key={action.id} className="flex items-start gap-3 p-4 rounded-lg border">
              <StatusIcon className={cn("h-5 w-5 mt-0.5", statusCfg.color)} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{action.title}</span>
                  <Badge variant={PRIORITY_BADGE[action.priority] || 'info'}>
                    {action.priority === 'high' ? 'Alta' : action.priority === 'medium' ? 'Média' : 'Baixa'}
                  </Badge>
                  <Badge variant="outline">{statusCfg.label}</Badge>
                </div>
                {action.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{action.description}</p>
                )}
                {action.due_date && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Prazo: {new Date(action.due_date).toLocaleDateString('pt-BR')}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1">
                {next && (
                  <Button size="sm" variant="ghost" onClick={() => onUpdateStatus(action.id, next)}>
                    {next === 'in_progress' ? 'Iniciar' : 'Concluir'}
                  </Button>
                )}
                <Button size="icon" variant="ghost" className="text-muted-foreground" onClick={() => onDelete(action.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
