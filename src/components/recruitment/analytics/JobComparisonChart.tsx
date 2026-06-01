import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useJobAnalytics } from "@/hooks/useJobAnalytics";
import type { DashboardPeriod } from "@/hooks/useRecruitmentDashboard";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from "recharts";
import { Briefcase } from "lucide-react";

interface JobComparisonChartProps {
  period: DashboardPeriod;
}

export function JobComparisonChart({ period }: JobComparisonChartProps) {
  const { data: jobs, isLoading } = useJobAnalytics(period);

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

  if (!jobs || jobs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Comparativo de Vagas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            <p>Nenhuma vaga encontrada no período</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Prepare data for chart - limit to top 8 jobs by candidates
  const chartData = jobs
    .slice(0, 8)
    .map(job => ({
      name: job.jobTitle.length > 20 ? job.jobTitle.substring(0, 20) + "..." : job.jobTitle,
      fullName: job.jobTitle,
      candidates: job.totalCandidates,
      hired: job.hired,
      inProgress: job.inProgress,
      conversionRate: job.conversionRate,
    }));

  // Calculate averages for comparison
  const avgCandidates = Math.round(jobs.reduce((sum, j) => sum + j.totalCandidates, 0) / jobs.length);
  const avgConversion = Math.round(jobs.reduce((sum, j) => sum + j.conversionRate, 0) / jobs.length * 10) / 10;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Comparativo de Vagas
          </span>
          <div className="flex items-center gap-4 text-sm font-normal text-muted-foreground">
            <span>Média: {avgCandidates} candidatos</span>
            <span>Taxa média: {avgConversion}%</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 12 }} />
            <YAxis 
              type="category" 
              dataKey="name" 
              tick={{ fontSize: 11 }}
              width={120}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              formatter={(value, name) => {
                const labels: Record<string, string> = {
                  candidates: "Total Candidatos",
                  hired: "Contratados",
                  inProgress: "Em Andamento",
                };
                return [value, labels[name as string] || name];
              }}
            />
            <Legend />
            <Bar dataKey="candidates" name="Candidatos" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            <Bar dataKey="hired" name="Contratados" fill="hsl(142, 76%, 36%)" radius={[0, 4, 4, 0]} />
            <Bar dataKey="inProgress" name="Em Andamento" fill="hsl(38, 92%, 50%)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
