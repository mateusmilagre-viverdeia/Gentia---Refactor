import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ArrowRight, Sparkles, Loader2, ClipboardList, Eye, Rocket, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const SENIORITIES = ["Júnior", "Pleno", "Sênior", "Especialista", "Coordenador", "Gerente", "Diretor", "C-Level"];

type Form = {
  job_title: string;
  seniority: string;
  area: string;
  industry: string;
  city: string;
  state: string;
  work_model: string;
  skills: string;
  competitors: string;
  reference_urls: string;
  briefing_notes: string;
  consultancy_name: string;
  client_name: string;
  primary_color: string;
};

const STEPS = [
  { id: 1, title: "Briefing", description: "Cargo, contexto e referências", icon: ClipboardList },
  { id: 2, title: "Revisão", description: "Confira os dados antes de gerar", icon: Eye },
  { id: 3, title: "Geração", description: "IA monta seu relatório premium", icon: Rocket },
];

export default function PesquisaMercadoNovo() {
  const navigate = useNavigate();
  const { currentOrganization } = useOrganization();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<Form>({
    job_title: "",
    seniority: "Pleno",
    area: "",
    industry: "",
    city: "",
    state: "",
    work_model: "Híbrido",
    skills: "",
    competitors: "",
    reference_urls: "",
    briefing_notes: "",
    consultancy_name: "",
    client_name: "",
    primary_color: "#3B82F6",
  });

  const update = (k: keyof Form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const skillsList = useMemo(() => form.skills.split(",").map((s) => s.trim()).filter(Boolean), [form.skills]);
  const competitorsList = useMemo(() => form.competitors.split(",").map((s) => s.trim()).filter(Boolean), [form.competitors]);
  const urlsList = useMemo(
    () => form.reference_urls.split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 5),
    [form.reference_urls]
  );

  const canAdvanceFromStep1 = form.job_title.trim().length > 0 && form.seniority.trim().length > 0;

  const goNext = () => {
    if (step === 1 && !canAdvanceFromStep1) {
      toast.error("Preencha cargo e senioridade");
      return;
    }
    setStep((s) => Math.min(3, s + 1));
  };
  const goBack = () => setStep((s) => Math.max(1, s - 1));

  const submit = async () => {
    if (!currentOrganization?.id) {
      toast.error("Organização não identificada");
      return;
    }
    setSubmitting(true);
    setStep(3);
    try {
      const { data, error } = await supabase.functions.invoke("generate-market-research", {
        body: {
          account_id: currentOrganization.id,
          job_title: form.job_title,
          seniority: form.seniority,
          area: form.area || null,
          industry: form.industry || null,
          location: { city: form.city, state: form.state, country: "Brasil", work_model: form.work_model },
          required_skills: skillsList,
          competitors: competitorsList,
          reference_urls: urlsList,
          briefing_notes: form.briefing_notes,
          branding: {
            consultancy_name: form.consultancy_name,
            client_name: form.client_name,
            primary_color: form.primary_color,
          },
        },
      });
      if (error) {
        // Tenta extrair payload do edge function (status 402 = saldo insuficiente)
        const ctx: any = (error as any).context;
        let parsed: any = null;
        try {
          if (ctx?.body) parsed = typeof ctx.body === "string" ? JSON.parse(ctx.body) : ctx.body;
          else if (typeof ctx?.json === "function") parsed = await ctx.json();
        } catch { /* ignore */ }
        if (parsed?.code === "INSUFFICIENT_CREDITS" || ctx?.status === 402) {
          toast.error(parsed?.error || "Saldo insuficiente para gerar a pesquisa.", {
            action: { label: "Comprar créditos", onClick: () => navigate("/configuracoes/creditos") },
          });
          setStep(2);
          return;
        }
        throw error;
      }
      toast.success("Relatório iniciado! A geração leva 3-6 minutos.");
      navigate(`/atracao-contratacao/recrutamento/pesquisa-mercado/${data.id}`);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Erro ao iniciar geração");
      setStep(2);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
      </Button>

      <div className="mb-2 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold">Nova Pesquisa de Mercado</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-8">
        Relatório premium com IA + dados internos. Tempo estimado: 3-6 minutos. O custo em créditos varia conforme o escopo da pesquisa e é debitado conforme o uso real da IA. É necessário ter pelo menos 20 créditos disponíveis para iniciar.
      </p>

      {/* Stepper */}
      <div className="mb-8">
        <div className="flex items-center justify-between gap-2">
          {STEPS.map((s, idx) => {
            const Icon = s.icon;
            const isActive = step === s.id;
            const isDone = step > s.id;
            return (
              <div key={s.id} className="flex items-center gap-3 flex-1">
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                    isDone && "bg-primary border-primary text-primary-foreground",
                    isActive && "border-primary text-primary",
                    !isActive && !isDone && "border-muted-foreground/30 text-muted-foreground"
                  )}
                >
                  {isDone ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <div className="hidden sm:block flex-1">
                  <div className={cn("text-sm font-semibold", isActive ? "text-foreground" : "text-muted-foreground")}>
                    Etapa {s.id} · {s.title}
                  </div>
                  <div className="text-xs text-muted-foreground">{s.description}</div>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={cn("h-px flex-1 mx-1", step > s.id ? "bg-primary" : "bg-border")} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* STEP 1 — Briefing */}
      {step === 1 && (
        <Card className="p-6 space-y-8">
          <section>
            <h2 className="font-semibold mb-3">Briefing do cargo</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Label>Cargo *</Label>
                <Input value={form.job_title} onChange={(e) => update("job_title", e.target.value)} placeholder="Ex: Head of Sales B2B" />
              </div>
              <div>
                <Label>Senioridade *</Label>
                <Select value={form.seniority} onValueChange={(v) => update("seniority", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SENIORITIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Área</Label>
                <Input value={form.area} onChange={(e) => update("area", e.target.value)} placeholder="Comercial" />
              </div>
              <div className="sm:col-span-2">
                <Label>Skills-chave (separadas por vírgula)</Label>
                <Input value={form.skills} onChange={(e) => update("skills", e.target.value)} placeholder="Vendas consultivas, SaaS, gestão de pipeline" />
              </div>
            </div>
          </section>

          <Separator />

          <section>
            <h2 className="font-semibold mb-3">Contexto de mercado</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Setor</Label>
                <Input value={form.industry} onChange={(e) => update("industry", e.target.value)} placeholder="SaaS B2B" />
              </div>
              <div>
                <Label>Modelo de trabalho</Label>
                <Select value={form.work_model} onValueChange={(v) => update("work_model", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Remoto">Remoto</SelectItem>
                    <SelectItem value="Híbrido">Híbrido</SelectItem>
                    <SelectItem value="Presencial">Presencial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Cidade</Label>
                <Input value={form.city} onChange={(e) => update("city", e.target.value)} placeholder="São Paulo" />
              </div>
              <div>
                <Label>Estado</Label>
                <Input value={form.state} onChange={(e) => update("state", e.target.value)} placeholder="SP" />
              </div>
            </div>
          </section>

          <Separator />

          <section>
            <h2 className="font-semibold mb-3">Concorrentes & referências</h2>
            <div className="space-y-3">
              <div>
                <Label>Concorrentes (até 5, separados por vírgula)</Label>
                <Input value={form.competitors} onChange={(e) => update("competitors", e.target.value)} placeholder="Nubank, Stone, PagSeguro" />
              </div>
              <div>
                <Label>URLs de vagas para análise (uma por linha, máx 5)</Label>
                <Textarea value={form.reference_urls} onChange={(e) => update("reference_urls", e.target.value)} rows={3} placeholder="https://..." />
              </div>
              <div>
                <Label>Observações para a IA</Label>
                <Textarea value={form.briefing_notes} onChange={(e) => update("briefing_notes", e.target.value)} rows={2} placeholder="Ex: cliente busca perfil que já tenha vendido para enterprise" />
              </div>
            </div>
          </section>

          <Separator />

          <section>
            <h2 className="font-semibold mb-3">Branding do relatório</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label>Consultoria</Label>
                <Input value={form.consultancy_name} onChange={(e) => update("consultancy_name", e.target.value)} />
              </div>
              <div>
                <Label>Cliente</Label>
                <Input value={form.client_name} onChange={(e) => update("client_name", e.target.value)} />
              </div>
              <div>
                <Label>Cor primária</Label>
                <Input type="color" value={form.primary_color} onChange={(e) => update("primary_color", e.target.value)} className="h-10 p-1" />
              </div>
            </div>
          </section>
        </Card>
      )}

      {/* STEP 2 — Revisão */}
      {step === 2 && (
        <Card className="p-6 space-y-6">
          <div>
            <h2 className="font-semibold mb-1">Revise o briefing</h2>
            <p className="text-sm text-muted-foreground">Confirme que está tudo certo antes de consumir créditos.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ReviewRow label="Cargo" value={`${form.job_title} · ${form.seniority}`} />
            <ReviewRow label="Área / Setor" value={[form.area, form.industry].filter(Boolean).join(" · ") || "—"} />
            <ReviewRow label="Localização" value={[form.city, form.state].filter(Boolean).join(", ") || "—"} />
            <ReviewRow label="Modelo" value={form.work_model} />
          </div>

          <Separator />

          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Skills-chave</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {skillsList.length > 0 ? skillsList.map((s) => <Badge key={s} variant="secondary">{s}</Badge>) : <span className="text-sm text-muted-foreground">Nenhuma</span>}
            </div>
          </div>

          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Concorrentes</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {competitorsList.length > 0 ? competitorsList.map((s) => <Badge key={s} variant="outline">{s}</Badge>) : <span className="text-sm text-muted-foreground">Nenhum</span>}
            </div>
          </div>

          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">URLs de referência</Label>
            {urlsList.length > 0 ? (
              <ul className="mt-2 space-y-1 text-sm">
                {urlsList.map((u) => <li key={u} className="truncate">→ {u}</li>)}
              </ul>
            ) : <p className="mt-2 text-sm text-muted-foreground">Nenhuma</p>}
          </div>

          {form.briefing_notes && (
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Observações</Label>
              <p className="mt-2 text-sm whitespace-pre-line">{form.briefing_notes}</p>
            </div>
          )}

          <Separator />

          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded border" style={{ backgroundColor: form.primary_color }} />
            <div className="text-sm">
              <div className="font-medium">{form.consultancy_name || "—"}</div>
              <div className="text-xs text-muted-foreground">para {form.client_name || "—"}</div>
            </div>
          </div>

          <div className="rounded-md bg-muted/50 p-4 text-sm">
            <strong>Estimativa:</strong> Tempo de geração 3-6 minutos · Validade do link público: 90 dias.
            <div className="mt-1 text-xs text-muted-foreground">
              O custo em créditos varia conforme o escopo (cargo, concorrentes, URLs de referência) e é debitado conforme o uso real da IA. Saldo mínimo necessário para iniciar: 20 créditos.
            </div>
          </div>
        </Card>
      )}

      {/* STEP 3 — Geração */}
      {step === 3 && (
        <Card className="p-12 text-center space-y-4">
          <Loader2 className="h-10 w-10 mx-auto animate-spin text-primary" />
          <h2 className="text-lg font-semibold">Iniciando geração...</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Estamos disparando o pipeline multi-LLM. Você será redirecionado para o relatório assim que ele entrar em fila — a tela atualiza sozinha.
          </p>
        </Card>
      )}

      {/* Footer nav */}
      {step < 3 && (
        <div className="mt-6 flex items-center justify-between">
          <Button variant="ghost" onClick={goBack} disabled={step === 1}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
          </Button>
          {step < 2 ? (
            <Button onClick={goNext} disabled={!canAdvanceFromStep1}>
              Continuar <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={submit} disabled={submitting} size="lg">
              {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Gerar relatório premium
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}
