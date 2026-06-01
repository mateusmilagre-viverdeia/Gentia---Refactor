import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { 
  Webhook, 
  RefreshCw, 
  Plus, 
  Trash2, 
  List, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Copy,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

interface WebhookInfo {
  id: string;
  url: string;
  status: string;
  enabled_events: string[];
  created: string;
  description?: string;
}

interface WebhookStatus {
  configured: boolean;
  secret_configured: boolean;
  webhook: WebhookInfo | null;
  expected_url: string;
}

export function StripeWebhookDiagnostics() {
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState<string | null>(null);
  const [status, setStatus] = useState<WebhookStatus | null>(null);
  const [allWebhooks, setAllWebhooks] = useState<WebhookInfo[] | null>(null);
  const [newWebhookSecret, setNewWebhookSecret] = useState<string | null>(null);

  const callWebhookFunction = async (actionName: string) => {
    setLoading(true);
    setAction(actionName);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Você precisa estar autenticado');
        return null;
      }

      const { data, error } = await supabase.functions.invoke('stripe-setup-webhook', {
        body: { action: actionName },
      });

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Webhook function error:', error);
      toast.error(error.message || 'Erro ao executar ação');
      return null;
    } finally {
      setLoading(false);
      setAction(null);
    }
  };

  const handleCheck = async () => {
    const data = await callWebhookFunction('check');
    if (data) {
      setStatus(data);
      setAllWebhooks(null);
      setNewWebhookSecret(null);
      
      if (data.configured && data.secret_configured) {
        toast.success('Webhook configurado corretamente!');
      } else if (data.configured && !data.secret_configured) {
        toast.warning('Webhook existe mas STRIPE_WEBHOOK_SECRET não está configurado');
      } else {
        toast.info('Webhook não encontrado');
      }
    }
  };

  const handleCreate = async () => {
    const data = await callWebhookFunction('create');
    if (data) {
      if (data.action === 'created' && data.webhook_secret) {
        setNewWebhookSecret(data.webhook_secret);
        toast.success('Webhook criado! Copie o secret abaixo.');
      } else if (data.action === 'updated') {
        toast.success('Webhook atualizado com os eventos corretos');
      }
      // Refresh status
      await handleCheck();
    }
  };

  const handleDelete = async () => {
    const data = await callWebhookFunction('delete');
    if (data?.success) {
      toast.success('Webhook deletado');
      setStatus(null);
      setNewWebhookSecret(null);
    }
  };

  const handleListAll = async () => {
    const data = await callWebhookFunction('list_all');
    if (data) {
      setAllWebhooks(data.webhooks);
      toast.info(`${data.total} webhook(s) encontrado(s)`);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado para a área de transferência');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Webhook className="h-5 w-5 text-primary" />
          <CardTitle>Diagnóstico de Webhooks Stripe</CardTitle>
        </div>
        <CardDescription>
          Verifique e gerencie os webhooks do Stripe para processar eventos de assinatura
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            onClick={handleCheck}
            disabled={loading}
          >
            {loading && action === 'check' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Verificar Status
          </Button>
          
          <Button 
            variant="outline" 
            onClick={handleCreate}
            disabled={loading}
          >
            {loading && action === 'create' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            Criar/Atualizar Webhook
          </Button>
          
          <Button 
            variant="outline" 
            onClick={handleDelete}
            disabled={loading}
            className="text-destructive hover:text-destructive"
          >
            {loading && action === 'delete' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            Deletar Webhook
          </Button>
          
          <Button 
            variant="ghost" 
            onClick={handleListAll}
            disabled={loading}
          >
            {loading && action === 'list_all' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <List className="mr-2 h-4 w-4" />
            )}
            Listar Todos
          </Button>
        </div>

        {/* New Webhook Secret Alert */}
        {newWebhookSecret && (
          <Alert className="border-green-500/50 bg-green-500/10">
            <AlertTriangle className="h-4 w-4 text-green-500" />
            <AlertTitle className="text-green-500">Webhook Secret Criado!</AlertTitle>
            <AlertDescription className="space-y-2">
              <p className="text-sm">
                <strong>IMPORTANTE:</strong> Copie este secret e adicione como <code>STRIPE_WEBHOOK_SECRET</code> nos secrets do projeto.
                Este valor só é mostrado uma vez!
              </p>
              <div className="flex items-center gap-2 rounded bg-muted p-2">
                <code className="flex-1 text-xs break-all">{newWebhookSecret}</code>
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => copyToClipboard(newWebhookSecret)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Status Display */}
        {status && (
          <div className="space-y-3 rounded-lg border p-4">
            <h4 className="font-medium">Status do Webhook</h4>
            
            <div className="grid gap-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Webhook configurado:</span>
                {status.configured ? (
                  <Badge variant="outline" className="gap-1 border-green-500/50 bg-green-500/10 text-green-500">
                    <CheckCircle2 className="h-3 w-3" />
                    Sim
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1 border-red-500/50 bg-red-500/10 text-red-500">
                    <XCircle className="h-3 w-3" />
                    Não
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">STRIPE_WEBHOOK_SECRET:</span>
                {status.secret_configured ? (
                  <Badge variant="outline" className="gap-1 border-green-500/50 bg-green-500/10 text-green-500">
                    <CheckCircle2 className="h-3 w-3" />
                    Configurado
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1 border-yellow-500/50 bg-yellow-500/10 text-yellow-500">
                    <AlertTriangle className="h-3 w-3" />
                    Não configurado
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">URL esperada:</span>
                <code className="text-xs">{status.expected_url}</code>
              </div>
            </div>

            {status.webhook && (
              <div className="mt-4 space-y-2 border-t pt-4">
                <h5 className="text-sm font-medium">Detalhes do Webhook</h5>
                <div className="grid gap-1 text-xs">
                  <div><strong>ID:</strong> {status.webhook.id}</div>
                  <div><strong>URL:</strong> {status.webhook.url}</div>
                  <div><strong>Status:</strong> {status.webhook.status}</div>
                  <div><strong>Criado:</strong> {new Date(status.webhook.created).toLocaleString('pt-BR')}</div>
                  <div className="mt-2">
                    <strong>Eventos ativos:</strong>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {status.webhook.enabled_events.map((event) => (
                        <Badge key={event} variant="secondary" className="text-xs">
                          {event}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!status.secret_configured && (
              <Alert className="mt-4 border-yellow-500/50 bg-yellow-500/10">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <AlertTitle className="text-yellow-500">Ação Necessária</AlertTitle>
                <AlertDescription className="text-sm">
                  O <code>STRIPE_WEBHOOK_SECRET</code> não está configurado. 
                  {status.configured ? (
                    <span> Delete o webhook atual e crie um novo para obter o secret.</span>
                  ) : (
                    <span> Crie um novo webhook para obter o secret.</span>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* All Webhooks List */}
        {allWebhooks && (
          <div className="space-y-3 rounded-lg border p-4">
            <h4 className="font-medium">Todos os Webhooks ({allWebhooks.length})</h4>
            
            {allWebhooks.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum webhook configurado na conta Stripe</p>
            ) : (
              <div className="space-y-2">
                {allWebhooks.map((webhook) => (
                  <div key={webhook.id} className="rounded border p-3 text-sm">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-mono text-xs text-muted-foreground">{webhook.id}</div>
                        <div className="mt-1">{webhook.url}</div>
                        {webhook.description && (
                          <div className="text-xs text-muted-foreground">{webhook.description}</div>
                        )}
                      </div>
                      <Badge 
                        variant="outline" 
                        className={webhook.status === 'enabled' 
                          ? 'border-green-500/50 bg-green-500/10 text-green-500' 
                          : 'border-muted'
                        }
                      >
                        {webhook.status}
                      </Badge>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Criado: {new Date(webhook.created).toLocaleString('pt-BR')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Link to Stripe Dashboard */}
        <div className="flex items-center gap-2 pt-2 text-sm text-muted-foreground">
          <span>Gerenciar webhooks diretamente:</span>
          <a 
            href="https://dashboard.stripe.com/webhooks" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            Stripe Dashboard
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
