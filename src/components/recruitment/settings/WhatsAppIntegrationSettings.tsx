import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Save, TestTube2 } from "lucide-react";
import { useWhatsAppConfig } from "@/hooks/useWhatsAppConfig";
import { useToast } from "@/hooks/use-toast";

export function WhatsAppIntegrationSettings() {
  const { config, isLoading, upsertConfig, testConnection, isSaving, isTesting } = useWhatsAppConfig();
  const { toast } = useToast();

  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [wabaId, setWabaId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (config) {
      setPhoneNumberId(config.phone_number_id || "");
      setWabaId(config.waba_id || "");
      setAccessToken("");
      setIsActive(config.is_active);
    }
  }, [config]);

  const handleSave = () => {
    if (!phoneNumberId.trim() || !accessToken.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Phone Number ID e Access Token são obrigatórios.",
        variant: "destructive",
      });
      return;
    }
    upsertConfig({
      phone_number_id: phoneNumberId.trim(),
      waba_id: wabaId.trim() || null,
      access_token: accessToken.trim(),
      is_active: isActive,
    });
  };

  const handleTestConnection = () => {
    testConnection();
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Integração WhatsApp (API Oficial)
        </h3>
        <p className="text-sm text-muted-foreground">
          Configure a API Oficial do WhatsApp (Meta Cloud API) para envio de notificações automáticas aos candidatos.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Credenciais da Meta Cloud API</CardTitle>
          <CardDescription>
            Obtenha esses dados no{" "}
            <a
              href="https://developers.facebook.com/apps/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              Meta for Developers
            </a>
            , na seção WhatsApp &gt; Configuração da API. O token é enviado somente ao backend e nunca é exibido depois de salvo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone_number_id">Phone Number ID *</Label>
            <Input
              id="phone_number_id"
              value={phoneNumberId}
              onChange={(e) => setPhoneNumberId(e.target.value)}
              placeholder="Ex: 123456789012345"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="waba_id">WhatsApp Business Account ID</Label>
            <Input
              id="waba_id"
              value={wabaId}
              onChange={(e) => setWabaId(e.target.value)}
              placeholder="Ex: 987654321098765"
            />
            <p className="text-xs text-muted-foreground">Opcional, mas recomendado para gerenciamento avançado.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="access_token">Access Token *</Label>
            <Input
              id="access_token"
              type="password"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder={config ? "•••••••••••• token já salvo — informe novo token para trocar" : "Token de acesso permanente"}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Integração ativa</p>
              <p className="text-xs text-muted-foreground">
                Desative para pausar envios via WhatsApp sem remover as credenciais.
              </p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Salvando..." : "Salvar"}
            </Button>
            <Button variant="outline" onClick={handleTestConnection} disabled={isTesting || !config}>
              <TestTube2 className="h-4 w-4 mr-2" />
              {isTesting ? "Testando..." : "Testar Conexão"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
