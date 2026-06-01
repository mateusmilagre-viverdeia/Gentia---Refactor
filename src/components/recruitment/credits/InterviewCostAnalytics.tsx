import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatBRT, BRT_TZ } from '@/lib/datetime';
import {
  Mic,
  Volume2,
  Brain,
  DollarSign,
  Clock,
  TrendingUp,
  MessageSquare,
  BarChart3,
  CalendarIcon,
} from 'lucide-react';
import { useInterviewCostAnalytics, USD_TO_BRL } from '@/hooks/useInterviewCostAnalytics';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { cn } from '@/lib/utils';

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b'];

type PresetPeriod = '7' | '30' | '90' | '365' | 'custom';

export function InterviewCostAnalytics() {
  const { summary, recentUsage, isLoading, error, dateRange, setDateRange } = useInterviewCostAnalytics();
  const [preset, setPreset] = useState<PresetPeriod>('30');

  const applyPreset = (value: PresetPeriod) => {
    setPreset(value);
    if (value === 'custom') return;
    const days = parseInt(value, 10);
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    setDateRange({ start, end });
  };

  const PeriodSelector = (
    <div className="flex flex-wrap items-center gap-2 justify-end">
      <Select value={preset} onValueChange={(v) => applyPreset(v as PresetPeriod)}>
        <SelectTrigger className="w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="7">Últimos 7 dias</SelectItem>
          <SelectItem value="30">Últimos 30 dias</SelectItem>
          <SelectItem value="90">Últimos 90 dias</SelectItem>
          <SelectItem value="365">Último ano</SelectItem>
          <SelectItem value="custom">Personalizado</SelectItem>
        </SelectContent>
      </Select>
      {preset === 'custom' && (
        <>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <CalendarIcon className="h-4 w-4" />
                {formatBRT(dateRange.start, 'dd/MM/yyyy')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={dateRange.start}
                onSelect={(d) => d && setDateRange({ ...dateRange, start: d })}
                disabled={(d) => d > dateRange.end || d > new Date()}
                initialFocus
                className={cn('p-3 pointer-events-auto')}
              />
            </PopoverContent>
          </Popover>
          <span className="text-muted-foreground text-sm">até</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <CalendarIcon className="h-4 w-4" />
                {formatBRT(dateRange.end, 'dd/MM/yyyy')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={dateRange.end}
                onSelect={(d) => d && setDateRange({ ...dateRange, end: d })}
                disabled={(d) => d < dateRange.start || d > new Date()}
                initialFocus
                className={cn('p-3 pointer-events-auto')}
              />
            </PopoverContent>
          </Popover>
        </>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        {PeriodSelector}
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        {PeriodSelector}
        <div className="text-center py-8 text-muted-foreground">
          <p>Erro ao carregar analytics: {error}</p>
        </div>
      </div>
    );
  }

  if (!summary || summary.totalInterviews === 0) {
    return (
      <div className="space-y-4">
        {PeriodSelector}
        <div className="text-center py-8 text-muted-foreground">
          <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="font-medium">Nenhuma entrevista de voz registrada no período</p>
          <p className="text-sm">Ajuste o intervalo acima ou aguarde novas entrevistas por voz</p>
        </div>
      </div>
    );
  }

  const formatCurrency = (usd: number, currency: 'USD' | 'BRL' = 'BRL') => {
    if (currency === 'USD') {
      return `$${usd.toFixed(4)}`;
    }
    return `R$ ${(usd * USD_TO_BRL).toFixed(2)}`;
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  const pieData = [
    { name: 'Áudio Entrada', value: summary.costBreakdown.audioInput, color: '#3b82f6' },
    { name: 'Áudio Saída', value: summary.costBreakdown.audioOutput, color: '#22c55e' },
    { name: 'Processamento IA', value: summary.costBreakdown.textProcessing, color: '#f59e0b' },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      {PeriodSelector}
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <MessageSquare className="h-4 w-4" />
              <span className="text-xs">Total Entrevistas</span>
            </div>
            <p className="text-2xl font-bold">{summary.totalInterviews}</p>
            <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
              <span>{summary.byType.cultural.count} cultural</span>
              <span>•</span>
              <span>{summary.byType.technical.count} técnica</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
              <span className="text-xs">Custo Total</span>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(summary.totalCostUsd)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(summary.totalCostUsd, 'USD')} USD
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs">Custo Médio</span>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(summary.avgCostPerInterviewUsd)}</p>
            <p className="text-xs text-muted-foreground mt-1">por entrevista</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-xs">Duração Média</span>
            </div>
            <p className="text-2xl font-bold">{formatDuration(summary.avgDurationSeconds)}</p>
            <p className="text-xs text-muted-foreground mt-1">por entrevista</p>
          </CardContent>
        </Card>
      </div>

      {/* Cost by Type */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Cultural</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Entrevistas</p>
                <p className="text-xl font-bold">{summary.byType.cultural.count}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Custo Médio</p>
                <p className="text-xl font-bold">{formatCurrency(summary.byType.cultural.avgCostUsd)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Duração Média</p>
                <p className="text-lg font-medium">{formatDuration(summary.byType.cultural.avgDurationSeconds)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Custo Total</p>
                <p className="text-lg font-medium">{formatCurrency(summary.byType.cultural.totalCostUsd)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Técnica</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Entrevistas</p>
                <p className="text-xl font-bold">{summary.byType.technical.count}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Custo Médio</p>
                <p className="text-xl font-bold">{formatCurrency(summary.byType.technical.avgCostUsd)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Duração Média</p>
                <p className="text-lg font-medium">{formatDuration(summary.byType.technical.avgDurationSeconds)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Custo Total</p>
                <p className="text-lg font-medium">{formatCurrency(summary.byType.technical.totalCostUsd)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cost Breakdown & Chart */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Cost Breakdown Pie */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Distribuição de Custos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-4 mt-2">
              <div className="flex items-center gap-2">
                <Mic className="h-4 w-4 text-blue-500" />
                <span className="text-xs">Entrada: {formatCurrency(summary.costBreakdown.audioInput)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Volume2 className="h-4 w-4 text-green-500" />
                <span className="text-xs">Saída: {formatCurrency(summary.costBreakdown.audioOutput)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-amber-500" />
                <span className="text-xs">IA: {formatCurrency(summary.costBreakdown.textProcessing)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Daily Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Tendência Diária</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={summary.dailyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(date) => formatBRT(date, 'dd/MM')}
                    className="text-xs"
                  />
                  <YAxis 
                    tickFormatter={(value) => `R$${(value * USD_TO_BRL).toFixed(0)}`}
                    className="text-xs"
                  />
                  <Tooltip
                    labelFormatter={(date) => formatBRT(date, 'dd/MM/yyyy')}
                    formatter={(value: number, name: string) => {
                      if (name === 'totalCost') return [formatCurrency(value), 'Custo'];
                      return [value, name === 'culturalCount' ? 'Cultural' : 'Técnica'];
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="totalCost" 
                    stroke="#3b82f6" 
                    fill="#3b82f6" 
                    fillOpacity={0.2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Usage Table */}
      {recentUsage.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Últimas Entrevistas</CardTitle>
            <CardDescription>Detalhamento de custos por sessão</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2">Data</th>
                    <th className="text-left py-2 px-2">Tipo</th>
                    <th className="text-right py-2 px-2">Duração</th>
                    <th className="text-right py-2 px-2">Créditos</th>
                    <th className="text-right py-2 px-2">Custo</th>
                  </tr>
                </thead>
                <tbody>
                  {recentUsage.slice(0, 10).map((usage) => (
                    <tr key={usage.id} className="border-b border-muted/50">
                      <td className="py-2 px-2 text-muted-foreground">
                        {formatBRT(usage.created_at, 'dd/MM/yyyy')}
                      </td>
                      <td className="py-2 px-2">
                        <Badge variant="outline" className={cn(
                          usage.session_type === 'cultural' 
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-green-50 text-green-700 border-green-200'
                        )}>
                          {usage.session_type === 'cultural' ? 'Cultural' : 'Técnica'}
                        </Badge>
                      </td>
                      <td className="py-2 px-2 text-right text-muted-foreground">
                        {usage.duration_seconds ? formatDuration(usage.duration_seconds) : '-'}
                      </td>
                      <td className="py-2 px-2 text-right text-muted-foreground">
                        {(usage.credits_consumed ?? 0).toFixed(1)}
                      </td>
                      <td className="py-2 px-2 text-right font-medium">
                        {formatCurrency(Number(usage.total_cost_usd))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
