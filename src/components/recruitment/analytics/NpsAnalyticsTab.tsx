import { useMemo, useState } from "react";
import { useNpsMetrics, useResolveNpsAlert, type NpsEnriched } from "@/hooks/useNps";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, BarChart, Bar, Cell } from "recharts";
import { Smile, Meh, Frown, AlertTriangle, MessageSquare } from "lucide-react";
import { parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { formatBRT } from "@/lib/datetime";

const categoryColor = (cat: string | null) => {
  if (cat === "promoter") return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30";
  if (cat === "neutral") return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/30";
  if (cat === "detractor") return "bg-destructive/10 text-destructive border-destructive/30";
  return "bg-muted";
};

const scoreColor = (score: number) => {
  if (score >= 50) return "text-green-600";
  if (score >= 0) return "text-yellow-600";
  return "text-destructive";
};

export function NpsAnalyticsTab() {
  const { metrics, monthly, byStage, list } = useNpsMetrics();
  const isLoading = list === undefined;
  const resolveAlert = useResolveNpsAlert();
  const [resolveTarget, setResolveTarget] = useState<NpsEnriched | null>(null);
  const [resolveNote, setResolveNote] = useState("");

  const detractors = useMemo(
    () => list.filter((n) => n.category === "detractor" && !n.alert_resolved && n.send_status === "answered"),
    [list]
  );

  const recentFeedbacks = useMemo(
    () => list.filter((n) => n.send_status === "answered").slice(0, 10),
    [list]
  );

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="space-y-6">
      {/* Cards de métricas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">NPS Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn("text-4xl font-bold", scoreColor(metrics.score))}>
              {metrics.score > 0 ? "+" : ""}{metrics.score}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{metrics.total_answered} respostas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Taxa de resposta</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{Math.round(metrics.response_rate * 100)}%</div>
            <p className="text-xs text-muted-foreground mt-1">{metrics.total_answered}/{metrics.total_sent} enviadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Detratores ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-destructive">{detractors.length}</div>
            <p className="text-xs text-muted-foreground mt-1">aguardando resolução</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Distribuição</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-10 rounded-md overflow-hidden bg-muted">
              {metrics.detractors_pct > 0 && (
                <div className="bg-destructive flex items-center justify-center text-xs font-bold text-destructive-foreground" style={{ width: `${metrics.detractors_pct}%` }}>
                  {metrics.detractors_pct}%
                </div>
              )}
              {metrics.neutrals_pct > 0 && (
                <div className="bg-yellow-500 flex items-center justify-center text-xs font-bold text-white" style={{ width: `${metrics.neutrals_pct}%` }}>
                  {metrics.neutrals_pct}%
                </div>
              )}
              {metrics.promoters_pct > 0 && (
                <div className="bg-green-600 flex items-center justify-center text-xs font-bold text-white" style={{ width: `${metrics.promoters_pct}%` }}>
                  {metrics.promoters_pct}%
                </div>
              )}
            </div>
            <div className="flex justify-between text-xs mt-1 text-muted-foreground">
              <span>Det</span><span>Neu</span><span>Pro</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Evolução do NPS (mensal)</CardTitle></CardHeader>
          <CardContent>
            {monthly.length === 0 ? (
              <p className="text-sm text-muted-foreground py-12 text-center">Sem dados suficientes</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={monthly}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis domain={[-100, 100]} className="text-xs" />
                  <Tooltip />
                  <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                  <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">NPS por etapa de saída</CardTitle></CardHeader>
          <CardContent>
            {byStage.length === 0 ? (
              <p className="text-sm text-muted-foreground py-12 text-center">Sem dados suficientes</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={byStage} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" domain={[-100, 100]} className="text-xs" />
                  <YAxis type="category" dataKey="stage" className="text-xs" width={100} />
                  <Tooltip />
                  <Bar dataKey="score">
                    {byStage.map((s, i) => (
                      <Cell key={i} fill={s.score >= 50 ? "hsl(142 71% 45%)" : s.score >= 0 ? "hsl(48 96% 53%)" : "hsl(var(--destructive))"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alertas de detratores */}
      {detractors.length > 0 && (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Alertas de detratores ({detractors.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {detractors.map((d) => (
              <div key={d.id} className="flex items-start justify-between gap-3 p-3 bg-destructive/5 rounded-md border border-destructive/20">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{d.candidate_name}</span>
                    <Badge variant="outline" className="text-destructive border-destructive/40">Nota {d.score}</Badge>
                    <span className="text-xs text-muted-foreground">{d.job_title}</span>
                  </div>
                  {d.feedback_text && (
                    <p className="text-sm text-muted-foreground italic line-clamp-2">"{d.feedback_text}"</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {d.answered_at && formatBRT(parseISO(d.answered_at), "dd/MM/yyyy HH:mm")}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => { setResolveTarget(d); setResolveNote(""); }}>
                  Resolver
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Feedbacks recentes */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Feedbacks recentes</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {recentFeedbacks.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Nenhum feedback ainda</p>
          ) : recentFeedbacks.map((f) => (
            <div key={f.id} className="flex items-start gap-3 p-3 border rounded-md">
              <div className={cn("h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm border-2", categoryColor(f.category))}>
                {f.score}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{f.candidate_name}</span>
                  {f.category === "promoter" && <Smile className="h-4 w-4 text-green-600" />}
                  {f.category === "neutral" && <Meh className="h-4 w-4 text-yellow-600" />}
                  {f.category === "detractor" && <Frown className="h-4 w-4 text-destructive" />}
                  <span className="text-xs text-muted-foreground">{f.job_title}</span>
                </div>
                {f.feedback_text ? (
                  <p className="text-sm text-muted-foreground italic">"{f.feedback_text}"</p>
                ) : (
                  <p className="text-xs text-muted-foreground">Sem comentário adicional</p>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Dialog de resolução */}
      <Dialog open={!!resolveTarget} onOpenChange={(o) => !o && setResolveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolver alerta de detrator</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {resolveTarget?.candidate_name} — Nota {resolveTarget?.score}
            </p>
            {resolveTarget?.feedback_text && (
              <p className="text-sm italic bg-muted p-2 rounded">"{resolveTarget.feedback_text}"</p>
            )}
            <Textarea
              value={resolveNote}
              onChange={(e) => setResolveNote(e.target.value)}
              placeholder="Que ação foi tomada?"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveTarget(null)}>Cancelar</Button>
            <Button
              onClick={async () => {
                if (!resolveTarget) return;
                await resolveAlert.mutateAsync({ id: resolveTarget.id, note: resolveNote });
                setResolveTarget(null);
              }}
              disabled={resolveAlert.isPending}
            >
              Marcar como resolvido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
