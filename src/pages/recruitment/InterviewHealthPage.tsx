import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navigate } from "react-router-dom";

import { RecruitmentLayout } from "@/components/layout/RecruitmentLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { formatBRT } from "@/lib/datetime";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAccount } from "@/hooks/useAccount";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import {
  useVoiceInterviewAnomalies,
  useResolveAnomaly,
  useAnalyseAnomalySession,
  type VoiceInterviewAnomaly,
} from "@/hooks/useVoiceInterviewAnomalies";
import { Activity, AlertTriangle, CheckCircle2, RefreshCw, ShieldAlert } from "lucide-react";

const SEVERITY_LABEL: Record<string, string> = {
  critical: "Crítico",
  warning: "Atenção",
  info: "Info",
};

const RULE_LABEL: Record<string, string> = {
  no_responses_persisted: "Sem respostas salvas",
  low_candidate_audio: "Pouca fala do candidato",
  frequent_ai_interruptions: "IA interrompida com frequência",
  connection_instability: "Instabilidade de conexão",
  response_save_failures: "Falha ao salvar resposta",
  abnormal_disconnect: "Desconexão anormal",
  response_dead_lettered: "Respostas em dead-letter",
};

function severityVariant(s: string) {
  if (s === "critical") return "destructive" as const;
  if (s === "warning") return "secondary" as const;
  return "outline" as const;
}

export default function InterviewHealthPage() {
  const { account, canManage, loading: accountLoading } = useAccount();
  const { isSuperAdmin, loading: superLoading } = useSuperAdmin();
  const [scope, setScope] = useState<"account" | "all">("account");
  const [onlyOpen, setOnlyOpen] = useState(true);
  const [severityFilter, setSeverityFilter] = useState<string>("all");

  const effectiveScope = isSuperAdmin ? scope : "account";
  const { data, isLoading, refetch, isFetching } = useVoiceInterviewAnomalies({
    scope: effectiveScope,
    onlyOpen,
  });

  const resolve = useResolveAnomaly();
  const analyse = useAnalyseAnomalySession();
  const [resolving, setResolving] = useState<VoiceInterviewAnomaly | null>(null);
  const [resolveNote, setResolveNote] = useState("");
  const [recovering, setRecovering] = useState<VoiceInterviewAnomaly | null>(null);

  const filtered = useMemo(() => {
    if (!data) return [] as VoiceInterviewAnomaly[];
    if (severityFilter === "all") return data;
    return data.filter((a) => a.severity === severityFilter);
  }, [data, severityFilter]);

  const stats = useMemo(() => {
    const all = data ?? [];
    return {
      total: all.length,
      critical: all.filter((a) => a.severity === "critical").length,
      warning: all.filter((a) => a.severity === "warning").length,
      cultural: all.filter((a) => a.session_type === "cultural").length,
      technical: all.filter((a) => a.session_type === "technical").length,
    };
  }, [data]);

  if (accountLoading || superLoading) {
    return (
      <RecruitmentLayout>
        <div className="p-6">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </RecruitmentLayout>
    );
  }

  // Access guard — Super Admin OR account admin
  if (!isSuperAdmin && !canManage) {
    return <Navigate to="/atracao-contratacao/recrutamento/interviews" replace />;
  }

  return (
    <RecruitmentLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ShieldAlert className="h-6 w-6 text-destructive" />
              Saúde das Entrevistas IA
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Anomalias detectadas em entrevistas de fit cultural e técnicas (voz). Permite
              identificar bugs, travamentos e problemas de qualidade nas sessões.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard label="Total" value={stats.total} icon={<Activity className="h-4 w-4" />} />
          <StatCard
            label="Críticos"
            value={stats.critical}
            icon={<AlertTriangle className="h-4 w-4 text-destructive" />}
          />
          <StatCard label="Atenção" value={stats.warning} />
          <StatCard label="Culturais" value={stats.cultural} />
          <StatCard label="Técnicas" value={stats.technical} />
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4 flex items-center gap-3 flex-wrap">
            {isSuperAdmin && (
              <Select value={scope} onValueChange={(v) => setScope(v as any)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="account">
                    Apenas {account?.name ?? "minha conta"}
                  </SelectItem>
                  <SelectItem value="all">Todas as contas (Super Admin)</SelectItem>
                </SelectContent>
              </Select>
            )}
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as severidades</SelectItem>
                <SelectItem value="critical">Apenas críticas</SelectItem>
                <SelectItem value="warning">Apenas atenção</SelectItem>
                <SelectItem value="info">Apenas info</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={onlyOpen ? "open" : "all"}
              onValueChange={(v) => setOnlyOpen(v === "open")}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Não resolvidas</SelectItem>
                <SelectItem value="all">Incluir resolvidas</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Anomalias detectadas</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-green-500" />
                Nenhuma anomalia para os filtros selecionados.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quando</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Candidato / Vaga</TableHead>
                    <TableHead>Regra</TableHead>
                    <TableHead>Severidade</TableHead>
                    <TableHead>Detalhes</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((a) => (
                    <TableRow key={a.id} className={a.resolved_at ? "opacity-60" : ""}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {formatBRT(new Date(a.created_at), "dd/MM HH:mm")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {a.session_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="font-medium">
                          {a.candidate_name ?? a.candidate_email ?? "—"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {a.job_title ?? "Vaga não vinculada"}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {RULE_LABEL[a.rule_code] ?? a.rule_code}
                      </TableCell>
                      <TableCell>
                        <Badge variant={severityVariant(a.severity)}>
                          {SEVERITY_LABEL[a.severity] ?? a.severity}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs max-w-md">
                        <div>{a.description}</div>
                        {a.suggestion && (
                          <div className="text-muted-foreground mt-1 italic">
                            → {a.suggestion}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right space-x-2 whitespace-nowrap">
                        {!a.resolved_at && (
                          <>
                            {a.rule_code === "response_dead_lettered" && (
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => setRecovering(a)}
                              >
                                Recuperar transcript
                              </Button>
                            )}
                            {(a.session_type === "cultural" ||
                              a.session_type === "technical") && (
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={analyse.isPending}
                                onClick={() =>
                                  analyse.mutate({
                                    sessionId: a.session_id,
                                    sessionType: a.session_type as "cultural" | "technical",
                                  })
                                }
                              >
                                Reanalisar
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setResolving(a);
                                setResolveNote("");
                              }}
                            >
                              Resolver
                            </Button>
                          </>
                        )}
                        {a.resolved_at && (
                          <span className="text-xs text-muted-foreground">
                            Resolvida{" "}
                            {formatBRT(new Date(a.resolved_at), "dd/MM HH:mm")}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Resolve dialog */}
      <Dialog open={!!resolving} onOpenChange={(open) => !open && setResolving(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marcar anomalia como resolvida</DialogTitle>
            <DialogDescription>
              {resolving && (RULE_LABEL[resolving.rule_code] ?? resolving.rule_code)} —{" "}
              {resolving?.candidate_name ?? resolving?.candidate_email ?? ""}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Nota da resolução (opcional) — ex.: oferecemos nova tentativa, candidato refez com sucesso."
            value={resolveNote}
            onChange={(e) => setResolveNote(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolving(null)}>
              Cancelar
            </Button>
            <Button
              disabled={resolve.isPending}
              onClick={async () => {
                if (!resolving) return;
                await resolve.mutateAsync({
                  id: resolving.id,
                  note: resolveNote.trim() || null,
                });
                setResolving(null);
              }}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeadLetterRecoveryDialog
        anomaly={recovering}
        onClose={() => setRecovering(null)}
      />
    </RecruitmentLayout>
  );
}

function DeadLetterRecoveryDialog({
  anomaly,
  onClose,
}: {
  anomaly: VoiceInterviewAnomaly | null;
  onClose: () => void;
}) {
  const [events, setEvents] = useState<Array<{ id: string; payload: any; created_at: string }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!anomaly) {
      setEvents([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("voice_interview_events")
        .select("id, payload, created_at")
        .eq("session_id", anomaly.session_id)
        .eq("event_type", "response_save_dead_letter")
        .order("created_at", { ascending: true });
      if (!cancelled) {
        setEvents((data ?? []) as any);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [anomaly]);

  return (
    <Dialog open={!!anomaly} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Respostas em dead-letter</DialogTitle>
          <DialogDescription>
            {anomaly?.candidate_name ?? anomaly?.candidate_email ?? ""} —{" "}
            {anomaly?.job_title ?? "vaga"}. Estes transcripts foram capturados pela IA mas não
            chegaram à tabela de respostas. Use-os para reprocessar manualmente ou avaliar a
            entrevista, enquanto não há reprocessador automático.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto space-y-3">
          {loading && <Skeleton className="h-32 w-full" />}
          {!loading && events.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhum evento dead-letter encontrado para esta sessão.
            </p>
          )}
          {events.map((ev) => (
            <Card key={ev.id}>
              <CardContent className="p-4 space-y-2 text-sm">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Q{ev.payload?.questionIndex ?? "?"}</span>
                  <span>{formatBRT(new Date(ev.created_at), "dd/MM HH:mm:ss")}</span>
                </div>
                {ev.payload?.aiQuestionSpoken && (
                  <div>
                    <div className="text-xs font-medium text-muted-foreground">Pergunta da IA</div>
                    <div className="text-sm">{ev.payload.aiQuestionSpoken}</div>
                  </div>
                )}
                <div>
                  <div className="text-xs font-medium text-muted-foreground">Resposta do candidato</div>
                  <div className="text-sm whitespace-pre-wrap">
                    {ev.payload?.candidateResponse ?? "—"}
                  </div>
                </div>
                {ev.payload?.error && (
                  <div className="text-xs text-destructive">Erro: {ev.payload.error}</div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{label}</span>
          {icon}
        </div>
        <div className="text-2xl font-bold mt-1">{value}</div>
      </CardContent>
    </Card>
  );
}
