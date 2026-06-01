import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DashboardSummary } from '@/hooks/usePulseMetrics';
import { cn } from '@/lib/utils';

interface HealthScoreProps {
  summary: DashboardSummary;
  alertsCount: number;
}

function getHealthStatus(score: number) {
  if (score >= 70) return { label: 'Saudável', color: 'text-green-600', bg: 'bg-green-500', ring: 'stroke-green-500' };
  if (score >= 40) return { label: 'Atenção', color: 'text-amber-600', bg: 'bg-amber-500', ring: 'stroke-amber-500' };
  return { label: 'Crítico', color: 'text-red-600', bg: 'bg-red-500', ring: 'stroke-red-500' };
}

export function OrganizationalHealthScore({ summary, alertsCount }: HealthScoreProps) {
  const score = useMemo(() => {
    const engagementComponent = summary.overallEngagement * 0.4;
    const participationComponent = summary.participationRate * 0.3;

    // Trend component: map trendValue (-50 to +50) to 0-100
    const trendNormalized = Math.max(0, Math.min(100, 50 + summary.trendValue));
    const trendComponent = trendNormalized * 0.2;

    // Alerts component: fewer unresolved alerts = better
    const alertScore = Math.max(0, 100 - alertsCount * 15);
    const alertComponent = alertScore * 0.1;

    return Math.round(engagementComponent + participationComponent + trendComponent + alertComponent);
  }, [summary, alertsCount]);

  const status = getHealthStatus(score);
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Saúde Organizacional</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16">
            <svg className="w-16 h-16 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
              <circle
                cx="50" cy="50" r="40" fill="none"
                className={status.ring}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                style={{ transition: 'stroke-dashoffset 0.5s ease' }}
              />
            </svg>
            <span className={cn("absolute inset-0 flex items-center justify-center text-lg font-bold", status.color)}>
              {score}
            </span>
          </div>
          <div>
            <div className={cn("text-sm font-semibold", status.color)}>{status.label}</div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Eng. {summary.overallEngagement}% · Part. {summary.participationRate}%
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
