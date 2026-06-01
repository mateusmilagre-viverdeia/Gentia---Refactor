import { useEffect, useState } from "react";
import { RecruitmentLayout } from "@/components/layout/RecruitmentLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatBRT } from "@/lib/datetime";

interface SessionRow {
  id: string;
  status: string;
  is_test: boolean;
  questions_total: number | null;
  questions_covered: number | null;
  matching_score: number | null;
  created_at: string;
  job: { id: string; title: string } | null;
  candidate: { first_name: string; last_name: string | null } | null;
  partial_transcript: string | null;
  coverage_log: Array<{ question_index: number; start_seconds?: number }> | null;
}

interface AggregateRow {
  question_index: number;
  label: string;
  sessions_covered: number;
  sessions_total: number;
  coverage_pct: number;
}

export default function CultureAdherenceAuditPage() {
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [aggregate, setAggregate] = useState<AggregateRow[]>([]);
  const [onlyTest, setOnlyTest] = useState(false);
  const [selected, setSelected] = useState<SessionRow | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/audit-culture-adherence?limit=100&onlyTest=${onlyTest}`,
        {
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        },
      );
      const json = await res.json();
      setSessions(json.sessions || []);
      setAggregate(json.aggregate || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [onlyTest]);

  const coveragePct = (s: SessionRow) =>
    s.questions_total ? Math.round(((s.questions_covered || 0) / s.questions_total) * 100) : 0;

  return (
    <RecruitmentLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Auditoria — Aderência IA Cultural</h1>
            <p className="text-muted-foreground text-sm">
              % de perguntas estruturadas efetivamente cobertas pela IA em cada sessão.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant={onlyTest ? "default" : "outline"} size="sm" onClick={() => setOnlyTest(!onlyTest)}>
              {onlyTest ? "Mostrando só simulações" : "Mostrar só simulações"}
            </Button>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Atualizar"}
            </Button>
          </div>
        </div>

        {aggregate.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Perguntas com menor cobertura (todas as sessões abaixo)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {aggregate.slice(0, 8).map((a) => (
                  <div key={a.question_index} className="border rounded p-3">
                    <div className="text-xs text-muted-foreground">{a.label}</div>
                    <div className="text-2xl font-bold">{a.coverage_pct}%</div>
                    <div className="text-xs text-muted-foreground">
                      {a.sessions_covered}/{a.sessions_total} sessões
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle className="text-base">Sessões recentes</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Vaga</TableHead>
                  <TableHead>Candidato</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Cobertura</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((s) => {
                  const pct = coveragePct(s);
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="text-xs">{formatBRT(new Date(s.created_at), "dd/MM HH:mm")}</TableCell>
                      <TableCell className="text-sm">{s.job?.title || "—"}</TableCell>
                      <TableCell className="text-sm">
                        {s.candidate ? `${s.candidate.first_name} ${s.candidate.last_name || ""}` : "—"}
                      </TableCell>
                      <TableCell>
                        {s.is_test ? <Badge variant="secondary">Simulação</Badge> : <Badge>Real</Badge>}
                      </TableCell>
                      <TableCell><Badge variant="outline">{s.status}</Badge></TableCell>
                      <TableCell className="text-right">
                        <span className={pct < 70 ? "text-destructive font-semibold" : pct < 100 ? "text-amber-600" : "text-green-600"}>
                          {s.questions_covered ?? 0}/{s.questions_total ?? 0} ({pct}%)
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => setSelected(s)}>
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!loading && sessions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      Nenhuma sessão encontrada.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {selected && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span>Detalhe: {selected.job?.title}</span>
                <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>Fechar</Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-xs text-muted-foreground">
                Cobertura: {selected.questions_covered ?? 0}/{selected.questions_total ?? 0} · Status: {selected.status} · {selected.is_test ? "Simulação" : "Real"}
              </div>
              <div>
                <div className="text-sm font-semibold mb-1">Coverage log</div>
                <div className="text-xs bg-muted rounded p-2 max-h-32 overflow-auto">
                  {(selected.coverage_log || []).map((c, i) => (
                    <div key={i}>Pergunta {c.question_index + 1} @ {c.start_seconds ?? "?"}s</div>
                  ))}
                  {(selected.coverage_log || []).length === 0 && <span className="text-muted-foreground">vazio</span>}
                </div>
              </div>
              <div>
                <div className="text-sm font-semibold mb-1">Transcript</div>
                <pre className="text-xs bg-muted rounded p-2 max-h-96 overflow-auto whitespace-pre-wrap">
                  {selected.partial_transcript || "(sem transcript)"}
                </pre>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </RecruitmentLayout>
  );
}
