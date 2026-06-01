import React from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, Download, FileText } from 'lucide-react';
import { useProjectProgressReport } from '@/hooks/useProjectProgressReport';
import { ProgressOverviewCard } from './ProgressOverviewCard';
import { PillarProgressChart } from './PillarProgressChart';
import { VelocityCard } from './VelocityCard';
import { ActionsCompletionChart } from './ActionsCompletionChart';
import { HealthTrendChart } from './HealthTrendChart';

interface ProjectAnalyticsDashboardProps {
  accountId: string;
}

export function ProjectAnalyticsDashboard({ accountId }: ProjectAnalyticsDashboardProps) {
  const { report, loading, error, refresh } = useProjectProgressReport(accountId);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <p className="text-destructive mb-4">{error}</p>
        <Button onClick={refresh} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Tentar Novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Analytics do Projeto</h2>
          <p className="text-sm text-muted-foreground">
            Métricas e indicadores de progresso
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={refresh} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Progress Overview */}
        <ProgressOverviewCard report={report} loading={loading} />

        {/* Velocity */}
        <VelocityCard timeline={report?.timeline || null} loading={loading} />
      </div>

      {/* Pillar Progress Chart - Full width */}
      <PillarProgressChart 
        pillarProgress={report?.pillarProgress || null} 
        loading={loading} 
      />

      {/* Bottom row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Actions Completion */}
        <ActionsCompletionChart 
          actionsSummary={report?.actionsSummary || null} 
          loading={loading} 
        />

        {/* Health Trend */}
        <HealthTrendChart 
          healthScore={report?.healthScore || null} 
          loading={loading} 
        />
      </div>

      {/* Report metadata */}
      {report && (
        <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-4">
          <div className="flex items-center gap-4">
            <span>Consultores: {report.consultants.join(', ') || 'Não atribuído'}</span>
          </div>
          <span>
            Relatório gerado em {new Date(report.generatedAt).toLocaleString('pt-BR')}
          </span>
        </div>
      )}
    </div>
  );
}
