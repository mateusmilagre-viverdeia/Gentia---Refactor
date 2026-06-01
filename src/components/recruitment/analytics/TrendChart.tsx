import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useTrendAnalytics } from "@/hooks/useTrendAnalytics";
import type { DashboardPeriod } from "@/hooks/useRecruitmentDashboard";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface TrendChartProps {
  period: DashboardPeriod;
}

export function TrendChart({ period }: TrendChartProps) {
  const { data: analytics, isLoading } = useTrendAnalytics(period);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!analytics || analytics.data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Tendência de Candidaturas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            <p>Sem dados para o período selecionado</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const GrowthBadge = ({ value, label }: { value: number; label: string }) => {
    const isPositive = value > 0;
    const isNeutral = value === 0;
    const Icon = isPositive ? TrendingUp : isNeutral ? Minus : TrendingDown;
    
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">{label}:</span>
        <Badge 
          variant={isPositive ? "default" : isNeutral ? "secondary" : "destructive"}
          className="flex items-center gap-1"
        >
          <Icon className="h-3 w-3" />
          {isPositive ? "+" : ""}{value}%
        </Badge>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Tendência de Candidaturas
        </CardTitle>
        <div className="flex items-center gap-4">
          <GrowthBadge value={analytics.growth.applications} label="Candidaturas" />
          <GrowthBadge value={analytics.growth.hired} label="Contratações" />
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={analytics.data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="label" 
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="applications"
              name="Candidaturas"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ fill: "hsl(var(--primary))", r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="hired"
              name="Contratados"
              stroke="hsl(142, 76%, 36%)"
              strokeWidth={2}
              dot={{ fill: "hsl(142, 76%, 36%)", r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="interviews"
              name="Entrevistas"
              stroke="hsl(38, 92%, 50%)"
              strokeWidth={2}
              dot={{ fill: "hsl(38, 92%, 50%)", r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
