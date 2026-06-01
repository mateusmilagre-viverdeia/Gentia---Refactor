import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAccount } from '@/hooks/useAccount';
import { toast } from 'sonner';
import { isSameMonth, isPast, differenceInDays, subMonths } from "date-fns";
import { formatBRT } from "@/lib/datetime";

// Types
export type MeetingStatus = 'draft' | 'scheduled' | 'completed' | 'cancelled';
export type MeetingItemType = 'topic' | 'action' | 'feedback' | 'blocker';
export type RecurrenceFrequency = 'weekly' | 'biweekly' | 'monthly';

export interface OneOnOneAnalytics {
  thisMonth: {
    completed: number;
    scheduled: number;
    completionRate: number;
  };
  actions: {
    total: number;
    completed: number;
    pending: number;
    overdue: number;
    completionRate: number;
  };
  collaborators: {
    total: number;
    inactive: Array<{
      collaboratorId: string;
      lastMeeting: string;
      daysSince: number;
    }>;
  };
  meetingsByCollaborator: Array<{
    collaboratorId: string;
    meetingCount: number;
    collaborator?: {
      id: string;
      first_name: string | null;
      last_name: string | null;
      avatar_url: string | null;
    };
  }>;
  monthlyTrend: Array<{
    month: string;
    total: number;
    completed: number;
  }>;
}

export interface Meeting {
  id: string;
  account_id: string;
  manager_id: string;
  collaborator_id: string;
  scheduled_at: string;
  duration_minutes: number;
  status: MeetingStatus;
  recurrence_id: string | null;
  template_id: string | null;
  notes: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  collaborator?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  };
  manager?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  };
  items?: MeetingItem[];
}

export interface MeetingItem {
  id: string;
  meeting_id: string;
  item_type: MeetingItemType;
  content: string;
  is_completed: boolean;
  due_date: string | null;
  created_by: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface MeetingTemplate {
  id: string;
  account_id: string | null;
  name: string;
  description: string | null;
  items: Array<{ type: MeetingItemType; content: string }>;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface MeetingRecurrence {
  id: string;
  account_id: string;
  manager_id: string;
  collaborator_id: string;
  frequency: RecurrenceFrequency;
  day_of_week: number | null;
  preferred_time: string | null;
  is_active: boolean;
  next_occurrence: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateMeetingInput {
  collaborator_id: string;
  scheduled_at: string;
  duration_minutes?: number;
  template_id?: string | null;
  notes?: string;
  recurrence?: {
    frequency: RecurrenceFrequency;
    day_of_week?: number;
    preferred_time?: string;
  };
}

export interface CreateMeetingItemInput {
  meeting_id: string;
  item_type: MeetingItemType;
  content: string;
  due_date?: string | null;
  order_index?: number;
}

export function useOneOnOneMeetings() {
  const { user } = useAuth();
  const { account } = useAccount();
  const queryClient = useQueryClient();

  // Fetch all meetings for the current user/account
  const {
    data: meetings = [],
    isLoading: isLoadingMeetings,
    refetch: refetchMeetings,
  } = useQuery({
    queryKey: ['one-on-one-meetings', account?.id],
    queryFn: async () => {
      if (!account?.id) return [];

      // Use any to bypass deep type instantiation
      const client = supabase as any;
      const { data, error } = await client
        .from('meetings_one_on_one')
        .select('*')
        .eq('account_id', account.id)
        .order('scheduled_at', { ascending: true });

      if (error) {
        console.error('Error fetching meetings:', error);
        return [];
      }

      // Fetch profile data for collaborators and managers
      const userIds = [...new Set([
        ...data.map((m: any) => m.collaborator_id),
        ...data.map((m: any) => m.manager_id),
      ])];

      const { data: profiles } = await client
        .from('profiles')
        .select('id, first_name, last_name, avatar_url')
        .in('id', userIds);

      const profileMap = new Map(
        (profiles || []).map((p: any) => [p.id, p])
      );

      return data.map((meeting: any) => ({
        ...meeting,
        collaborator: profileMap.get(meeting.collaborator_id),
        manager: profileMap.get(meeting.manager_id),
      })) as Meeting[];
    },
    enabled: !!account?.id,
  });

  // Fetch templates
  const {
    data: templates = [],
    isLoading: isLoadingTemplates,
  } = useQuery({
    queryKey: ['one-on-one-templates', account?.id],
    queryFn: async () => {
      const client = supabase as any;
      const { data, error } = await client
        .from('meeting_one_on_one_templates')
        .select('*')
        .or(`account_id.is.null,account_id.eq.${account?.id}`)
        .order('is_default', { ascending: false });

      if (error) {
        console.error('Error fetching templates:', error);
        return [];
      }

      return data as MeetingTemplate[];
    },
    enabled: !!account?.id,
  });

  // Fetch recurrences
  const {
    data: recurrences = [],
    isLoading: isLoadingRecurrences,
  } = useQuery({
    queryKey: ['one-on-one-recurrences', account?.id, user?.id],
    queryFn: async () => {
      if (!account?.id || !user?.id) return [];

      const client = supabase as any;
      const { data, error } = await client
        .from('meeting_one_on_one_recurrence')
        .select('*')
        .eq('account_id', account.id)
        .eq('manager_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching recurrences:', error);
        return [];
      }

      return data as MeetingRecurrence[];
    },
    enabled: !!account?.id && !!user?.id,
  });

  // Create meeting mutation
  const createMeetingMutation = useMutation({
    mutationFn: async (input: CreateMeetingInput) => {
      if (!account?.id || !user?.id) {
        throw new Error('User or account not found');
      }

      const client = supabase as any;

      // Create recurrence first if provided
      let recurrenceId: string | null = null;
      if (input.recurrence) {
        const { data: recurrenceData, error: recurrenceError } = await client
          .from('meeting_one_on_one_recurrence')
          .insert({
            account_id: account.id,
            manager_id: user.id,
            collaborator_id: input.collaborator_id,
            frequency: input.recurrence.frequency,
            day_of_week: input.recurrence.day_of_week,
            preferred_time: input.recurrence.preferred_time,
            is_active: true,
            next_occurrence: input.scheduled_at.split('T')[0],
          })
          .select()
          .single();

        if (recurrenceError) throw recurrenceError;
        recurrenceId = recurrenceData.id;
      }

      // Create the meeting
      const { data: meetingData, error: meetingError } = await client
        .from('meetings_one_on_one')
        .insert({
          account_id: account.id,
          manager_id: user.id,
          collaborator_id: input.collaborator_id,
          scheduled_at: input.scheduled_at,
          duration_minutes: input.duration_minutes || 30,
          status: 'scheduled',
          template_id: input.template_id || null,
          recurrence_id: recurrenceId,
          notes: input.notes || null,
        })
        .select()
        .single();

      if (meetingError) throw meetingError;

      // If template was selected, create items from template
      if (input.template_id) {
        const template = templates.find((t) => t.id === input.template_id);
        if (template?.items?.length) {
          const items = template.items.map((item, index) => ({
            meeting_id: meetingData.id,
            item_type: item.type,
            content: item.content,
            order_index: index,
            created_by: user.id,
          }));

          await client
            .from('meeting_one_on_one_items')
            .insert(items);
        }
      }

      return meetingData as Meeting;
    },
    onSuccess: () => {
      toast.success('Reunião criada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['one-on-one-meetings'] });
      queryClient.invalidateQueries({ queryKey: ['one-on-one-recurrences'] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar reunião: ${error.message}`);
    },
  });

  // Update meeting mutation
  const updateMeetingMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Meeting> & { id: string }) => {
      const client = supabase as any;
      const { error } = await client
        .from('meetings_one_on_one')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Reunião atualizada!');
      queryClient.invalidateQueries({ queryKey: ['one-on-one-meetings'] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar reunião: ${error.message}`);
    },
  });

  // Complete meeting
  const completeMeeting = useCallback(async (meetingId: string) => {
    const client = supabase as any;
    const { error } = await client
      .from('meetings_one_on_one')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', meetingId);

    if (error) {
      toast.error('Erro ao finalizar reunião');
      return;
    }

    toast.success('Reunião finalizada!');
    queryClient.invalidateQueries({ queryKey: ['one-on-one-meetings'] });
  }, [queryClient]);

  // Cancel meeting
  const cancelMeeting = useCallback(async (meetingId: string) => {
    const client = supabase as any;
    const { error } = await client
      .from('meetings_one_on_one')
      .update({ status: 'cancelled' })
      .eq('id', meetingId);

    if (error) {
      toast.error('Erro ao cancelar reunião');
      return;
    }

    toast.success('Reunião cancelada');
    queryClient.invalidateQueries({ queryKey: ['one-on-one-meetings'] });
  }, [queryClient]);

  // Fetch items for a specific meeting
  const fetchMeetingItems = useCallback(async (meetingId: string): Promise<MeetingItem[]> => {
    const client = supabase as any;
    const { data, error } = await client
      .from('meeting_one_on_one_items')
      .select('*')
      .eq('meeting_id', meetingId)
      .order('order_index', { ascending: true });

    if (error) {
      console.error('Error fetching meeting items:', error);
      return [];
    }

    return data as MeetingItem[];
  }, []);

  // Add item mutation
  const addItemMutation = useMutation({
    mutationFn: async (input: CreateMeetingItemInput) => {
      if (!user?.id) throw new Error('User not found');

      const client = supabase as any;
      const { data, error } = await client
        .from('meeting_one_on_one_items')
        .insert({
          ...input,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as MeetingItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['one-on-one-meeting-items'] });
    },
  });

  // Update item mutation
  const updateItemMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<MeetingItem> & { id: string }) => {
      const client = supabase as any;
      const { error } = await client
        .from('meeting_one_on_one_items')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['one-on-one-meeting-items'] });
    },
  });

  // Toggle item complete
  const toggleItemComplete = useCallback(async (itemId: string, currentValue: boolean) => {
    const client = supabase as any;
    const { error } = await client
      .from('meeting_one_on_one_items')
      .update({ is_completed: !currentValue })
      .eq('id', itemId);

    if (error) {
      toast.error('Erro ao atualizar item');
      return;
    }

    queryClient.invalidateQueries({ queryKey: ['one-on-one-meeting-items'] });
  }, [queryClient]);

  // Delete item
  const deleteItem = useCallback(async (itemId: string) => {
    const client = supabase as any;
    const { error } = await client
      .from('meeting_one_on_one_items')
      .delete()
      .eq('id', itemId);

    if (error) {
      toast.error('Erro ao remover item');
      return;
    }

    queryClient.invalidateQueries({ queryKey: ['one-on-one-meeting-items'] });
  }, [queryClient]);

  // Template mutations
  const createTemplateMutation = useMutation({
    mutationFn: async (input: { name: string; description: string; items: Array<{ type: MeetingItemType; content: string }> }) => {
      if (!account?.id) throw new Error('Account not found');

      const client = supabase as any;
      const { data, error } = await client
        .from('meeting_one_on_one_templates')
        .insert({
          account_id: account.id,
          name: input.name,
          description: input.description || null,
          items: input.items,
          is_default: false,
        })
        .select()
        .single();

      if (error) throw error;
      return data as MeetingTemplate;
    },
    onSuccess: () => {
      toast.success('Modelo criado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['one-on-one-templates'] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar modelo: ${error.message}`);
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name: string; description: string; items: Array<{ type: MeetingItemType; content: string }> }) => {
      const client = supabase as any;
      const { error } = await client
        .from('meeting_one_on_one_templates')
        .update({
          name: data.name,
          description: data.description || null,
          items: data.items,
        })
        .eq('id', id)
        .not('account_id', 'is', null); // Prevent editing global templates

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Modelo atualizado!');
      queryClient.invalidateQueries({ queryKey: ['one-on-one-templates'] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar modelo: ${error.message}`);
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      const client = supabase as any;
      const { error } = await client
        .from('meeting_one_on_one_templates')
        .delete()
        .eq('id', id)
        .not('account_id', 'is', null); // Prevent deleting global templates

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Modelo excluído!');
      queryClient.invalidateQueries({ queryKey: ['one-on-one-templates'] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir modelo: ${error.message}`);
    },
  });

  // Recurrence management
  const pauseRecurrence = useCallback(async (recurrenceId: string) => {
    const client = supabase as any;
    const { error } = await client
      .from('meeting_one_on_one_recurrence')
      .update({ is_active: false })
      .eq('id', recurrenceId);

    if (error) {
      toast.error('Erro ao pausar série');
      return;
    }

    toast.success('Série pausada');
    queryClient.invalidateQueries({ queryKey: ['one-on-one-recurrences'] });
  }, [queryClient]);

  const resumeRecurrence = useCallback(async (recurrenceId: string) => {
    const client = supabase as any;
    const { error } = await client
      .from('meeting_one_on_one_recurrence')
      .update({ is_active: true })
      .eq('id', recurrenceId);

    if (error) {
      toast.error('Erro ao reativar série');
      return;
    }

    toast.success('Série reativada');
    queryClient.invalidateQueries({ queryKey: ['one-on-one-recurrences'] });
  }, [queryClient]);

  const deleteRecurrence = useCallback(async (recurrenceId: string) => {
    const client = supabase as any;
    const { error } = await client
      .from('meeting_one_on_one_recurrence')
      .delete()
      .eq('id', recurrenceId);

    if (error) {
      toast.error('Erro ao excluir série');
      return;
    }

    toast.success('Série excluída');
    queryClient.invalidateQueries({ queryKey: ['one-on-one-recurrences'] });
  }, [queryClient]);

  // Computed values
  const upcomingMeetings = meetings.filter(
    (m) => m.status === 'scheduled' && new Date(m.scheduled_at) >= new Date()
  );

  const pastMeetings = meetings.filter(
    (m) => m.status === 'completed' || new Date(m.scheduled_at) < new Date()
  );

  const pendingActions = meetings
    .flatMap((m) => m.items || [])
    .filter((item) => item.item_type === 'action' && !item.is_completed);

  // Analytics calculation
  const analytics = useMemo((): OneOnOneAnalytics => {
    const now = new Date();
    
    // This month stats
    const thisMonth = meetings.filter(m => 
      isSameMonth(new Date(m.scheduled_at), now)
    );
    
    const completed = thisMonth.filter(m => m.status === 'completed').length;
    const scheduled = thisMonth.filter(m => 
      m.status === 'scheduled' || m.status === 'completed'
    ).length;
    
    // Actions aggregate
    const allActions = meetings.flatMap(m => m.items || [])
      .filter(i => i.item_type === 'action');
    
    const actionsCompleted = allActions.filter(a => a.is_completed).length;
    const actionsOverdue = allActions.filter(a => 
      !a.is_completed && a.due_date && isPast(new Date(a.due_date))
    ).length;
    
    // Unique collaborators
    const uniqueCollaborators = new Set(
      meetings.map(m => m.collaborator_id)
    );
    
    // Collaborators without recent meeting
    const collaboratorsLastMeeting = new Map<string, string>();
    meetings
      .filter(m => m.status === 'completed')
      .forEach(m => {
        const last = collaboratorsLastMeeting.get(m.collaborator_id);
        if (!last || new Date(m.scheduled_at) > new Date(last)) {
          collaboratorsLastMeeting.set(m.collaborator_id, m.scheduled_at);
        }
      });
    
    const inactiveCollaborators = Array.from(collaboratorsLastMeeting.entries())
      .filter(([_, date]) => differenceInDays(now, new Date(date)) > 14)
      .map(([id, date]) => ({
        collaboratorId: id,
        lastMeeting: date,
        daysSince: differenceInDays(now, new Date(date)),
      }));
    
    // Frequency by collaborator
    const meetingsByCollaborator = Array.from(
      meetings.reduce((acc, m) => {
        const count = acc.get(m.collaborator_id) || 0;
        acc.set(m.collaborator_id, count + 1);
        return acc;
      }, new Map<string, number>())
    ).map(([id, count]) => ({
      collaboratorId: id,
      meetingCount: count,
      collaborator: meetings.find(m => m.collaborator_id === id)?.collaborator,
    }));
    
    // Monthly trend (last 6 months)
    const monthlyTrend: Array<{ month: string; total: number; completed: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const monthMeetings = meetings.filter(m => 
        isSameMonth(new Date(m.scheduled_at), monthDate)
      );
      monthlyTrend.push({
        month: formatBRT(monthDate, 'MMM'),
        total: monthMeetings.length,
        completed: monthMeetings.filter(m => m.status === 'completed').length,
      });
    }
    
    return {
      thisMonth: {
        completed,
        scheduled,
        completionRate: scheduled > 0 
          ? Math.round((completed / scheduled) * 100) 
          : 0,
      },
      actions: {
        total: allActions.length,
        completed: actionsCompleted,
        pending: allActions.length - actionsCompleted,
        overdue: actionsOverdue,
        completionRate: allActions.length > 0
          ? Math.round((actionsCompleted / allActions.length) * 100)
          : 0,
      },
      collaborators: {
        total: uniqueCollaborators.size,
        inactive: inactiveCollaborators,
      },
      meetingsByCollaborator,
      monthlyTrend,
    };
  }, [meetings]);

  return {
    // Data
    meetings,
    upcomingMeetings,
    pastMeetings,
    templates,
    recurrences,
    pendingActions,
    analytics,

    // Loading states
    isLoading: isLoadingMeetings || isLoadingTemplates || isLoadingRecurrences,
    isLoadingMeetings,
    isLoadingTemplates,
    isLoadingRecurrences,

    // Mutations
    createMeeting: createMeetingMutation.mutateAsync,
    updateMeeting: updateMeetingMutation.mutateAsync,
    completeMeeting,
    cancelMeeting,
    isCreating: createMeetingMutation.isPending,
    isUpdating: updateMeetingMutation.isPending,

    // Items
    fetchMeetingItems,
    addItem: addItemMutation.mutateAsync,
    updateItem: updateItemMutation.mutateAsync,
    toggleItemComplete,
    deleteItem,

    // Templates
    createTemplate: createTemplateMutation.mutateAsync,
    updateTemplate: updateTemplateMutation.mutateAsync,
    deleteTemplate: deleteTemplateMutation.mutateAsync,
    isCreatingTemplate: createTemplateMutation.isPending,

    // Recurrences
    pauseRecurrence,
    resumeRecurrence,
    deleteRecurrence,

    // Refetch
    refetchMeetings,
  };
}
