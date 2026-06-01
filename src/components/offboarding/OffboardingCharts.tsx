import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from "recharts";

interface TrendData {
  month: string;
  count: number;
}

interface DistributionData {
  name: string;
  value: number;
  color: string;
}

interface RatingData {
  subject: string;
  value: number;
  fullMark: number;
}

interface ReasonData {
  reason: string;
  count: number;
  percentage: number;
}

interface OffboardingChartsProps {
  monthlyTrend: TrendData[];
  terminationDistribution: DistributionData[];
  surveyRatings: RatingData[];
  exitReasons: ReasonData[];
  hasEnoughData: boolean;
}

const COLORS = {
  voluntary: 'hsl(217, 91%, 60%)',
  involuntary: 'hsl(0, 84%, 60%)',
  contract_end: 'hsl(0, 0%, 45%)',
};

export function OffboardingCharts({
  monthlyTrend,
  terminationDistribution,
  surveyRatings,
  exitReasons,
  hasEnoughData,
}: OffboardingChartsProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Monthly Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Tendência Mensal</CardTitle>
          <CardDescription>Desligamentos ao longo do tempo</CardDescription>
        </CardHeader>
        <CardContent>
          {monthlyTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))' }}
                  name="Desligamentos"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground">
              Sem dados para exibir
            </div>
          )}
        </CardContent>
      </Card>

      {/* Termination Type Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Distribuição por Tipo</CardTitle>
          <CardDescription>Proporção de tipos de desligamento</CardDescription>
        </CardHeader>
        <CardContent>
          {terminationDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={terminationDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {terminationDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground">
              Sem dados para exibir
            </div>
          )}
        </CardContent>
      </Card>

      {/* Survey Ratings Radar */}
      {hasEnoughData && (
        <Card>
          <CardHeader>
            <CardTitle>Avaliações da Pesquisa</CardTitle>
            <CardDescription>Médias por categoria (1-5)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={surveyRatings}>
                <PolarGrid className="stroke-muted" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fontSize: 11 }}
                  className="text-muted-foreground"
                />
                <PolarRadiusAxis
                  angle={30}
                  domain={[0, 5]}
                  tick={{ fontSize: 10 }}
                />
                <Radar
                  name="Média"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.3}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Exit Reasons Bar Chart */}
      {hasEnoughData && exitReasons.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Motivos de Saída</CardTitle>
            <CardDescription>Top razões mais citadas</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={exitReasons.slice(0, 5)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis
                  dataKey="reason"
                  type="category"
                  width={120}
                  tick={{ fontSize: 11 }}
                  className="text-muted-foreground"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number, name: string) => [
                    `${value} (${exitReasons.find(r => r.count === value)?.percentage || 0}%)`,
                    'Ocorrências',
                  ]}
                />
                <Bar
                  dataKey="count"
                  fill="hsl(var(--primary))"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
