import { useEffect, useMemo, useState } from "react";
import { ConsultoriaLayout } from "@/components/consultoria";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Copy, Link2, Star, AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEPRole } from "@/hooks/useEPRole";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { getPublicSatisfactionUrl } from "@/lib/publicUrl";

const sb = supabase as any;

type Template = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  recurrence_days: number | null;
};

type Question = {
  id: string;
  template_id: string;
  type: "nps" | "stars" | "multiple_choice" | "text";
  question_text: string;
  options: string[] | null;
  is_required: boolean;
  order_index: number;
};

type Invite = {
  id: string;
  token: string;
  consultant_user_id: string;
  client_account_id: string;
  template_id: string;
  status: string;
  source: string;
  created_at: string;
  completed_at: string | null;
};

type ResponseRow = {
  id: string;
  invite_id: string;
  question_id: string;
  value_numeric: number | null;
  value_text: string | null;
  respondent_name: string | null;
  respondent_email: string | null;
  created_at: string;
};

const QUESTION_TYPE_LABELS: Record<string, string> = {
  nps: "NPS (0-10)",
  stars: "Estrelas (1-5)",
  multiple_choice: "Múltipla escolha",
  text: "Texto livre",
};

export default function ConsultoriaAvaliacoes() {
  const { isSuperAdmin, isHeadCS, loading } = useEPRole();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [responses, setResponses] = useState<ResponseRow[]>([]);
  const [consultants, setConsultants] = useState<{ user_id: string; name: string }[]>([]);
  const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const reload = async () => {
    setLoadingData(true);
    const [tplRes, qRes, invRes, respRes, consRes, accRes] = await Promise.all([
      sb.from("consultant_satisfaction_templates").select("*").order("created_at", { ascending: false }),
      sb.from("consultant_satisfaction_questions").select("*").order("order_index"),
      sb.from("consultant_satisfaction_invites").select("*").order("created_at", { ascending: false }),
      sb.from("consultant_satisfaction_responses").select("*").order("created_at", { ascending: false }).limit(500),
      sb.from("ep_consultants").select("id, user_id, name, email").eq("active", true),
      sb.from("companies").select("id, name").order("name"),
    ]);
    setTemplates((tplRes.data ?? []) as Template[]);
    setQuestions((qRes.data ?? []) as Question[]);
    setInvites((invRes.data ?? []) as Invite[]);
    setResponses((respRes.data ?? []) as ResponseRow[]);
    setConsultants(
      (consRes.data ?? []).map((c: any) => ({ user_id: c.user_id, name: c.name || c.email || "Consultor" }))
    );
    setAccounts((accRes.data ?? []) as { id: string; name: string }[]);
    setLoadingData(false);
  };

  useEffect(() => {
    if (isSuperAdmin || isHeadCS) reload();
  }, [isSuperAdmin, isHeadCS]);

  if (loading) {
    return (
      <ConsultoriaLayout>
        <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
      </ConsultoriaLayout>
    );
  }
  if (!isSuperAdmin && !isHeadCS) return <Navigate to="/consultoria" replace />;

  return (
    <ConsultoriaLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Avaliação de Consultores</h1>
          <p className="text-muted-foreground">Pesquisa de satisfação dos clientes sobre nossos consultores.</p>
        </div>

        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="config">Configuração</TabsTrigger>
            <TabsTrigger value="responses">Respostas</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6 mt-6">
            <DashboardTab
              invites={invites}
              responses={responses}
              questions={questions}
              consultants={consultants}
              accounts={accounts}
              loading={loadingData}
            />
          </TabsContent>

          <TabsContent value="config" className="space-y-6 mt-6">
            <ConfigTab
              templates={templates}
              questions={questions}
              consultants={consultants}
              accounts={accounts}
              onChange={reload}
            />
          </TabsContent>

          <TabsContent value="responses" className="space-y-6 mt-6">
            <ResponsesTab
              invites={invites}
              responses={responses}
              questions={questions}
              consultants={consultants}
              accounts={accounts}
            />
          </TabsContent>
        </Tabs>
      </div>
    </ConsultoriaLayout>
  );
}

// ============ DASHBOARD ============

function DashboardTab({ invites, responses, questions, consultants, accounts, loading }: any) {
  const consultantName = (id: string) =>
    consultants.find((c: any) => c.user_id === id)?.name ?? "Consultor";
  const accountName = (id: string) =>
    accounts.find((a: any) => a.id === id)?.name ?? "Cliente";

  const stats = useMemo(() => {
    const npsQids = new Set(questions.filter((q: Question) => q.type === "nps").map((q: Question) => q.id));
    const starQids = new Set(questions.filter((q: Question) => q.type === "stars").map((q: Question) => q.id));

    const npsResp = responses.filter((r: ResponseRow) => npsQids.has(r.question_id) && r.value_numeric != null);
    const starResp = responses.filter((r: ResponseRow) => starQids.has(r.question_id) && r.value_numeric != null);

    const promoters = npsResp.filter((r: ResponseRow) => (r.value_numeric ?? 0) >= 9).length;
    const detractors = npsResp.filter((r: ResponseRow) => (r.value_numeric ?? 0) <= 6).length;
    const npsScore = npsResp.length > 0 ? Math.round(((promoters - detractors) / npsResp.length) * 100) : null;
    const avgStars = starResp.length > 0 ? (starResp.reduce((s: number, r: ResponseRow) => s + (r.value_numeric ?? 0), 0) / starResp.length) : null;

    // ranking per consultant
    const inviteToConsultant: Record<string, string> = {};
    invites.forEach((i: Invite) => { inviteToConsultant[i.id] = i.consultant_user_id; });
    const perConsult: Record<string, { nps: number[]; stars: number[] }> = {};
    responses.forEach((r: ResponseRow) => {
      const cid = inviteToConsultant[r.invite_id];
      if (!cid) return;
      if (!perConsult[cid]) perConsult[cid] = { nps: [], stars: [] };
      if (npsQids.has(r.question_id) && r.value_numeric != null) perConsult[cid].nps.push(r.value_numeric);
      if (starQids.has(r.question_id) && r.value_numeric != null) perConsult[cid].stars.push(r.value_numeric);
    });
    const ranking = Object.entries(perConsult).map(([cid, v]) => {
      const prom = v.nps.filter(n => n >= 9).length;
      const det = v.nps.filter(n => n <= 6).length;
      return {
        consultant_user_id: cid,
        name: consultantName(cid),
        nps: v.nps.length > 0 ? Math.round(((prom - det) / v.nps.length) * 100) : null,
        stars: v.stars.length > 0 ? (v.stars.reduce((a, b) => a + b, 0) / v.stars.length) : null,
        responses: v.nps.length + v.stars.length,
      };
    }).sort((a, b) => (b.nps ?? -999) - (a.nps ?? -999));

    // alerts
    const alerts = responses
      .filter((r: ResponseRow) =>
        (npsQids.has(r.question_id) && (r.value_numeric ?? 99) <= 6) ||
        (starQids.has(r.question_id) && (r.value_numeric ?? 99) <= 2)
      )
      .slice(0, 10);

    return { npsScore, avgStars, totalResponses: responses.length, totalInvites: invites.length, ranking, alerts, npsQids, starQids };
  }, [responses, invites, questions, consultants]);

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardDescription>NPS Global</CardDescription></CardHeader>
          <CardContent><p className="text-3xl font-bold">{stats.npsScore ?? "—"}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Média de estrelas</CardDescription></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold flex items-center gap-2">
              {stats.avgStars != null ? stats.avgStars.toFixed(1) : "—"}
              {stats.avgStars != null && <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Respostas recebidas</CardDescription></CardHeader>
          <CardContent><p className="text-3xl font-bold">{stats.totalResponses}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Convites enviados</CardDescription></CardHeader>
          <CardContent><p className="text-3xl font-bold">{stats.totalInvites}</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ranking de consultores</CardTitle>
          <CardDescription>Comparativo de NPS e estrelas por consultor.</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.ranking.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Sem respostas ainda.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Consultor</TableHead>
                  <TableHead className="text-right">NPS</TableHead>
                  <TableHead className="text-right">Estrelas</TableHead>
                  <TableHead className="text-right">Respostas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.ranking.map((r: any) => (
                  <TableRow key={r.consultant_user_id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-right">{r.nps ?? "—"}</TableCell>
                    <TableCell className="text-right">{r.stars != null ? r.stars.toFixed(1) : "—"}</TableCell>
                    <TableCell className="text-right">{r.responses}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {stats.alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" /> Alertas de notas baixas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Comentário</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.alerts.map((a: ResponseRow) => (
                  <TableRow key={a.id}>
                    <TableCell>{new Date(a.created_at).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell>
                      {stats.npsQids.has(a.question_id) ? "NPS" : "Estrelas"}
                    </TableCell>
                    <TableCell><Badge variant="destructive">{a.value_numeric}</Badge></TableCell>
                    <TableCell className="text-muted-foreground text-sm">{a.respondent_name ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============ CONFIG ============

function ConfigTab({ templates, questions, consultants, accounts, onChange }: any) {
  const [selected, setSelected] = useState<string | null>(templates[0]?.id ?? null);
  useEffect(() => {
    if (!selected && templates[0]?.id) setSelected(templates[0].id);
  }, [templates]);

  const tpl = templates.find((t: Template) => t.id === selected);
  const tplQuestions = questions.filter((q: Question) => q.template_id === selected).sort((a: Question, b: Question) => a.order_index - b.order_index);

  const createTemplate = async () => {
    const { error } = await sb.from("consultant_satisfaction_templates").insert({
      name: "Nova pesquisa",
      description: "",
      is_active: true,
    });
    if (error) toast.error(error.message); else { toast.success("Template criado"); onChange(); }
  };

  const updateTemplate = async (patch: Partial<Template>) => {
    if (!tpl) return;
    const { error } = await sb.from("consultant_satisfaction_templates").update(patch).eq("id", tpl.id);
    if (error) toast.error(error.message); else onChange();
  };

  const deleteTemplate = async () => {
    if (!tpl || !confirm("Excluir este template?")) return;
    const { error } = await sb.from("consultant_satisfaction_templates").delete().eq("id", tpl.id);
    if (error) toast.error(error.message); else { setSelected(null); toast.success("Excluído"); onChange(); }
  };

  return (
    <div className="grid md:grid-cols-[260px_1fr] gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Templates</CardTitle>
          <Button size="sm" onClick={createTemplate}><Plus className="h-4 w-4 mr-1" />Novo</Button>
        </CardHeader>
        <CardContent className="space-y-1 px-2">
          {templates.map((t: Template) => (
            <button
              key={t.id}
              onClick={() => setSelected(t.id)}
              className={`w-full text-left px-3 py-2 rounded-md text-sm ${selected === t.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            >
              <div className="font-medium truncate">{t.name}</div>
              {!t.is_active && <Badge variant="outline" className="mt-1 text-xs">Inativo</Badge>}
            </button>
          ))}
        </CardContent>
      </Card>

      <div className="space-y-6">
        {!tpl ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">Selecione ou crie um template.</CardContent></Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Detalhes do template</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Nome</Label>
                  <Input value={tpl.name} onChange={(e) => updateTemplate({ name: e.target.value })} />
                </div>
                <div>
                  <Label>Descrição</Label>
                  <Textarea value={tpl.description ?? ""} onChange={(e) => updateTemplate({ description: e.target.value })} />
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Switch checked={tpl.is_active} onCheckedChange={(v) => updateTemplate({ is_active: v })} />
                    <Label>Ativo</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label>Recorrência:</Label>
                    <Select
                      value={tpl.recurrence_days?.toString() ?? "manual"}
                      onValueChange={(v) => updateTemplate({ recurrence_days: v === "manual" ? null : parseInt(v) })}
                    >
                      <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">Apenas manual</SelectItem>
                        <SelectItem value="30">A cada 30 dias</SelectItem>
                        <SelectItem value="60">A cada 60 dias</SelectItem>
                        <SelectItem value="90">A cada 90 dias</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <Button variant="destructive" size="sm" onClick={deleteTemplate}>
                    <Trash2 className="h-4 w-4 mr-1" /> Excluir template
                  </Button>
                  <ManualInviteDialog templateId={tpl.id} consultants={consultants} accounts={accounts} onCreated={onChange} />
                </div>
              </CardContent>
            </Card>

            <QuestionEditor templateId={tpl.id} questions={tplQuestions} onChange={onChange} />
          </>
        )}
      </div>
    </div>
  );
}

function QuestionEditor({ templateId, questions, onChange }: { templateId: string; questions: Question[]; onChange: () => void }) {
  const addQuestion = async () => {
    const order = questions.length;
    const { error } = await sb.from("consultant_satisfaction_questions").insert({
      template_id: templateId,
      type: "nps",
      question_text: "Nova pergunta",
      is_required: true,
      order_index: order,
    });
    if (error) toast.error(error.message); else onChange();
  };

  const update = async (id: string, patch: Partial<Question>) => {
    const { error } = await sb.from("consultant_satisfaction_questions").update(patch).eq("id", id);
    if (error) toast.error(error.message); else onChange();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir pergunta?")) return;
    const { error } = await sb.from("consultant_satisfaction_questions").delete().eq("id", id);
    if (error) toast.error(error.message); else onChange();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Perguntas</CardTitle>
          <CardDescription>Configure as perguntas que o cliente responderá.</CardDescription>
        </div>
        <Button onClick={addQuestion} size="sm"><Plus className="h-4 w-4 mr-1" />Adicionar</Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {questions.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhuma pergunta. Adicione a primeira.</p>
        )}
        {questions.map((q, idx) => (
          <Card key={q.id} className="bg-muted/30">
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant="outline">#{idx + 1}</Badge>
                <Button variant="ghost" size="sm" onClick={() => remove(q.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid md:grid-cols-[1fr_200px] gap-3">
                <Input
                  value={q.question_text}
                  onChange={(e) => update(q.id, { question_text: e.target.value })}
                  placeholder="Texto da pergunta"
                />
                <Select value={q.type} onValueChange={(v) => update(q.id, { type: v as Question["type"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(QUESTION_TYPE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {q.type === "multiple_choice" && (
                <Textarea
                  rows={3}
                  placeholder="Uma opção por linha"
                  value={(q.options ?? []).join("\n")}
                  onChange={(e) => update(q.id, { options: e.target.value.split("\n").map(s => s.trim()).filter(Boolean) })}
                />
              )}
              <div className="flex items-center gap-2">
                <Switch checked={q.is_required} onCheckedChange={(v) => update(q.id, { is_required: v })} />
                <Label className="text-sm">Obrigatória</Label>
              </div>
            </CardContent>
          </Card>
        ))}
      </CardContent>
    </Card>
  );
}

function ManualInviteDialog({ templateId, consultants, accounts, onCreated }: any) {
  const [open, setOpen] = useState(false);
  const [consultantId, setConsultantId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [loading, setLoading] = useState(false);
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);

  const create = async () => {
    if (!consultantId || !accountId) {
      toast.error("Selecione consultor e cliente");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-satisfaction-invite", {
        body: { consultant_user_id: consultantId, client_account_id: accountId, template_id: templateId, source: "manual" },
      });
      if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message);
      const token = (data as any).invite.token;
      setCreatedUrl(getPublicSatisfactionUrl(token));
      onCreated();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setOpen(false);
    setCreatedUrl(null);
    setConsultantId("");
    setAccountId("");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm"><Link2 className="h-4 w-4 mr-1" />Gerar link manual</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Gerar link de avaliação</DialogTitle>
          <DialogDescription>Crie um link único para um cliente avaliar um consultor.</DialogDescription>
        </DialogHeader>
        {!createdUrl ? (
          <div className="space-y-4">
            <div>
              <Label>Consultor</Label>
              <Select value={consultantId} onValueChange={setConsultantId}>
                <SelectTrigger><SelectValue placeholder="Selecione o consultor" /></SelectTrigger>
                <SelectContent>
                  {consultants.map((c: any) => (
                    <SelectItem key={c.user_id} value={c.user_id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Cliente</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                <SelectContent>
                  {accounts.map((a: any) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button onClick={create} disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Gerar link
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Link gerado. Compartilhe com o cliente:</p>
            <div className="flex gap-2">
              <Input readOnly value={createdUrl} />
              <Button onClick={() => { navigator.clipboard.writeText(createdUrl); toast.success("Copiado!"); }}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={reset}>Fechar</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ============ RESPONSES ============

function ResponsesTab({ invites, responses, questions, consultants, accounts }: any) {
  const consultantName = (id: string) => consultants.find((c: any) => c.user_id === id)?.name ?? "—";
  const accountName = (id: string) => accounts.find((a: any) => a.id === id)?.name ?? "—";

  const completed = invites.filter((i: Invite) => i.status === "completed");

  const responsesFor = (inviteId: string) => responses.filter((r: ResponseRow) => r.invite_id === inviteId);
  const questionFor = (qid: string) => questions.find((q: Question) => q.id === qid);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Respostas individuais</CardTitle>
        <CardDescription>{completed.length} avaliações completas.</CardDescription>
      </CardHeader>
      <CardContent>
        {completed.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhuma resposta ainda.</p>
        ) : (
          <div className="space-y-4">
            {completed.map((inv: Invite) => {
              const rs = responsesFor(inv.id);
              const respondent = rs[0];
              return (
                <Card key={inv.id} className="bg-muted/20">
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                      <div><span className="text-muted-foreground">Consultor:</span> <strong>{consultantName(inv.consultant_user_id)}</strong></div>
                      <div><span className="text-muted-foreground">Cliente:</span> <strong>{accountName(inv.client_account_id)}</strong></div>
                      <div><span className="text-muted-foreground">Data:</span> {new Date(inv.completed_at ?? inv.created_at).toLocaleDateString("pt-BR")}</div>
                      {respondent?.respondent_name && <div><span className="text-muted-foreground">Respondente:</span> {respondent.respondent_name}</div>}
                    </div>
                    <div className="space-y-2 pt-2 border-t">
                      {rs.map((r: ResponseRow) => {
                        const q = questionFor(r.question_id);
                        if (!q) return null;
                        return (
                          <div key={r.id} className="text-sm">
                            <div className="font-medium">{q.question_text}</div>
                            <div className="text-muted-foreground">
                              {r.value_numeric != null && <Badge variant={r.value_numeric <= 6 && q.type === "nps" ? "destructive" : "secondary"}>{r.value_numeric}</Badge>}
                              {r.value_text && <span>{r.value_text}</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
