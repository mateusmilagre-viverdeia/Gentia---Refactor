import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { DailyMetric, DriverScore } from '@/hooks/usePulseMetrics';
import { formatBRT } from "@/lib/datetime";

const DRIVER_COLORS = [
  'hsl(var(--primary))',
  'hsl(142, 76%, 36%)',
  'hsl(38, 92%, 50%)',
  'hsl(280, 67%, 51%)',
  'hsl(199, 89%, 48%)',
  'hsl(346, 77%, 49%)',
  'hsl(174, 72%, 40%)',
  'hsl(25, 95%, 53%)',
];

interface DriverTrendChartProps {
  metrics: DailyMetric[];
  driverScores: DriverScore[];
  loading: boolean;
}

export function DriverTrendChart({ metrics, driverScores, loading }: DriverTrendChartProps) {
  const driverKeys = useMemo(() => driverScores.map(d => d.driver_key), [driverScores]);
  const [activeDrivers, setActiveDrivers] = useState<Set<string>>(new Set(driverKeys));

  // Update active drivers when driverScores changes
  useMemo(() => {
    setActiveDrivers(new Set(driverKeys));
  }, [driverKeys]);

  const chartData = useMemo(() => {
    return metrics
      .filter(m => m.by_driver && Object.keys(m.by_driver).length > 0)
      .map(m => {
        const point: Record<string, any> = {
          date: formatBRT(new Date(m.date), 'dd/MM'),
        };
        driverScores.forEach(d => {
          const val = m.by_driver?.[d.driver_key]?.avg;
          point[d.driver_key] = val != null ? Math.round(val * 10) : null;
        });
        return point;
      });
  }, [metrics, driverScores]);

  const toggleDriver = (key: string) => {
    setActiveDrivers(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size > 1) next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  if (loading) return <Skeleton className="h-[350px]" />;
  if (chartData.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Evolução por Driver</CardTitle>
        <CardDescription>Sentimento ao longo do tempo por cada driver</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {driverScores.map((d, i) => (
            <Badge
              key={d.driver_key}
              variant={activeDrivers.has(d.driver_key) ? 'default' : 'outline'}
              className="cursor-pointer text-xs"
              style={activeDrivers.has(d.driver_key) ? { backgroundColor: DRIVER_COLORS[i % DRIVER_COLORS.length] } : {}}
              onClick={() => toggleDriver(d.driver_key)}
            >
              {d.driver_name}
            </Badge>
          ))}
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="date" className="text-xs" />
            <YAxis domain={[0, 100]} className="text-xs" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            {driverScores.map((d, i) =>
              activeDrivers.has(d.driver_key) ? (
                <Line
                  key={d.driver_key}
                  type="monotone"
                  dataKey={d.driver_key}
                  stroke={DRIVER_COLORS[i % DRIVER_COLORS.length]}
                  name={d.driver_name}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              ) : null
            )}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
