import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { MessageSquare, Mail, Copy, Check, Inbox } from "lucide-react";
import { useEmailIntakeConfig, useExternalEntries } from "@/hooks/useExternalEntries";
import { useWhatsAppConfig } from "@/hooks/useWhatsAppConfig";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export function IntakeChannelsSettings() {
  const { config: emailConfig, isLoading: emailLoading, toggleActive: toggleEmail, isToggling } = useEmailIntakeConfig();
  const { config: whatsappConfig, isLoading: waLoading } = useWhatsAppConfig();
  const { metrics } = useExternalEntries();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({ title: "Copiado!", description: text });
    setTimeout(() => setCopied(false), 2000);
  };

  if (emailLoading || waLoading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium flex items-center gap-2">
          <Inbox className="h-5 w-5" />
          Canais de Entrada de Currículos
        </h3>
        <p className="text-sm text-muted-foreground">
          Receba currículos automaticamente via WhatsApp e e-mail dedicado. Os candidatos são extraídos por IA e adicionados ao seu banco de talentos.
        </p>
      </div>

      {/* WhatsApp Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="h-5 w-5 text-primary" />
                Recebimento via WhatsApp
              </CardTitle>
              <CardDescription>
                Candidatos enviam currículos diretamente para seu número WhatsApp Business.
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{metrics.whatsapp}</div>
              <div className="text-xs text-muted-foreground">recebidos</div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {whatsappConfig?.phone_number_id ? (
            <>
              <div className="flex items-center justify-between p-3 border rounded">
                <div>
                  <div className="text-sm font-medium">Phone Number ID</div>
                  <div className="text-xs text-muted-foreground font-mono">{whatsappConfig.phone_number_id}</div>
                </div>
                <Switch checked={whatsappConfig.is_active} disabled />
              </div>
              <div className="rounded-lg bg-muted p-3 text-xs space-y-2">
                <p className="font-medium">⚙️ Configuração do Webhook (Meta Cloud API):</p>
                <ol className="list-decimal pl-4 space-y-1 text-muted-foreground">
                  <li>No Meta for Developers, vá em WhatsApp → Configuração</li>
                  <li>Aponte o webhook para: <code className="text-foreground">{`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-intake`}</code></li>
                  <li>Token de verificação: <code className="text-foreground">gentia-intake-2026</code></li>
                  <li>Inscreva os campos <code>messages</code></li>
                </ol>
              </div>
            </>
          ) : (
            <div className="text-sm text-muted-foreground p-4 border border-dashed rounded text-center">
              Configure suas credenciais WhatsApp na aba "Notificações" primeiro.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Mail className="h-5 w-5 text-primary" />
                Recebimento via E-mail
              </CardTitle>
              <CardDescription>
                Endereço dedicado para receber currículos por e-mail.
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{metrics.email}</div>
              <div className="text-xs text-muted-foreground">recebidos</div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {emailConfig ? (
            <>
              <div className="space-y-2">
                <Label>Seu endereço dedicado</Label>
                <div className="flex gap-2">
                  <Input value={emailConfig.dedicated_email} readOnly className="font-mono text-sm" />
                  <Button variant="outline" size="icon" onClick={() => handleCopy(emailConfig.dedicated_email)}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Compartilhe esse endereço para receber currículos automaticamente.
                </p>
              </div>

              <Separator />

              <div className="flex items-center justify-between p-3 border rounded">
                <div>
                  <div className="text-sm font-medium">Recebimento ativo</div>
                  <div className="text-xs text-muted-foreground">
                    Desative para pausar o processamento de novos e-mails.
                  </div>
                </div>
                <Switch
                  checked={emailConfig.is_active}
                  onCheckedChange={toggleEmail}
                  disabled={isToggling}
                />
              </div>

              <div className="rounded-lg bg-muted p-3 text-xs space-y-2">
                <p className="font-medium">⚙️ Pré-requisitos de DNS (a configurar pela GENTIA):</p>
                <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                  <li>MX record para <code className="text-foreground">candidatos.gentia.com.br</code> apontando para Postmark/SendGrid</li>
                  <li>Webhook Inbound apontando para <code className="text-foreground">/functions/v1/email-intake</code></li>
                </ul>
              </div>
            </>
          ) : (
            <div className="text-sm text-muted-foreground">Configuração não disponível.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
