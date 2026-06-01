import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, ShieldAlert, Mic, Headphones } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatBRT } from "@/lib/datetime";
import {
  useVoiceKPIs, useVoiceDaily, useVoiceRecent, useVoiceByAccount, useVoiceDetail,
  type InterviewType,
} from "@/hooks/useVoiceInterviewMonitoring";

const PERIODS = [
  { value: "7", label: "Últimos 7 dias" },
  { value: "30", label: "Últimos 30 dias" },
  { value: "90", label: "Últimos 90 dias" },
];

function fmtDuration(s: number | null | undefined) {
  if (!s || s <= 0) return "—";
  const m = Math.floor(s / 60), r = s % 60;
  return `${m}m ${String(r).padStart(2, "0")}s`;
}
function pct(n: number, d: number) { return d > 0 ? `${Math.round((n / d) * 100)}%` : "—"; }

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  completed: "default", pending: "secondary", in_progress: "secondary",
  abandoned: "destructive", cancelled: "outline",
};

export default function VoiceInterviewsMonitoring() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [checking, setChecking] = useState(true);
  const [type, setType] = useState<InterviewType>("cultural");
  const [periodDays, setPeriodDays] = useState("30");
  const [detailId, setDetailId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!user) { setChecking(false); return; }
      const { data } = await supabase.rpc("is_super_admin", { _user_id: user.id });
      setIsSuperAdmin(data === true);
      setChecking(false);
    })();
  }, [user]);

  const { start, end } = useMemo(() => {
    const e = new Date();
    const s = new Date(); s.setDate(s.getDate() - parseInt(periodDays, 10));
    return { start: s, end: e };
  }, [periodDays]);

  const filters = { type, start, end };
  const kpis = useVoiceKPIs(filters);
  const daily = useVoiceDaily(filters);
  const recent = useVoiceRecent(filters);
  const byAccount = useVoiceByAccount(filters);
  const detail = useVoiceDetail(type, detailId);

  if (authLoading || checking) {
    return <AppLayout title="Monitoramento de Entrevistas de Voz"><div className="flex justify-center p-12"><Loader2 className="h-6 w-6 animate-spin" /></div></AppLayout>;
  }
  if (!isSuperAdmin) {
    return (
      <AppLayout title="Monitoramento de Entrevistas de Voz">
        <Card className="max-w-md mx-auto mt-12"><CardContent className="pt-6 text-center space-y-3">
          <ShieldAlert className="h-10 w-10 text-destructive mx-auto" />
          <p className="font-medium">Acesso restrito a Super Admins</p>
          <Button onClick={() => navigate("/")} variant="outline">Voltar</Button>
        </CardContent></Card>
      </AppLayout>
    );
  }

  const k = kpis.data;
  const completionRate = k ? pct(k.completed, k.total) : "—";
  const qualifiedRate = k ? pct(k.qualified, k.completed) : "—";
  const abortRate = k ? pct(k.aborted, k.total) : "—";

  return (
    <AppLayout
      title="Monitoramento de Entrevistas de Voz"
      breadcrumb={[{ label: "Administração", href: "/admin/dashboard" }, { label: "Entrevistas de Voz" }]}
    >
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold">Entrevistas de Voz</h1>
            <p className="text-sm text-muted-foreground">Uso da plataforma por conta — Cultural e Técnica.</p>
          </div>
          <Select value={periodDays} onValueChange={setPeriodDays}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>{PERIODS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        <Tabs value={type} onValueChange={(v) => setType(v as InterviewType)}>
          <TabsList>
            <TabsTrigger value="cultural"><Mic className="h-4 w-4 mr-2" />Cultural</TabsTrigger>
            <TabsTrigger value="technical"><Headphones className="h-4 w-4 mr-2" />Técnica</TabsTrigger>
          </TabsList>

          <TabsContent value={type} className="space-y-6 mt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {[
                ["Total", k?.total ?? "—"],
                ["Últimas 24h", k?.last_24h ?? "—"],
                ["% Completas", completionRate],
                ["% Qualificadas", qualifiedRate],
                ["Tempo médio", fmtDuration(k?.avg_duration_seconds)],
                ["Taxa de aborto", abortRate],
                ["Contas ativas", k?.active_accounts ?? "—"],
              ].map(([label, val]) => (
                <Card key={label as string}><CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-2xl font-semibold mt-1">{kpis.isLoading ? "…" : val}</p>
                </CardContent></Card>
              ))}
            </div>

            <Card>
              <CardHeader><CardTitle className="text-base">Volume diário</CardTitle></CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={daily.data || []}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="total" name="Iniciadas" stroke="hsl(var(--primary))" strokeWidth={2} />
                      <Line type="monotone" dataKey="completed" name="Completas" stroke="hsl(var(--chart-2, 142 70% 45%))" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Últimas 50 entrevistas</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Quando</TableHead><TableHead>Conta</TableHead><TableHead>Candidato</TableHead>
                    <TableHead>Vaga</TableHead><TableHead>Status</TableHead><TableHead>Duração</TableHead>
                    <TableHead>Score</TableHead>{type === "technical" && <TableHead>Recom.</TableHead>}
                  </TableRow></TableHeader>
                  <TableBody>
                    {recent.isLoading && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">Carregando…</TableCell></TableRow>}
                    {!recent.isLoading && (recent.data?.length ?? 0) === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">Sem entrevistas no período.</TableCell></TableRow>}
                    {recent.data?.map(r => (
                      <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setDetailId(r.id)}>
                        <TableCell className="text-xs">{formatBRT(r.created_at)}</TableCell>
                        <TableCell className="text-sm">{r.account_name || "—"}</TableCell>
                        <TableCell className="text-sm">{r.candidate_name || `Candidato #${r.candidate_id?.slice(0, 6) || "?"}`}</TableCell>
                        <TableCell className="text-sm">{r.job_title || "—"}</TableCell>
                        <TableCell><Badge variant={STATUS_VARIANT[r.status] || "outline"}>{r.status}</Badge></TableCell>
                        <TableCell className="text-sm">{fmtDuration(r.duration_seconds)}</TableCell>
                        <TableCell className="text-sm">{r.score != null ? Number(r.score).toFixed(1) : "—"}</TableCell>
                        {type === "technical" && <TableCell className="text-xs">{r.recommendation || "—"}</TableCell>}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Uso por conta</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Conta</TableHead><TableHead>Total</TableHead><TableHead>Completas</TableHead>
                    <TableHead>% Compl.</TableHead><TableHead>% Qualif.</TableHead>
                    <TableHead>Tempo médio</TableHead><TableHead>Última atividade</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {byAccount.isLoading && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">Carregando…</TableCell></TableRow>}
                    {byAccount.data?.map(a => (
                      <TableRow key={a.account_id ?? "null"} className={a.total === 0 ? "opacity-60" : ""}>
                        <TableCell className="text-sm">{a.account_name || "—"}</TableCell>
                        <TableCell>{a.total}</TableCell>
                        <TableCell>{a.completed}</TableCell>
                        <TableCell>{pct(a.completed, a.total)}</TableCell>
                        <TableCell>{pct(a.qualified, a.completed)}</TableCell>
                        <TableCell>{fmtDuration(a.avg_duration_seconds)}</TableCell>
                        <TableCell className="text-xs">{a.last_activity_at ? formatBRT(a.last_activity_at) : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={!!detailId} onOpenChange={(o) => !o && setDetailId(null)}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Resumo da entrevista</DialogTitle></DialogHeader>
            {detail.isLoading && <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>}
            {detail.data && (
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div><p className="text-xs text-muted-foreground">Conta</p><p>{detail.data.account_name || "—"}</p></div>
                  <div><p className="text-xs text-muted-foreground">Vaga</p><p>{detail.data.job_title || "—"}</p></div>
                  <div><p className="text-xs text-muted-foreground">Candidato</p><p>{detail.data.candidate_name || "—"}</p></div>
                  <div><p className="text-xs text-muted-foreground">Quando</p><p>{formatBRT(detail.data.created_at)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Status</p><Badge variant={STATUS_VARIANT[detail.data.status] || "outline"}>{detail.data.status}</Badge></div>
                  <div><p className="text-xs text-muted-foreground">Duração</p><p>{fmtDuration(detail.data.duration_seconds)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Score</p><p>{detail.data.score != null ? Number(detail.data.score).toFixed(1) : "—"}</p></div>
                  <div><p className="text-xs text-muted-foreground">Recomendação</p><p>{detail.data.recommendation || "—"}</p></div>
                </div>
                {detail.data.summary && (<div><p className="text-xs text-muted-foreground mb-1">Resumo</p><p className="whitespace-pre-wrap">{detail.data.summary}</p></div>)}
                {detail.data.transcript && (<div><p className="text-xs text-muted-foreground mb-1">Transcript</p><pre className="text-xs bg-muted p-3 rounded whitespace-pre-wrap font-sans max-h-80 overflow-y-auto">{detail.data.transcript}</pre></div>)}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
