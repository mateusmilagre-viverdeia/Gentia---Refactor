import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, Briefcase, Users, TrendingUp, Clock, ExternalLink, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { differenceInDays } from "date-fns";
import { formatBRTRelative } from "@/lib/datetime";

interface HuntingMultiJobDashboardProps {
  accountId: string;
}

interface JobHuntingRow {
  jobId: string;
  title: string;
  department: string | null;
  status: string;
  found: number;
  avgScore: number;
  approached: number;
  responded: number;
  converted: number;
  conversionRate: number;
  lastSearchAt: string | null;
  staleDays: number;
  healthStatus: 'green' | 'yellow' | 'red';
}

export function HuntingMultiJobDashboard({ accountId }: HuntingMultiJobDashboardProps) {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['hunting-multi-job', accountId],
    queryFn: async () => {
      // Fetch active jobs
      const { data: jobs } = await supabase
        .from('recruitment_jobs')
        .select('id, title, department, status, created_at')
        .eq('account_id', accountId)
        .in('status', ['active', 'published', 'draft']);

      if (!jobs?.length) return { rows: [], kpis: getEmptyKPIs() };

      const jobIds = jobs.map(j => j.id);

      // Fetch searches for these jobs
      const { data: searches } = await supabase
        .from('recruitment_hunting_searches')
        .select('id, job_id, created_at')
        .eq('account_id', accountId)
        .in('job_id', jobIds);

      const searchIds = searches?.map(s => s.id) || [];

      // Fetch results
      let allResults: any[] = [];
      if (searchIds.length > 0) {
        const { data: results } = await supabase
          .from('recruitment_hunting_results')
          .select('id, match_score, status, search_id')
          .in('search_id', searchIds);
        allResults = results || [];
      }

      // Map search_id -> job_id
      const searchToJob = new Map<string, string>();
      searches?.forEach(s => searchToJob.set(s.id, s.job_id));

      // Build rows
      const rows: JobHuntingRow[] = jobs.map(job => {
        const jobSearches = searches?.filter(s => s.job_id === job.id) || [];
        const jobSearchIds = jobSearches.map(s => s.id);
        const jobResults = allResults.filter(r => jobSearchIds.includes(r.search_id));

        const found = jobResults.length;
        const withScore = jobResults.filter(r => r.match_score != null);
        const avgScore = withScore.length > 0
          ? Math.round(withScore.reduce((s, r) => s + (r.match_score || 0), 0) / withScore.length)
          : 0;
        const approached = jobResults.filter(r => ['approached', 'responded', 'converted'].includes(r.status)).length;
        const responded = jobResults.filter(r => ['responded', 'converted'].includes(r.status)).length;
        const converted = jobResults.filter(r => r.status === 'converted').length;
        const conversionRate = approached > 0 ? Math.round((converted / approached) * 100) : 0;

        const lastSearch = jobSearches.sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
        const lastSearchAt = lastSearch?.created_at || null;
        const staleDays = lastSearchAt ? differenceInDays(new Date(), new Date(lastSearchAt)) : 999;

        let healthStatus: 'green' | 'yellow' | 'red' = 'green';
        if (staleDays > 7 || (found === 0 && staleDays > 3)) healthStatus = 'red';
        else if (staleDays > 3 || approached === 0) healthStatus = 'yellow';

        return {
          jobId: job.id,
          title: job.title,
          department: job.department,
          status: job.status,
          found,
          avgScore,
          approached,
          responded,
          converted,
          conversionRate,
          lastSearchAt,
          staleDays,
          healthStatus,
        };
      });

      // Sort: red first, then yellow, then green
      const order = { red: 0, yellow: 1, green: 2 };
      rows.sort((a, b) => order[a.healthStatus] - order[b.healthStatus]);

      // KPIs
      const totalActive = rows.length;
      const totalFound = rows.reduce((s, r) => s + r.found, 0);
      const totalConverted = rows.reduce((s, r) => s + r.converted, 0);
      const avgConversion = rows.filter(r => r.approached > 0).length > 0
        ? Math.round(rows.reduce((s, r) => s + r.conversionRate, 0) / rows.filter(r => r.approached > 0).length)
        : 0;

      return {
        rows,
        kpis: { totalActive, totalFound, totalConverted, avgConversion },
      };
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const { rows, kpis } = data;

  const healthIcon = (status: 'green' | 'yellow' | 'red') => {
    if (status === 'red') return <span className="inline-block w-2.5 h-2.5 rounded-full bg-destructive" title="Parada (>7 dias sem busca)" />;
    if (status === 'yellow') return <span className="inline-block w-2.5 h-2.5 rounded-full bg-yellow-500" title="Em andamento" />;
    return <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500" title="Ativa" />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="h-5 w-5" />
          Dashboard Multi-Vaga
        </CardTitle>
        <CardDescription>Visão consolidada de hunting em todas as vagas ativas</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard label="Vagas Ativas" value={kpis.totalActive} icon={Briefcase} />
          <KPICard label="Candidatos Encontrados" value={kpis.totalFound} icon={Users} />
          <KPICard label="Convertidos" value={kpis.totalConverted} icon={TrendingUp} />
          <KPICard label="Conversão Média" value={`${kpis.avgConversion}%`} icon={TrendingUp} />
        </div>

        {/* Table */}
        {rows.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Vaga</TableHead>
                  <TableHead className="text-center">Encontrados</TableHead>
                  <TableHead className="text-center">Score Médio</TableHead>
                  <TableHead className="text-center">Abordados</TableHead>
                  <TableHead className="text-center">Responderam</TableHead>
                  <TableHead className="text-center">Convertidos</TableHead>
                  <TableHead className="text-center">Conversão</TableHead>
                  <TableHead>Última Busca</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(row => (
                  <TableRow key={row.jobId}>
                    <TableCell>{healthIcon(row.healthStatus)}</TableCell>
                    <TableCell>
                      <div>
                        <span className="font-medium text-sm">{row.title}</span>
                        {row.department && (
                          <span className="block text-xs text-muted-foreground">{row.department}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{row.found}</TableCell>
                    <TableCell className="text-center">
                      {row.avgScore > 0 ? (
                        <Badge variant={row.avgScore >= 70 ? 'default' : 'secondary'}>
                          {row.avgScore}%
                        </Badge>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-center">{row.approached}</TableCell>
                    <TableCell className="text-center">{row.responded}</TableCell>
                    <TableCell className="text-center">{row.converted}</TableCell>
                    <TableCell className="text-center">
                      {row.approached > 0 ? `${row.conversionRate}%` : '-'}
                    </TableCell>
                    <TableCell>
                      {row.lastSearchAt ? (
                        <span className="text-xs text-muted-foreground">
                          {formatBRTRelative(new Date(row.lastSearchAt))}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" /> Nunca
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/atracao-contratacao/recrutamento/hunting-outreach?tab=hunting&jobId=${row.jobId}`)}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>Nenhuma vaga ativa encontrada</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function KPICard({ label, value, icon: Icon }: { label: string; value: string | number; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="rounded-lg border border-border/50 p-4 text-center">
      <Icon className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function getEmptyKPIs() {
  return { totalActive: 0, totalFound: 0, totalConverted: 0, avgConversion: 0 };
}
