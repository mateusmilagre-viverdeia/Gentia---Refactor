import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, CheckCircle2, RefreshCw, ShieldCheck } from "lucide-react";
import { LLMMappingAuditCard } from "./LLMMappingAuditCard";

interface ValidationResult {
  window: { from: string; to: string };
  summary: {
    interviews_total: number;
    interviews_with_token_usage: number;
    interviews_with_debit: number;
    ai_exec_total: number;
    ai_exec_with_tokens: number;
    total_cost_usd: number;
    total_interview_credits_debited: number;
    total_all_credits_debited: number;
    expected_credits_from_usd: number;
    reconciliation_gap_pct: number | null;
    usd_to_brl: number;
    margin_percent: number;
    credit_value_brl: number;
  };
  interviews: any[];
  ai_executions: any[];
  anomalies: { severity: "high" | "medium"; message: string; ref?: string }[];
}

function isoDaysAgo(n: number) {
  const d = new Date(Date.now() - n * 86400000);
  return d.toISOString().slice(0, 10);
}

export function ValidationTab() {
  const [from, setFrom] = useState(isoDaysAgo(7));
  const [to, setTo] = useState(isoDaysAgo(0));
  const [enabled, setEnabled] = useState(true);

  const { data, isLoading, isFetching, refetch, error } = useQuery({
    queryKey: ["validate-ai-billing", from, to],
    enabled,
    queryFn: async (): Promise<ValidationResult> => {
      const { data, error } = await supabase.functions.invoke("validate-ai-billing", {
        body: { from: new Date(from).toISOString(), to: new Date(to + "T23:59:59").toISOString() },
      });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-4">
      <LLMMappingAuditCard />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            Validação de Cobrança de IA
          </CardTitle>
          <CardDescription>
            Confere se cada entrevista de voz e chamada de IA do módulo R&S registrou tokens e debitou créditos.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div>
            <Label className="text-xs">De</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9" />
          </div>
          <div>
            <Label className="text-xs">Até</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9" />
          </div>
          <Button onClick={() => { setEnabled(true); refetch(); }} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
            Rodar validação
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{(error as Error).message}</AlertDescription>
        </Alert>
      )}

      {isLoading && <Skeleton className="h-64" />}

      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Metric
              label="Entrevistas concluídas"
              value={String(data.summary.interviews_total)}
              sub={`${data.summary.interviews_with_token_usage} com tokens · ${data.summary.interviews_with_debit} com débito`}
              ok={
                data.summary.interviews_total === 0 ||
                (data.summary.interviews_with_token_usage === data.summary.interviews_total &&
                  data.summary.interviews_with_debit === data.summary.interviews_total)
              }
            />
            <Metric
              label="Chamadas IA (R&S)"
              value={String(data.summary.ai_exec_total)}
              sub={`${data.summary.ai_exec_with_tokens} com tokens registrados`}
              ok={data.summary.ai_exec_total === 0 || data.summary.ai_exec_with_tokens > 0}
            />
            <Metric
              label="Custo OpenAI (USD)"
              value={`$${data.summary.total_cost_usd.toFixed(2)}`}
              sub={`Esperado: ${data.summary.expected_credits_from_usd.toFixed(1)} créditos`}
            />
            <Metric
              label="Créditos debitados"
              value={`${data.summary.total_interview_credits_debited.toFixed(1)}`}
              sub={
                data.summary.reconciliation_gap_pct !== null
                  ? `Gap vs esperado: ${data.summary.reconciliation_gap_pct.toFixed(1)}%`
                  : "—"
              }
              ok={
                data.summary.reconciliation_gap_pct === null ||
                Math.abs(data.summary.reconciliation_gap_pct) <= 15
              }
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                {data.anomalies.length === 0 ? (
                  <><CheckCircle2 className="h-4 w-4 text-green-600" /> Nenhuma anomalia</>
                ) : (
                  <><AlertTriangle className="h-4 w-4 text-amber-600" /> Anomalias ({data.anomalies.length})</>
                )}
              </CardTitle>
            </CardHeader>
            {data.anomalies.length > 0 && (
              <CardContent className="space-y-2 max-h-64 overflow-auto">
                {data.anomalies.map((a, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm border-l-2 pl-2"
                       style={{ borderColor: a.severity === "high" ? "hsl(var(--destructive))" : "hsl(45 90% 50%)" }}>
                    <Badge variant={a.severity === "high" ? "destructive" : "secondary"}>
                      {a.severity === "high" ? "Alto" : "Médio"}
                    </Badge>
                    <span className="flex-1">{a.message}</span>
                  </div>
                ))}
              </CardContent>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Entrevistas no período</CardTitle>
              <CardDescription>
                Cobertura de token usage + débito de crédito por sessão.
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-auto max-h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quando</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Duração</TableHead>
                    <TableHead className="text-right">Tokens in/out</TableHead>
                    <TableHead className="text-right">USD</TableHead>
                    <TableHead className="text-right">Crédito</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.interviews.map((r) => (
                    <TableRow key={`${r.type}-${r.session_id}`}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {r.completed_at ? new Date(r.completed_at).toLocaleString("pt-BR") : "—"}
                      </TableCell>
                      <TableCell><Badge variant="outline">{r.type}</Badge></TableCell>
                      <TableCell className="text-right">{r.duration_seconds}s</TableCell>
                      <TableCell className="text-right text-xs">
                        {r.audio_input_tokens != null ? `${r.audio_input_tokens}/${r.audio_output_tokens}` : "—"}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {r.total_cost_usd != null ? `$${Number(r.total_cost_usd).toFixed(3)}` : "—"}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {r.debit_amount != null ? `${r.debit_amount}` : "—"}
                      </TableCell>
                      <TableCell>
                        {r.has_token_usage && r.has_debit ? (
                          <Badge className="bg-green-600/15 text-green-700 border-green-600/30">OK</Badge>
                        ) : (
                          <Badge variant="destructive">
                            {!r.has_token_usage ? "sem tokens" : "sem débito"}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {data.interviews.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">Sem entrevistas no período.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Execuções de IA (últimas 100)</CardTitle>
            </CardHeader>
            <CardContent className="overflow-auto max-h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quando</TableHead>
                    <TableHead>Função</TableHead>
                    <TableHead>Modelo</TableHead>
                    <TableHead className="text-right">Tokens</TableHead>
                    <TableHead className="text-right">USD</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.ai_executions.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {new Date(l.created_at).toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-xs">{l.function_name}</TableCell>
                      <TableCell className="text-xs">{l.model ?? "—"}</TableCell>
                      <TableCell className="text-right text-xs">
                        {l.tokens_used ?? <span className="text-amber-600">—</span>}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {l.estimated_cost != null ? `$${Number(l.estimated_cost).toFixed(4)}` : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function Metric({ label, value, sub, ok }: { label: string; value: string; sub?: string; ok?: boolean }) {
  return (
    <div className={`border rounded-md p-3 ${ok === false ? "border-destructive/50 bg-destructive/5" : ok === true ? "border-green-600/30 bg-green-600/5" : ""}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}
