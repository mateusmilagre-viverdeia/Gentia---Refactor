import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type EventType = 'holiday' | 'company_event' | 'training' | 'celebration';

export interface OrgEvent {
  id: string;
  account_id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_type: EventType;
  is_recurring: boolean;
  recurrence_rule: string | null;
  created_by: string | null;
  created_at: string;
}

export interface CreateEventInput {
  title: string;
  description?: string;
  event_date: string;
  event_type: EventType;
  is_recurring?: boolean;
  recurrence_rule?: string;
}

export function useOrgEvents() {
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const accountId = currentOrganization?.id;
  const queryClient = useQueryClient();

  const eventsQuery = useQuery({
    queryKey: ['org-events', accountId],
    queryFn: async () => {
      if (!accountId) return [];
      
      const { data, error } = await supabase
        .from('org_events')
        .select('*')
        .eq('account_id', accountId)
        .order('event_date', { ascending: true });
      
      if (error) throw error;
      return data as OrgEvent[];
    },
    enabled: !!accountId,
  });

  const createEvent = useMutation({
    mutationFn: async (input: CreateEventInput) => {
      if (!accountId || !user) throw new Error('No organization or user');
      
      const { data, error } = await supabase
        .from('org_events')
        .insert({
          account_id: accountId,
          created_by: user.id,
          ...input,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-events', accountId] });
      toast.success('Evento criado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar evento: ${error.message}`);
    },
  });

  const updateEvent = useMutation({
    mutationFn: async ({ id, ...input }: Partial<OrgEvent> & { id: string }) => {
      const { data, error } = await supabase
        .from('org_events')
        .update(input)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-events', accountId] });
      toast.success('Evento atualizado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar evento: ${error.message}`);
    },
  });

  const deleteEvent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('org_events')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-events', accountId] });
      toast.success('Evento removido com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover evento: ${error.message}`);
    },
  });

  return {
    events: eventsQuery.data ?? [],
    isLoading: eventsQuery.isLoading,
    error: eventsQuery.error,
    createEvent,
    updateEvent,
    deleteEvent,
    refetch: eventsQuery.refetch,
  };
}

// Hook para próximos eventos
export function useUpcomingEvents(limit = 5) {
  const { currentOrganization } = useOrganization();
  const accountId = currentOrganization?.id;

  return useQuery({
    queryKey: ['upcoming-events', accountId, limit],
    queryFn: async () => {
      if (!accountId) return [];
      
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('org_events')
        .select('*')
        .eq('account_id', accountId)
        .gte('event_date', today)
        .order('event_date', { ascending: true })
        .limit(limit);
      
      if (error) throw error;
      return data as OrgEvent[];
    },
    enabled: !!accountId,
  });
}

// Hook para eventos de hoje
export function useTodayEvents() {
  const { currentOrganization } = useOrganization();
  const accountId = currentOrganization?.id;

  return useQuery({
    queryKey: ['today-events', accountId],
    queryFn: async () => {
      if (!accountId) return [];
      
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('org_events')
        .select('*')
        .eq('account_id', accountId)
        .eq('event_date', today);
      
      if (error) throw error;
      return data as OrgEvent[];
    },
    enabled: !!accountId,
  });
}
