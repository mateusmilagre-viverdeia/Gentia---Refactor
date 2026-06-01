import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, AlertCircle, XCircle, Loader2, Sparkles, Trash2, Stethoscope, Briefcase, Send } from "lucide-react";
import { toast } from "sonner";

type CheckStatus = "ok" | "warn" | "fail";
interface DiagCheck { id: string; label: string; status: CheckStatus; detail?: string }
interface DiagResponse { success: boolean; summary: { ok: number; warn: number; fail: number }; checks: DiagCheck[] }

const STATUS_ICON: Record<CheckStatus, JSX.Element> = {
  ok: <CheckCircle2 className="h-4 w-4 text-green-600" />,
  warn: <AlertCircle className="h-4 w-4 text-amber-500" />,
  fail: <XCircle className="h-4 w-4 text-red-500" />,
};

interface ContactDiscovery {
  apollo_status: "ok" | "no_match" | "error" | "skipped";
  apollo_email: string | null;
  apollo_phone: string | null;
  apollo_error?: string;
  heuristic_email: string | null;
  heuristic_confidence: "low" | null;
  heuristic_status: "ok" | "no_company" | "skipped";
  final_email: string | null;
  final_phone: string | null;
  final_email_source: "override" | "apollo" | "heuristic" | null;
  final_phone_source: "override" | "apollo" | null;
}

interface RealApproachResult {
  candidate?: { name: string; headline: string; company: string; score: number };
  ai_messages?: { whatsapp: string; email_subject: string; email_body: string };
  contact_discovery?: ContactDiscovery;
  blocked?: boolean;
  reason?: string;
  whatsapp_sent?: boolean;
  whatsapp_error?: string;
  email_sent?: boolean;
  email_error?: string;
}

export function HuntingQAChecklistCard() {
  const { currentOrganization } = useOrganization();
  const accountId = currentOrganization?.id;
  const qc = useQueryClient();
  const [autoRun, setAutoRun] = useState(false);
  const [realDialogOpen, setRealDialogOpen] = useState(false);
  const [realResult, setRealResult] = useState<RealApproachResult | null>(null);
  const [linkedinUrl, setLinkedinUrl] = useState("https://www.linkedin.com/in/guilherme-guimaraes-cultura-organizacional/");

  const { data, isFetching, refetch } = useQuery({
    queryKey: ["hunting-diagnostics", accountId],
    enabled: !!accountId && autoRun,
    queryFn: async (): Promise<DiagResponse> => {
      const { data, error } = await supabase.functions.invoke("hunting-diagnostics", {
        body: { account_id: accountId },
      });
      if (error) throw error;
      return data;
    },
  });

  const seedMut = useMutation({
    mutationFn: async (action: "seed" | "clear" | "seed_job" | "clear_job") => {
      const { data, error } = await supabase.functions.invoke("hunting-demo-seed", {
        body: { account_id: accountId, action },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, action) => {
      const messages: Record<string, string> = {
        seed: "Dados demo de Hunting criados",
        clear: "Dados demo de Hunting removidos",
        seed_job: "Vaga demo + ICP criados e publicados",
        clear_job: "Vaga demo + ICP removidos",
      };
      toast.success(messages[action] ?? "Operação concluída");
      qc.invalidateQueries({ queryKey: ["hunting-searches"] });
      qc.invalidateQueries({ queryKey: ["hunting-diagnostics"] });
      qc.invalidateQueries({ queryKey: ["recruitment-jobs"] });
      qc.invalidateQueries({ queryKey: ["job-icps"] });
      if (autoRun) refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const realApproachMut = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("hunting-demo-seed", {
        body: {
          account_id: accountId,
          action: "seed_real_approach",
          linkedin_url: linkedinUrl.trim(),
        },
      });
      if (error) throw error;
      return data as RealApproachResult & { error?: string };
    },
    onSuccess: (d) => {
      setRealResult(d);
      const parts: string[] = [];
      if (d.whatsapp_sent) parts.push("WhatsApp enviado");
      if (d.whatsapp_error) parts.push(`WhatsApp falhou: ${d.whatsapp_error}`);
      if (d.email_sent) parts.push("Email enviado");
      if (d.email_error) parts.push(`Email falhou: ${d.email_error}`);
      toast.success(parts.join(" · ") || "Abordagem registrada");
      qc.invalidateQueries({ queryKey: ["hunting-searches"] });
      qc.invalidateQueries({ queryKey: ["hunting-diagnostics"] });
      qc.invalidateQueries({ queryKey: ["recruitment-hunting-approaches"] });
      qc.invalidateQueries({ queryKey: ["recruitment-communications-log"] });
      if (autoRun) refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleClearAll = async () => {
    await seedMut.mutateAsync("clear");
    await seedMut.mutateAsync("clear_job");
    setRealResult(null);
  };

  const total = data?.checks.length ?? 0;
  const okCount = data?.summary.ok ?? 0;
  const pct = total > 0 ? Math.round((okCount / total) * 100) : 0;

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Stethoscope className="h-4 w-4" />
                QA do Fluxo de Hunting
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Valida secrets, ICP, buscas e abordagens nesta conta antes de testar com clientes reais.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-end">
              <Button size="sm" variant="outline" onClick={() => { setAutoRun(true); refetch(); }} disabled={isFetching}>
                {isFetching ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Stethoscope className="h-3.5 w-3.5 mr-1" />}
                Rodar diagnóstico
              </Button>
              <Button size="sm" variant="default" onClick={() => seedMut.mutate("seed_job")} disabled={seedMut.isPending}>
                <Briefcase className="h-3.5 w-3.5 mr-1" />
                Seed vaga demo
              </Button>
              <Button size="sm" variant="secondary" onClick={() => seedMut.mutate("seed")} disabled={seedMut.isPending}>
                <Sparkles className="h-3.5 w-3.5 mr-1" />
                Seed candidatos
              </Button>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => setRealDialogOpen(true)}
                disabled={realApproachMut.isPending}
              >
                <Send className="h-3.5 w-3.5 mr-1" />
                Seed abordagem real
              </Button>
              <Button size="sm" variant="ghost" onClick={handleClearAll} disabled={seedMut.isPending}>
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Limpar demo
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {data ? (
            <>
              <div className="flex items-center gap-3">
                <Progress value={pct} className="h-2 flex-1" />
                <span className="text-xs font-medium tabular-nums">{pct}%</span>
                <Badge variant="outline" className="text-xs">{okCount}/{total} ok</Badge>
              </div>
              <ul className="space-y-1.5">
                {data.checks.map((c) => (
                  <li key={c.id} className="flex items-start gap-2 text-sm">
                    {STATUS_ICON[c.status]}
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">{c.label}</span>
                      {c.detail && <span className="text-muted-foreground"> — {c.detail}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Clique em <span className="font-medium">Rodar diagnóstico</span> para verificar o estado da conta, ou <span className="font-medium">Seed demo</span> para popular a tela com dados fictícios.
            </p>
          )}

          {realResult && (
            <div className="mt-4 border rounded-md p-3 bg-muted/30 space-y-3 text-xs">
              <div className="font-semibold text-sm">Última abordagem real</div>
              {realResult.candidate && (
                <div>
                  <strong>{realResult.candidate.name}</strong> — {realResult.candidate.headline}
                  {realResult.candidate.company && <> · {realResult.candidate.company}</>}
                  <Badge variant="outline" className="ml-2">Score {realResult.candidate.score}</Badge>
                </div>
              )}

              {realResult.contact_discovery && (
                <div className="space-y-1.5 border-l-2 border-muted pl-3">
                  <div className="font-medium">Descoberta de contato (waterfall)</div>
                  <div className="flex items-center gap-2">
                    {realResult.contact_discovery.apollo_status === "ok" ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> : realResult.contact_discovery.apollo_status === "no_match" ? <AlertCircle className="h-3.5 w-3.5 text-amber-500" /> : <XCircle className="h-3.5 w-3.5 text-red-500" />}
                    <span>Apollo: {realResult.contact_discovery.apollo_status}</span>
                    {realResult.contact_discovery.apollo_email && <span className="text-muted-foreground">→ {realResult.contact_discovery.apollo_email}</span>}
                    {realResult.contact_discovery.apollo_phone && <span className="text-muted-foreground"> · {realResult.contact_discovery.apollo_phone}</span>}
                    {realResult.contact_discovery.apollo_error && <span className="text-red-500">({realResult.contact_discovery.apollo_error})</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    {realResult.contact_discovery.heuristic_status === "ok" ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> : realResult.contact_discovery.heuristic_status === "no_company" ? <XCircle className="h-3.5 w-3.5 text-red-500" /> : <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />}
                    <span>Heurística: {realResult.contact_discovery.heuristic_status}</span>
                    {realResult.contact_discovery.heuristic_email && <span className="text-muted-foreground">→ {realResult.contact_discovery.heuristic_email} (confiança baixa)</span>}
                  </div>
                  <div className="flex items-center gap-2 pt-1 border-t border-muted">
                    <span className="font-medium">Final:</span>
                    {realResult.contact_discovery.final_email ? <Badge variant="outline">📧 {realResult.contact_discovery.final_email} ({realResult.contact_discovery.final_email_source})</Badge> : <span className="text-muted-foreground">sem email</span>}
                    {realResult.contact_discovery.final_phone && <Badge variant="outline">📱 {realResult.contact_discovery.final_phone} ({realResult.contact_discovery.final_phone_source})</Badge>}
                  </div>
                </div>
              )}

              {realResult.ai_messages && (
                <details className="cursor-pointer">
                  <summary className="font-medium">Mensagens geradas pela IA</summary>
                  <div className="mt-2 space-y-2">
                    <div>
                      <div className="font-medium">WhatsApp:</div>
                      <pre className="whitespace-pre-wrap bg-background p-2 rounded text-[11px]">{realResult.ai_messages.whatsapp}</pre>
                    </div>
                    <div>
                      <div className="font-medium">Email — {realResult.ai_messages.email_subject}</div>
                      <pre className="whitespace-pre-wrap bg-background p-2 rounded text-[11px]">{realResult.ai_messages.email_body}</pre>
                    </div>
                  </div>
                </details>
              )}
              <div className="flex gap-2 flex-wrap">
                {realResult.blocked && <Badge variant="destructive">🚫 Bloqueado: {realResult.reason}</Badge>}
                {realResult.whatsapp_sent && <Badge className="bg-emerald-600">WhatsApp enviado</Badge>}
                {realResult.whatsapp_error && <Badge variant="destructive">WhatsApp: {realResult.whatsapp_error}</Badge>}
                {realResult.email_sent && <Badge className="bg-emerald-600">Email enviado</Badge>}
                {realResult.email_error && <Badge variant="destructive">Email: {realResult.email_error}</Badge>}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={realDialogOpen} onOpenChange={setRealDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Seed abordagem real (descoberta automática)</DialogTitle>
            <DialogDescription>
              Sistema scrapeia o perfil via Apify, tenta enriquecer com Apollo (email + telefone reais) e, se não achar, infere email pelo padrão da empresa. Se nada funcionar, registra como "sem contato" — cenário real de hunting frio.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label htmlFor="li-url">URL do perfil LinkedIn</Label>
              <Input id="li-url" value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} />
            </div>
            <p className="text-xs text-muted-foreground">
              A vaga DEMO precisa existir (clique em "Seed vaga demo" antes). Custo: ~1 crédito Apify + 1-2 créditos Apollo.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRealDialogOpen(false)} disabled={realApproachMut.isPending}>Cancelar</Button>
            <Button
              onClick={async () => {
                if (!linkedinUrl.trim()) return toast.error("URL LinkedIn obrigatória");
                await realApproachMut.mutateAsync();
                setRealDialogOpen(false);
              }}
              disabled={realApproachMut.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {realApproachMut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
              Descobrir contato e abordar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
