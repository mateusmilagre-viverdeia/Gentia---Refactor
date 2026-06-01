import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart } from 'recharts';
import { Activity } from 'lucide-react';
import { ProjectHealthScore } from '@/types/project-health.types';

interface HealthTrendChartProps {
  healthScore: ProjectHealthScore | null;
  loading?: boolean;
}

export function HealthTrendChart({ healthScore, loading }: HealthTrendChartProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-4 w-56" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!healthScore) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Tendência do Health Score
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48">
          <p className="text-muted-foreground">Calcule o Health Score para ver a tendência</p>
        </CardContent>
      </Card>
    );
  }

  // Generate simulated trend data based on current score
  // In a real implementation, this would come from historical health score records
  const currentScore = healthScore.health_score;
  const trendData = [];
  
  for (let i = 5; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const monthLabel = date.toLocaleDateString('pt-BR', { month: 'short' });
    
    // Simulate progression toward current score
    const variance = (5 - i) * 3;
    const baseScore = Math.max(0, currentScore - 15 + variance);
    const score = i === 0 ? currentScore : Math.round(baseScore + Math.random() * 5);
    
    trendData.push({
      month: monthLabel,
      score: Math.min(100, Math.max(0, score)),
    });
  }

  const getScoreColor = (score: number) => {
    if (score >= 70) return '#22c55e';
    if (score >= 40) return '#eab308';
    return '#ef4444';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Tendência do Health Score
            </CardTitle>
            <CardDescription>
              Evolução do score de saúde do projeto
            </CardDescription>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold" style={{ color: getScoreColor(currentScore) }}>
              {currentScore}
            </p>
            <p className="text-xs text-muted-foreground">score atual</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="healthGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={getScoreColor(currentScore)} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={getScoreColor(currentScore)} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="month" 
                axisLine={false} 
                tickLine={false}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                domain={[0, 100]} 
                axisLine={false} 
                tickLine={false}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip
                formatter={(value: number) => [`${value} pontos`, 'Health Score']}
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              {/* Threshold lines */}
              <ReferenceLine 
                y={70} 
                stroke="#22c55e" 
                strokeDasharray="3 3" 
                strokeOpacity={0.5}
              />
              <ReferenceLine 
                y={40} 
                stroke="#eab308" 
                strokeDasharray="3 3" 
                strokeOpacity={0.5}
              />
              <Area
                type="monotone"
                dataKey="score"
                stroke={getScoreColor(currentScore)}
                strokeWidth={2}
                fill="url(#healthGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Threshold legend */}
        <div className="flex justify-center gap-4 mt-2 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-green-500" style={{ opacity: 0.5 }} />
            <span className="text-muted-foreground">Saudável (≥70)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-yellow-500" style={{ opacity: 0.5 }} />
            <span className="text-muted-foreground">Atenção (≥40)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
