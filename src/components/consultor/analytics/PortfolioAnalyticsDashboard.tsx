import React from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw } from 'lucide-react';
import { usePortfolioAnalytics } from '@/hooks/usePortfolioAnalytics';
import { PortfolioSummaryCards } from './PortfolioSummaryCards';
import { ProjectsStatusDistribution } from './ProjectsStatusDistribution';
import { AtRiskProjectsTable } from './AtRiskProjectsTable';
import { ConsultantWorkloadChart } from './ConsultantWorkloadChart';

export function PortfolioAnalyticsDashboard() {
  const { 
    summary, 
    atRiskProjects, 
    consultantPerformance, 
    trends, 
    loading, 
    error, 
    refresh 
  } = usePortfolioAnalytics();

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
          <h2 className="text-lg font-semibold">Analytics do Portfolio</h2>
          <p className="text-sm text-muted-foreground">
            Visão consolidada de todos os projetos
          </p>
        </div>
        <Button variant="outline" onClick={refresh} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Summary Cards */}
      <PortfolioSummaryCards summary={summary} loading={loading} />

      {/* Charts row */}
      <div className="grid gap-6 md:grid-cols-2">
        <ProjectsStatusDistribution summary={summary} loading={loading} />
        <ConsultantWorkloadChart consultants={consultantPerformance} loading={loading} />
      </div>

      {/* At Risk Projects */}
      <AtRiskProjectsTable projects={atRiskProjects} loading={loading} />

      {/* Timestamp */}
      {!loading && (
        <div className="text-xs text-muted-foreground text-center border-t pt-4">
          Dados atualizados em {new Date().toLocaleString('pt-BR')}
        </div>
      )}
    </div>
  );
}
