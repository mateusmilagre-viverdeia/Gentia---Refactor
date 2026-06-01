import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldAlert, CheckCircle2, AlertCircle, Clock, FlaskConical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatBRT } from "@/lib/datetime";
import { useInterviewDebugData } from "@/hooks/useInterviewDebugData";

export default function InterviewDebugPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [checking, setChecking] = useState(true);
  const { data, isLoading, error, refetch } = useInterviewDebugData(sessionId);

  useEffect(() => {
    (async () => {
      if (!user) { setChecking(false); return; }
      const { data } = await supabase.rpc("is_super_admin", { _user_id: user.id });
      setIsSuperAdmin(data === true);
      setChecking(false);
    })();
  }, [user]);

  if (authLoading || checking) {
    return <AppLayout title="Diagnóstico"><div className="flex justify-center p-12"><Loader2 className="h-6 w-6 animate-spin" /></div></AppLayout>;
  }
  if (!isSuperAdmin) {
    return (
      <AppLayout title="Diagnóstico">
        <Card className="max-w-md mx-auto mt-12"><CardContent className="pt-6 text-center space-y-3">
          <ShieldAlert className="h-10 w-10 text-destructive mx-auto" />
          <p className="font-medium">Acesso restrito a Super Admins</p>
          <Button onClick={() => navigate("/")} variant="outline">Voltar</Button>
        </CardContent></Card>
      </AppLayout>
    );
  }

  const s = data?.session;
  const isTest = s?.is_test === true;
  const meta = (s?.metadata as Record<string, any>) || {};
  const durationSec = s?.duration_seconds ?? (s?.started_at && s?.completed_at
    ? Math.round((+new Date(s.completed_at) - +new Date(s.started_at)) / 1000)
    : null);

  return (
    <AppLayout
      title="Diagnóstico da entrevista"
      breadcrumb={[{ label: "Administração", href: "/admin/dashboard" }, { label: "Entrevistas", href: "/admin/voice-interviews" }, { label: "Diagnóstico" }]}
    >
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {isLoading && <div className="flex justify-center p-12"><Loader2 className="h-6 w-6 animate-spin" /></div>}
        {error && <Card><CardContent className="pt-6 text-destructive">Erro: {(error as Error).message}</CardContent></Card>}
        {data && s && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    Sessão {sessionId?.slice(0, 8)}…
                    {isTest ? (
                      <Badge variant="outline" className="gap-1 border-amber-500 text-amber-600">
                        <FlaskConical className="h-3 w-3" /> SIMULAÇÃO
                      </Badge>
                    ) : (
                      <Badge variant="default">PRODUÇÃO</Badge>
                    )}
                    <Badge variant={s.status === "completed" ? "default" : s.status === "abandoned" ? "destructive" : "secondary"}>
                      {s.status}
                    </Badge>
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    {data.candidate?.full_name || "—"} · {data.job?.title || "—"}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => refetch()}>Atualizar</Button>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div><p className="text-xs text-muted-foreground">Iniciada</p><p>{s.started_at ? formatBRT(s.started_at) : "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Última atividade</p><p>{s.last_activity_at ? formatBRT(s.last_activity_at) : "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Finalizada</p><p>{s.completed_at ? formatBRT(s.completed_at) : "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Duração</p><p>{durationSec ? `${Math.floor(durationSec / 60)}m ${durationSec % 60}s` : "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Score</p><p className="font-semibold">{s.matching_score != null ? Number(s.matching_score).toFixed(1) : "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Tentativa</p><p>{s.attempt_number ?? 1}</p></div>
                <div><p className="text-xs text-muted-foreground">Cobertura</p><p className="font-semibold">{data.covered}/{data.total}</p></div>
                <div><p className="text-xs text-muted-foreground">Natural</p><p>{s.completed_naturally === true ? "Sim" : s.completed_naturally === false ? "Não" : "—"}</p></div>
              </CardContent>
            </Card>

            {meta.partial_coverage && (
              <Card className="border-amber-500">
                <CardContent className="pt-4 text-sm">
                  <p className="font-medium text-amber-700 flex items-center gap-2"><AlertCircle className="h-4 w-4" />Encerrada com cobertura parcial</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {meta.partial_coverage.covered}/{meta.partial_coverage.total} · forçada por {meta.partial_coverage.forced_by} em {formatBRT(meta.partial_coverage.forced_at)}
                  </p>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader><CardTitle className="text-base">Perguntas ({data.covered}/{data.total})</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-1 text-sm">
                  {data.questions.map((q: any, i: number) => {
                    const covered = !data.missing.find((m) => m.index === i);
                    return (
                      <li key={i} className="flex items-start gap-2">
                        {covered ? <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" /> : <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />}
                        <span className={covered ? "" : "text-muted-foreground"}>P{i + 1}. {q.question_text || `Pergunta ${i + 1}`}</span>
                      </li>
                    );
                  })}
                  {data.questions.length === 0 && <li className="text-muted-foreground">Sem perguntas configuradas</li>}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Linha do tempo</CardTitle></CardHeader>
              <CardContent>
                <ol className="space-y-3">
                  {data.timeline.map((e, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm">
                      <div className="text-xs text-muted-foreground w-32 shrink-0 flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {formatBRT(e.ts)}
                      </div>
                      <div className="flex-1">
                        <p className={e.kind === "anomaly" ? "text-amber-700 font-medium" : "font-medium"}>{e.label}</p>
                        {e.detail && <p className="text-xs text-muted-foreground line-clamp-2">{e.detail}</p>}
                        {e.payload && (
                          <pre className="text-[10px] bg-muted p-2 rounded mt-1 overflow-x-auto">{JSON.stringify(e.payload, null, 2)}</pre>
                        )}
                      </div>
                    </li>
                  ))}
                  {data.timeline.length === 0 && <li className="text-muted-foreground text-sm">Sem eventos</li>}
                </ol>
              </CardContent>
            </Card>

            {data.anomalies.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">Anomalias ({data.anomalies.length})</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {data.anomalies.map((a) => (
                    <div key={a.id} className="border-l-2 border-amber-500 pl-3">
                      <p className="font-medium">{a.rule_code} <Badge variant="outline" className="ml-1 text-xs">{a.severity}</Badge></p>
                      <p className="text-xs text-muted-foreground">{a.description}</p>
                      {a.metrics && <pre className="text-[10px] bg-muted p-2 rounded mt-1 overflow-x-auto">{JSON.stringify(a.metrics, null, 2)}</pre>}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader><CardTitle className="text-base">Avaliação</CardTitle></CardHeader>
              <CardContent className="text-sm space-y-2">
                {s.matching_analysis ? (
                  <pre className="whitespace-pre-wrap text-xs bg-muted p-3 rounded max-h-80 overflow-y-auto font-sans">{s.matching_analysis}</pre>
                ) : <p className="text-muted-foreground">Sem análise registrada</p>}
                {s.audio_url && <a href={s.audio_url} target="_blank" rel="noreferrer" className="text-primary text-xs underline">Abrir áudio</a>}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}
