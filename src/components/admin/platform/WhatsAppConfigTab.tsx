import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  MessageCircle, Save, Zap, RefreshCw, Eye, EyeOff,
  CheckCircle, XCircle, Link, LayoutTemplate, Send
} from "lucide-react";
import { PlatformCommLogs } from "./PlatformCommLogs";
;

async function callWhatsAppFunction(action: string, method: string, body?: unknown) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Não autenticado");

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/platform-admin-whatsapp?action=${action}`;
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Erro na requisição");
  return data;
}

interface TemplateComponent {
  type: string;
  text?: string;
  example?: { body_text?: string[][] };
  parameters?: unknown[];
}

interface WhatsAppTemplate {
  name: string;
  category: string;
  language: string;
  status: string;
  components?: TemplateComponent[];
}

const TEMPLATE_STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  APPROVED: { label: "Aprovado", variant: "default" },
  PENDING: { label: "Pendente", variant: "secondary" },
  REJECTED: { label: "Rejeitado", variant: "destructive" },
  DISABLED: { label: "Desativado", variant: "outline" },
};

const CATEGORY_MAP: Record<string, string> = {
  MARKETING: "Marketing",
  UTILITY: "Utilitário",
  AUTHENTICATION: "Autenticação",
};

export function WhatsAppConfigTab() {
  const queryClient = useQueryClient();
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [wabaId, setWabaId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; info?: Record<string, string> } | null>(null);
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [templatesLoaded, setTemplatesLoaded] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [testTemplateName, setTestTemplateName] = useState("");
  const [testSendResult, setTestSendResult] = useState<{ success: boolean; message_id?: string; error?: string } | null>(null);
  const [bodyParams, setBodyParams] = useState<string[]>([]);

  // Workflow template state
  const [wfCulturalTemplate, setWfCulturalTemplate] = useState("");
  const [wfDiscTemplate, setWfDiscTemplate] = useState("");
  const [wfTechnicalTemplate, setWfTechnicalTemplate] = useState("");
  const [wfCompletionTemplate, setWfCompletionTemplate] = useState("");
  const [wfRejectionTemplate, setWfRejectionTemplate] = useState("");

  const { data: configData, isLoading } = useQuery({
    queryKey: ["platform-whatsapp-config"],
    queryFn: () => callWhatsAppFunction("config", "GET"),
  });

  useEffect(() => {
    if (configData?.config) {
      const c = configData.config;
      setPhoneNumberId(c.phone_number_id || "");
      setWabaId(c.waba_id || "");
      setIsActive(c.is_active || false);
      // Token não é retornado por segurança
      setAccessToken(c.phone_number_id ? "***" : "");
    }
  }, [configData]);

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-webhook`;
  const verifyToken = configData?.config?.webhook_verify_token || "—";

  const saveMutation = useMutation({
    mutationFn: () => callWhatsAppFunction("config", "PUT", {
      phone_number_id: phoneNumberId,
      waba_id: wabaId,
      access_token: accessToken,
      is_active: isActive,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-whatsapp-config"] });
      toast.success("Configurações salvas com sucesso!");
    },
    onError: (err: Error) => toast.error(`Erro ao salvar: ${err.message}`),
  });

  const testMutation = useMutation({
    mutationFn: () => callWhatsAppFunction("test", "POST"),
    onSuccess: (data) => {
      setTestResult({ success: true, info: data.phone_info });
      toast.success("Conexão estabelecida com sucesso!");
    },
    onError: (err: Error) => {
      setTestResult({ success: false });
      toast.error(`Falha na conexão: ${err.message}`);
    },
  });

  const templatesMutation = useMutation({
    mutationFn: () => callWhatsAppFunction("templates", "GET"),
    onSuccess: (data) => {
      setTemplates(data.templates || []);
      setTemplatesLoaded(true);
      toast.success(`${data.templates?.length || 0} templates encontrados!`);
    },
    onError: (err: Error) => toast.error(`Erro ao buscar templates: ${err.message}`),
  });

  // Workflow templates query
  const { data: wfData } = useQuery({
    queryKey: ["platform-whatsapp-workflow-templates"],
    queryFn: () => callWhatsAppFunction("workflow-templates", "GET"),
  });

  useEffect(() => {
    if (wfData?.workflow_templates) {
      const wt = wfData.workflow_templates;
      setWfCulturalTemplate(wt.template_cultural_name || "");
      setWfDiscTemplate(wt.template_disc_name || "");
      setWfTechnicalTemplate(wt.template_technical_name || "");
      setWfCompletionTemplate(wt.template_completion_name || "");
      setWfRejectionTemplate(wt.template_rejection_name || "");
    }
  }, [wfData]);

  const saveWorkflowTemplatesMutation = useMutation({
    mutationFn: () => {
      const cleanVal = (v: string) => (v && v !== "__none__") ? v : null;
      const culName = cleanVal(wfCulturalTemplate);
      const discName = cleanVal(wfDiscTemplate);
      const techName = cleanVal(wfTechnicalTemplate);
      const compName = cleanVal(wfCompletionTemplate);
      const rejName = cleanVal(wfRejectionTemplate);
      const culTmpl = approvedTemplates.find(t => t.name === culName);
      const discTmpl = approvedTemplates.find(t => t.name === discName);
      const techTmpl = approvedTemplates.find(t => t.name === techName);
      const compTmpl = approvedTemplates.find(t => t.name === compName);
      const rejTmpl = approvedTemplates.find(t => t.name === rejName);
      return callWhatsAppFunction("workflow-templates", "PUT", {
        template_cultural_name: culName,
        template_cultural_language: culTmpl?.language || "pt_BR",
        template_disc_name: discName,
        template_disc_language: discTmpl?.language || "pt_BR",
        template_technical_name: techName,
        template_technical_language: techTmpl?.language || "pt_BR",
        template_completion_name: compName,
        template_completion_language: compTmpl?.language || "pt_BR",
        template_rejection_name: rejName,
        template_rejection_language: rejTmpl?.language || "pt_BR",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-whatsapp-workflow-templates"] });
      toast.success("Templates do workflow salvos com sucesso!");
    },
    onError: (err: Error) => toast.error(`Erro ao salvar: ${err.message}`),
  });

  const sendTestMutation = useMutation({
    mutationFn: () => {
      const selectedTemplate = approvedTemplates.find(t => t.name === testTemplateName);
      return callWhatsAppFunction("send-test", "POST", {
        phone: testPhone,
        template_name: testTemplateName,
        template_language: selectedTemplate?.language || "pt_BR",
        body_params: bodyParams.length > 0 ? bodyParams : undefined,
      });
    },
    onSuccess: (data) => {
      setTestSendResult({ success: true, message_id: data.message_id });
      toast.success("Mensagem de teste enviada com sucesso!");
    },
    onError: (err: Error) => {
      setTestSendResult({ success: false, error: err.message });
      toast.error(`Falha ao enviar: ${err.message}`);
    },
  });

  // Extract body preview from template
  function getTemplateBodyPreview(template: WhatsAppTemplate): string {
    const bodyComponent = template.components?.find(c => c.type === 'BODY');
    if (!bodyComponent?.text) return "";
    const clean = bodyComponent.text.replace(/\{\{\d+\}\}/g, '___').trim();
    return clean.length > 60 ? clean.slice(0, 57) + "…" : clean;
  }

  // Extract variable count from template body component
  function getTemplateVariableCount(template: WhatsAppTemplate): number {
    const bodyComponent = template.components?.find(c => c.type === 'BODY');
    if (!bodyComponent?.text) return 0;
    const matches = bodyComponent.text.match(/\{\{\d+\}\}/g);
    return matches ? matches.length : 0;
  }

  function getTemplateExampleValues(template: WhatsAppTemplate): string[] {
    const bodyComponent = template.components?.find(c => c.type === 'BODY');
    return bodyComponent?.example?.body_text?.[0] || [];
  }

  function handleTemplateSelect(templateName: string) {
    setTestTemplateName(templateName);
    setTestSendResult(null);
    const tmpl = approvedTemplates.find(t => t.name === templateName);
    if (tmpl) {
      const varCount = getTemplateVariableCount(tmpl);
      const examples = getTemplateExampleValues(tmpl);
      const params: string[] = [];
      for (let i = 0; i < varCount; i++) {
        params.push(examples[i] || `Teste ${i + 1}`);
      }
      setBodyParams(params);
    } else {
      setBodyParams([]);
    }
  }

  function renderTemplateSelectItem(t: WhatsAppTemplate, i: number) {
    const preview = getTemplateBodyPreview(t);
    return (
      <SelectItem key={i} value={t.name}>
        <div className="flex flex-col items-start">
          <span>{t.name} ({t.language})</span>
          {preview && <span className="text-xs text-muted-foreground truncate max-w-[300px]">{preview}</span>}
        </div>
      </SelectItem>
    );
  }

  const approvedTemplates = templates.filter(t => t.status === "APPROVED");

  return (
    <div className="space-y-6">
      {/* Credenciais Meta Cloud API */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageCircle className="h-4 w-4" />
            Credenciais Meta Cloud API
          </CardTitle>
          <CardDescription>
            Configure as credenciais para integração com a API oficial do WhatsApp Business.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone-number-id">Phone Number ID</Label>
                  <Input
                    id="phone-number-id"
                    value={phoneNumberId}
                    onChange={(e) => setPhoneNumberId(e.target.value)}
                    placeholder="123456789012345"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="waba-id">WABA ID (WhatsApp Business Account ID)</Label>
                  <Input
                    id="waba-id"
                    value={wabaId}
                    onChange={(e) => setWabaId(e.target.value)}
                    placeholder="123456789012345"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="access-token">Access Token</Label>
                <div className="relative">
                  <Input
                    id="access-token"
                    type={showToken ? "text" : "password"}
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    placeholder="EAAxxxxxxxxxxxxxxx..."
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  O token é armazenado de forma segura. Deixe como "***" para manter o token atual.
                </p>
              </div>

              <div className="flex items-center gap-3 py-2">
                <Switch
                  id="is-active"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
                <Label htmlFor="is-active" className="cursor-pointer">
                  Integração Ativa
                </Label>
                <Badge variant={isActive ? "default" : "secondary"}>
                  {isActive ? "Ativa" : "Inativa"}
                </Badge>
              </div>

              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => testMutation.mutate()}
                  disabled={testMutation.isPending}
                >
                  <Zap className="h-4 w-4 mr-2" />
                  {testMutation.isPending ? "Testando..." : "Testar Conexão"}
                </Button>
                <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  {saveMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </div>

              {/* Test Result */}
              {testResult && (
              <div className={`rounded-lg border p-3 text-sm ${testResult.success ? 'border-primary/30 bg-primary/5' : 'border-destructive/20 bg-destructive/5'}`}>
                <div className="flex items-center gap-2 font-medium mb-1">
                  {testResult.success ? (
                    <><CheckCircle className="h-4 w-4 text-primary" /> Conexão estabelecida!</>
                  ) : (
                    <><XCircle className="h-4 w-4 text-destructive" /> Falha na conexão</>
                  )}
                  </div>
                  {testResult.success && testResult.info && (
                    <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground mt-2">
                      {testResult.info.display_phone_number && (
                        <span>Número: <strong>{testResult.info.display_phone_number}</strong></span>
                      )}
                      {testResult.info.verified_name && (
                        <span>Nome: <strong>{testResult.info.verified_name}</strong></span>
                      )}
                      {testResult.info.quality_rating && (
                        <span>Qualidade: <strong>{testResult.info.quality_rating}</strong></span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Webhook Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Link className="h-4 w-4" />
            Configuração do Webhook
          </CardTitle>
          <CardDescription>
            Use estes dados para configurar o webhook no Meta Business Manager.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">URL do Webhook</Label>
            <div className="flex gap-2">
              <Input readOnly value={webhookUrl} className="font-mono text-xs" />
              <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(webhookUrl); toast.success("URL copiada!"); }}>
                Copiar
              </Button>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Token de Verificação</Label>
            <div className="flex gap-2">
              <Input readOnly value={verifyToken} className="font-mono text-xs" />
              <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(verifyToken); toast.success("Token copiado!"); }}>
                Copiar
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            No Meta Business Manager, vá em WhatsApp → Configuração → Webhooks e insira os dados acima.
          </p>
        </CardContent>
      </Card>

      {/* Enviar Teste */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Send className="h-4 w-4" />
            Enviar Teste
          </CardTitle>
          <CardDescription>
            Envie uma mensagem de teste real usando um template aprovado.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!templatesLoaded || approvedTemplates.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm space-y-3">
              <p>
                {!templatesLoaded
                  ? "Busque os templates primeiro para selecionar um template aprovado."
                  : "Nenhum template aprovado encontrado."}
              </p>
              {!templatesLoaded && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => templatesMutation.mutate()}
                  disabled={templatesMutation.isPending}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${templatesMutation.isPending ? "animate-spin" : ""}`} />
                  Buscar Templates
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="test-phone">Número de Telefone</Label>
                  <Input
                    id="test-phone"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    placeholder="+5511999999999"
                  />
                  <p className="text-xs text-muted-foreground">
                    Formato E.164 com código do país (ex: +5511999999999)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="test-template">Template Aprovado</Label>
                  <Select value={testTemplateName} onValueChange={handleTemplateSelect}>
                    <SelectTrigger id="test-template">
                      <SelectValue placeholder="Selecione um template" />
                    </SelectTrigger>
                    <SelectContent>
                      {approvedTemplates.map(renderTemplateSelectItem)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Variable inputs */}
              {bodyParams.length > 0 && (
                <div className="space-y-3 rounded-lg border p-4 bg-muted/30">
                  <Label className="text-sm font-medium">Variáveis do Template</Label>
                  <p className="text-xs text-muted-foreground">
                    Preencha os valores que substituirão {"{{1}}"}, {"{{2}}"}, etc. no corpo da mensagem.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {bodyParams.map((val, idx) => (
                      <div key={idx} className="space-y-1">
                        <Label className="text-xs">{`{{${idx + 1}}}`}</Label>
                        <Input
                          value={val}
                          onChange={(e) => {
                            const updated = [...bodyParams];
                            updated[idx] = e.target.value;
                            setBodyParams(updated);
                          }}
                          placeholder={`Valor para {{${idx + 1}}}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex justify-end">
                <Button
                  onClick={() => sendTestMutation.mutate()}
                  disabled={sendTestMutation.isPending || !testPhone || !testTemplateName}
                >
                  <Send className="h-4 w-4 mr-2" />
                  {sendTestMutation.isPending ? "Enviando..." : "Enviar Teste"}
                </Button>
              </div>
              {testSendResult && (
                <div className={`rounded-lg border p-3 text-sm ${testSendResult.success ? 'border-primary/30 bg-primary/5' : 'border-destructive/20 bg-destructive/5'}`}>
                  <div className="flex items-center gap-2 font-medium">
                    {testSendResult.success ? (
                      <><CheckCircle className="h-4 w-4 text-primary" /> Mensagem enviada!{testSendResult.message_id && <span className="font-mono text-xs text-muted-foreground ml-2">ID: {testSendResult.message_id}</span>}</>
                    ) : (
                      <><XCircle className="h-4 w-4 text-destructive" /> {testSendResult.error || "Falha ao enviar"}</>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Templates do Workflow */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <LayoutTemplate className="h-4 w-4" />
            Templates do Workflow
          </CardTitle>
          <CardDescription>
            Defina quais templates aprovados serão usados automaticamente nas notificações do processo seletivo.
            As variáveis <code className="text-xs bg-muted px-1 rounded">{"{{1}}"}</code> = nome do candidato e{" "}
            <code className="text-xs bg-muted px-1 rounded">{"{{2}}"}</code> = nome da vaga serão preenchidas automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!templatesLoaded || approvedTemplates.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm space-y-3">
              <p>
                {!templatesLoaded
                  ? "Busque os templates primeiro para configurar o workflow."
                  : "Nenhum template aprovado encontrado."}
              </p>
              {!templatesLoaded && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => templatesMutation.mutate()}
                  disabled={templatesMutation.isPending}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${templatesMutation.isPending ? "animate-spin" : ""}`} />
                  Buscar Templates
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Aprovação na etapa de Fit Cultural</Label>
                  <Select value={wfCulturalTemplate} onValueChange={setWfCulturalTemplate}>
                    <SelectTrigger>
                      <SelectValue placeholder="Nenhum (usa texto livre)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Nenhum (usa texto livre)</SelectItem>
                      {approvedTemplates.map(renderTemplateSelectItem)}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Enviado quando o candidato é aprovado na etapa de Fit Cultural (e convidado para a próxima etapa).
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Aprovação na etapa de Fit Comportamental</Label>
                  <Select value={wfDiscTemplate} onValueChange={setWfDiscTemplate}>
                    <SelectTrigger>
                      <SelectValue placeholder="Nenhum (usa texto livre)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Nenhum (usa texto livre)</SelectItem>
                      {approvedTemplates.map(renderTemplateSelectItem)}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Enviado quando o candidato é aprovado na etapa de Fit Comportamental (e convidado para a próxima etapa).
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Aprovação na etapa de Fit Técnico</Label>
                  <Select value={wfTechnicalTemplate} onValueChange={setWfTechnicalTemplate}>
                    <SelectTrigger>
                      <SelectValue placeholder="Nenhum (usa texto livre)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Nenhum (usa texto livre)</SelectItem>
                      {approvedTemplates.map(renderTemplateSelectItem)}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Enviado quando o candidato é aprovado na etapa de Fit Técnico (e convidado para a próxima etapa).
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Finalização do Processo</Label>
                  <Select value={wfCompletionTemplate} onValueChange={setWfCompletionTemplate}>
                    <SelectTrigger>
                      <SelectValue placeholder="Nenhum (usa texto livre)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Nenhum (usa texto livre)</SelectItem>
                      {approvedTemplates.map(renderTemplateSelectItem)}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Enviado quando o candidato completa todas as etapas do processo seletivo.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Reprovação</Label>
                  <Select value={wfRejectionTemplate} onValueChange={setWfRejectionTemplate}>
                    <SelectTrigger>
                      <SelectValue placeholder="Nenhum (usa texto livre com IA)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Nenhum (usa texto livre com IA)</SelectItem>
                      {approvedTemplates.map(renderTemplateSelectItem)}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Enviado quando o candidato não atinge o score mínimo. Sem template, usa mensagem gerada por IA.
                  </p>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={() => saveWorkflowTemplatesMutation.mutate()}
                  disabled={saveWorkflowTemplatesMutation.isPending}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saveWorkflowTemplatesMutation.isPending ? "Salvando..." : "Salvar Templates do Workflow"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Templates */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <LayoutTemplate className="h-4 w-4" />
              Templates de Mensagem
            </CardTitle>
            <CardDescription>
              Templates aprovados na sua conta Meta Business Manager.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => templatesMutation.mutate()}
            disabled={templatesMutation.isPending}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${templatesMutation.isPending ? "animate-spin" : ""}`} />
            {templatesMutation.isPending ? "Buscando..." : "Buscar Templates"}
          </Button>
        </CardHeader>
        <CardContent>
          {!templatesLoaded ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Clique em "Buscar Templates" para listar os templates da sua conta.
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Nenhum template encontrado.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {templates.map((t, i) => {
                const statusInfo = TEMPLATE_STATUS_MAP[t.status] || { label: t.status, variant: "outline" as const };
                return (
                  <div key={i} className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono text-sm font-medium">{t.name}</span>
                      <Badge variant={statusInfo.variant} className="text-xs shrink-0">
                        {statusInfo.label}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="text-xs">
                        {CATEGORY_MAP[t.category] || t.category}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {t.language}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Logs */}
      <PlatformCommLogs channel="whatsapp" />
    </div>
  );
}
