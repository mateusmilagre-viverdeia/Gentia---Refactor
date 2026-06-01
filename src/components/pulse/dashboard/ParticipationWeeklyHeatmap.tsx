import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface HeatmapProps {
  engagementChartData: Array<{ date: string; participation: number }>;
}

const DAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

export function ParticipationWeeklyHeatmap({ engagementChartData }: HeatmapProps) {
  const heatmapData = useMemo(() => {
    const dayBuckets: Record<number, number[]> = {};
    for (let i = 0; i < 7; i++) dayBuckets[i] = [];

    engagementChartData.forEach((d) => {
      // date is usually "dd/MM" or ISO — try to parse
      const parts = d.date.split('/');
      let dateObj: Date | null = null;
      if (parts.length === 2) {
        // dd/MM format — assume current year
        const now = new Date();
        dateObj = new Date(now.getFullYear(), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
      } else {
        dateObj = new Date(d.date);
      }
      if (dateObj && !isNaN(dateObj.getTime())) {
        // getDay: 0=Sun, convert to Mon=0
        const jsDay = dateObj.getDay();
        const dayIndex = jsDay === 0 ? 6 : jsDay - 1;
        dayBuckets[dayIndex].push(d.participation);
      }
    });

    return DAY_LABELS.map((label, i) => {
      const values = dayBuckets[i];
      const avg = values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null;
      return { label, avg, count: values.length };
    });
  }, [engagementChartData]);

  const getColor = (avg: number | null) => {
    if (avg === null) return 'bg-muted text-muted-foreground';
    if (avg >= 80) return 'bg-green-500/20 text-green-700 dark:text-green-400';
    if (avg >= 50) return 'bg-amber-500/20 text-amber-700 dark:text-amber-400';
    return 'bg-red-500/20 text-red-700 dark:text-red-400';
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Participação por Dia da Semana</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-2">
          {heatmapData.map((d) => (
            <div
              key={d.label}
              className={cn(
                'flex flex-col items-center justify-center rounded-lg p-3 transition-colors',
                getColor(d.avg)
              )}
            >
              <span className="text-xs font-medium opacity-70">{d.label}</span>
              <span className="text-lg font-bold">{d.avg !== null ? `${d.avg}%` : '—'}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
