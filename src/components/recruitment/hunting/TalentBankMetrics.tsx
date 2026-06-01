import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Database,
  TrendingUp,
  Users,
  MessageCircle,
  Target,
  Clock,
  Briefcase,
  ArrowRightLeft,
  CheckCircle2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface TalentBankMetricsProps {
  accountId: string;
}

export function TalentBankMetrics({ accountId }: TalentBankMetricsProps) {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ["talent-bank-metrics", accountId],
    queryFn: async () => {
      // Get all matches
      const { data: matches } = await supabase
        .from("talent_bank_matches")
        .select("id, job_id, similarity_score, status, created_at")
        .eq("account_id", accountId);

      // Get reactivation conversations
      const { data: conversations } = await supabase
        .from("recruitment_outreach_conversations")
        .select("id, candidate_id, status, response_classification, reactivation_context, created_at")
        .eq("account_id", accountId)
        .not("reactivation_context", "is", null);

      // Get process history count
      const { count: historyCount } = await supabase
        .from("candidate_process_history")
        .select("id", { count: "exact", head: true })
        .eq("account_id", accountId);

      // Get total jobs
      const { data: jobs } = await supabase
        .from("recruitment_jobs")
        .select("id")
        .eq("account_id", accountId)
        .in("status", ["active", "published", "closed"]);

      // Get cross-match suggestions
      const { data: crossMatches } = await supabase
        .from("recruitment_cross_match_suggestions")
        .select("id, status, match_score, imported_to_job_id, imported_at, created_at")
        .eq("account_id", accountId);

      // Calculate metrics
      const allMatches = matches || [];
      const allConversations = conversations || [];
      const allCrossMatches = crossMatches || [];
      const totalJobs = jobs?.length || 0;

      // Jobs with 3+ matches above 0.80
      const jobMatchCounts = new Map<string, number>();
      for (const m of allMatches) {
        if (m.similarity_score >= 0.8) {
          jobMatchCounts.set(m.job_id, (jobMatchCounts.get(m.job_id) || 0) + 1);
        }
      }
      const jobsWithHighMatches = Array.from(jobMatchCounts.values()).filter((c) => c >= 3).length;
      const hitRate = totalJobs > 0 ? Math.round((jobsWithHighMatches / totalJobs) * 100) : 0;

      // Response rate
      const totalReactivations = allConversations.length;
      const responded = allConversations.filter(
        (c: any) => c.response_classification && c.response_classification !== "no_response"
      ).length;
      const responseRate = totalReactivations > 0 ? Math.round((responded / totalReactivations) * 100) : 0;

      // Conversion
      const interested = allConversations.filter(
        (c: any) => c.response_classification === "interested"
      ).length;
      const conversionRate = totalReactivations > 0 ? Math.round((interested / totalReactivations) * 100) : 0;

      // Cross-match metrics
      const crossMatchTotal = allCrossMatches.length;
      const crossMatchAccepted = allCrossMatches.filter((c: any) => c.status === "accepted").length;
      const crossMatchDismissed = allCrossMatches.filter((c: any) => c.status === "dismissed").length;
      const crossMatchPending = allCrossMatches.filter((c: any) => c.status === "pending" || c.status === "pending_ai_review").length;
      const crossMatchAcceptRate = crossMatchTotal > 0 ? Math.round((crossMatchAccepted / crossMatchTotal) * 100) : 0;

      // Status distribution (talent bank)
      const statusDist = allMatches.reduce((acc: Record<string, number>, m: any) => {
        acc[m.status] = (acc[m.status] || 0) + 1;
        return acc;
      }, {});

      // Monthly matches trend
      const monthlyMatches = allMatches.reduce((acc: Record<string, number>, m: any) => {
        const month = m.created_at?.substring(0, 7) || "unknown";
        acc[month] = (acc[month] || 0) + 1;
        return acc;
      }, {});

      // Cross-match status distribution
      const crossMatchStatusDist = [
        { name: "Aceitas", value: crossMatchAccepted },
        { name: "Descartadas", value: crossMatchDismissed },
        { name: "Pendentes", value: crossMatchPending },
      ].filter(d => d.value > 0);

      return {
        totalMatches: allMatches.length,
        hitRate,
        responseRate,
        conversionRate,
        totalReactivations,
        responded,
        interested,
        historyCount: historyCount || 0,
        statusDist,
        monthlyMatches: Object.entries(monthlyMatches)
          .sort(([a], [b]) => a.localeCompare(b))
          .slice(-6)
          .map(([month, count]) => ({ month: month.substring(5), matches: count })),
        crossMatchTotal,
        crossMatchAccepted,
        crossMatchDismissed,
        crossMatchPending,
        crossMatchAcceptRate,
        crossMatchStatusDist,
      };
    },
  });

  if (isLoading || !metrics) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="h-16 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statusData = Object.entries(metrics.statusDist).map(([name, value]) => ({
    name: { pending: "Pendente", approved: "Aprovado", rejected: "Rejeitado", contacted: "Contatado" }[name] || name,
    value,
  }));

  const COLORS = ["hsl(var(--primary))", "hsl(142 76% 36%)", "hsl(0 84% 60%)", "hsl(217 91% 60%)"];
  const CROSS_COLORS = ["hsl(142 76% 36%)", "hsl(0 84% 60%)", "hsl(45 93% 47%)"];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{metrics.hitRate}%</p>
                <p className="text-xs text-muted-foreground">Taxa de Hit do Banco</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{metrics.responseRate}%</p>
                <p className="text-xs text-muted-foreground">Taxa de Resposta</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{metrics.conversionRate}%</p>
                <p className="text-xs text-muted-foreground">Conversão Reativação</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <ArrowRightLeft className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{metrics.crossMatchAcceptRate}%</p>
                <p className="text-xs text-muted-foreground">Aceite Cross-Match</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Matches por Mês</CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.monthlyMatches.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={metrics.monthlyMatches}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="matches" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
                Sem dados ainda
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Status Banco de Talentos</CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {statusData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
                Sem dados ainda
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Cross-Match
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.crossMatchStatusDist.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={metrics.crossMatchStatusDist}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {metrics.crossMatchStatusDist.map((_, i) => (
                      <Cell key={i} fill={CROSS_COLORS[i % CROSS_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
                Sem dados de cross-match
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
            <div>
              <p className="text-lg font-semibold">{metrics.historyCount}</p>
              <p className="text-xs text-muted-foreground">Registros Histórico</p>
            </div>
            <div>
              <p className="text-lg font-semibold">{metrics.totalMatches}</p>
              <p className="text-xs text-muted-foreground">Matches Banco</p>
            </div>
            <div>
              <p className="text-lg font-semibold">{metrics.crossMatchTotal}</p>
              <p className="text-xs text-muted-foreground">Sugestões Cross-Vaga</p>
            </div>
            <div>
              <p className="text-lg font-semibold">{metrics.crossMatchAccepted}</p>
              <p className="text-xs text-muted-foreground">Cross-Match Aceitos</p>
            </div>
            <div>
              <p className="text-lg font-semibold">{metrics.totalReactivations}</p>
              <p className="text-xs text-muted-foreground">Reativações Enviadas</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
