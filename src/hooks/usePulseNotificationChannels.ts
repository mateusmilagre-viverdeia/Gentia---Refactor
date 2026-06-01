import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Json } from '@/integrations/supabase/types';

export type ChannelType = 'discord' | 'slack' | 'email' | 'webhook';

export interface PulseNotificationChannel {
  id: string;
  account_id: string;
  channel_type: ChannelType;
  name: string;
  webhook_url: string | null;
  is_active: boolean;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CreateChannelData {
  channel_type: ChannelType;
  name: string;
  webhook_url?: string;
  config?: Record<string, unknown>;
}

export interface UpdateChannelData {
  name?: string;
  webhook_url?: string;
  is_active?: boolean;
  config?: Record<string, unknown>;
}

const isValidChannelType = (type: string): type is ChannelType => {
  return ['discord', 'slack', 'email', 'webhook'].includes(type);
};

export function usePulseNotificationChannels(accountId: string | null) {
  const { toast } = useToast();
  const [channels, setChannels] = useState<PulseNotificationChannel[]>([]);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);

  const fetchChannels = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pulse_notification_channels')
        .select('*')
        .eq('account_id', accountId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const parsed: PulseNotificationChannel[] = (data || [])
        .filter(ch => isValidChannelType(ch.channel_type))
        .map(ch => ({
          ...ch,
          channel_type: ch.channel_type as ChannelType,
          config: (typeof ch.config === 'object' && ch.config !== null && !Array.isArray(ch.config)) 
            ? ch.config as Record<string, unknown>
            : {}
        }));
      setChannels(parsed);
    } catch (error) {
      console.error('Error fetching notification channels:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os canais de notificação.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [accountId, toast]);

  const createChannel = useCallback(async (data: CreateChannelData): Promise<PulseNotificationChannel | null> => {
    if (!accountId) return null;
    try {
      const insertData = {
        account_id: accountId,
        channel_type: data.channel_type,
        name: data.name,
        webhook_url: data.webhook_url || null,
        config: (data.config || {}) as Json,
      };

      const { data: newChannel, error } = await supabase
        .from('pulse_notification_channels')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Canal criado',
        description: `Canal "${data.name}" configurado com sucesso.`,
      });

      await fetchChannels();
      
      // Cast to proper type
      if (newChannel && isValidChannelType(newChannel.channel_type)) {
        return {
          ...newChannel,
          channel_type: newChannel.channel_type as ChannelType,
          config: (typeof newChannel.config === 'object' && newChannel.config !== null && !Array.isArray(newChannel.config)) 
            ? newChannel.config as Record<string, unknown>
            : {}
        };
      }
      return null;
    } catch (error) {
      console.error('Error creating channel:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar o canal.',
        variant: 'destructive',
      });
      return null;
    }
  }, [accountId, fetchChannels, toast]);

  const updateChannel = useCallback(async (channelId: string, data: UpdateChannelData) => {
    try {
      const updateData: Record<string, unknown> = {
        ...data,
        updated_at: new Date().toISOString(),
      };
      if (data.config) {
        updateData.config = data.config as Json;
      }

      const { error } = await supabase
        .from('pulse_notification_channels')
        .update(updateData)
        .eq('id', channelId);

      if (error) throw error;

      toast({
        title: 'Canal atualizado',
        description: 'Alterações salvas com sucesso.',
      });

      await fetchChannels();
      return true;
    } catch (error) {
      console.error('Error updating channel:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o canal.',
        variant: 'destructive',
      });
      return false;
    }
  }, [fetchChannels, toast]);

  const deleteChannel = useCallback(async (channelId: string) => {
    try {
      const { error } = await supabase
        .from('pulse_notification_channels')
        .delete()
        .eq('id', channelId);

      if (error) throw error;

      toast({
        title: 'Canal removido',
        description: 'Canal de notificação removido.',
      });

      await fetchChannels();
      return true;
    } catch (error) {
      console.error('Error deleting channel:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível remover o canal.',
        variant: 'destructive',
      });
      return false;
    }
  }, [fetchChannels, toast]);

  const testChannel = useCallback(async (channelId: string) => {
    const channel = channels.find(c => c.id === channelId);
    if (!channel) return false;

    setTesting(channelId);
    try {
      const { data, error } = await supabase.functions.invoke('test-pulse-notification', {
        body: { channel_id: channelId }
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: '✅ Teste enviado!',
          description: `Notificação de teste enviada para "${channel.name}".`,
        });
        return true;
      } else {
        throw new Error(data?.error || 'Falha no teste');
      }
    } catch (error) {
      console.error('Error testing channel:', error);
      toast({
        title: 'Erro no teste',
        description: error instanceof Error ? error.message : 'Não foi possível enviar a notificação de teste.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setTesting(null);
    }
  }, [channels, toast]);

  const toggleChannel = useCallback(async (channelId: string, isActive: boolean) => {
    return updateChannel(channelId, { is_active: isActive });
  }, [updateChannel]);

  return {
    channels,
    loading,
    testing,
    fetchChannels,
    createChannel,
    updateChannel,
    deleteChannel,
    testChannel,
    toggleChannel,
  };
}
