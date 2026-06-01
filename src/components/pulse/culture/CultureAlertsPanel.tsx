import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, AlertCircle, Info, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CultureDashboardSummary } from '@/types/pulseCulture.types';
import type { CreateActionInput } from '@/hooks/usePulseActions';

interface AlertItem {
  id: string;
  type: 'pillar' | 'value' | 'trend' | 'participation';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  context?: string;
}

interface CultureAlertsPanelProps {
  summary: CultureDashboardSummary;
  pillarScores: Array<{ pillar: string; pillar_name: string; score: number }>;
  valueScores: Array<{ value: string; score: number }>;
  onCreateAction?: (input: CreateActionInput) => Promise<unknown>;
}

export function CultureAlertsPanel({ summary, pillarScores, valueScores, onCreateAction }: CultureAlertsPanelProps) {
  const [actionDialog, setActionDialog] = useState<AlertItem | null>(null);
  const [actionTitle, setActionTitle] = useState('');
  const [actionDescription, setActionDescription] = useState('');
  const [creating, setCreating] = useState(false);

  const alerts = useMemo(() => {
    const items: AlertItem[] = [];

    // Low pillar scores
    pillarScores.forEach(p => {
      if (p.score < 5.0) {
        items.push({
          id: `pillar-critical-${p.pillar}`,
          type: 'pillar',
          severity: 'critical',
          title: `Pilar "${p.pillar_name}" em nível crítico`,
          description: `Score de ${p.score.toFixed(1)}/10 — abaixo do mínimo aceitável de 5.0`,
          context: p.pillar,
        });
      } else if (p.score < 6.0) {
        items.push({
          id: `pillar-warning-${p.pillar}`,
          type: 'pillar',
          severity: 'warning',
          title: `Pilar "${p.pillar_name}" precisa de atenção`,
          description: `Score de ${p.score.toFixed(1)}/10 — abaixo da meta de 6.0`,
          context: p.pillar,
        });
      }
    });

    // Low value scores
    valueScores.forEach(v => {
      if (v.score < 5.0) {
        items.push({
          id: `value-critical-${v.value}`,
          type: 'value',
          severity: 'critical',
          title: `Valor "${v.value}" em nível crítico`,
          description: `Score de ${v.score.toFixed(1)}/10 — indica desconexão com a cultura`,
        });
      }
    });

    // Negative trend
    if (summary.trendValue < -0.5) {
      items.push({
        id: 'trend-negative',
        type: 'trend',
        severity: 'warning',
        title: 'Tendência negativa no Culture Score',
        description: `Queda de ${Math.abs(summary.trendValue).toFixed(1)} pontos vs. período anterior`,
      });
    }

    // Low participation
    if (summary.participationRate > 0 && summary.participationRate < 50) {
      items.push({
        id: 'participation-low',
        type: 'participation',
        severity: 'warning',
        title: 'Participação abaixo do ideal',
        description: `Apenas ${summary.participationRate}% de taxa de resposta — meta mínima é 50%`,
      });
    }

    // Sort by severity
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    return items.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  }, [summary, pillarScores, valueScores]);

  const handleOpenAction = (alert: AlertItem) => {
    setActionDialog(alert);
    setActionTitle(`Ação: ${alert.title}`);
    setActionDescription(alert.description);
  };

  const handleCreateAction = async () => {
    if (!onCreateAction || !actionDialog) return;
    setCreating(true);
    try {
      await onCreateAction({
        title: actionTitle,
        description: actionDescription,
        priority: actionDialog.severity === 'critical' ? 'high' : 'medium',
      });
      setActionDialog(null);
      setActionTitle('');
      setActionDescription('');
    } finally {
      setCreating(false);
    }
  };

  const SeverityIcon = ({ severity }: { severity: string }) => {
    if (severity === 'critical') return <AlertTriangle className="h-5 w-5 text-red-500" />;
    if (severity === 'warning') return <AlertCircle className="h-5 w-5 text-amber-500" />;
    return <Info className="h-5 w-5 text-blue-500" />;
  };

  const severityBadgeVariant = (severity: string) => {
    if (severity === 'critical') return 'destructive' as const;
    if (severity === 'warning') return 'warning' as const;
    return 'info' as const;
  };

  if (alerts.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <Info className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">Nenhum alerta no momento</p>
            <p className="text-sm mt-1">Todos os indicadores estão dentro dos parâmetros esperados.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Alertas de Cultura
            <Badge variant="destructive" className="ml-2">{alerts.length}</Badge>
          </CardTitle>
          <CardDescription>Indicadores que exigem atenção imediata do RH</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {alerts.map(alert => (
            <div
              key={alert.id}
              className={cn(
                "flex items-start gap-3 p-4 rounded-lg border",
                alert.severity === 'critical' && "border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20",
                alert.severity === 'warning' && "border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20",
                alert.severity === 'info' && "border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20",
              )}
            >
              <SeverityIcon severity={alert.severity} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{alert.title}</span>
                  <Badge variant={severityBadgeVariant(alert.severity)}>
                    {alert.severity === 'critical' ? 'Crítico' : alert.severity === 'warning' ? 'Atenção' : 'Info'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{alert.description}</p>
              </div>
              {onCreateAction && (
                <Button size="sm" variant="outline" onClick={() => handleOpenAction(alert)}>
                  <Plus className="h-3 w-3 mr-1" />
                  Ação
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={!!actionDialog} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Plano de Ação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Título</label>
              <Input value={actionTitle} onChange={e => setActionTitle(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Descrição</label>
              <Textarea value={actionDescription} onChange={e => setActionDescription(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>Cancelar</Button>
            <Button onClick={handleCreateAction} disabled={creating || !actionTitle}>
              {creating ? 'Criando...' : 'Criar Ação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
