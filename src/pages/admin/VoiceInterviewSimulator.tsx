import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Loader2, Play, CheckCircle2, AlertTriangle, XCircle, FlaskConical } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatBRT } from "@/lib/datetime";


type Persona = "balanced" | "short" | "evasive" | "detailed";

interface Job {
  id: string;
  title: string;
  account_id: string;
}

interface SimulationRow {
  id: string;
  job_id: string;
  persona: string;
  status: string;
  questions_total: number;
  questions_covered: number;
  adherence_score: number | null;
  turns_count: number;
  duration_ms: number | null;
  created_at: string;
  error_message: string | null;
}

interface SimulationDetail extends SimulationRow {
  transcript: Array<{ role: "interviewer" | "candidate"; text: string; ts: number }>;
  coverage_map: Array<{ id: string; position: number; question: string; covered: boolean }>;
  deviations: Array<{ id: string; position: number; question: string }>;
}

export default function VoiceInterviewSimulator() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobId, setJobId] = useState<string>("");
  const [persona, setPersona] = useState<Persona>("balanced");
  const [candidateName, setCandidateName] = useState("Candidato Teste");
  const [running, setRunning] = useState(false);
  const [history, setHistory] = useState<SimulationRow[]>([]);
  const [selected, setSelected] = useState<SimulationDetail | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const loadJobs = async () => {
    const { data } = await supabase
      .from("recruitment_jobs")
      .select("id, title, account_id")
      .order("created_at", { ascending: false })
      .limit(200);
    setJobs((data ?? []) as Job[]);
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    const { data } = await supabase
      .from("voice_interview_simulations")
      .select("id, job_id, persona, status, questions_total, questions_covered, adherence_score, turns_count, duration_ms, created_at, error_message")
      .order("created_at", { ascending: false })
      .limit(50);
    setHistory((data ?? []) as SimulationRow[]);
    setLoadingHistory(false);
  };

  useEffect(() => {
    loadJobs();
    loadHistory();
  }, []);

  const runSimulation = async () => {
    if (!jobId) {
      toast.error("Selecione uma vaga");
      return;
    }
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("simulate-culture-interview", {
        body: { jobId, persona, candidateName },
      });
      if (error) throw error;
      toast.success(`Simulação ${data.status} — aderência ${(data.adherenceScore * 100).toFixed(0)}%`);
      await loadHistory();
    } catch (e: any) {
      toast.error(e.message || "Falha na simulação");
    } finally {
      setRunning(false);
    }
  };

  const openDetail = async (id: string) => {
    const { data, error } = await supabase
      .from("voice_interview_simulations")
      .select("*")
      .eq("id", id)
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    setSelected(data as unknown as SimulationDetail);
  };

  const jobTitle = (id: string) => jobs.find((j) => j.id === id)?.title ?? id.slice(0, 8);

  const StatusBadge = ({ status }: { status: string }) => {
    if (status === "completed") return <Badge className="bg-emerald-600"><CheckCircle2 className="h-3 w-3 mr-1" />Completa</Badge>;
    if (status === "running") return <Badge variant="secondary"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Rodando</Badge>;
    if (status === "timeout") return <Badge className="bg-amber-600"><AlertTriangle className="h-3 w-3 mr-1" />Timeout</Badge>;
    return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Falhou</Badge>;
  };

  return (
    <AppLayout title="Simulador de Entrevista de Voz">
      <div className="container mx-auto p-6 space-y-6 max-w-6xl">
        <div className="flex items-center gap-3">
          <FlaskConical className="h-7 w-7" />
          <div>
            <h1 className="text-2xl font-bold">Simulador de Entrevista de Voz</h1>
            <p className="text-sm text-muted-foreground">
              Roda uma conversa texto-only com a IA entrevistadora para verificar se ela segue as perguntas estruturadas da vaga. Não usa áudio nem cobra créditos do candidato.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle>Nova simulação</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-4">
            <div className="md:col-span-2">
              <Label>Vaga</Label>
              <Select value={jobId} onValueChange={setJobId}>
                <SelectTrigger><SelectValue placeholder="Selecione uma vaga..." /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {jobs.map((j) => (
                    <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Persona do candidato</Label>
              <Select value={persona} onValueChange={(v) => setPersona(v as Persona)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="balanced">Equilibrada (3-6 frases)</SelectItem>
                  <SelectItem value="short">Curta (1 frase)</SelectItem>
                  <SelectItem value="evasive">Evasiva (sem exemplos)</SelectItem>
                  <SelectItem value="detailed">Detalhada (com exemplos)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Nome simulado</Label>
              <Input value={candidateName} onChange={(e) => setCandidateName(e.target.value)} />
            </div>
            <div className="md:col-span-4">
              <Button onClick={runSimulation} disabled={running || !jobId}>
                {running ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Rodando…</> : <><Play className="h-4 w-4 mr-2" />Rodar simulação</>}
              </Button>
              <span className="text-xs text-muted-foreground ml-3">
                Pode levar 30-90s. A IA conversa com um candidato simulado até cobrir todas as perguntas ou bater o limite.
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Histórico</CardTitle></CardHeader>
          <CardContent>
            {loadingHistory ? <Loader2 className="h-4 w-4 animate-spin" /> : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quando</TableHead>
                    <TableHead>Vaga</TableHead>
                    <TableHead>Persona</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aderência</TableHead>
                    <TableHead className="text-right">Cobertura</TableHead>
                    <TableHead className="text-right">Turnos</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs">{formatBRT(new Date(r.created_at), "dd/MM HH:mm")}</TableCell>
                      <TableCell className="text-xs">{jobTitle(r.job_id)}</TableCell>
                      <TableCell className="text-xs">{r.persona}</TableCell>
                      <TableCell><StatusBadge status={r.status} /></TableCell>
                      <TableCell className="text-right font-mono">{r.adherence_score != null ? `${(r.adherence_score * 100).toFixed(0)}%` : "—"}</TableCell>
                      <TableCell className="text-right font-mono">{r.questions_covered}/{r.questions_total}</TableCell>
                      <TableCell className="text-right font-mono">{r.turns_count}</TableCell>
                      <TableCell><Button variant="ghost" size="sm" onClick={() => openDetail(r.id)}>Ver</Button></TableCell>
                    </TableRow>
                  ))}
                  {history.length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground text-sm py-8">Nenhuma simulação ainda</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Simulação — {selected ? jobTitle(selected.job_id) : ""}</DialogTitle>
            </DialogHeader>
            {selected && (
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Status:</span> <StatusBadge status={selected.status} /></div>
                  <div><span className="text-muted-foreground">Aderência:</span> <b>{selected.adherence_score != null ? `${(selected.adherence_score * 100).toFixed(0)}%` : "—"}</b></div>
                  <div><span className="text-muted-foreground">Cobertura:</span> {selected.questions_covered}/{selected.questions_total}</div>
                  <div><span className="text-muted-foreground">Turnos:</span> {selected.turns_count}</div>
                </div>

                {selected.error_message && (
                  <div className="rounded border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                    Erro: {selected.error_message}
                  </div>
                )}

                <div>
                  <h3 className="font-semibold mb-2">Mapa de cobertura</h3>
                  <div className="space-y-1 text-sm">
                    {selected.coverage_map?.map((c) => (
                      <div key={c.id} className="flex items-start gap-2">
                        {c.covered
                          ? <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                          : <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />}
                        <span className={c.covered ? "" : "text-muted-foreground"}>
                          <b>{c.position}.</b> {c.question}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Transcrição</h3>
                  <div className="space-y-2 text-sm">
                    {selected.transcript?.map((t, i) => (
                      <div key={i} className={`p-2 rounded ${t.role === "interviewer" ? "bg-primary/5 border-l-2 border-primary" : "bg-muted"}`}>
                        <div className="text-xs font-semibold mb-1">{t.role === "interviewer" ? "🤖 Entrevistadora" : "👤 Candidato simulado"}</div>
                        <div className="whitespace-pre-wrap">{t.text}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
