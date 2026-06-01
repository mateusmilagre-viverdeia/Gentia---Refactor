import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Bell, 
  Plus, 
  Settings, 
  Trash2, 
  Send, 
  Loader2,
  MessageSquare,
  Mail,
  Webhook,
  RefreshCw,
  Copy
} from 'lucide-react';
import { 
  PulseNotificationChannel, 
  ChannelType,
  CreateChannelData 
} from '@/hooks/usePulseNotificationChannels';
import { PulseNotificationMetricsPanel } from '@/components/pulse/admin/PulseNotificationMetricsPanel';

interface Props {
  accountId?: string | null;
  channels: PulseNotificationChannel[];
  loading: boolean;
  onCreate: (data: CreateChannelData) => Promise<PulseNotificationChannel | null>;
  onUpdate: (id: string, updates: Partial<PulseNotificationChannel>) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onToggle: (id: string, isActive: boolean) => Promise<boolean>;
  onTest: (id: string) => Promise<boolean>;
  onRefresh: () => Promise<void>;
}

const CHANNEL_ICONS: Record<ChannelType, React.ReactNode> = {
  discord: <MessageSquare className="h-4 w-4 text-primary" />,
  slack: <MessageSquare className="h-4 w-4 text-primary" />,
  email: <Mail className="h-4 w-4 text-primary" />,
  webhook: <Webhook className="h-4 w-4 text-primary" />,
};

const CHANNEL_LABELS: Record<ChannelType, string> = {
  discord: 'Discord',
  slack: 'Slack',
  email: 'E-mail',
  webhook: 'Webhook (Automação)',
};

const CHANNEL_DESCRIPTIONS: Record<ChannelType, string> = {
  discord: 'Enviar notificações via Discord Webhook',
  slack: 'Enviar notificações via Slack Webhook',
  email: 'Enviar notificações por e-mail',
  webhook: 'Enviar um evento JSON para automações (n8n/Zapier/Make/WhatsApp)',
};

const WEBHOOK_SAMPLE_PAYLOAD = {
  event: 'pulse.daily_ready',
  account_id: '00000000-0000-0000-0000-000000000000',
  account_name: 'Empresa Exemplo',
  channel_id: '00000000-0000-0000-0000-000000000000',
  channel_name: 'WhatsApp (Automação)',
  assignment_id: '00000000-0000-0000-0000-000000000000',
  date: '2026-01-22',
  title: '💫 Seu Pulso Diário está disponível!',
  message: 'Responda 5 perguntas rápidas sobre o pulso de quinta-feira, 22 de janeiro',
  deep_link: '/retencao/pulse',
  timestamp: '2026-01-22T12:00:00.000Z',
  metadata: {
    kind: 'daily_ready',
    questions_count: 5,
  },
};

export function PulseAdminNotifications({ 
  accountId,
  channels, 
  loading, 
  onCreate, 
  onUpdate, 
  onDelete, 
  onToggle, 
  onTest,
  onRefresh 
}: Props) {
  const { toast } = useToast();
  const derivedAccountId = channels[0]?.account_id ?? null;
  const resolvedAccountId = accountId ?? derivedAccountId;
  const [testing, setTesting] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingChannel, setEditingChannel] = useState<PulseNotificationChannel | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  // Form state
  const [formType, setFormType] = useState<ChannelType>('discord');
  const [formName, setFormName] = useState('');
  const [formWebhookUrl, setFormWebhookUrl] = useState('');
  const [formEmails, setFormEmails] = useState('');
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setFormType('discord');
    setFormName('');
    setFormWebhookUrl('');
    setFormEmails('');
  };

  const copyWebhookSample = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(WEBHOOK_SAMPLE_PAYLOAD, null, 2));
      toast({
        title: 'Copiado!',
        description: 'Exemplo de payload JSON copiado para a área de transferência.',
      });
    } catch {
      toast({
        title: 'Erro',
        description: 'Não foi possível copiar o JSON. Copie manualmente.',
        variant: 'destructive',
      });
    }
  };

  const handleCreate = async () => {
    setSaving(true);
    const data: CreateChannelData = {
      channel_type: formType,
      name: formName,
      webhook_url: formType !== 'email' ? formWebhookUrl : undefined,
      config: formType === 'email' ? { emails: formEmails.split(',').map(e => e.trim()).filter(Boolean) } : {},
    };
    
    const result = await onCreate(data);
    if (result) {
      setShowCreateModal(false);
      resetForm();
    }
    setSaving(false);
  };

  const handleEdit = async () => {
    if (!editingChannel) return;
    setSaving(true);
    
    const updates = {
      name: formName,
      webhook_url: formType !== 'email' ? formWebhookUrl : editingChannel.webhook_url,
      config: formType === 'email' 
        ? { emails: formEmails.split(',').map(e => e.trim()).filter(Boolean) }
        : editingChannel.config,
    };
    
    const success = await onUpdate(editingChannel.id, updates);
    if (success) {
      setShowEditModal(false);
      setEditingChannel(null);
      resetForm();
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    await onDelete(deleteConfirmId);
    setDeleteConfirmId(null);
  };

  const handleTest = async (channelId: string) => {
    setTesting(channelId);
    await onTest(channelId);
    setTesting(null);
  };

  const openEditModal = (channel: PulseNotificationChannel) => {
    setEditingChannel(channel);
    setFormType(channel.channel_type);
    setFormName(channel.name);
    setFormWebhookUrl(channel.webhook_url || '');
    setFormEmails(
      channel.channel_type === 'email' && channel.config?.emails
        ? (channel.config.emails as string[]).join(', ')
        : ''
    );
    setShowEditModal(true);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2].map(i => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                Canais de Notificação
              </CardTitle>
              <CardDescription>
                Configure onde você deseja receber alertas do Pulse Diário.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={onRefresh}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setFormType('webhook');
                  setFormName('WhatsApp (Automação)');
                  setFormWebhookUrl('');
                  setFormEmails('');
                  setShowCreateModal(true);
                }}
              >
                <Webhook className="h-4 w-4 mr-2" />
                WhatsApp via Automação
              </Button>
              <Button onClick={() => { resetForm(); setShowCreateModal(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Canal
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {channels.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="mb-4">Nenhum canal de notificação configurado.</p>
              <Button variant="outline" onClick={() => { resetForm(); setShowCreateModal(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Configurar primeiro canal
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {channels.map(channel => (
                <div 
                  key={channel.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-muted">
                      {CHANNEL_ICONS[channel.channel_type]}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{channel.name}</span>
                        <Badge variant={channel.is_active ? "default" : "secondary"}>
                          {channel.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {CHANNEL_LABELS[channel.channel_type]}
                        {channel.webhook_url && (
                          <span className="ml-2 text-xs">
                            ({channel.webhook_url.substring(0, 40)}...)
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={channel.is_active}
                      onCheckedChange={(checked) => onToggle(channel.id, checked)}
                    />
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleTest(channel.id)}
                      disabled={testing === channel.id || !channel.is_active}
                    >
                      {testing === channel.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => openEditModal(channel)}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteConfirmId(channel.id)}
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

      {/* Create Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Canal de Notificação</DialogTitle>
            <DialogDescription>
              Configure um novo canal para receber alertas do Pulse.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tipo de Canal</Label>
              <Select value={formType} onValueChange={(v) => setFormType(v as ChannelType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(CHANNEL_LABELS) as ChannelType[]).map(type => (
                    <SelectItem key={type} value={type}>
                      <div className="flex items-center gap-2">
                        {CHANNEL_ICONS[type]}
                        {CHANNEL_LABELS[type]}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {CHANNEL_DESCRIPTIONS[formType]}
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>Nome do Canal</Label>
              <Input
                placeholder="Ex: Equipe Comercial"
                value={formName}
                onChange={e => setFormName(e.target.value)}
              />
            </div>

            {formType !== 'email' ? (
              <div className="space-y-2">
                <Label>Webhook URL</Label>
                <Input
                  placeholder={
                    formType === 'discord' 
                      ? 'https://discord.com/api/webhooks/...' 
                      : formType === 'slack'
                      ? 'https://hooks.slack.com/services/...'
                      : 'https://seu-endpoint.com/webhook'
                  }
                  value={formWebhookUrl}
                  onChange={e => setFormWebhookUrl(e.target.value)}
                />
                {formType === 'webhook' && (
                  <div className="rounded-md border bg-muted/30 p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-muted-foreground">
                        Template "WhatsApp via Webhook": cole a URL do seu fluxo (n8n/Zapier/Make) e use o JSON abaixo como exemplo.
                      </p>
                      <Button variant="outline" size="sm" onClick={copyWebhookSample}>
                        <Copy className="h-4 w-4 mr-2" />
                        Copiar exemplo JSON
                      </Button>
                    </div>
                    <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-1">
                      <li>O sistema envia <span className="font-medium">POST</span> com <span className="font-medium">Content-Type: application/json</span>.</li>
                      <li>Evento suportado agora: <span className="font-medium">pulse.daily_ready</span>.</li>
                      <li>No n8n/Zapier, use um gatilho de Webhook e encaminhe o campo <span className="font-medium">message</span> para seu provedor de WhatsApp.</li>
                    </ul>
                    <pre className="text-xs overflow-auto rounded bg-background p-3 border">
{JSON.stringify(WEBHOOK_SAMPLE_PAYLOAD, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Label>E-mails (separados por vírgula)</Label>
                <Input
                  placeholder="email1@empresa.com, email2@empresa.com"
                  value={formEmails}
                  onChange={e => setFormEmails(e.target.value)}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCreate} 
              disabled={saving || !formName || (formType !== 'email' && !formWebhookUrl)}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Criar Canal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Canal</DialogTitle>
            <DialogDescription>
              Atualize as configurações do canal de notificação.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome do Canal</Label>
              <Input
                value={formName}
                onChange={e => setFormName(e.target.value)}
              />
            </div>

            {editingChannel?.channel_type !== 'email' ? (
              <div className="space-y-2">
                <Label>Webhook URL</Label>
                <Input
                  value={formWebhookUrl}
                  onChange={e => setFormWebhookUrl(e.target.value)}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>E-mails (separados por vírgula)</Label>
                <Input
                  value={formEmails}
                  onChange={e => setFormEmails(e.target.value)}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEdit} disabled={saving || !formName}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover canal?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O canal será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="mt-6">
        <PulseNotificationMetricsPanel accountId={resolvedAccountId} channels={channels} />
      </div>
    </>
  );
}
