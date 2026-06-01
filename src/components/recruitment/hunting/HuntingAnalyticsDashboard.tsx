import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Search, Users, MessageSquare, UserCheck, TrendingUp, BarChart3 } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OutreachABResults } from './OutreachABResults';
import { SearchQualityScorecard } from './SearchQualityScorecard';

interface HuntingAnalyticsDashboardProps {
  jobId?: string;
  accountId: string;
}

interface HuntingMetrics {
  totalSearches: number;
  totalProfilesFound: number;
  profilesAboveThreshold: number;
  profilesApproached: number;
  profilesResponded: number;
  profilesConverted: number;
  avgMatchScore: number;
  conversionRate: number;
  responseRate: number;
  scoreDistribution: { range: string; count: number }[];
  topMatchedSkills: { skill: string; count: number }[];
  topMissedSkills: { skill: string; count: number }[];
  weeklyTrend: { week: string; searches: number; results: number; converted: number }[];
  channelRates: { channel: string; sent: number; responded: number; rate: number }[];
  queryPerformance: { query: string; results: number; avgScore: number }[];
}

const CHART_COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];
const SCORE_COLORS = ['hsl(var(--destructive))', 'hsl(var(--chart-4))', 'hsl(var(--chart-2))', 'hsl(var(--primary))'];

export function HuntingAnalyticsDashboard({ jobId, accountId }: HuntingAnalyticsDashboardProps) {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['hunting-analytics-v2', jobId, accountId],
    queryFn: async (): Promise<HuntingMetrics> => {
      // Fetch searches
      let searchesQuery = supabase
        .from('recruitment_hunting_searches')
        .select('id, results_count, status, query, created_at, filters')
        .eq('account_id', accountId);
      if (jobId) searchesQuery = searchesQuery.eq('job_id', jobId);
      const { data: searches } = await searchesQuery;
      const searchIds = searches?.map(s => s.id) || [];

      if (searchIds.length === 0) return getEmptyMetrics();

      // Fetch results
      const { data: results } = await supabase
        .from('recruitment_hunting_results')
        .select('id, match_score, status, extracted_data, created_at, search_id')
        .in('search_id', searchIds);

      const allResults = results || [];
      const profilesWithScore = allResults.filter(r => r.match_score != null);
      const totalProfilesFound = allResults.length;
      const profilesAboveThreshold = profilesWithScore.filter(r => (r.match_score || 0) >= 60).length;
      const profilesApproached = allResults.filter(r => ['approached', 'responded', 'converted'].includes(r.status)).length;
      const profilesResponded = allResults.filter(r => ['responded', 'converted'].includes(r.status)).length;
      const profilesConverted = allResults.filter(r => r.status === 'converted').length;
      const avgMatchScore = profilesWithScore.length > 0
        ? profilesWithScore.reduce((s, r) => s + (r.match_score || 0), 0) / profilesWithScore.length
        : 0;

      // Score distribution
      const scoreBuckets = [
        { range: '0-30', min: 0, max: 30, count: 0 },
        { range: '31-60', min: 31, max: 60, count: 0 },
        { range: '61-80', min: 61, max: 80, count: 0 },
        { range: '81-100', min: 81, max: 100, count: 0 },
      ];
      profilesWithScore.forEach(r => {
        const score = r.match_score || 0;
        const bucket = scoreBuckets.find(b => score >= b.min && score <= b.max);
        if (bucket) bucket.count++;
      });

      // Top matched & missed skills
      const matchedMap = new Map<string, number>();
      const missedMap = new Map<string, number>();
      allResults.forEach(r => {
        const bd = (r.extracted_data as any)?.score_breakdown?.details;
        if (bd) {
          (bd.matched_mandatory || []).forEach((s: string) => matchedMap.set(s, (matchedMap.get(s) || 0) + 1));
          (bd.missed_mandatory || []).forEach((s: string) => missedMap.set(s, (missedMap.get(s) || 0) + 1));
        }
      });
      const topMatchedSkills = [...matchedMap.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([skill, count]) => ({ skill, count }));
      const topMissedSkills = [...missedMap.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([skill, count]) => ({ skill, count }));

      // Weekly trend
      const weekMap = new Map<string, { searches: number; results: number; converted: number }>();
      searches?.forEach(s => {
        const wk = getWeekKey(s.created_at);
        const cur = weekMap.get(wk) || { searches: 0, results: 0, converted: 0 };
        cur.searches++;
        weekMap.set(wk, cur);
      });
      allResults.forEach(r => {
        const wk = getWeekKey(r.created_at);
        const cur = weekMap.get(wk) || { searches: 0, results: 0, converted: 0 };
        cur.results++;
        if (r.status === 'converted') cur.converted++;
        weekMap.set(wk, cur);
      });
      const weeklyTrend = [...weekMap.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(-8)
        .map(([week, data]) => ({ week: formatWeekLabel(week), ...data }));

      // Channel rates (from outreach conversations)
      let channelRates: { channel: string; sent: number; responded: number; rate: number }[] = [];
      try {
        let convQuery = supabase
          .from('recruitment_outreach_conversations')
          .select('status, contact_phone, contact_email')
          .eq('account_id', accountId);
        const { data: convs } = await convQuery;
        if (convs && convs.length > 0) {
          const whatsappSent = convs.filter(c => c.contact_phone).length;
          const whatsappResponded = convs.filter(c => c.contact_phone && ['responded', 'interested', 'converted'].includes(c.status)).length;
          const emailSent = convs.filter(c => c.contact_email && !c.contact_phone).length;
          const emailResponded = convs.filter(c => c.contact_email && !c.contact_phone && ['responded', 'interested', 'converted'].includes(c.status)).length;
          channelRates = [
            { channel: 'WhatsApp', sent: whatsappSent, responded: whatsappResponded, rate: whatsappSent > 0 ? Math.round((whatsappResponded / whatsappSent) * 100) : 0 },
            { channel: 'Email', sent: emailSent, responded: emailResponded, rate: emailSent > 0 ? Math.round((emailResponded / emailSent) * 100) : 0 },
          ];
        }
      } catch {}

      // Query performance
      const queryMap = new Map<string, { results: number; totalScore: number }>();
      searches?.forEach(s => {
        const queries = (s.filters as any)?.queries || [s.query];
        queries.forEach((q: string) => {
          const short = q.length > 60 ? q.substring(0, 57) + '...' : q;
          const cur = queryMap.get(short) || { results: 0, totalScore: 0 };
          const searchResults = allResults.filter(r => r.search_id === s.id);
          cur.results += searchResults.length;
          cur.totalScore += searchResults.reduce((sum, r) => sum + (r.match_score || 0), 0);
          queryMap.set(short, cur);
        });
      });
      const queryPerformance = [...queryMap.entries()]
        .map(([query, data]) => ({
          query,
          results: data.results,
          avgScore: data.results > 0 ? Math.round(data.totalScore / data.results) : 0,
        }))
        .sort((a, b) => b.avgScore - a.avgScore)
        .slice(0, 5);

      return {
        totalSearches: searches?.length || 0,
        totalProfilesFound,
        profilesAboveThreshold,
        profilesApproached,
        profilesResponded,
        profilesConverted,
        avgMatchScore: Math.round(avgMatchScore),
        conversionRate: profilesApproached > 0 ? Math.round((profilesConverted / profilesApproached) * 100) : 0,
        responseRate: profilesApproached > 0 ? Math.round((profilesResponded / profilesApproached) * 100) : 0,
        scoreDistribution: scoreBuckets.map(b => ({ range: b.range, count: b.count })),
        topMatchedSkills,
        topMissedSkills,
        weeklyTrend,
        channelRates,
        queryPerformance,
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

  if (!metrics) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Analytics de Hunting
        </CardTitle>
        <CardDescription>
          {jobId ? 'Métricas desta vaga' : 'Métricas consolidadas de todas as vagas'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="quality">Qualidade</TabsTrigger>
            <TabsTrigger value="scores">Scores & Skills</TabsTrigger>
            <TabsTrigger value="trends">Tendências</TabsTrigger>
            <TabsTrigger value="ab">A/B Testing</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="space-y-6">
            {/* Key metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard label="Buscas" value={metrics.totalSearches} icon={Search} />
              <MetricCard label="Score Médio" value={`${metrics.avgMatchScore}%`} icon={TrendingUp} />
              <MetricCard label="Taxa Resposta" value={`${metrics.responseRate}%`} icon={MessageSquare} />
              <MetricCard label="Taxa Conversão" value={`${metrics.conversionRate}%`} icon={UserCheck} />
            </div>

            {/* Funnel */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Funil de Hunting</h4>
              {[
                { label: 'Perfis Encontrados', value: metrics.totalProfilesFound, color: 'bg-blue-500' },
                { label: 'Score ≥ 60%', value: metrics.profilesAboveThreshold, color: 'bg-purple-500' },
                { label: 'Abordados', value: metrics.profilesApproached, color: 'bg-orange-500' },
                { label: 'Responderam', value: metrics.profilesResponded, color: 'bg-green-500' },
                { label: 'Convertidos', value: metrics.profilesConverted, color: 'bg-emerald-600' },
              ].map((step, i) => {
                const pct = metrics.totalProfilesFound > 0 ? Math.round((step.value / metrics.totalProfilesFound) * 100) : 0;
                return (
                  <div key={step.label} className="flex items-center gap-3">
                    <span className="text-xs w-32 text-muted-foreground">{step.label}</span>
                    <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full ${step.color} rounded-full transition-all`} style={{ width: `${i === 0 ? 100 : pct}%` }} />
                    </div>
                    <Badge variant="secondary" className="min-w-[40px] justify-center">{step.value}</Badge>
                    {i > 0 && <span className="text-xs text-muted-foreground w-10">{pct}%</span>}
                  </div>
                );
              })}
            </div>

            {/* Channel rates */}
            {metrics.channelRates.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Taxa de Resposta por Canal</h4>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics.channelRates}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="channel" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip />
                      <Bar dataKey="sent" name="Enviados" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="responded" name="Responderam" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Scores & Skills */}
          <TabsContent value="scores" className="space-y-6">
            {/* Score distribution */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Distribuição de Scores</h4>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.scoreDistribution}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="range" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip />
                    <Bar dataKey="count" name="Candidatos" radius={[4, 4, 0, 0]}>
                      {metrics.scoreDistribution.map((_, i) => (
                        <Cell key={i} fill={SCORE_COLORS[i]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Skills */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-green-600">✅ Skills Mais Encontradas</h4>
                {metrics.topMatchedSkills.length > 0 ? (
                  <div className="space-y-2">
                    {metrics.topMatchedSkills.map(s => (
                      <div key={s.skill} className="flex items-center justify-between">
                        <span className="text-sm truncate">{s.skill}</span>
                        <Badge variant="secondary">{s.count}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Sem dados ainda</p>
                )}
              </div>
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-red-600">❌ Skills Mais Ausentes</h4>
                {metrics.topMissedSkills.length > 0 ? (
                  <div className="space-y-2">
                    {metrics.topMissedSkills.map(s => (
                      <div key={s.skill} className="flex items-center justify-between">
                        <span className="text-sm truncate">{s.skill}</span>
                        <Badge variant="destructive">{s.count}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Sem dados ainda</p>
                )}
              </div>
            </div>

            {/* Query performance */}
            {metrics.queryPerformance.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Performance por Query</h4>
                <div className="space-y-2">
                  {metrics.queryPerformance.map((q, i) => (
                    <div key={i} className="flex items-center justify-between text-sm bg-muted/30 rounded p-2">
                      <span className="truncate flex-1 text-xs font-mono">{q.query}</span>
                      <div className="flex gap-3 ml-2">
                        <Badge variant="secondary">{q.results} resultados</Badge>
                        <Badge variant="outline">{q.avgScore}% avg</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Trends */}
          <TabsContent value="trends" className="space-y-6">
            {metrics.weeklyTrend.length > 0 ? (
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Tendência Semanal</h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={metrics.weeklyTrend}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="week" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="searches" name="Buscas" stroke="hsl(var(--muted-foreground))" strokeWidth={2} />
                      <Line type="monotone" dataKey="results" name="Resultados" stroke="hsl(var(--primary))" strokeWidth={2} />
                      <Line type="monotone" dataKey="converted" name="Convertidos" stroke="hsl(var(--chart-2))" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Sem dados de tendência ainda</p>
            )}
          </TabsContent>

          {/* Quality */}
          <TabsContent value="quality">
            <SearchQualityScorecard accountId={accountId} jobId={jobId} />
          </TabsContent>

          {/* A/B Testing */}
          <TabsContent value="ab">
            <OutreachABResults accountId={accountId} jobId={jobId} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function MetricCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="rounded-lg border border-border/50 p-4 text-center">
      <Icon className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function getEmptyMetrics(): HuntingMetrics {
  return {
    totalSearches: 0, totalProfilesFound: 0, profilesAboveThreshold: 0,
    profilesApproached: 0, profilesResponded: 0, profilesConverted: 0,
    avgMatchScore: 0, conversionRate: 0, responseRate: 0,
    scoreDistribution: [], topMatchedSkills: [], topMissedSkills: [],
    weeklyTrend: [], channelRates: [], queryPerformance: [],
  };
}

function getWeekKey(dateStr: string): string {
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const jan1 = new Date(year, 0, 1);
  const week = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

function formatWeekLabel(wk: string): string {
  const [, w] = wk.split('-W');
  return `Sem ${parseInt(w)}`;
}
