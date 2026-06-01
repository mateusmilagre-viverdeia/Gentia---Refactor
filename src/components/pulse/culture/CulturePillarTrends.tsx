import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface ChartDataPoint {
  date: string;
  [pillar: string]: string | number;
}

interface PillarTrend {
  pillar: string;
  name: string;
  currentScore: number;
  previousScore: number;
  trend: 'up' | 'down' | 'stable';
  trendValue: number;
}

interface CulturePillarTrendsProps {
  chartData: ChartDataPoint[];
  pillarTrends: PillarTrend[];
  selectedPillar?: string;
  onSelectPillar?: (pillar: string) => void;
  loading?: boolean;
}

const PILLAR_COLORS: Record<string, string> = {
  mission: 'hsl(var(--primary))',
  vision: 'hsl(280, 65%, 60%)',
  value: 'hsl(142, 71%, 45%)',
  decision: 'hsl(38, 92%, 50%)',
  indicator: 'hsl(199, 89%, 48%)',
  project: 'hsl(350, 89%, 60%)',
  energy: 'hsl(172, 66%, 50%)',
  development: 'hsl(24, 94%, 50%)',
};

function TrendIcon({ trend }: { trend: 'up' | 'down' | 'stable' }) {
  if (trend === 'up') return <TrendingUp className="h-4 w-4 text-green-500" />;
  if (trend === 'down') return <TrendingDown className="h-4 w-4 text-red-500" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

export function CulturePillarTrends({ 
  chartData, 
  pillarTrends, 
  selectedPillar,
  onSelectPillar,
  loading 
}: CulturePillarTrendsProps) {
  const activePillar = selectedPillar || (pillarTrends[0]?.pillar);

  const currentTrend = useMemo(() => 
    pillarTrends.find(p => p.pillar === activePillar),
  [pillarTrends, activePillar]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-2 mb-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16" />)}
          </div>
          <Skeleton className="h-[250px]" />
        </CardContent>
      </Card>
    );
  }

  if (!chartData || chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tendência por Pilar</CardTitle>
          <CardDescription>Evolução de cada pilar cultural</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Nenhum dado disponível ainda
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tendência por Pilar</CardTitle>
        <CardDescription>
          Clique em um pilar para ver sua evolução detalhada
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Pillar selector buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {pillarTrends.map(pillar => (
            <button
              key={pillar.pillar}
              onClick={() => onSelectPillar?.(pillar.pillar)}
              className={cn(
                "p-3 rounded-lg border text-left transition-all",
                "hover:border-primary/50 hover:bg-muted/50",
                activePillar === pillar.pillar && "border-primary bg-primary/5"
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium truncate">{pillar.name}</span>
                <TrendIcon trend={pillar.trend} />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold">
                  {pillar.currentScore.toFixed(1)}
                </span>
                <span className={cn(
                  "text-xs",
                  pillar.trend === 'up' ? 'text-green-600' : 
                  pillar.trend === 'down' ? 'text-red-600' : 
                  'text-muted-foreground'
                )}>
                  {pillar.trendValue >= 0 ? '+' : ''}{pillar.trendValue.toFixed(1)}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Chart for selected pillar */}
        {currentTrend && (
          <div className="pt-2">
            <div className="flex items-center gap-2 mb-3">
              <Badge 
                style={{ backgroundColor: PILLAR_COLORS[activePillar] || 'hsl(var(--primary))' }}
              >
                {currentTrend.name}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Score atual: {currentTrend.currentScore.toFixed(1)}
              </span>
            </div>
            
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id={`gradient-${activePillar}`} x1="0" y1="0" x2="0" y2="1">
                    <stop 
                      offset="5%" 
                      stopColor={PILLAR_COLORS[activePillar] || 'hsl(var(--primary))'} 
                      stopOpacity={0.3} 
                    />
                    <stop 
                      offset="95%" 
                      stopColor={PILLAR_COLORS[activePillar] || 'hsl(var(--primary))'} 
                      stopOpacity={0} 
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                />
                <YAxis 
                  domain={[0, 10]} 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [value.toFixed(1), currentTrend.name]}
                />
                <Area
                  type="monotone"
                  dataKey={activePillar}
                  stroke={PILLAR_COLORS[activePillar] || 'hsl(var(--primary))'}
                  fillOpacity={1}
                  fill={`url(#gradient-${activePillar})`}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
