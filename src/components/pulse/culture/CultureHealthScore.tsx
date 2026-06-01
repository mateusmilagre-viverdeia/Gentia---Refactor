import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { CultureDashboardSummary } from '@/types/pulseCulture.types';

interface CultureHealthScoreProps {
  summary: CultureDashboardSummary;
  pillarCoverage: number; // 0-100: percentage of pillars with data
  alertsCount?: number;
}

function getHealthStatus(score: number) {
  if (score >= 70) return { label: 'Saudável', color: 'text-green-600', ring: 'stroke-green-500' };
  if (score >= 40) return { label: 'Atenção', color: 'text-amber-600', ring: 'stroke-amber-500' };
  return { label: 'Crítico', color: 'text-red-600', ring: 'stroke-red-500' };
}

export function CultureHealthScore({ summary, pillarCoverage, alertsCount = 0 }: CultureHealthScoreProps) {
  const score = useMemo(() => {
    // Culture Score normalized to 0-100 (original is 0-10)
    const cultureComponent = (summary.overallScore / 10) * 100 * 0.5;
    // Participation (already 0-100)
    const participationComponent = summary.participationRate * 0.25;
    // Trend: map trendValue (-5 to +5) to 0-100
    const trendNormalized = Math.max(0, Math.min(100, 50 + summary.trendValue * 10));
    const trendComponent = trendNormalized * 0.15;
    // Pillar coverage
    const coverageComponent = pillarCoverage * 0.1;

    return Math.round(Math.max(0, Math.min(100, cultureComponent + participationComponent + trendComponent + coverageComponent)));
  }, [summary, pillarCoverage]);

  const status = getHealthStatus(score);
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Saúde Cultural</CardTitle>
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
              Score {summary.overallScore.toFixed(1)} · Part. {summary.participationRate}%
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
