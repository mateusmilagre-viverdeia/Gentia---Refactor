import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Mail, Send, Save, CheckCircle, Plug, Copy, Check, Eye, EyeOff,
  Globe, Wifi, WifiOff, AlertTriangle, Server, Key, Pencil, X, RefreshCw
} from "lucide-react";
import { PlatformCommLogs } from "./PlatformCommLogs";

async function callEmailFunction(action: string, method: string, body?: unknown, timeoutMs = 20000) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Não autenticado");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/platform-admin-email?action=${action}`;
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Erro na requisição");
    return data;
  } finally {
    clearTimeout(timeoutId);
  }
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={handleCopy}>
      {copied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
    </Button>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-border/40 last:border-0">
      <span className="text-xs font-medium text-muted-foreground w-36 shrink-0">{label}</span>
      <div className="flex items-center gap-1.5 flex-1 justify-end">{children}</div>
    </div>
  );
}

export function EmailConfigTab() {
  const queryClient = useQueryClient();

  // General sender fields
  const [fromName, setFromName] = useState("Gentia");
  const [fromEmail, setFromEmail] = useState("");
  const [replyTo, setReplyTo] = useState("");

  // Provider selection
  const [provider, setProvider] = useState<"resend" | "smtp">("resend");

  // SMTP fields
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [smtpSecure, setSmtpSecure] = useState(true);
  const [smtpHasPassword, setSmtpHasPassword] = useState(false);
  const [changePassword, setChangePassword] = useState(false);
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);

  // Resend editable fields
  const [editingResend, setEditingResend] = useState(false);
  const [resendEndpoint, setResendEndpoint] = useState("https://api.resend.com/emails");
  const [resendApiKey, setResendApiKey] = useState("");
  const [resendHasCustomKey, setResendHasCustomKey] = useState(false);
  const [resendKeyLast4, setResendKeyLast4] = useState<string | null>(null);
  const [showResendKey, setShowResendKey] = useState(false);

  // UI
  const [testEmail, setTestEmail] = useState("");
  const [testSent, setTestSent] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  const { data: configData, isLoading } = useQuery({
    queryKey: ["platform-email-config"],
    queryFn: () => callEmailFunction("config", "GET"),
  });

  const { data: connectionData, isLoading: connectionLoading, refetch: refetchConnection } = useQuery({
    queryKey: ["platform-email-connection"],
    queryFn: () => callEmailFunction("connection", "GET"),
  });

  useEffect(() => {
    if (configData?.config) {
      const c = configData.config;
      setFromName(c.from_name || "Gentia");
      setFromEmail(c.from_email || "");
      setReplyTo(c.reply_to || "");
      setProvider(c.provider === "smtp" ? "smtp" : "resend");
      setSmtpHost(c.smtp_host || "");
      setSmtpPort(c.smtp_port || 587);
      setSmtpUser(c.smtp_user || "");
      setSmtpSecure(c.smtp_secure ?? true);
      setSmtpHasPassword(!!c.smtp_has_password);
      setResendEndpoint(c.resend_endpoint || "https://api.resend.com/emails");
      setResendHasCustomKey(!!c.resend_has_custom_key);
      setResendKeyLast4(c.resend_key_last4 || null);
    }
  }, [configData]);

  // Domain validation (only for Resend)
  const fromEmailDomain = fromEmail.split('@')[1] || '';
  const isDomainValid = provider === 'smtp' || !fromEmail || !connectionData?.domains?.length ||
    connectionData.domains.some((d: string) =>
      fromEmailDomain === d || fromEmailDomain.endsWith(`.${d}`)
    );

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = {
        from_name: fromName,
        from_email: fromEmail,
        reply_to: replyTo || null,
        provider,
      };

      if (provider === 'smtp') {
        payload.smtp_host = smtpHost;
        payload.smtp_port = smtpPort;
        payload.smtp_user = smtpUser;
        payload.smtp_secure = smtpSecure;
        if (changePassword && smtpPassword) {
          payload.smtp_password = smtpPassword;
        }
      }

      return callEmailFunction("config", "PUT", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-email-config"] });
      queryClient.invalidateQueries({ queryKey: ["platform-email-connection"] });
      setChangePassword(false);
      setSmtpPassword("");
      toast.success("Configurações salvas com sucesso!");
    },
    onError: (err: Error) => {
      const msg = err.name === 'AbortError'
        ? 'Timeout: o servidor demorou muito para responder. Tente novamente.'
        : `Erro ao salvar: ${err.message}`;
      toast.error(msg);
    },
  });

  const saveResendMutation = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = {
        resend_endpoint: resendEndpoint || 'https://api.resend.com/emails',
      };
      if (resendApiKey.trim()) {
        payload.resend_api_key = resendApiKey.trim();
      }
      return callEmailFunction("config", "PUT", payload);
    },
    onSuccess: (data) => {
      setEditingResend(false);
      setResendApiKey("");
      setShowResendKey(false);
      // Update local state from response
      if (data?.config) {
        setResendEndpoint(data.config.resend_endpoint || 'https://api.resend.com/emails');
        setResendHasCustomKey(!!data.config.resend_has_custom_key);
        setResendKeyLast4(data.config.resend_key_last4 || null);
      }
      queryClient.invalidateQueries({ queryKey: ["platform-email-config"] });
      queryClient.invalidateQueries({ queryKey: ["platform-email-connection"] });
      toast.success("Configurações do Resend salvas! Verificando conexão...");
    },
    onError: (err: Error) => {
      const msg = err.name === 'AbortError'
        ? 'Timeout: o servidor demorou muito para responder. Tente novamente.'
        : `Erro ao salvar: ${err.message}`;
      toast.error(msg);
    },
  });

  const testMutation = useMutation({
    mutationFn: () => callEmailFunction("test", "POST", { to_email: testEmail }),
    onSuccess: () => {
      setTestSent(true);
      queryClient.invalidateQueries({ queryKey: ["platform-comm-logs", "email"] });
      toast.success(`Email de teste enviado para ${testEmail}!`);
      setTimeout(() => setTestSent(false), 3000);
    },
    onError: (err: Error) => {
      const msg = err.name === 'AbortError'
        ? 'Timeout: o servidor demorou muito para responder. Tente novamente.'
        : `Erro ao enviar: ${err.message}`;
      toast.error(msg);
    },
  });

  const isConnected = connectionData?.status === 'connected';

  const isSaveDisabled = saveMutation.isPending || !isDomainValid ||
    (provider === 'smtp' && (!smtpHost || !smtpUser || (!smtpHasPassword && !smtpPassword)));

  return (
    <div className="space-y-6">

      {/* Provider Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="h-4 w-4" />
            Provedor de Email
          </CardTitle>
          <CardDescription>
            Escolha como os emails serão enviados pela plataforma.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={provider}
            onValueChange={(v) => setProvider(v as "resend" | "smtp")}
            className="grid grid-cols-1 md:grid-cols-2 gap-3"
          >
            <label
              htmlFor="provider-resend"
              className={`flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors ${provider === 'resend' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}`}
            >
              <RadioGroupItem value="resend" id="provider-resend" className="mt-0.5" />
              <div>
                <p className="text-sm font-medium">Resend API</p>
                <p className="text-xs text-muted-foreground mt-0.5">Provedor atual. Gerenciado via API Key.</p>
              </div>
            </label>
            <label
              htmlFor="provider-smtp"
              className={`flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors ${provider === 'smtp' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}`}
            >
              <RadioGroupItem value="smtp" id="provider-smtp" className="mt-0.5" />
              <div>
                <p className="text-sm font-medium">SMTP Clássico</p>
                <p className="text-xs text-muted-foreground mt-0.5">Gmail, SendGrid, Mailgun, servidor próprio...</p>
              </div>
            </label>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Connection Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Plug className="h-4 w-4" />
                {provider === 'smtp' ? 'Configuração SMTP' : 'Conexão com Resend'}
              </CardTitle>
              <CardDescription>
                {provider === 'smtp'
                  ? 'Configure as credenciais do seu servidor SMTP.'
                  : 'Detalhes técnicos de integração com o serviço Resend.'}
              </CardDescription>
            </div>
            {provider === 'resend' && !editingResend && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchConnection()}
                disabled={connectionLoading}
                className="shrink-0"
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${connectionLoading ? 'animate-spin' : ''}`} />
                Verificar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {provider === 'smtp' ? (
            /* SMTP Form */
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="smtp-host">Host SMTP</Label>
                  <Input
                    id="smtp-host"
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    placeholder="smtp.gmail.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp-port">Porta</Label>
                  <Input
                    id="smtp-port"
                    type="number"
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(Number(e.target.value))}
                    placeholder="587"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtp-user">Usuário / Email</Label>
                <Input
                  id="smtp-user"
                  value={smtpUser}
                  onChange={(e) => setSmtpUser(e.target.value)}
                  placeholder="user@gmail.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtp-password">
                  Senha SMTP
                  {smtpHasPassword && !changePassword && (
                    <span className="ml-2 text-xs text-muted-foreground font-normal">(configurada)</span>
                  )}
                </Label>
                {smtpHasPassword && !changePassword ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value="••••••••••••••••"
                      disabled
                      className="flex-1 font-mono"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setChangePassword(true)}
                    >
                      <Key className="h-3 w-3 mr-1.5" />
                      Alterar
                    </Button>
                  </div>
                ) : (
                  <div className="relative">
                    <Input
                      id="smtp-password"
                      type={showSmtpPassword ? "text" : "password"}
                      value={smtpPassword}
                      onChange={(e) => setSmtpPassword(e.target.value)}
                      placeholder={smtpHasPassword ? "Nova senha (deixe vazio para manter a atual)" : "Senha do servidor SMTP"}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1 h-8 w-8"
                      onClick={() => setShowSmtpPassword(v => !v)}
                    >
                      {showSmtpPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </Button>
                    {smtpHasPassword && changePassword && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Deixe vazio para manter a senha atual.{" "}
                        <button type="button" className="underline text-primary" onClick={() => { setChangePassword(false); setSmtpPassword(""); }}>
                          Cancelar
                        </button>
                      </p>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  id="smtp-secure"
                  checked={smtpSecure}
                  onCheckedChange={setSmtpSecure}
                />
                <Label htmlFor="smtp-secure" className="cursor-pointer">
                  Usar TLS/SSL
                  <span className="ml-1.5 text-xs text-muted-foreground font-normal">(recomendado)</span>
                </Label>
              </div>

              {/* SMTP status after save */}
              {connectionData?.provider === 'smtp' && (
                <div className="mt-2 rounded-lg border border-border/60 divide-y divide-border/40">
                  <InfoRow label="Status">
                    {isConnected ? (
                      <Badge variant="success" className="flex items-center gap-1">
                        <Wifi className="h-2.5 w-2.5" />
                        Conectado
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="flex items-center gap-1">
                        <WifiOff className="h-2.5 w-2.5" />
                        Erro de conexão
                      </Badge>
                    )}
                  </InfoRow>
                  {connectionData.status_message && (
                    <InfoRow label="Detalhe">
                      <span className="text-xs text-muted-foreground text-right">{connectionData.status_message}</span>
                    </InfoRow>
                  )}
                  <InfoRow label="Host">
                    <span className="text-xs font-mono text-muted-foreground">{connectionData.smtp_host}</span>
                  </InfoRow>
                  <InfoRow label="Porta">
                    <span className="text-xs font-mono text-muted-foreground">{connectionData.smtp_port}</span>
                  </InfoRow>
                  <InfoRow label="Segurança">
                    <Badge variant="outline" className="text-xs">
                      {connectionData.smtp_secure ? 'TLS/SSL' : 'Sem TLS'}
                    </Badge>
                  </InfoRow>
                </div>
              )}

              {!smtpHost && (
                <Alert>
                  <Server className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Preencha o Host, Usuário e Senha do servidor SMTP para habilitar o envio.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          ) : (
            /* Resend connection info */
            connectionLoading ? (
              <div className="space-y-2.5">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : editingResend ? (
              /* === Resend Edit Mode === */
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="resend-endpoint">Endpoint da API</Label>
                  <Input
                    id="resend-endpoint"
                    value={resendEndpoint}
                    onChange={(e) => setResendEndpoint(e.target.value)}
                    placeholder="https://api.resend.com/emails"
                  />
                  <p className="text-xs text-muted-foreground">
                    Padrão: <code className="font-mono bg-muted px-1 py-0.5 rounded">https://api.resend.com/emails</code>
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="resend-api-key">
                    API Key
                    {resendHasCustomKey && resendKeyLast4 && (
                      <span className="ml-2 text-xs text-muted-foreground font-normal">
                        (configurada — termina em <code className="font-mono">{resendKeyLast4}</code>)
                      </span>
                    )}
                  </Label>
                  <div className="relative">
                    <Input
                      id="resend-api-key"
                      type={showResendKey ? "text" : "password"}
                      value={resendApiKey}
                      onChange={(e) => setResendApiKey(e.target.value)}
                      placeholder={resendHasCustomKey ? `re_••••${resendKeyLast4 || '••••'}` : "re_xxxxxxxxxxxxxxxx"}
                      className="pr-10 font-mono"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1 h-8 w-8"
                      onClick={() => setShowResendKey(v => !v)}
                    >
                      {showResendKey ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {resendHasCustomKey
                      ? "Deixe em branco para manter a chave atual."
                      : "Insira a sua Resend API Key. Encontre em resend.com/api-keys."}
                  </p>
                </div>

                <div className="flex gap-2 justify-end pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingResend(false);
                      setResendApiKey("");
                      setShowResendKey(false);
                      // Reset endpoint to saved value
                      if (configData?.config?.resend_endpoint) {
                        setResendEndpoint(configData.config.resend_endpoint);
                      }
                    }}
                  >
                    <X className="h-3.5 w-3.5 mr-1.5" />
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => saveResendMutation.mutate()}
                    disabled={saveResendMutation.isPending}
                  >
                    <Save className="h-3.5 w-3.5 mr-1.5" />
                    {saveResendMutation.isPending ? "Salvando..." : "Salvar e Verificar Conexão"}
                  </Button>
                </div>
              </div>
            ) : connectionData ? (
              /* === Resend Read Mode === */
              <div>
                <div className="divide-y divide-border/40">
                  <InfoRow label="Provedor">
                    <span className="text-sm font-medium">Resend API</span>
                  </InfoRow>
                  <InfoRow label="Status">
                    <div className="flex flex-col items-end gap-0.5">
                      {isConnected ? (
                        <Badge variant="success" className="flex items-center gap-1">
                          <Wifi className="h-2.5 w-2.5" />
                          Conectado
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="flex items-center gap-1">
                          <WifiOff className="h-2.5 w-2.5" />
                          Erro de conexão
                        </Badge>
                      )}
                      {connectionData.status_message && (
                        <span className="text-xs text-muted-foreground">{connectionData.status_message}</span>
                      )}
                    </div>
                  </InfoRow>
                  <InfoRow label="Endpoint API">
                    <span className="text-xs font-mono text-muted-foreground truncate">{connectionData.endpoint}</span>
                    <CopyButton value={connectionData.endpoint} />
                  </InfoRow>
                  <InfoRow label="API Key">
                    <div className="flex flex-col items-end gap-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono text-muted-foreground">
                          {showApiKey ? connectionData.api_key_masked : 're_' + '•'.repeat(16) + connectionData.api_key_masked?.slice(-4)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={() => setShowApiKey(v => !v)}
                        >
                          {showApiKey ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </Button>
                        {showApiKey && connectionData.api_key_masked && (
                          <CopyButton value={connectionData.api_key_masked} />
                        )}
                      </div>
                      {connectionData.has_custom_key && (
                        <span className="text-xs text-muted-foreground">Chave personalizada</span>
                      )}
                    </div>
                  </InfoRow>
                  <InfoRow label="Domínios Verificados">
                    {connectionData.domains?.length > 0 ? (
                      <div className="flex flex-wrap gap-1 justify-end">
                        {connectionData.domains.map((d: string) => (
                          <Badge key={d} variant="outline" className="flex items-center gap-1 text-xs">
                            <Globe className="h-2.5 w-2.5" />
                            {d}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Nenhum domínio verificado</span>
                    )}
                  </InfoRow>
                </div>

                <div className="mt-4 flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingResend(true)}
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1.5" />
                    Editar Configurações do Resend
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Não foi possível carregar os dados de conexão.</p>
                <Button variant="outline" size="sm" onClick={() => setEditingResend(true)}>
                  <Pencil className="h-3.5 w-3.5 mr-1.5" />
                  Configurar Resend
                </Button>
              </div>
            )
          )}
        </CardContent>
      </Card>

      {/* Sender Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="h-4 w-4" />
            Configurações do Remetente
          </CardTitle>
          <CardDescription>
            Define o remetente padrão para todos os emails disparados pela plataforma.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="from-name">Nome do Remetente</Label>
                  <Input
                    id="from-name"
                    value={fromName}
                    onChange={(e) => setFromName(e.target.value)}
                    placeholder="Gentia"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="from-email">Email do Remetente</Label>
                  <Input
                    id="from-email"
                    type="email"
                    value={fromEmail}
                    onChange={(e) => setFromEmail(e.target.value)}
                    placeholder={provider === 'smtp' ? "noreply@seudominio.com" : "noreply@resend.ecpmais.com.br"}
                    className={fromEmail && !isDomainValid ? "border-destructive focus-visible:ring-destructive" : ""}
                  />
                  {fromEmail && !isDomainValid && (
                    <Alert variant="destructive" className="mt-2">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        O domínio <strong>{fromEmailDomain}</strong> não está verificado no Resend.
                        {connectionData?.domains?.length > 0 && (
                          <> Domínios válidos: {connectionData.domains.join(', ')}</>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}
                  {provider === 'resend' && connectionData?.domains?.length > 0 && (isDomainValid || !fromEmail) && (
                    <p className="text-xs text-muted-foreground">
                      Domínio verificado:{" "}
                      <code className="font-mono bg-muted px-1 py-0.5 rounded">{connectionData.domains[0]}</code>
                      {" · "}
                      <button
                        type="button"
                        className="underline text-primary hover:no-underline"
                        onClick={() => setFromEmail(`noreply@${connectionData.domains[0]}`)}
                      >
                        Usar este domínio
                      </button>
                    </p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reply-to">Reply-To <span className="text-muted-foreground">(opcional)</span></Label>
                <Input
                  id="reply-to"
                  type="email"
                  value={replyTo}
                  onChange={(e) => setReplyTo(e.target.value)}
                  placeholder="contato@gentia.com.br"
                />
              </div>
              <div className="flex justify-end">
                <Button onClick={() => saveMutation.mutate()} disabled={isSaveDisabled}>
                  <Save className="h-4 w-4 mr-2" />
                  {saveMutation.isPending ? "Salvando..." : "Salvar Configurações"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Test */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Send className="h-4 w-4" />
            Teste de Envio
          </CardTitle>
          <CardDescription>
            Envie um email de teste para verificar se as configurações estão corretas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="seu@email.com"
              className="flex-1"
            />
            <Button
              onClick={() => testMutation.mutate()}
              disabled={!testEmail || testMutation.isPending || testSent || !isDomainValid}
              variant={testSent ? "outline" : "default"}
            >
              {testSent ? (
                <><CheckCircle className="h-4 w-4 mr-2" /> Enviado!</>
              ) : testMutation.isPending ? (
                "Enviando..."
              ) : (
                <><Send className="h-4 w-4 mr-2" /> Enviar Teste</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs */}
      <PlatformCommLogs channel="email" />
    </div>
  );
}
