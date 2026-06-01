import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useEPRole } from '@/hooks/useEPRole';
import { useToast } from '@/hooks/use-toast';
import type {
  SupportTicket,
  SupportTicketMessage,
  CreateTicketInput,
  UpdateTicketInput,
  TicketFilters,
  TicketMetrics,
  TicketStatus,
  TicketPriority,
} from '@/types/support.types';

interface UseSupportTicketsOptions {
  mode?: 'user' | 'admin'; // user = only my account tickets, admin = all tickets
}

export function useSupportTickets(options: UseSupportTicketsOptions = {}) {
  const { mode = 'user' } = options;
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const { isEPTeam } = useEPRole();
  const { toast } = useToast();

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<TicketFilters>({
    status: 'all',
    priority: 'all',
    assigned_to: 'all',
    category: 'all',
  });

  const fetchTickets = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('support_tickets')
        .select(`
          *,
          account:companies!support_tickets_account_id_fkey(id, name)
        `)
        .order('created_at', { ascending: false });

      // In user mode, filter by current organization
      if (mode === 'user' && currentOrganization?.id) {
        query = query.eq('account_id', currentOrganization.id);
      }

      // Apply filters
      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters.priority && filters.priority !== 'all') {
        query = query.eq('priority', filters.priority);
      }
      if (filters.assigned_to === 'unassigned') {
        query = query.is('assigned_to', null);
      } else if (filters.assigned_to && filters.assigned_to !== 'all') {
        query = query.eq('assigned_to', filters.assigned_to);
      }
      if (filters.category && filters.category !== 'all') {
        query = query.eq('category', filters.category);
      }
      if (filters.dateRange) {
        query = query
          .gte('created_at', filters.dateRange.start.toISOString())
          .lte('created_at', filters.dateRange.end.toISOString());
      }

      const { data, error: queryError } = await query;

      if (queryError) throw queryError;

      // Fetch creator profiles
      const creatorIds = [...new Set((data || []).map(t => t.created_by))];
      const assigneeIds = [...new Set((data || []).filter(t => t.assigned_to).map(t => t.assigned_to!))];
      const allUserIds = [...new Set([...creatorIds, ...assigneeIds])];

      let profilesMap: Record<string, { id: string; first_name: string | null; last_name: string | null; email: string | null }> = {};
      
      if (allUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', allUserIds);

        if (profiles) {
          profilesMap = profiles.reduce((acc, p) => {
            acc[p.id] = p;
            return acc;
          }, {} as typeof profilesMap);
        }
      }

      const enrichedTickets: SupportTicket[] = (data || []).map(ticket => ({
        ...ticket,
        conversation_context: ticket.conversation_context as Record<string, unknown> | null,
        category: ticket.category as SupportTicket['category'],
        status: ticket.status as SupportTicket['status'],
        priority: ticket.priority as SupportTicket['priority'],
        creator: profilesMap[ticket.created_by],
        assignee: ticket.assigned_to ? profilesMap[ticket.assigned_to] : undefined,
      }));

      setTickets(enrichedTickets);
    } catch (err) {
      console.error('Error fetching tickets:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar tickets');
    } finally {
      setLoading(false);
    }
  }, [user, currentOrganization?.id, mode, filters]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Subscribe to realtime changes
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('support_tickets_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_tickets',
        },
        () => {
          fetchTickets();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchTickets]);

  const createTicket = useCallback(async (input: CreateTicketInput): Promise<SupportTicket | null> => {
    if (!user || !currentOrganization?.id) {
      toast({
        title: 'Erro',
        description: 'Usuário não autenticado ou organização não selecionada',
        variant: 'destructive',
      });
      return null;
    }

    try {
      const { data, error } = await supabase.functions.invoke('create-support-ticket', {
        body: {
          title: input.title,
          description: input.description,
          category: input.category || 'general',
          priority: input.priority || 'normal',
          conversationContext: input.conversationContext,
          pageContext: input.pageContext,
          accountId: currentOrganization.id,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: 'Chamado criado',
        description: 'Seu chamado foi aberto com sucesso. Você receberá uma resposta em breve.',
      });

      await fetchTickets();
      return data.ticket;
    } catch (err) {
      console.error('Error creating ticket:', err);
      toast({
        title: 'Erro ao criar chamado',
        description: err instanceof Error ? err.message : 'Tente novamente',
        variant: 'destructive',
      });
      return null;
    }
  }, [user, currentOrganization?.id, toast, fetchTickets]);

  const updateTicket = useCallback(async (ticketId: string, input: UpdateTicketInput): Promise<boolean> => {
    try {
      const updateData: Record<string, unknown> = { ...input };
      
      // Track SLA timestamps
      if (input.status === 'resolved') {
        updateData.resolved_at = new Date().toISOString();
      } else if (input.status === 'closed') {
        updateData.closed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('support_tickets')
        .update(updateData)
        .eq('id', ticketId);

      if (error) throw error;

      toast({
        title: 'Chamado atualizado',
        description: 'As alterações foram salvas.',
      });

      await fetchTickets();
      return true;
    } catch (err) {
      console.error('Error updating ticket:', err);
      toast({
        title: 'Erro ao atualizar chamado',
        description: err instanceof Error ? err.message : 'Tente novamente',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast, fetchTickets]);

  const addMessage = useCallback(async (
    ticketId: string, 
    content: string, 
    isInternal: boolean = false
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('support_ticket_messages')
        .insert({
          ticket_id: ticketId,
          author_id: user.id,
          content,
          is_internal: isInternal,
        });

      if (error) throw error;

      // Update first_response_at if EP team is responding
      if (isEPTeam) {
        const ticket = tickets.find(t => t.id === ticketId);
        if (ticket && !ticket.first_response_at) {
          await supabase
            .from('support_tickets')
            .update({ 
              first_response_at: new Date().toISOString(),
              status: 'in_progress',
            })
            .eq('id', ticketId);
        }
      }

      toast({
        title: isInternal ? 'Nota interna adicionada' : 'Resposta enviada',
      });

      return true;
    } catch (err) {
      console.error('Error adding message:', err);
      toast({
        title: 'Erro ao enviar mensagem',
        description: err instanceof Error ? err.message : 'Tente novamente',
        variant: 'destructive',
      });
      return false;
    }
  }, [user, isEPTeam, tickets, toast]);

  const rateResolution = useCallback(async (
    ticketId: string,
    rating: number,
    comment?: string
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({
          satisfaction_rating: rating,
          satisfaction_comment: comment || null,
          rated_at: new Date().toISOString(),
        })
        .eq('id', ticketId);

      if (error) throw error;

      toast({
        title: 'Avaliação enviada',
        description: 'Obrigado pelo seu feedback!',
      });

      await fetchTickets();
      return true;
    } catch (err) {
      console.error('Error rating ticket:', err);
      toast({
        title: 'Erro ao enviar avaliação',
        description: err instanceof Error ? err.message : 'Tente novamente',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast, fetchTickets]);

  const getTicketMessages = useCallback(async (ticketId: string): Promise<SupportTicketMessage[]> => {
    try {
      const { data, error } = await supabase
        .from('support_ticket_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch author profiles
      const authorIds = [...new Set((data || []).map(m => m.author_id))];
      let profilesMap: Record<string, { id: string; first_name: string | null; last_name: string | null; email: string | null }> = {};

      if (authorIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', authorIds);

        if (profiles) {
          profilesMap = profiles.reduce((acc, p) => {
            acc[p.id] = p;
            return acc;
          }, {} as typeof profilesMap);
        }
      }

      return (data || []).map(msg => ({
        ...msg,
        author: profilesMap[msg.author_id],
      }));
    } catch (err) {
      console.error('Error fetching messages:', err);
      return [];
    }
  }, []);

  // Calculate metrics
  const metrics: TicketMetrics = {
    total: tickets.length,
    byStatus: {
      open: tickets.filter(t => t.status === 'open').length,
      in_progress: tickets.filter(t => t.status === 'in_progress').length,
      waiting_customer: tickets.filter(t => t.status === 'waiting_customer').length,
      resolved: tickets.filter(t => t.status === 'resolved').length,
      closed: tickets.filter(t => t.status === 'closed').length,
    },
    byPriority: {
      low: tickets.filter(t => t.priority === 'low').length,
      normal: tickets.filter(t => t.priority === 'normal').length,
      high: tickets.filter(t => t.priority === 'high').length,
      urgent: tickets.filter(t => t.priority === 'urgent').length,
    },
    avgFirstResponseTime: calculateAvgFirstResponseTime(tickets),
    avgResolutionTime: calculateAvgResolutionTime(tickets),
    slaComplianceRate: calculateSlaCompliance(tickets),
    avgSatisfactionRating: calculateAvgSatisfaction(tickets),
    satisfactionCount: tickets.filter(t => t.satisfaction_rating).length,
  };

  return {
    tickets,
    loading,
    error,
    filters,
    setFilters,
    metrics,
    createTicket,
    updateTicket,
    addMessage,
    rateResolution,
    getTicketMessages,
    refetch: fetchTickets,
  };
}

// Helper functions for metrics
function calculateAvgFirstResponseTime(tickets: SupportTicket[]): number | null {
  const ticketsWithResponse = tickets.filter(t => t.first_response_at);
  if (ticketsWithResponse.length === 0) return null;

  const totalMinutes = ticketsWithResponse.reduce((sum, t) => {
    const created = new Date(t.created_at).getTime();
    const responded = new Date(t.first_response_at!).getTime();
    return sum + (responded - created) / 60000;
  }, 0);

  return Math.round(totalMinutes / ticketsWithResponse.length);
}

function calculateAvgResolutionTime(tickets: SupportTicket[]): number | null {
  const resolvedTickets = tickets.filter(t => t.resolved_at);
  if (resolvedTickets.length === 0) return null;

  const totalMinutes = resolvedTickets.reduce((sum, t) => {
    const created = new Date(t.created_at).getTime();
    const resolved = new Date(t.resolved_at!).getTime();
    return sum + (resolved - created) / 60000;
  }, 0);

  return Math.round(totalMinutes / resolvedTickets.length);
}

function calculateSlaCompliance(tickets: SupportTicket[]): number {
  const ticketsWithSla = tickets.filter(t => t.sla_due_at);
  if (ticketsWithSla.length === 0) return 100;

  const compliant = ticketsWithSla.filter(t => {
    if (t.resolved_at) {
      return new Date(t.resolved_at) <= new Date(t.sla_due_at!);
    }
    // If not resolved, check if still within SLA
    return new Date() <= new Date(t.sla_due_at!);
  }).length;

  return Math.round((compliant / ticketsWithSla.length) * 100);
}

function calculateAvgSatisfaction(tickets: SupportTicket[]): number | null {
  const ratedTickets = tickets.filter(t => t.satisfaction_rating);
  if (ratedTickets.length === 0) return null;

  const totalRating = ratedTickets.reduce((sum, t) => sum + t.satisfaction_rating!, 0);
  return Math.round((totalRating / ratedTickets.length) * 10) / 10;
}
