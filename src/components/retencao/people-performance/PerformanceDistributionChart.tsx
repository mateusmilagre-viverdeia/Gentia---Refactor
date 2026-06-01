import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Cell, Tooltip, ResponsiveContainer, LabelList } from 'recharts';
import { PeoplePerformanceScore, getPerformanceLevel } from '@/types/people-performance.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, X } from 'lucide-react';

interface PerformanceDistributionChartProps {
  scores: PeoplePerformanceScore[];
  onFilterChange?: (level: string | null) => void;
  activeFilter?: string | null;
}

interface DistributionData {
  level: string;
  count: number;
  percentage: number;
  color: string;
  people: string[];
}

const LEVEL_CONFIG = [
  { level: 'Excelente', min: 80, color: 'hsl(142, 76%, 36%)' },
  { level: 'Bom', min: 60, color: 'hsl(217, 91%, 60%)' },
  { level: 'Regular', min: 40, color: 'hsl(38, 92%, 50%)' },
  { level: 'Atenção', min: 0, color: 'hsl(0, 84%, 60%)' },
];

export function PerformanceDistributionChart({ 
  scores, 
  onFilterChange,
  activeFilter 
}: PerformanceDistributionChartProps) {
  const distribution = useMemo<DistributionData[]>(() => {
    const total = scores.length;
    
    return LEVEL_CONFIG.map(config => {
      const matchingPeople = scores.filter(s => {
        const level = getPerformanceLevel(s.peoplePerformanceIndex);
        return level.label === config.level;
      });
      
      return {
        level: config.level,
        count: matchingPeople.length,
        percentage: total > 0 ? (matchingPeople.length / total) * 100 : 0,
        color: config.color,
        people: matchingPeople.map(p => p.displayName),
      };
    });
  }, [scores]);

  const handleBarClick = (data: DistributionData) => {
    if (onFilterChange) {
      onFilterChange(activeFilter === data.level ? null : data.level);
    }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.[0]) return null;
    
    const data = payload[0].payload as DistributionData;
    
    return (
      <div className="bg-popover border rounded-lg shadow-lg p-3 max-w-xs">
        <p className="font-medium mb-1">{data.level}</p>
        <p className="text-sm text-muted-foreground">
          {data.count} pessoa{data.count !== 1 ? 's' : ''} ({data.percentage.toFixed(1)}%)
        </p>
        {data.people.length > 0 && data.people.length <= 5 && (
          <div className="mt-2 text-xs text-muted-foreground">
            {data.people.join(', ')}
          </div>
        )}
        {data.people.length > 5 && (
          <div className="mt-2 text-xs text-muted-foreground">
            {data.people.slice(0, 5).join(', ')} e mais {data.people.length - 5}
          </div>
        )}
      </div>
    );
  };

  if (scores.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Distribuição por Faixa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">
            Sem dados para exibir
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Distribuição por Faixa
          </CardTitle>
          {activeFilter && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onFilterChange?.(null)}
              className="h-7 text-xs"
            >
              <X className="h-3 w-3 mr-1" />
              Limpar filtro
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={distribution}
              layout="vertical"
              margin={{ top: 5, right: 40, left: 80, bottom: 5 }}
            >
              <XAxis 
                type="number" 
                hide 
                domain={[0, Math.max(...distribution.map(d => d.count), 1)]}
              />
              <YAxis 
                type="category" 
                dataKey="level" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
                width={75}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
              <Bar 
                dataKey="count" 
                radius={[0, 4, 4, 0]}
                cursor="pointer"
                onClick={(_, index) => handleBarClick(distribution[index])}
              >
                {distribution.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.color}
                    opacity={activeFilter && activeFilter !== entry.level ? 0.3 : 1}
                  />
                ))}
                <LabelList 
                  dataKey="count" 
                  position="right" 
                  fontSize={12}
                  fill="hsl(var(--foreground))"
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2">
          Clique em uma barra para filtrar a tabela
        </p>
      </CardContent>
    </Card>
  );
}
