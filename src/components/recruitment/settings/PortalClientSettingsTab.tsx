import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Save, Building2, Upload, Bell, Loader2 } from "lucide-react";

export function PortalClientSettingsTab() {
  const { currentAccount } = useOrganization();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const [consultancyName, setConsultancyName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [confidentialityText, setConfidentialityText] = useState("");
  const [validityDays, setValidityDays] = useState(30);
  const [openingMessage, setOpeningMessage] = useState("");

  // Notification settings
  const [notifyShortlistReady, setNotifyShortlistReady] = useState(true);
  const [notifyReminder48h, setNotifyReminder48h] = useState(true);
  const [notifyCandidateApproved, setNotifyCandidateApproved] = useState(true);
  const [templateShortlistReady, setTemplateShortlistReady] = useState("");
  const [templateReminder48h, setTemplateReminder48h] = useState("");
  const [templateCandidateApproved, setTemplateCandidateApproved] = useState("");

  const { data: settings, isLoading } = useQuery({
    queryKey: ["consultancy-portal-settings", currentAccount?.id],
    queryFn: async () => {
      if (!currentAccount?.id) return null;
      const { data, error } = await supabase
        .from("consultancy_portal_settings")
        .select("*")
        .eq("account_id", currentAccount.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!currentAccount?.id,
  });

  useEffect(() => {
    if (settings) {
      setConsultancyName(settings.consultancy_name || "");
      setLogoUrl(settings.logo_url || "");
      setConfidentialityText(settings.confidentiality_text || "");
      setValidityDays(settings.default_shortlist_validity_days || 30);
      setOpeningMessage(settings.default_opening_message || "");
      setNotifyShortlistReady(settings.notify_shortlist_ready ?? true);
      setNotifyReminder48h(settings.notify_reminder_48h ?? true);
      setNotifyCandidateApproved(settings.notify_candidate_approved ?? true);
      setTemplateShortlistReady(settings.template_shortlist_ready || "");
      setTemplateReminder48h(settings.template_reminder_48h || "");
      setTemplateCandidateApproved(settings.template_candidate_approved || "");
    }
  }, [settings]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentAccount?.id) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem (PNG, JPG, SVG)");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Imagem deve ter no máximo 2MB");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${currentAccount.id}/logo-${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("consultancy-logos")
        .upload(path, file, { upsert: true, cacheControl: "3600" });
      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage
        .from("consultancy-logos")
        .getPublicUrl(path);

      setLogoUrl(publicUrl);
      toast.success("Logo carregado! Não esqueça de salvar.");
    } catch (e: any) {
      toast.error(e.message || "Erro ao carregar logo");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!currentAccount?.id) throw new Error("Sem conta");
      const payload = {
        account_id: currentAccount.id,
        consultancy_name: consultancyName || null,
        logo_url: logoUrl || null,
        confidentiality_text: confidentialityText || null,
        default_shortlist_validity_days: validityDays,
        default_opening_message: openingMessage || null,
        notify_shortlist_ready: notifyShortlistReady,
        notify_reminder_48h: notifyReminder48h,
        notify_candidate_approved: notifyCandidateApproved,
        template_shortlist_ready: templateShortlistReady || null,
        template_reminder_48h: templateReminder48h || null,
        template_candidate_approved: templateCandidateApproved || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("consultancy_portal_settings")
        .upsert(payload, { onConflict: "account_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["consultancy-portal-settings"] });
      toast.success("Configurações salvas!");
    },
    onError: () => toast.error("Erro ao salvar configurações"),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Identidade da Consultoria
          </CardTitle>
          <CardDescription>
            Configurações de marca e textos padrão para o portal do cliente e relatórios de shortlist.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome da Consultoria</Label>
              <Input
                value={consultancyName}
                onChange={(e) => setConsultancyName(e.target.value)}
                placeholder="Ex: Gentia Consultoria"
              />
            </div>
            <div className="space-y-2">
              <Label>Logo da Consultoria</Label>
              <div className="flex items-center gap-2">
                {logoUrl && (
                  <img src={logoUrl} alt="Logo" className="h-10 w-10 object-contain rounded border" />
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : <Upload className="h-3.5 w-3.5 mr-2" />}
                  {logoUrl ? "Trocar" : "Carregar"}
                </Button>
                {logoUrl && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setLogoUrl("")}>
                    Remover
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">PNG, JPG ou SVG. Máx 2MB.</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Texto de Confidencialidade</Label>
            <Textarea
              value={confidentialityText}
              onChange={(e) => setConfidentialityText(e.target.value)}
              placeholder="Este relatório é confidencial..."
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Exibido no rodapé dos relatórios de shortlist e no portal do cliente.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Validade Padrão de Shortlist (dias)</Label>
              <Input
                type="number"
                value={validityDays}
                onChange={(e) => setValidityDays(parseInt(e.target.value) || 30)}
                min={1}
                max={365}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Mensagem de Abertura Padrão</Label>
            <Textarea
              value={openingMessage}
              onChange={(e) => setOpeningMessage(e.target.value)}
              placeholder="Prezado(a), segue a lista de candidatos selecionados..."
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Mensagem padrão que será pré-preenchida ao gerar novos relatórios de shortlist.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notificações WhatsApp do Portal
          </CardTitle>
          <CardDescription>
            Controle as notificações automáticas enviadas aos contatos dos clientes.
            Variáveis disponíveis: <code className="text-xs">{"{{nome}}"}</code>, <code className="text-xs">{"{{titulo}}"}</code>, <code className="text-xs">{"{{link}}"}</code>, <code className="text-xs">{"{{consultoria}}"}</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <NotificationToggleBlock
            label="Shortlist pronta"
            description="Enviado ao contato principal quando um relatório de shortlist é gerado."
            enabled={notifyShortlistReady}
            onEnabledChange={setNotifyShortlistReady}
            template={templateShortlistReady}
            onTemplateChange={setTemplateShortlistReady}
            placeholder={`Olá {{nome}}! O relatório de shortlist "{{titulo}}" está pronto. Acesse: {{link}}`}
          />
          <NotificationToggleBlock
            label="Lembrete 48h"
            description="Enviado se o contato não acessou o relatório em 48h após a geração."
            enabled={notifyReminder48h}
            onEnabledChange={setNotifyReminder48h}
            template={templateReminder48h}
            onTemplateChange={setTemplateReminder48h}
            placeholder={`Olá {{nome}}! Notamos que ainda não acessou a shortlist "{{titulo}}". Confira aqui: {{link}}`}
          />
          <NotificationToggleBlock
            label="Candidato aprovado"
            description="Enviado quando o cliente aprova um candidato no portal."
            enabled={notifyCandidateApproved}
            onEnabledChange={setNotifyCandidateApproved}
            template={templateCandidateApproved}
            onTemplateChange={setTemplateCandidateApproved}
            placeholder={`Ótimo! Você aprovou um candidato na shortlist "{{titulo}}". Em breve entraremos em contato com os próximos passos.`}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || isLoading}
        >
          <Save className="h-4 w-4 mr-2" />
          {saveMutation.isPending ? "Salvando..." : "Salvar Configurações"}
        </Button>
      </div>
    </div>
  );
}

function NotificationToggleBlock({
  label, description, enabled, onEnabledChange, template, onTemplateChange, placeholder,
}: {
  label: string;
  description: string;
  enabled: boolean;
  onEnabledChange: (v: boolean) => void;
  template: string;
  onTemplateChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <Label className="text-sm font-medium">{label}</Label>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
        <Switch checked={enabled} onCheckedChange={onEnabledChange} />
      </div>
      {enabled && (
        <Textarea
          value={template}
          onChange={(e) => onTemplateChange(e.target.value)}
          placeholder={placeholder}
          rows={2}
          className="text-xs"
        />
      )}
    </div>
  );
}
