import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Key, Webhook, Trash2, Copy, ExternalLink, Loader2 } from "lucide-react";
import { formatBRTRelative } from "@/lib/datetime";


const WEBHOOK_EVENTS = [
  { id: "candidate.created", label: "Candidato criado" },
  { id: "candidate.updated", label: "Candidato atualizado" },
  { id: "candidate.stage_changed", label: "Etapa do candidato alterada" },
  { id: "application.created", label: "Candidatura criada" },
  { id: "application.updated", label: "Candidatura atualizada" },
  { id: "interview.scheduled", label: "Entrevista agendada" },
  { id: "interview.completed", label: "Entrevista concluída" },
];

function generateApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let key = 'ep_';
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

function generateWebhookSecret(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let secret = 'whsec_';
  for (let i = 0; i < 24; i++) {
    secret += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return secret;
}

const OrganizationDevelopers = () => {
  const { currentAccount } = useOrganization();
  const queryClient = useQueryClient();
  
  // Dialog states
  const [apiKeyDialogOpen, setApiKeyDialogOpen] = useState(false);
  const [webhookDialogOpen, setWebhookDialogOpen] = useState(false);
  const [deleteApiKeyId, setDeleteApiKeyId] = useState<string | null>(null);
  const [deleteWebhookId, setDeleteWebhookId] = useState<string | null>(null);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  
  // Form states
  const [apiKeyName, setApiKeyName] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookEvents, setWebhookEvents] = useState<string[]>([]);

  // Fetch API keys
  const { data: apiKeys = [], isLoading: loadingApiKeys } = useQuery({
    queryKey: ["organization-api-keys", currentAccount?.id],
    queryFn: async () => {
      if (!currentAccount?.id) return [];
      const { data, error } = await supabase
        .from("organization_api_keys")
        .select("*")
        .eq("account_id", currentAccount.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!currentAccount?.id,
  });

  // Fetch webhooks
  const { data: webhooks = [], isLoading: loadingWebhooks } = useQuery({
    queryKey: ["organization-webhooks", currentAccount?.id],
    queryFn: async () => {
      if (!currentAccount?.id) return [];
      const { data, error } = await supabase
        .from("organization_webhooks")
        .select("*")
        .eq("account_id", currentAccount.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!currentAccount?.id,
  });

  // Create API key mutation - uses edge function for secure hashing
  const createApiKeyMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!currentAccount?.id) throw new Error("No account selected");
      
      // Call edge function to create hashed API key
      const { data, error } = await supabase.functions.invoke('hash-api-key', {
        body: {
          action: 'create',
          account_id: currentAccount.id,
          key_name: name,
        },
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return data.api_key;
    },
    onSuccess: (key) => {
      setNewApiKey(key);
      setApiKeyName("");
      queryClient.invalidateQueries({ queryKey: ["organization-api-keys"] });
      toast.success("API key criada com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao criar API key");
    },
  });

  // Delete API key mutation
  const deleteApiKeyMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("organization_api_keys")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      setDeleteApiKeyId(null);
      queryClient.invalidateQueries({ queryKey: ["organization-api-keys"] });
      toast.success("API key excluída");
    },
    onError: () => {
      toast.error("Erro ao excluir API key");
    },
  });

  // Create webhook mutation
  const createWebhookMutation = useMutation({
    mutationFn: async ({ url, events }: { url: string; events: string[] }) => {
      if (!currentAccount?.id) throw new Error("No account selected");
      
      const { error } = await supabase.from("organization_webhooks").insert({
        account_id: currentAccount.id,
        url,
        events,
        secret: generateWebhookSecret(),
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      setWebhookDialogOpen(false);
      setWebhookUrl("");
      setWebhookEvents([]);
      queryClient.invalidateQueries({ queryKey: ["organization-webhooks"] });
      toast.success("Webhook criado com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao criar webhook");
    },
  });

  // Toggle webhook active mutation
  const toggleWebhookMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from("organization_webhooks")
        .update({ active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization-webhooks"] });
    },
    onError: () => {
      toast.error("Erro ao atualizar webhook");
    },
  });

  // Delete webhook mutation
  const deleteWebhookMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("organization_webhooks")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      setDeleteWebhookId(null);
      queryClient.invalidateQueries({ queryKey: ["organization-webhooks"] });
      toast.success("Webhook excluído");
    },
    onError: () => {
      toast.error("Erro ao excluir webhook");
    },
  });

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success("Chave copiada!");
  };

  const toggleWebhookEvent = (eventId: string) => {
    setWebhookEvents((prev) =>
      prev.includes(eventId)
        ? prev.filter((e) => e !== eventId)
        : [...prev, eventId]
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Developers</h1>
        <p className="text-muted-foreground">
          Gerencie API keys e webhooks para integrar com sistemas externos.
        </p>
      </div>

      {/* API Keys Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              API Keys
            </CardTitle>
            <CardDescription className="mt-1.5">
              Estas chaves permitem que outros aplicativos controlem recursos da sua organização.{" "}
              <span className="text-destructive font-medium">Tenha cuidado!</span>
            </CardDescription>
          </div>
          <Dialog open={apiKeyDialogOpen} onOpenChange={(open) => {
            setApiKeyDialogOpen(open);
            if (!open) {
              setNewApiKey(null);
              setApiKeyName("");
            }
          }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Criar API key
              </Button>
            </DialogTrigger>
            <DialogContent>
              {newApiKey ? (
                <>
                  <DialogHeader>
                    <DialogTitle>API Key criada</DialogTitle>
                    <DialogDescription>
                      Copie sua chave agora. Ela não será exibida novamente.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-md font-mono text-sm break-all">
                      {newApiKey}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0"
                        onClick={() => handleCopyKey(newApiKey)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={() => {
                      setApiKeyDialogOpen(false);
                      setNewApiKey(null);
                    }}>
                      Entendi
                    </Button>
                  </DialogFooter>
                </>
              ) : (
                <>
                  <DialogHeader>
                    <DialogTitle>Criar nova API Key</DialogTitle>
                    <DialogDescription>
                      Dê um nome para identificar onde esta chave será usada.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="api-key-name">Nome</Label>
                      <Input
                        id="api-key-name"
                        placeholder="Ex: Integração com ATS"
                        value={apiKeyName}
                        onChange={(e) => setApiKeyName(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setApiKeyDialogOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={() => createApiKeyMutation.mutate(apiKeyName)}
                      disabled={!apiKeyName.trim() || createApiKeyMutation.isPending}
                    >
                      {createApiKeyMutation.isPending && (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      Criar
                    </Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {loadingApiKeys ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : apiKeys.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma API key encontrada.
            </div>
          ) : (
            <div className="divide-y">
              {apiKeys.map((key) => (
                <div key={key.id} className="flex items-center justify-between py-3">
                  <div className="space-y-1">
                    <div className="font-medium">{key.name}</div>
                    <div className="text-sm text-muted-foreground font-mono">
                      {key.key_prefix}...
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {key.last_used_at
                        ? `Último uso ${formatBRTRelative(new Date(key.last_used_at))}`
                        : "Nunca utilizada"}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeleteApiKeyId(key.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Webhooks Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Webhook className="h-5 w-5" />
              Webhooks
            </CardTitle>
            <CardDescription className="mt-1.5">
              Registre endpoints POST para ser notificado sobre eventos assíncronos.
            </CardDescription>
          </div>
          <Dialog open={webhookDialogOpen} onOpenChange={setWebhookDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Criar webhook
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar novo Webhook</DialogTitle>
                <DialogDescription>
                  Configure a URL e os eventos que deseja receber.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="webhook-url">URL do Endpoint</Label>
                  <Input
                    id="webhook-url"
                    type="url"
                    placeholder="https://seu-servidor.com/webhook"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Eventos</Label>
                  <div className="grid gap-2 max-h-48 overflow-y-auto">
                    {WEBHOOK_EVENTS.map((event) => (
                      <div key={event.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={event.id}
                          checked={webhookEvents.includes(event.id)}
                          onCheckedChange={() => toggleWebhookEvent(event.id)}
                        />
                        <label
                          htmlFor={event.id}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {event.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setWebhookDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => createWebhookMutation.mutate({ url: webhookUrl, events: webhookEvents })}
                  disabled={!webhookUrl.trim() || webhookEvents.length === 0 || createWebhookMutation.isPending}
                >
                  {createWebhookMutation.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Criar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {loadingWebhooks ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : webhooks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum webhook encontrado.
            </div>
          ) : (
            <div className="divide-y">
              {webhooks.map((webhook) => (
                <div key={webhook.id} className="flex items-center justify-between py-3">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-mono text-sm truncate">{webhook.url}</span>
                    </div>
                    <div className="flex items-center gap-1 flex-wrap">
                      {webhook.events?.slice(0, 3).map((event: string) => (
                        <Badge key={event} variant="secondary" className="text-xs">
                          {WEBHOOK_EVENTS.find((e) => e.id === event)?.label || event}
                        </Badge>
                      ))}
                      {webhook.events?.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{webhook.events.length - 3}
                        </Badge>
                      )}
                    </div>
                    {webhook.last_triggered_at && (
                      <div className="text-xs text-muted-foreground">
                        Último disparo {formatBRTRelative(new Date(webhook.last_triggered_at))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={webhook.active}
                      onCheckedChange={(active) =>
                        toggleWebhookMutation.mutate({ id: webhook.id, active })
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteWebhookId(webhook.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete API Key Dialog */}
      <AlertDialog open={!!deleteApiKeyId} onOpenChange={(open) => !open && setDeleteApiKeyId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir API Key?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Qualquer integração usando esta chave deixará de funcionar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteApiKeyId && deleteApiKeyMutation.mutate(deleteApiKeyId)}
            >
              {deleteApiKeyMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Excluir"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Webhook Dialog */}
      <AlertDialog open={!!deleteWebhookId} onOpenChange={(open) => !open && setDeleteWebhookId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Webhook?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O endpoint deixará de receber notificações.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteWebhookId && deleteWebhookMutation.mutate(deleteWebhookId)}
            >
              {deleteWebhookMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Excluir"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default OrganizationDevelopers;
