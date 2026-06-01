import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Users, Loader2, TrendingUp, Building2, Calendar } from "lucide-react";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useEPRole } from "@/hooks/useEPRole";
import { supabase } from "@/integrations/supabase/client";
import { formatBRT } from "@/lib/datetime";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(var(--muted-foreground))",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
];

interface OverviewData {
  total_candidates: number;
  new_7d: number;
  new_30d: number;
  new_in_range: number;
  total_applications: number;
  applications_in_range: number;
  accounts_with_candidates: number;
  by_status: Array<{ status: string; count: number }>;
  by_source: Array<{ source: string; count: number }>;
}

interface AccountRow {
  account_id: string;
  account_name: string;
  total_candidates: number;
  new_30d: number;
  total_applications: number;
  last_candidate_at: string | null;
}

interface SeriesPoint {
  day: string;
  candidates: number;
}

export default function CandidatesOverview() {
  const { isSuperAdmin, loading: roleLoading } = useEPRole();
  const [rangeDays, setRangeDays] = useState<number>(30);

  const overview = useQuery({
    queryKey: ["admin-candidates-overview", rangeDays],
    enabled: !!isSuperAdmin,
    queryFn: async (): Promise<OverviewData> => {
      const from = new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000).toISOString();
      const to = new Date().toISOString();
      const { data, error } = await supabase.rpc("admin_candidates_overview", {
        _from: from,
        _to: to,
      });
      if (error) throw error;
      return data as unknown as OverviewData;
    },
  });

  const byAccount = useQuery({
    queryKey: ["admin-candidates-by-account"],
    enabled: !!isSuperAdmin,
    queryFn: async (): Promise<AccountRow[]> => {
      const { data, error } = await supabase.rpc("admin_candidates_by_account", { _limit: 50 });
      if (error) throw error;
      return (data || []) as AccountRow[];
    },
  });

  const series = useQuery({
    queryKey: ["admin-candidates-timeseries", rangeDays],
    enabled: !!isSuperAdmin,
    queryFn: async (): Promise<SeriesPoint[]> => {
      const { data, error } = await supabase.rpc("admin_candidates_timeseries", { _days: rangeDays });
      if (error) throw error;
      return (data || []).map((d: any) => ({
        day: formatBRT(new Date(d.day), "dd/MM"),
        candidates: Number(d.candidates) || 0,
      }));
    },
  });

  if (roleLoading) {
    return (
      <AppLayout title="Candidatos (Global)">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!isSuperAdmin) return <Navigate to="/" replace />;

  const breadcrumb = [
    { label: "Admin", href: "/admin/dashboard" },
    { label: "Candidatos" },
  ];

  const data = overview.data;

  return (
    <AppLayout title="Candidatos (Global)" breadcrumb={breadcrumb}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Visão global de candidatos</h2>
              <p className="text-sm text-muted-foreground">
                Métricas agregadas de todas as contas da plataforma
              </p>
            </div>
          </div>
          <Select value={String(rangeDays)} onValueChange={(v) => setRangeDays(Number(v))}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPI label="Total de candidatos" value={data?.total_candidates} loading={overview.isLoading} />
          <KPI label="Novos (7d)" value={data?.new_7d} loading={overview.isLoading} />
          <KPI label="Novos (30d)" value={data?.new_30d} loading={overview.isLoading} />
          <KPI label="Contas com candidatos" value={data?.accounts_with_candidates} loading={overview.isLoading} icon={Building2} />
          <KPI label="Candidaturas totais" value={data?.total_applications} loading={overview.isLoading} />
          <KPI label={`Candidaturas (últ. ${rangeDays}d)`} value={data?.applications_in_range} loading={overview.isLoading} />
          <KPI label={`Novos cand. (últ. ${rangeDays}d)`} value={data?.new_in_range} loading={overview.isLoading} icon={TrendingUp} />
        </div>

        {/* Time series */}
        <Card>
          <CardHeader>
            <CardTitle>Novos candidatos por dia</CardTitle>
            <CardDescription>Tendência nos últimos {rangeDays} dias</CardDescription>
          </CardHeader>
          <CardContent>
            {series.isLoading ? (
              <div className="h-[280px] flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={series.data || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "0.5rem",
                    }}
                  />
                  <Line type="monotone" dataKey="candidates" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Status + Source side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Distribuição por status</CardTitle>
              <CardDescription>Candidatos agregados por status atual</CardDescription>
            </CardHeader>
            <CardContent>
              {overview.isLoading ? (
                <div className="h-[260px] flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data?.by_status || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="status" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "0.5rem",
                      }}
                    />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Origem dos candidatos</CardTitle>
              <CardDescription>Top fontes de aquisição</CardDescription>
            </CardHeader>
            <CardContent>
              {overview.isLoading ? (
                <div className="h-[260px] flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={data?.by_source || []}
                      dataKey="count"
                      nameKey="source"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      innerRadius={50}
                      paddingAngle={2}
                    >
                      {(data?.by_source || []).map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "0.5rem",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* By account table */}
        <Card>
          <CardHeader>
            <CardTitle>Top contas por volume</CardTitle>
            <CardDescription>50 contas com mais candidatos cadastrados</CardDescription>
          </CardHeader>
          <CardContent>
            {byAccount.isLoading ? (
              <div className="py-10 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Conta</TableHead>
                    <TableHead className="text-right">Candidatos</TableHead>
                    <TableHead className="text-right">Novos (30d)</TableHead>
                    <TableHead className="text-right">Candidaturas</TableHead>
                    <TableHead className="text-right">Último cadastro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(byAccount.data || []).map((row) => (
                    <TableRow key={row.account_id}>
                      <TableCell className="font-medium">{row.account_name}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary">{row.total_candidates}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{row.new_30d}</TableCell>
                      <TableCell className="text-right">{row.total_applications}</TableCell>
                      <TableCell className="text-right text-muted-foreground text-sm">
                        {row.last_candidate_at
                          ? formatBRT(new Date(row.last_candidate_at), "dd/MM/yyyy")
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!byAccount.data || byAccount.data.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Nenhum dado disponível
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

function KPI({
  label,
  value,
  loading,
  icon: Icon,
}: {
  label: string;
  value?: number;
  loading: boolean;
  icon?: typeof Users;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-bold mt-1">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (value ?? 0).toLocaleString("pt-BR")}
            </p>
          </div>
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        </div>
      </CardContent>
    </Card>
  );
}
