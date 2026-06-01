import { useEffect, useState, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Loader2, ShieldAlert, PlayCircle, Activity, AlertTriangle,
  CheckCircle2, RefreshCw, BellRing,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatBRT } from "@/lib/datetime";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";

interface Incident {
  id: string;
  account_id: string | null;
  function_name: string;
  detected_at: string;
  window_start: string;
  window_end: string;
  ai_calls_count: number;
  estimated_cost_brl: number;
  credits_adjusted: number;
  status: string;
  notified_at: string | null;
  notes: string | null;
}

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "destructive" | "secondary" | "outline" }> = {
  detected: { label: "Detectado", variant: "secondary" },
  auto_corrected: { label: "Auto-corrigido", variant: "default" },
  requires_manual_review: { label: "Revisão manual", variant: "destructive" },
  notified: { label: "Notificado", variant: "default" },
  dismissed: { label: "Descartado", variant: "outline" },
};

export default function AIBillingHealth() {
  const { user, loading: authLoading } = useAuth();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    (async () => {
      if (!user) { setCheckingAdmin(false); return; }
      const { data } = await supabase.rpc("is_super_admin", { _user_id: user.id });
      setIsSuperAdmin(data === true);
      setCheckingAdmin(false);
    })();
  }, [user]);

  const loadIncidents = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("ai_billing_incidents")
      .select("id, account_id, function_name, detected_at, window_start, window_end, ai_calls_count, estimated_cost_brl, credits_adjusted, status, notified_at, notes")
      .order("detected_at", { ascending: false })
      .limit(200);
    if (error) {
      toast.error("Erro ao carregar incidentes: " + error.message);
    } else {
      setIncidents((data as Incident[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isSuperAdmin) loadIncidents();
  }, [isSuperAdmin, loadIncidents]);

  const runMonitor = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-billing-monitor", {
        method: "POST",
      });
      if (error) throw error;
      toast.success(
        `Monitor executado: ${(data as any)?.incidents_created ?? 0} incidente(s) criados, ${(data as any)?.auto_corrected ?? 0} auto-corrigido(s)`,
      );
      loadIncidents();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao executar monitor");
    } finally {
      setRunning(false);
    }
  };

  const dismissIncident = async (id: string) => {
    const { error } = await supabase
      .from("ai_billing_incidents")
      .update({ status: "dismissed" })
      .eq("id", id);
    if (error) {
      toast.error("Erro ao descartar: " + error.message);
    } else {
      toast.success("Incidente descartado");
      loadIncidents();
    }
  };

  if (authLoading || checkingAdmin) {
    return (
      <AppLayout title="Saúde de Billing IA">
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!isSuperAdmin) {
    return (
      <AppLayout title="Saúde de Billing IA" breadcrumb={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Saúde Billing IA" }]}>
        <Card className="max-w-md mx-auto mt-12">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <ShieldAlert className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold">Acesso Restrito</h2>
            <p className="text-muted-foreground">Esta página é exclusiva para Super Admins.</p>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  const now = Date.now();
  const last24h = incidents.filter((i) => now - new Date(i.detected_at).getTime() < 24 * 3600 * 1000);
  const last7d = incidents.filter((i) => now - new Date(i.detected_at).getTime() < 7 * 24 * 3600 * 1000);
  const totalAutoCorrected = incidents.filter((i) => i.status === "auto_corrected" || i.status === "notified");
  const totalCredits = totalAutoCorrected.reduce((s, i) => s + Number(i.credits_adjusted || 0), 0);
  const pendingReview = incidents.filter((i) => i.status === "requires_manual_review").length;
  const lastRun = incidents[0]?.detected_at;

  // Build chart data: last 30 days, group by day
  const chartMap = new Map<string, { date: string; auto: number; manual: number }>();
  for (let d = 29; d >= 0; d--) {
    const day = new Date(now - d * 24 * 3600 * 1000);
    const key = day.toISOString().slice(0, 10);
    chartMap.set(key, { date: key.slice(5), auto: 0, manual: 0 });
  }
  for (const i of incidents) {
    const key = i.detected_at.slice(0, 10);
    const entry = chartMap.get(key);
    if (!entry) continue;
    if (i.status === "auto_corrected" || i.status === "notified") entry.auto++;
    else if (i.status === "requires_manual_review") entry.manual++;
  }
  const chartData = Array.from(chartMap.values());

  const filtered = statusFilter === "all"
    ? incidents
    : incidents.filter((i) => i.status === statusFilter);

  return (
    <AppLayout
      title="Saúde de Billing IA"
      breadcrumb={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Saúde Billing IA" }]}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <Activity className="h-6 w-6" /> Saúde de Billing IA
            </h1>
            <p className="text-sm text-muted-foreground">
              Monitoramento contínuo (a cada 15min) de divergências entre uso de IA e cobrança de créditos no R&S.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadIncidents} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Atualizar
            </Button>
            <Button onClick={runMonitor} disabled={running}>
              {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <PlayCircle className="h-4 w-4 mr-2" />}
              Rodar monitor agora
            </Button>
          </div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground font-normal">Última execução</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold">{lastRun ? formatBRT(lastRun) : "Nenhuma"}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground font-normal">Divergências 24h / 7d</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{last24h.length} / {last7d.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground font-normal">Auto-corrigido (créditos)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                {totalCredits.toFixed(2)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground font-normal">Aguardando revisão</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold flex items-center gap-2">
                <AlertTriangle className={`h-5 w-5 ${pendingReview > 0 ? "text-amber-600" : "text-muted-foreground"}`} />
                {pendingReview}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Incidentes por dia — últimos 30 dias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="auto" name="Auto-corrigido" stackId="a" fill="hsl(var(--primary))" />
                  <Bar dataKey="manual" name="Revisão manual" stackId="a" fill="hsl(var(--destructive))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Timeline de incidentes</CardTitle>
            <div className="flex gap-1 flex-wrap">
              {["all", "auto_corrected", "notified", "requires_manual_review", "dismissed"].map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={statusFilter === s ? "default" : "outline"}
                  onClick={() => setStatusFilter(s)}
                >
                  {s === "all" ? "Todos" : STATUS_LABELS[s]?.label ?? s}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Nenhum incidente {statusFilter !== "all" ? `no status "${STATUS_LABELS[statusFilter]?.label}"` : ""}.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Detectado</TableHead>
                      <TableHead>Função</TableHead>
                      <TableHead>Conta</TableHead>
                      <TableHead className="text-right">Chamadas IA</TableHead>
                      <TableHead className="text-right">Custo (BRL)</TableHead>
                      <TableHead className="text-right">Créditos</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Notificado</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((i) => {
                      const meta = STATUS_LABELS[i.status] ?? { label: i.status, variant: "outline" as const };
                      return (
                        <TableRow key={i.id}>
                          <TableCell className="whitespace-nowrap text-xs">{formatBRT(i.detected_at)}</TableCell>
                          <TableCell className="font-mono text-xs">{i.function_name}</TableCell>
                          <TableCell className="font-mono text-xs">{i.account_id?.slice(0, 8) ?? "—"}</TableCell>
                          <TableCell className="text-right">{i.ai_calls_count}</TableCell>
                          <TableCell className="text-right">{Number(i.estimated_cost_brl).toFixed(4)}</TableCell>
                          <TableCell className="text-right">{Number(i.credits_adjusted).toFixed(2)}</TableCell>
                          <TableCell><Badge variant={meta.variant}>{meta.label}</Badge></TableCell>
                          <TableCell>
                            {i.notified_at ? (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <BellRing className="h-3 w-3" />
                                {formatBRT(i.notified_at)}
                              </span>
                            ) : "—"}
                          </TableCell>
                          <TableCell>
                            {i.status !== "dismissed" && (
                              <Button size="sm" variant="ghost" onClick={() => dismissIncident(i.id)}>
                                Descartar
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
