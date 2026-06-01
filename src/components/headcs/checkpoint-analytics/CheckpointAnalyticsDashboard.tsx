import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "lucide-react";
import { useCheckpointAnalytics } from "@/hooks/useCheckpointAnalytics";
import { CheckpointMetricCards } from "./CheckpointMetricCards";
import { CheckpointsByPeriodChart } from "./CheckpointsByPeriodChart";
import { CheckpointsByConsultantChart } from "./CheckpointsByConsultantChart";
import { CheckpointsByClientTable } from "./CheckpointsByClientTable";
import { UpcomingCheckpointsCalendar } from "./UpcomingCheckpointsCalendar";
import { ClientsWithoutCheckpointAlert } from "./ClientsWithoutCheckpointAlert";
import { OverdueActionsTable } from "./OverdueActionsTable";
import { CheckpointInsightsPanel } from "./CheckpointInsightsPanel";
import type { CheckpointAnalyticsFilters } from "@/types/checkpoint-analytics.types";

export function CheckpointAnalyticsDashboard() {
  const { analytics, filters, setFilters, consultants, clients } = useCheckpointAnalytics();

  if (analytics.isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-64" />
        </div>
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Analytics de Checkpoints</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={filters.period}
            onValueChange={(value) => setFilters({ ...filters, period: value as CheckpointAnalyticsFilters['period'] })}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="60">Últimos 60 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
              <SelectItem value="180">Últimos 6 meses</SelectItem>
              <SelectItem value="365">Último ano</SelectItem>
              <SelectItem value="all">Todo período</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.consultantId || 'all'}
            onValueChange={(value) => setFilters({ ...filters, consultantId: value === 'all' ? undefined : value })}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Consultor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos consultores</SelectItem>
              {consultants.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.clientId || 'all'}
            onValueChange={(value) => setFilters({ ...filters, clientId: value === 'all' ? undefined : value })}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Cliente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos clientes</SelectItem>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Metric Cards */}
      <CheckpointMetricCards analytics={analytics} />

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        <CheckpointsByPeriodChart data={analytics.historical.byMonth} />
        <CheckpointsByConsultantChart data={analytics.historical.byConsultant} />
      </div>

      {/* Upcoming and Alerts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        <UpcomingCheckpointsCalendar checkpoints={analytics.upcoming.upcomingCheckpoints} />
        <CheckpointInsightsPanel alerts={analytics.alerts.alerts} />
      </div>

      {/* Clients and Actions Row */}
      <div className="grid gap-4 md:grid-cols-2">
        <ClientsWithoutCheckpointAlert clients={analytics.upcoming.clientsWithoutFutureCheckpoint} />
        <OverdueActionsTable actions={analytics.actions.overdueActions} />
      </div>

      {/* Upcoming Deadlines */}
      {analytics.actions.upcomingDeadlines.length > 0 && (
        <OverdueActionsTable 
          actions={analytics.actions.upcomingDeadlines} 
          title="Ações Vencendo em Breve (7 dias)"
          showUpcoming
        />
      )}

      {/* Full Client Table */}
      <CheckpointsByClientTable data={analytics.historical.byClient} />
    </div>
  );
}
