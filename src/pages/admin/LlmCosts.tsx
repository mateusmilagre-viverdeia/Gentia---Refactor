import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip as RTooltip, CartesianGrid, Legend,
} from "recharts";
import {
  Loader2, RefreshCw, ShieldAlert, TrendingDown, DollarSign, Sparkles, AlertTriangle, Settings2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLlmCostMetrics, type AccountCostRow } from "@/hooks/useLlmCostMetrics";
import { formatBRT } from "@/lib/datetime";


const FUNCTION_LABELS: Record<string, string> = {
  "culture-interview-complete": "Avaliação Cultural",
  "technical-interview-complete": "Avaliação Técnica",
  "analyze-cv-job-match": "Match de CV (vaga)",
};

const TIER_LABELS: Record<string, string> = {
  stable: "Stable (rollback)",
  optimized: "Optimized (Fase 1)",
  experimental: "Experimental",
};

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 4 }).format(n || 0);
const fmtPct = (n: number) => `${(n || 0).toFixed(1)}%`;

export default function LlmCosts() {
  const { user, loading: authLoading } = useAuth();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [days, setDays] = useState(30);
  const { loading, error, byFunction, daily, byAccount, anomalies, qualitySignal, refresh } = useLlmCostMetrics(days);
  const [search, setSearch] = useState("");

  // Tier change modal state
  const [editAccount, setEditAccount] = useState<AccountCostRow | null>(null);
  const [newTier, setNewTier] = useState<"stable" | "optimized" | "experimental">("optimized");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const check = async () => {
      if (!user) { setCheckingAdmin(false); return; }
      const { data } = await supabase.rpc("is_super_admin", { _user_id: user.id });
      setIsSuperAdmin(data === true);
      setCheckingAdmin(false);
    };
    check();
  }, [user]);

  const totalCost = useMemo(() => byFunction.reduce((s, f) => s + f.total_cost_brl, 0), [byFunction]);
  const totalSavings = useMemo(() => byFunction.reduce((s, f) => s + f.savings_brl, 0), [byFunction]);
  const totalSessions = useMemo(() => byFunction.reduce((s, f) => s + f.total_sessions, 0), [byFunction]);
  const baselineCost = useMemo(
    () => byFunction.reduce((s, f) => s + (f.baseline_cost_brl ?? 0) * f.total_sessions, 0),
    [byFunction]
  );
  const overallSavingsPct = baselineCost > 0 ? (totalSavings / baselineCost) * 100 : 0;

  // Pivot daily into chart-friendly rows: { day, "Avaliação Cultural": x, ... }
  const chartData = useMemo(() => {
    const map = new Map<string, any>();
    for (const d of daily) {
      const row = map.get(d.day) || { day: d.day };
      row[FUNCTION_LABELS[d.function_name] || d.function_name] = Number((row[FUNCTION_LABELS[d.function_name] || d.function_name] || 0) + d.cost_brl);
      map.set(d.day, row);
    }
    return Array.from(map.values()).sort((a, b) => a.day.localeCompare(b.day));
  }, [daily]);

  const filteredAccounts = byAccount.filter((a) =>
    !search || (a.account_name || a.account_id).toLowerCase().includes(search.toLowerCase())
  );

  const openTierEditor = (acc: AccountCostRow) => {
    setEditAccount(acc);
    setNewTier(acc.tier);
    setReason("");
  };

  const submitTierChange = async () => {
    if (!editAccount) return;
    setSaving(true);
    try {
      // Upsert account_settings
      const { data: existing } = await supabase
        .from("account_settings" as any)
        .select("id")
        .eq("account_id", editAccount.account_id)
        .maybeSingle();
      if (existing) {
        const { error: updErr } = await supabase
          .from("account_settings" as any)
          .update({ evaluator_optimization_tier: newTier, updated_at: new Date().toISOString() })
          .eq("account_id", editAccount.account_id);
        if (updErr) throw updErr;
      } else {
        const { error: insErr } = await supabase
          .from("account_settings" as any)
          .insert({ account_id: editAccount.account_id, evaluator_optimization_tier: newTier });
        if (insErr) throw insErr;
      }
      // Audit log
      await supabase.from("evaluator_tier_change_log" as any).insert({
        account_id: editAccount.account_id,
        old_tier: editAccount.tier,
        new_tier: newTier,
        changed_by: user?.id,
        reason: reason || null,
      });
      toast.success(`Tier alterado para ${TIER_LABELS[newTier]}`);
      setEditAccount(null);
      await refresh();
    } catch (e: any) {
      toast.error(`Falha ao alterar tier: ${e.message || "erro"}`);
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || checkingAdmin) {
    return (
      <AppLayout title="Custos LLM" breadcrumb={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Custos LLM" }]}>
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }
  if (!isSuperAdmin) {
    return (
      <AppLayout title="Custos LLM" breadcrumb={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Custos LLM" }]}>
        <Card className="max-w-md mx-auto mt-12">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <ShieldAlert className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold">Acesso Restrito</h2>
            <p className="text-muted-foreground">Esta página é exclusiva para administradores.</p>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Custos LLM" breadcrumb={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Custos LLM" }]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Observabilidade de Custos LLM</h1>
            <p className="text-sm text-muted-foreground">
              Custos das 3 funções de avaliação (cultural, técnica, CV match) com comparativo vs baseline pré-Fase 1.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 dias</SelectItem>
                <SelectItem value="30">30 dias</SelectItem>
                <SelectItem value="60">60 dias</SelectItem>
                <SelectItem value="90">90 dias</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </div>
        </div>

        {error && (
          <Card className="border-destructive/30">
            <CardContent className="pt-4 text-sm text-destructive">{error}</CardContent>
          </Card>
        )}

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard icon={<DollarSign />} label="Custo total" value={fmtBRL(totalCost)} sub={`${totalSessions} avaliações`} />
          <MetricCard icon={<TrendingDown />} label="Economia vs baseline" value={fmtBRL(totalSavings)} sub={fmtPct(overallSavingsPct)} accent />
          <MetricCard icon={<Sparkles />} label="Custo médio cultural" value={fmtBRL(byFunction.find(f => f.function_name === "culture-interview-complete")?.avg_cost_brl || 0)} sub="por avaliação" />
          <MetricCard
            icon={<Sparkles />}
            label="Qualidade (sinal)"
            value={qualitySignal.avg != null ? qualitySignal.avg.toFixed(2) : "—"}
            sub={qualitySignal.count > 0 ? `${qualitySignal.count} sinais` : "sem sinais ainda"}
            accent={qualitySignal.avg != null && qualitySignal.avg < 0.6}
          />
        </div>

        {/* Per-function breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Custo por função</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Função</TableHead>
                  <TableHead className="text-right">Avaliações</TableHead>
                  <TableHead className="text-right">Custo total</TableHead>
                  <TableHead className="text-right">Custo médio</TableHead>
                  <TableHead className="text-right">Baseline</TableHead>
                  <TableHead className="text-right">Economia</TableHead>
                  <TableHead className="text-right">% economia</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byFunction.map((f) => (
                  <TableRow key={f.function_name}>
                    <TableCell className="font-medium">{FUNCTION_LABELS[f.function_name] || f.function_name}</TableCell>
                    <TableCell className="text-right">{f.total_sessions}</TableCell>
                    <TableCell className="text-right">{fmtBRL(f.total_cost_brl)}</TableCell>
                    <TableCell className="text-right">{fmtBRL(f.avg_cost_brl)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {f.baseline_cost_brl != null ? fmtBRL(f.baseline_cost_brl) : "—"}
                    </TableCell>
                    <TableCell className="text-right text-emerald-600 dark:text-emerald-400">
                      {fmtBRL(f.savings_brl)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline">{fmtPct(f.savings_pct)}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Timeline chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Evolução diária (BRL)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${Number(v).toFixed(2)}`} />
                  <RTooltip formatter={(v: any) => fmtBRL(Number(v))} />
                  <Legend />
                  <Area type="monotone" dataKey="Avaliação Cultural" stackId="1" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.3)" />
                  <Area type="monotone" dataKey="Avaliação Técnica" stackId="1" stroke="hsl(var(--chart-2, 200 80% 50%))" fill="hsl(var(--chart-2, 200 80% 50%) / 0.3)" />
                  <Area type="monotone" dataKey="Match de CV (vaga)" stackId="1" stroke="hsl(var(--chart-3, 280 70% 60%))" fill="hsl(var(--chart-3, 280 70% 60%) / 0.3)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Tabs: Accounts + Anomalies */}
        <Tabs defaultValue="accounts">
          <TabsList>
            <TabsTrigger value="accounts">Por conta</TabsTrigger>
            <TabsTrigger value="anomalies">
              Anomalias
              {anomalies.length > 0 && (
                <Badge variant="destructive" className="ml-2">{anomalies.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="accounts">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Custo por conta</CardTitle>
                <Input placeholder="Buscar conta..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Conta</TableHead>
                      <TableHead className="text-right">Avaliações</TableHead>
                      <TableHead className="text-right">Custo total</TableHead>
                      <TableHead className="text-right">Custo médio</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead className="text-right">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAccounts.length === 0 && (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhuma conta com avaliações no período</TableCell></TableRow>
                    )}
                    {filteredAccounts.map((a) => (
                      <TableRow key={a.account_id}>
                        <TableCell className="font-medium">{a.account_name || a.account_id.slice(0, 8)}</TableCell>
                        <TableCell className="text-right">{a.total_sessions}</TableCell>
                        <TableCell className="text-right">{fmtBRL(a.total_cost_brl)}</TableCell>
                        <TableCell className="text-right">{fmtBRL(a.avg_cost_brl)}</TableCell>
                        <TableCell>
                          <Badge variant={a.tier === "stable" ? "outline" : a.tier === "experimental" ? "secondary" : "default"}>
                            {TIER_LABELS[a.tier]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => openTierEditor(a)}>
                            <Settings2 className="h-4 w-4 mr-1" /> Mudar tier
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="anomalies">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" /> Sessões fora do padrão (últimos 7 dias)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Quando</TableHead>
                      <TableHead>Função</TableHead>
                      <TableHead>Conta</TableHead>
                      <TableHead className="text-right">Custo</TableHead>
                      <TableHead>Motivo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {anomalies.length === 0 && (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhuma anomalia detectada 🎉</TableCell></TableRow>
                    )}
                    {anomalies.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatBRT(new Date(a.created_at), "dd/MM HH:mm")}
                        </TableCell>
                        <TableCell>{FUNCTION_LABELS[a.function_name] || a.function_name}</TableCell>
                        <TableCell className="text-xs">{a.account_id?.slice(0, 8) || "—"}</TableCell>
                        <TableCell className="text-right">{fmtBRL(a.cost_brl || 0)}</TableCell>
                        <TableCell><Badge variant="outline">{a.reason}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Tier change dialog */}
      <Dialog open={!!editAccount} onOpenChange={(open) => !open && setEditAccount(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar tier de otimização</DialogTitle>
            <DialogDescription>
              Conta: <strong>{editAccount?.account_name || editAccount?.account_id}</strong>
              <br />
              Tier atual: <Badge variant="outline" className="ml-1">{TIER_LABELS[editAccount?.tier || "optimized"]}</Badge>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Novo tier</Label>
              <Select value={newTier} onValueChange={(v: any) => setNewTier(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="stable">Stable — sem compressão, max_tokens folgado (rollback)</SelectItem>
                  <SelectItem value="optimized">Optimized — Fase 1 ativa (default)</SelectItem>
                  <SelectItem value="experimental">Experimental — reservado para futuras fases</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Motivo (opcional, fica no log)</Label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex.: cliente premium reclamou de qualidade…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditAccount(null)} disabled={saving}>Cancelar</Button>
            <Button onClick={submitTierChange} disabled={saving || newTier === editAccount?.tier}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

function MetricCard({
  icon, label, value, sub, accent,
}: { icon: React.ReactNode; label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={`text-2xl font-semibold ${accent ? "text-emerald-600 dark:text-emerald-400" : ""}`}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className="text-muted-foreground">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}
