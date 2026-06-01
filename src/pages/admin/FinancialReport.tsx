import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, RefreshCw, ShieldAlert, Download, DollarSign, TrendingUp, Clock, Activity } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface PnLRow {
  account_id: string;
  account_name: string;
  plan: string | null;
  revenue_brl: number;
  cost_brl: number;
  margin_brl: number;
  margin_pct: number | null;
  last_invoice_at: string | null;
}

interface UsageRow {
  account_id: string;
  account_name: string;
  cultural_interviews: number;
  technical_interviews: number;
  total_interviews: number;
  total_minutes: number;
  avg_minutes: number;
  completion_rate: number;
  active_jobs: number;
  candidates: number;
  credits_used_month: number;
  cost_brl: number;
}

interface ReportData {
  period_days: number;
  usd_to_brl: number;
  totals: {
    revenue_brl: number;
    cost_brl: number;
    margin_brl: number;
    margin_pct: number;
    total_interviews: number;
    total_minutes: number;
    avg_minutes: number;
  };
  pnl: PnLRow[];
  usage: UsageRow[];
}

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 }).format(n || 0);
const fmtNum = (n: number) => new Intl.NumberFormat("pt-BR").format(Math.round(n || 0));
const fmtPct = (n: number | null) => (n === null ? "—" : `${n.toFixed(1)}%`);

type SortDir = "asc" | "desc";

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const keys = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [keys.join(";"), ...rows.map((r) => keys.map((k) => escape(r[k])).join(";"))].join("\n");
}

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([`\ufeff${content}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function FinancialReport() {
  const { user, loading: authLoading } = useAuth();
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);
  const [days, setDays] = useState(30);
  const [search, setSearch] = useState("");
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [pnlSort, setPnlSort] = useState<{ key: keyof PnLRow; dir: SortDir }>({ key: "margin_brl", dir: "desc" });
  const [usageSort, setUsageSort] = useState<{ key: keyof UsageRow; dir: SortDir }>({ key: "total_minutes", dir: "desc" });

  useEffect(() => {
    if (!user) return;
    supabase.rpc("is_super_admin", { _user_id: user.id }).then(({ data }) => setIsSuperAdmin(data === true));
  }, [user]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const { data: res, error } = await supabase.functions.invoke("admin-financial-report", {
        body: { days },
      });
      if (error) throw error;
      setData(res as ReportData);
    } catch (e: any) {
      toast.error("Erro ao carregar relatório", { description: e?.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin, days]);

  const filteredPnl = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    const rows = q
      ? data.pnl.filter((r) => r.account_name.toLowerCase().includes(q))
      : data.pnl;
    return [...rows].sort((a, b) => {
      const av = a[pnlSort.key] as any;
      const bv = b[pnlSort.key] as any;
      if (av === null) return 1;
      if (bv === null) return -1;
      if (typeof av === "number" && typeof bv === "number") {
        return pnlSort.dir === "asc" ? av - bv : bv - av;
      }
      return pnlSort.dir === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
  }, [data, search, pnlSort]);

  const filteredUsage = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    const rows = q
      ? data.usage.filter((r) => r.account_name.toLowerCase().includes(q))
      : data.usage;
    return [...rows].sort((a, b) => {
      const av = a[usageSort.key] as any;
      const bv = b[usageSort.key] as any;
      if (typeof av === "number" && typeof bv === "number") {
        return usageSort.dir === "asc" ? av - bv : bv - av;
      }
      return usageSort.dir === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
  }, [data, search, usageSort]);

  const togglePnlSort = (key: keyof PnLRow) =>
    setPnlSort((s) => ({ key, dir: s.key === key && s.dir === "desc" ? "asc" : "desc" }));
  const toggleUsageSort = (key: keyof UsageRow) =>
    setUsageSort((s) => ({ key, dir: s.key === key && s.dir === "desc" ? "asc" : "desc" }));

  if (authLoading || isSuperAdmin === null) {
    return (
      <AppLayout title="Relatório Financeiro" breadcrumb={[{ label: "Administração", href: "/admin/dashboard" }, { label: "Financeiro" }]}>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }
  if (!user) return <Navigate to="/auth/login" replace />;
  if (!isSuperAdmin) {
    return (
      <AppLayout title="Relatório Financeiro" breadcrumb={[{ label: "Administração", href: "/admin/dashboard" }, { label: "Financeiro" }]}>
        <Card className="max-w-md mx-auto mt-12">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <ShieldAlert className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold">Acesso Restrito</h2>
            <p className="text-muted-foreground">Exclusivo para administradores da plataforma.</p>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  const totals = data?.totals;

  return (
    <AppLayout
      title="Relatório Financeiro"
      breadcrumb={[{ label: "Administração", href: "/admin/dashboard" }, { label: "Financeiro" }]}
    >
      <div className="space-y-6">
        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-3">
          <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
              <SelectItem value="180">Últimos 180 dias</SelectItem>
              <SelectItem value="365">Últimos 365 dias</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder="Buscar cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
          <Button variant="outline" size="sm" onClick={fetchReport} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Atualizar
          </Button>
          {data && (
            <Badge variant="secondary" className="ml-auto">
              USD→BRL: {data.usd_to_brl.toFixed(2)} · período {data.period_days}d
            </Badge>
          )}
        </div>

        {/* Cards de topo */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard icon={<DollarSign className="h-4 w-4" />} label="Receita" value={fmtBRL(totals?.revenue_brl || 0)} />
          <MetricCard icon={<TrendingUp className="h-4 w-4" />} label="Custo IA" value={fmtBRL(totals?.cost_brl || 0)} />
          <MetricCard
            icon={<DollarSign className="h-4 w-4" />}
            label="Margem Bruta"
            value={fmtBRL(totals?.margin_brl || 0)}
            sub={fmtPct(totals?.margin_pct ?? null)}
            highlight={(totals?.margin_brl || 0) >= 0 ? "positive" : "negative"}
          />
          <MetricCard icon={<Clock className="h-4 w-4" />} label="Minutos de entrevista" value={fmtNum(totals?.total_minutes || 0)} sub={`${fmtNum(totals?.total_interviews || 0)} entrevistas`} />
        </div>

        <Tabs defaultValue="pnl" className="w-full">
          <TabsList>
            <TabsTrigger value="pnl">P&L por Cliente</TabsTrigger>
            <TabsTrigger value="usage">Uso da Plataforma</TabsTrigger>
          </TabsList>

          {/* ===== Aba P&L ===== */}
          <TabsContent value="pnl" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Margem por Cliente</CardTitle>
                  <CardDescription>Receita (faturas pagas) vs custo de IA (LLM/voz) no período.</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadCsv(`pnl_${days}d.csv`, toCsv(filteredPnl as any))}
                  disabled={filteredPnl.length === 0}
                >
                  <Download className="h-4 w-4 mr-2" /> Exportar CSV
                </Button>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                ) : (
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <SortableHead onClick={() => togglePnlSort("account_name")}>Cliente</SortableHead>
                          <TableHead>Plano</TableHead>
                          <SortableHead onClick={() => togglePnlSort("revenue_brl")} className="text-right">Receita</SortableHead>
                          <SortableHead onClick={() => togglePnlSort("cost_brl")} className="text-right">Custo IA</SortableHead>
                          <SortableHead onClick={() => togglePnlSort("margin_brl")} className="text-right">Margem</SortableHead>
                          <SortableHead onClick={() => togglePnlSort("margin_pct")} className="text-right">Margem %</SortableHead>
                          <TableHead>Última fatura</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPnl.length === 0 && (
                          <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Sem dados no período.</TableCell></TableRow>
                        )}
                        {filteredPnl.map((r) => (
                          <TableRow key={r.account_id}>
                            <TableCell className="font-medium">{r.account_name}</TableCell>
                            <TableCell>{r.plan ? <Badge variant="secondary">{r.plan}</Badge> : <span className="text-muted-foreground">—</span>}</TableCell>
                            <TableCell className="text-right">{fmtBRL(r.revenue_brl)}</TableCell>
                            <TableCell className="text-right">{fmtBRL(r.cost_brl)}</TableCell>
                            <TableCell className={`text-right font-medium ${r.margin_brl >= 0 ? "text-emerald-600" : "text-destructive"}`}>{fmtBRL(r.margin_brl)}</TableCell>
                            <TableCell className="text-right">{fmtPct(r.margin_pct)}</TableCell>
                            <TableCell className="text-muted-foreground text-sm">{r.last_invoice_at ? new Date(r.last_invoice_at).toLocaleDateString("pt-BR") : "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== Aba Uso ===== */}
          <TabsContent value="usage" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard icon={<Activity className="h-4 w-4" />} label="Total de entrevistas" value={fmtNum(totals?.total_interviews || 0)} />
              <MetricCard icon={<Clock className="h-4 w-4" />} label="Minutos totais" value={fmtNum(totals?.total_minutes || 0)} />
              <MetricCard icon={<Clock className="h-4 w-4" />} label="Tempo médio" value={`${(totals?.avg_minutes || 0).toFixed(1)} min`} />
              <MetricCard icon={<Activity className="h-4 w-4" />} label="Clientes ativos" value={fmtNum((data?.usage || []).filter((u) => u.total_interviews > 0).length)} />
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Uso por Cliente</CardTitle>
                  <CardDescription>Entrevistas, minutagem e consumo de créditos por organização.</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadCsv(`uso_${days}d.csv`, toCsv(filteredUsage as any))}
                  disabled={filteredUsage.length === 0}
                >
                  <Download className="h-4 w-4 mr-2" /> Exportar CSV
                </Button>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                ) : (
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <SortableHead onClick={() => toggleUsageSort("account_name")}>Cliente</SortableHead>
                          <SortableHead onClick={() => toggleUsageSort("cultural_interviews")} className="text-right">Cultural</SortableHead>
                          <SortableHead onClick={() => toggleUsageSort("technical_interviews")} className="text-right">Técnica</SortableHead>
                          <SortableHead onClick={() => toggleUsageSort("total_interviews")} className="text-right">Total</SortableHead>
                          <SortableHead onClick={() => toggleUsageSort("total_minutes")} className="text-right">Minutos</SortableHead>
                          <SortableHead onClick={() => toggleUsageSort("avg_minutes")} className="text-right">Médio (min)</SortableHead>
                          <SortableHead onClick={() => toggleUsageSort("completion_rate")} className="text-right">Conclusão</SortableHead>
                          <SortableHead onClick={() => toggleUsageSort("active_jobs")} className="text-right">Vagas ativas</SortableHead>
                          <SortableHead onClick={() => toggleUsageSort("candidates")} className="text-right">Candidatos</SortableHead>
                          <SortableHead onClick={() => toggleUsageSort("credits_used_month")} className="text-right">Créditos (mês)</SortableHead>
                          <SortableHead onClick={() => toggleUsageSort("cost_brl")} className="text-right">Custo IA</SortableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsage.length === 0 && (
                          <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-8">Sem dados no período.</TableCell></TableRow>
                        )}
                        {filteredUsage.map((r) => (
                          <TableRow key={r.account_id}>
                            <TableCell className="font-medium">{r.account_name}</TableCell>
                            <TableCell className="text-right">{fmtNum(r.cultural_interviews)}</TableCell>
                            <TableCell className="text-right">{fmtNum(r.technical_interviews)}</TableCell>
                            <TableCell className="text-right font-medium">{fmtNum(r.total_interviews)}</TableCell>
                            <TableCell className="text-right">{fmtNum(r.total_minutes)}</TableCell>
                            <TableCell className="text-right">{r.avg_minutes.toFixed(1)}</TableCell>
                            <TableCell className="text-right">{r.completion_rate.toFixed(1)}%</TableCell>
                            <TableCell className="text-right">{fmtNum(r.active_jobs)}</TableCell>
                            <TableCell className="text-right">{fmtNum(r.candidates)}</TableCell>
                            <TableCell className="text-right">{r.credits_used_month.toFixed(1)}</TableCell>
                            <TableCell className="text-right">{fmtBRL(r.cost_brl)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

function MetricCard({
  icon, label, value, sub, highlight,
}: { icon: React.ReactNode; label: string; value: string; sub?: string; highlight?: "positive" | "negative" }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide">
          {icon}
          {label}
        </div>
        <div
          className={`text-2xl font-semibold mt-2 ${
            highlight === "positive" ? "text-emerald-600" : highlight === "negative" ? "text-destructive" : ""
          }`}
        >
          {value}
        </div>
        {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function SortableHead({
  children, onClick, className,
}: { children: React.ReactNode; onClick: () => void; className?: string }) {
  return (
    <TableHead className={`cursor-pointer select-none hover:text-foreground ${className || ""}`} onClick={onClick}>
      {children}
    </TableHead>
  );
}
