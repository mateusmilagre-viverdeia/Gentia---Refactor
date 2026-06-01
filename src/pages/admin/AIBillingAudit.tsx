import { useEffect, useState, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Loader2, RefreshCw, ShieldAlert, CheckCircle2, AlertTriangle, ScanLine,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatBRT } from "@/lib/datetime";


interface Suspect {
  function_name: string;
  ai_calls: number;
  estimated_cost_brl: number;
  debits_count: number;
  reason: string;
}

interface AuditResult {
  scanned_at: string;
  window_days: number;
  total_rs_functions: number;
  ai_callers: number;
  billed: number;
  exempt: number;
  suspects_count: number;
  suspects: Suspect[];
  triggered_by: string;
}

interface HistoryRow {
  id: string;
  scanned_at: string;
  window_days: number;
  ai_callers: number;
  billed: number;
  exempt: number;
  suspects: Suspect[];
  triggered_by: string;
}

export default function AIBillingAudit() {
  const { user, loading: authLoading } = useAuth();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);

  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    const check = async () => {
      if (!user) { setCheckingAdmin(false); return; }
      const { data } = await supabase.rpc("is_super_admin", { _user_id: user.id });
      setIsSuperAdmin(data === true);
      setCheckingAdmin(false);
    };
    check();
  }, [user]);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    const { data, error } = await supabase
      .from("ai_billing_audit_log")
      .select("id, scanned_at, window_days, ai_callers, billed, exempt, suspects, triggered_by")
      .order("scanned_at", { ascending: false })
      .limit(30);
    if (error) {
      toast.error("Erro ao carregar histórico");
    } else {
      setHistory((data as unknown as HistoryRow[]) ?? []);
      // Use most recent as current result if no manual run yet
      if (!result && data && data.length > 0) {
        const last = data[0] as unknown as HistoryRow;
        setResult({
          scanned_at: last.scanned_at,
          window_days: last.window_days,
          total_rs_functions: last.ai_callers + last.suspects.length,
          ai_callers: last.ai_callers,
          billed: last.billed,
          exempt: last.exempt,
          suspects_count: last.suspects.length,
          suspects: last.suspects ?? [],
          triggered_by: last.triggered_by,
        });
      }
    }
    setLoadingHistory(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isSuperAdmin) loadHistory();
  }, [isSuperAdmin, loadHistory]);

  const runAudit = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("audit-ai-billing", {
        method: "POST",
      });
      if (error) throw error;
      setResult(data as AuditResult);
      toast.success("Auditoria executada");
      loadHistory();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao executar auditoria";
      toast.error(msg);
    } finally {
      setRunning(false);
    }
  };

  if (authLoading || checkingAdmin) {
    return (
      <AppLayout title="Auditoria de Billing IA">
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!isSuperAdmin) {
    return (
      <AppLayout title="Auditoria de Billing IA" breadcrumb={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Billing IA" }]}>
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

  const hasIssues = (result?.suspects_count ?? 0) > 0;

  return (
    <AppLayout
      title="Auditoria de Billing IA"
      breadcrumb={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Billing IA (R&S)" }]}
    >
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Guardrail de Billing — Recrutamento & Seleção</h1>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Auditoria <strong>não-restritiva</strong>: nunca bloqueia o cliente.
              Identifica funções de R&S que chamaram IA mas não emitiram débito de créditos correlato na janela observada.
              Outros módulos (Cultura, Pulse, Propostas, NPS, etc.) não cobram créditos por design e ficam fora do escopo.
            </p>
          </div>
          <Button onClick={runAudit} disabled={running}>
            {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ScanLine className="h-4 w-4 mr-2" />}
            Executar agora
          </Button>
        </div>

        {/* Status global */}
        <Card className={hasIssues ? "border-destructive" : "border-emerald-500/40"}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              {hasIssues ? (
                <AlertTriangle className="h-10 w-10 text-destructive shrink-0" />
              ) : (
                <CheckCircle2 className="h-10 w-10 text-emerald-500 shrink-0" />
              )}
              <div className="flex-1">
                <div className="text-lg font-semibold">
                  {result
                    ? hasIssues
                      ? `${result.suspects_count} função(ões) R&S suspeita(s) de não cobrar créditos`
                      : "Tudo OK — todas as funções R&S que chamaram IA emitiram débitos"
                    : "Ainda sem dados — clique em Executar agora"}
                </div>
                {result && (
                  <div className="text-sm text-muted-foreground mt-1">
                    Última verificação:{" "}
                    {formatBRT(new Date(result.scanned_at), "dd/MM/yyyy HH:mm")}
                    {" · "}janela: {result.window_days}d
                    {" · "}origem: {result.triggered_by}
                  </div>
                )}
              </div>
              {result && (
                <div className="grid grid-cols-3 gap-6 text-center">
                  <div>
                    <div className="text-2xl font-semibold">{result.ai_callers}</div>
                    <div className="text-xs text-muted-foreground">Chamaram IA</div>
                  </div>
                  <div>
                    <div className="text-2xl font-semibold text-emerald-500">{result.billed}</div>
                    <div className="text-xs text-muted-foreground">Com débito</div>
                  </div>
                  <div>
                    <div className="text-2xl font-semibold text-muted-foreground">{result.exempt}</div>
                    <div className="text-xs text-muted-foreground">Isentas</div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Suspeitas */}
        {result && result.suspects.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Funções suspeitas</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Função</TableHead>
                    <TableHead className="text-right">Chamadas IA</TableHead>
                    <TableHead className="text-right">Custo est. (BRL)</TableHead>
                    <TableHead>Motivo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.suspects.map((s) => (
                    <TableRow key={s.function_name}>
                      <TableCell className="font-mono text-xs">{s.function_name}</TableCell>
                      <TableCell className="text-right">{s.ai_calls}</TableCell>
                      <TableCell className="text-right">
                        {s.estimated_cost_brl.toFixed(4)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{s.reason}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Histórico */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Histórico (últimas 30 execuções)
              <Button variant="ghost" size="sm" onClick={loadHistory} disabled={loadingHistory}>
                <RefreshCw className={`h-3 w-3 ${loadingHistory ? "animate-spin" : ""}`} />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingHistory ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : history.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Sem execuções registradas ainda.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quando</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead className="text-right">Janela</TableHead>
                    <TableHead className="text-right">IA</TableHead>
                    <TableHead className="text-right">Com débito</TableHead>
                    <TableHead className="text-right">Isentas</TableHead>
                    <TableHead className="text-right">Suspeitas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((h) => {
                    const n = h.suspects?.length ?? 0;
                    return (
                      <TableRow key={h.id}>
                        <TableCell className="text-xs">
                          {formatBRT(new Date(h.scanned_at), "dd/MM HH:mm")}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{h.triggered_by}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{h.window_days}d</TableCell>
                        <TableCell className="text-right">{h.ai_callers}</TableCell>
                        <TableCell className="text-right text-emerald-500">{h.billed}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{h.exempt}</TableCell>
                        <TableCell className="text-right">
                          {n > 0 ? (
                            <Badge variant="destructive">{n}</Badge>
                          ) : (
                            <Badge variant="outline" className="text-emerald-500 border-emerald-500/40">0</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
