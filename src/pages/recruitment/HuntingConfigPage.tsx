import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Info } from "lucide-react";

type Settings = {
  id?: string;
  account_id: string;
  mode: "free_only" | "low_cost" | "aggressive";
  daily_firecrawl_limit: number;
  enable_mailboxlayer: boolean;
  enable_hunter: boolean;
  enable_snov: boolean;
  enable_neverbounce: boolean;
  enable_twilio: boolean;
};

const PROVIDERS = [
  { key: "enable_mailboxlayer" as const, name: "MailboxLayer", desc: "Validação de email (cascata grátis)", free: "100/mês grátis", paid: "depois ~US$ 0,002/uso", level: 1, secret: "MAILBOXLAYER_API_KEY" },
  { key: "enable_hunter" as const, name: "Hunter.io", desc: "Email finder + verifier", free: "25 buscas + 50 verificações/mês grátis", paid: "depois US$ 0,04/busca", level: 2, secret: "HUNTER_API_KEY" },
  { key: "enable_snov" as const, name: "Snov.io", desc: "Email finder alternativo", free: "50/mês grátis", paid: "depois US$ 0,008/email", level: 2, secret: "SNOV_CLIENT_ID + SNOV_CLIENT_SECRET" },
  { key: "enable_neverbounce" as const, name: "NeverBounce", desc: "Validação extra de email", free: "1.000 grátis no signup", paid: "depois US$ 0,008/uso", level: 2, secret: "NEVERBOUNCE_API_KEY" },
  { key: "enable_twilio" as const, name: "Twilio Lookup", desc: "Confirma se telefone é WhatsApp/válido", free: "sem grátis", paid: "US$ 0,005/lookup", level: 2, secret: "TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN" },
];

const FREE_VALIDATORS = [
  { name: "Abstract API", desc: "Validador grátis primário (sem toggle, sempre roda se a chave existir)", free: "100/dia ≈ 3.000/mês grátis", secret: "ABSTRACT_EMAIL_API_KEY" },
];

export default function HuntingConfigPage() {
  const { currentOrganization } = useOrganization();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    if (!currentOrganization?.id) return;
    let cancel = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("hunting_provider_settings" as any)
        .select("*")
        .eq("account_id", currentOrganization.id)
        .maybeSingle();
      if (cancel) return;
      if (data) {
        setSettings(data as any);
      } else {
        // cria padrões
        const { data: created } = await supabase
          .from("hunting_provider_settings" as any)
          .insert({ account_id: currentOrganization.id })
          .select()
          .single();
        if (!cancel) setSettings(created as any);
      }
      setLoading(false);
    })();
    return () => { cancel = true; };
  }, [currentOrganization?.id]);

  const update = async (patch: Partial<Settings>) => {
    if (!settings) return;
    const next = { ...settings, ...patch };
    setSettings(next);
    setSaving(true);
    const { error } = await supabase
      .from("hunting_provider_settings" as any)
      .update(patch as any)
      .eq("account_id", settings.account_id);
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar configuração");
    } else {
      toast.success("Configuração atualizada");
    }
  };

  if (loading || !settings) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configuração de Descoberta de Contatos</h1>
        <p className="text-muted-foreground mt-1">
          Controle quais provedores são usados na cascata de descoberta de email/telefone dos candidatos.
          Use os toggles para ativar/desativar e ajuste o limite diário para evitar surpresas no custo.
        </p>
      </div>

      {/* Modo de operação */}
      <Card>
        <CardHeader>
          <CardTitle>Modo de operação</CardTitle>
          <CardDescription>Define o nível geral de agressividade da cascata.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Modo atual</Label>
            <Select value={settings.mode} onValueChange={(v) => update({ mode: v as Settings["mode"] })}>
              <SelectTrigger className="w-full md:w-80"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="free_only">Só grátis — Apollo + heurística + provedores grátis</SelectItem>
                <SelectItem value="low_cost">Baixo custo (recomendado) — adiciona Firecrawl com limite</SelectItem>
                <SelectItem value="aggressive">Agressivo — usa todos os provedores ligados</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Limite diário de buscas Firecrawl</Label>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min={0}
                max={2000}
                value={settings.daily_firecrawl_limit}
                onChange={(e) => setSettings({ ...settings, daily_firecrawl_limit: Number(e.target.value) })}
                onBlur={() => update({ daily_firecrawl_limit: settings.daily_firecrawl_limit })}
                className="w-32"
              />
              <span className="text-xs text-muted-foreground">
                ~3 créditos por busca · estimativa ≈ R$ {(settings.daily_firecrawl_limit * 0.05).toFixed(2)}/dia teto
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Provedores */}
      <Card>
        <CardHeader>
          <CardTitle>Provedores</CardTitle>
          <CardDescription>
            Cada provedor só é chamado se ele estiver ligado E a etapa anterior não tiver achado o contato.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {PROVIDERS.map((p) => (
            <div key={p.key} className="flex items-start justify-between gap-4 p-3 border rounded-lg">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">{p.name}</span>
                  <Badge variant={p.level === 1 ? "secondary" : "outline"} className="text-[10px]">
                    Nível {p.level}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{p.desc}</p>
                <p className="text-[11px] text-muted-foreground/80 mt-1">
                  💰 {p.free} · {p.paid}
                </p>
                <p className="text-[11px] text-muted-foreground/60 mt-1">
                  🔑 Secret necessário: <code className="text-[10px]">{p.secret}</code>
                </p>
              </div>
              <Switch
                checked={settings[p.key]}
                onCheckedChange={(v) => update({ [p.key]: v } as any)}
                disabled={saving}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Validadores grátis (sem toggle) */}
      <Card>
        <CardHeader>
          <CardTitle>Validadores de email — cascata grátis</CardTitle>
          <CardDescription>
            Rodam automaticamente após qualquer email ser descoberto. Cascata: Abstract → Hunter Verifier → MailboxLayer → NeverBounce.
            Para a verificação parar (e marcar o email como ✅ verificado), basta um deles confirmar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {FREE_VALIDATORS.map((v) => (
            <div key={v.name} className="p-3 border rounded-lg">
              <div className="font-medium text-sm">{v.name}</div>
              <p className="text-xs text-muted-foreground">{v.desc}</p>
              <p className="text-[11px] text-muted-foreground/80 mt-1">💰 {v.free}</p>
              <p className="text-[11px] text-muted-foreground/60 mt-1">
                🔑 Secret: <code className="text-[10px]">{v.secret}</code>
              </p>
            </div>
          ))}
          <p className="text-[11px] text-muted-foreground/80 pt-2 border-t">
            💡 Hunter Verifier e MailboxLayer também participam aqui. Hunter usa a mesma <code>HUNTER_API_KEY</code> do
            email finder. MailboxLayer respeita o toggle acima.
          </p>
        </CardContent>
      </Card>

      <Card className="bg-muted/30 border-dashed">
        <CardContent className="pt-6 flex gap-3">
          <Info className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Como funciona a cascata</p>
            <ol className="list-decimal list-inside space-y-0.5 text-xs">
              <li>Cache (já buscamos antes? usa o resultado salvo)</li>
              <li>Apollo (já incluso no seu plano)</li>
              <li>Firecrawl Search no Google (até o limite diário)</li>
              <li>Firecrawl Scrape do site da empresa</li>
              <li>Extração com IA do conteúdo coletado</li>
              <li>Validação de email (provedores grátis primeiro)</li>
              <li>Provedores opcionais ligados acima</li>
              <li>Heurística como último recurso</li>
            </ol>
            <p className="text-xs mt-2">
              Em cada candidato a UI mostra exatamente quais etapas rodaram e quanto custou.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
