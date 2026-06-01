import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo, useState } from "react";
import { differenceInDays, subDays, startOfWeek, addWeeks, parseISO, isAfter, isBefore, addDays } from "date-fns";
import { formatBRT } from "@/lib/datetime";
import type { 
  CheckpointAnalytics, 
  CheckpointAnalyticsFilters,
  CheckpointByPeriod,
  CheckpointByClient,
  CheckpointByConsultant,
  UpcomingCheckpoint,
  ClientWithoutCheckpoint,
  OverdueAction,
  CheckpointAlert
} from "@/types/checkpoint-analytics.types";

interface RawCheckpoint {
  id: string;
  account_id: string;
  checkpoint_date: string;
  status: string;
  topic: string;
  created_at: string;
  company?: { id: string; name: string } | null;
}

interface RawAction {
  id: string;
  checkpoint_id: string;
  account_id: string;
  title: string;
  due_date: string | null;
  status: string;
  responsible: string;
  checkpoint?: { topic: string; account_id: string } | null;
  company?: { id: string; name: string } | null;
}

interface RawAssignment {
  account_id: string;
  consultant_id: string;
  consultant?: { id: string; name: string } | null;
}

export function useCheckpointAnalytics() {
  const [filters, setFilters] = useState<CheckpointAnalyticsFilters>({
    period: '90',
  });

  const periodDays = filters.period === 'all' ? 3650 : parseInt(filters.period);
  const startDate = subDays(new Date(), periodDays);

  // Fetch all checkpoints
  const { data: checkpoints, isLoading: loadingCheckpoints } = useQuery({
    queryKey: ['checkpoint-analytics-checkpoints', filters],
    queryFn: async () => {
      let query = supabase
        .from('project_checkpoints')
        .select(`
          id,
          account_id,
          checkpoint_date,
          status,
          topic,
          created_at,
          company:companies(id, name)
        `)
        .gte('checkpoint_date', formatBRT(startDate, 'yyyy-MM-dd'));

      if (filters.clientId) {
        query = query.eq('account_id', filters.clientId);
      }

      const { data, error } = await query.order('checkpoint_date', { ascending: false });
      if (error) throw error;
      return (data || []) as RawCheckpoint[];
    },
  });

  // Fetch all actions
  const { data: actions, isLoading: loadingActions } = useQuery({
    queryKey: ['checkpoint-analytics-actions', filters],
    queryFn: async () => {
      let query = supabase
        .from('checkpoint_actions')
        .select(`
          id,
          checkpoint_id,
          account_id,
          title,
          due_date,
          status,
          responsible,
          checkpoint:project_checkpoints(topic, account_id),
          company:companies(id, name)
        `);

      if (filters.clientId) {
        query = query.eq('account_id', filters.clientId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as RawAction[];
    },
  });

  // Fetch consultant assignments
  const { data: assignments, isLoading: loadingAssignments } = useQuery({
    queryKey: ['checkpoint-analytics-assignments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('consultant_assignments')
        .select(`
          account_id,
          consultant_id,
          consultant:ep_consultants(id, name)
        `)
        .eq('active', true);

      if (error) throw error;
      return (data || []) as RawAssignment[];
    },
  });

  // Fetch all clients (companies with active projects)
  const { data: allClients, isLoading: loadingClients } = useQuery({
    queryKey: ['checkpoint-analytics-clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name, created_at');

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch all consultants
  const { data: allConsultants, isLoading: loadingConsultants } = useQuery({
    queryKey: ['checkpoint-analytics-consultants'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ep_consultants')
        .select('id, name')
        .eq('active', true);

      if (error) throw error;
      return data || [];
    },
  });

  const analytics = useMemo<CheckpointAnalytics>(() => {
    const today = new Date();
    const safeCheckpoints = checkpoints || [];
    const safeActions = actions || [];
    const safeAssignments = assignments || [];
    const safeClients = allClients || [];
    const safeConsultants = allConsultants || [];

    // Filter by consultant if needed
    let filteredCheckpoints = safeCheckpoints;
    if (filters.consultantId) {
      const clientsForConsultant = safeAssignments
        .filter(a => a.consultant_id === filters.consultantId)
        .map(a => a.account_id);
      filteredCheckpoints = safeCheckpoints.filter(c => clientsForConsultant.includes(c.account_id));
    }

    // --- HISTORICAL METRICS ---
    const completedCheckpoints = filteredCheckpoints.filter(c => c.status === 'completed');
    const scheduledCheckpoints = filteredCheckpoints.filter(c => c.status === 'scheduled');
    const cancelledCheckpoints = filteredCheckpoints.filter(c => c.status === 'cancelled');

    const completionRate = filteredCheckpoints.length > 0
      ? Math.round((completedCheckpoints.length / (completedCheckpoints.length + cancelledCheckpoints.length || 1)) * 100)
      : 0;

    // By month
    const byMonth: CheckpointByPeriod[] = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = subDays(today, i * 30);
      const monthKey = formatBRT(monthDate, 'yyyy-MM');
      const monthLabel = formatBRT(monthDate, 'MMM');
      
      const monthCheckpoints = filteredCheckpoints.filter(c => 
        formatBRT(parseISO(c.checkpoint_date), 'yyyy-MM') === monthKey
      );

      byMonth.push({
        period: monthKey,
        label: monthLabel,
        completed: monthCheckpoints.filter(c => c.status === 'completed').length,
        scheduled: monthCheckpoints.filter(c => c.status === 'scheduled').length,
        cancelled: monthCheckpoints.filter(c => c.status === 'cancelled').length,
      });
    }

    // By client
    const clientMap = new Map<string, CheckpointByClient>();
    filteredCheckpoints.forEach(c => {
      const clientId = c.account_id;
      const clientName = c.company?.name || 'Cliente';
      
      if (!clientMap.has(clientId)) {
        clientMap.set(clientId, {
          clientId,
          clientName,
          completedCount: 0,
          scheduledCount: 0,
          totalCount: 0,
          lastCheckpointDate: null,
          pendingActionsCount: 0,
        });
      }
      
      const client = clientMap.get(clientId)!;
      client.totalCount++;
      if (c.status === 'completed') {
        client.completedCount++;
        if (!client.lastCheckpointDate || c.checkpoint_date > client.lastCheckpointDate) {
          client.lastCheckpointDate = c.checkpoint_date;
        }
      }
      if (c.status === 'scheduled') client.scheduledCount++;
    });

    // Add pending actions count to clients
    safeActions.forEach(a => {
      const client = clientMap.get(a.account_id);
      if (client && a.status !== 'completed') {
        client.pendingActionsCount++;
      }
    });

    const byClient = Array.from(clientMap.values())
      .sort((a, b) => b.totalCount - a.totalCount);

    // By consultant
    const consultantMap = new Map<string, CheckpointByConsultant>();
    safeConsultants.forEach(consultant => {
      consultantMap.set(consultant.id, {
        consultantId: consultant.id,
        consultantName: consultant.name,
        completedCount: 0,
        scheduledCount: 0,
        totalCount: 0,
        upcomingCount: 0,
      });
    });

    filteredCheckpoints.forEach(c => {
      const clientAssignments = safeAssignments.filter(a => a.account_id === c.account_id);
      clientAssignments.forEach(a => {
        const consultant = consultantMap.get(a.consultant_id);
        if (consultant) {
          consultant.totalCount++;
          if (c.status === 'completed') consultant.completedCount++;
          if (c.status === 'scheduled') {
            consultant.scheduledCount++;
            if (isAfter(parseISO(c.checkpoint_date), today)) {
              consultant.upcomingCount++;
            }
          }
        }
      });
    });

    const byConsultant = Array.from(consultantMap.values())
      .filter(c => c.totalCount > 0 || filters.consultantId === c.consultantId)
      .sort((a, b) => b.totalCount - a.totalCount);

    // Average days between checkpoints
    let totalDaysBetween = 0;
    let countPairs = 0;
    byClient.forEach(client => {
      const clientCheckpoints = completedCheckpoints
        .filter(c => c.account_id === client.clientId)
        .sort((a, b) => a.checkpoint_date.localeCompare(b.checkpoint_date));
      
      for (let i = 1; i < clientCheckpoints.length; i++) {
        const days = differenceInDays(
          parseISO(clientCheckpoints[i].checkpoint_date),
          parseISO(clientCheckpoints[i - 1].checkpoint_date)
        );
        totalDaysBetween += days;
        countPairs++;
      }
    });
    const avgDaysBetweenCheckpoints = countPairs > 0 ? Math.round(totalDaysBetween / countPairs) : 0;

    // --- ACTIONS METRICS ---
    const completedActions = safeActions.filter(a => a.status === 'completed');
    const pendingActions = safeActions.filter(a => a.status === 'pending');
    const inProgressActions = safeActions.filter(a => a.status === 'in_progress');
    const overdueActions = safeActions.filter(a => 
      a.status !== 'completed' && 
      a.due_date && 
      isBefore(parseISO(a.due_date), today)
    );

    const actionsCompletionRate = safeActions.length > 0
      ? Math.round((completedActions.length / safeActions.length) * 100)
      : 0;

    const overdueActionsList: OverdueAction[] = overdueActions
      .map(a => ({
        id: a.id,
        title: a.title,
        dueDate: a.due_date!,
        daysOverdue: differenceInDays(today, parseISO(a.due_date!)),
        clientId: a.account_id,
        clientName: a.company?.name || 'Cliente',
        responsible: a.responsible,
        checkpointTopic: a.checkpoint?.topic || '',
      }))
      .sort((a, b) => b.daysOverdue - a.daysOverdue);

    const upcomingDeadlines: OverdueAction[] = safeActions
      .filter(a => 
        a.status !== 'completed' && 
        a.due_date && 
        isAfter(parseISO(a.due_date), today) &&
        isBefore(parseISO(a.due_date), addDays(today, 7))
      )
      .map(a => ({
        id: a.id,
        title: a.title,
        dueDate: a.due_date!,
        daysOverdue: 0,
        clientId: a.account_id,
        clientName: a.company?.name || 'Cliente',
        responsible: a.responsible,
        checkpointTopic: a.checkpoint?.topic || '',
      }))
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

    // --- UPCOMING METRICS ---
    const futureCheckpoints = scheduledCheckpoints.filter(c => 
      isAfter(parseISO(c.checkpoint_date), today) || 
      formatBRT(parseISO(c.checkpoint_date), 'yyyy-MM-dd') === formatBRT(today, 'yyyy-MM-dd')
    );

    const next7Days = futureCheckpoints.filter(c => 
      isBefore(parseISO(c.checkpoint_date), addDays(today, 7))
    ).length;
    const next14Days = futureCheckpoints.filter(c => 
      isBefore(parseISO(c.checkpoint_date), addDays(today, 14))
    ).length;
    const next30Days = futureCheckpoints.filter(c => 
      isBefore(parseISO(c.checkpoint_date), addDays(today, 30))
    ).length;

    // By week
    const byWeek: { weekStart: string; weekLabel: string; count: number }[] = [];
    for (let i = 0; i < 4; i++) {
      const weekStart = startOfWeek(addWeeks(today, i), { weekStartsOn: 1 });
      const weekEnd = addDays(weekStart, 6);
      const weekLabel = `${formatBRT(weekStart, 'dd/MM')} - ${formatBRT(weekEnd, 'dd/MM')}`;
      
      const count = futureCheckpoints.filter(c => {
        const date = parseISO(c.checkpoint_date);
        return (isAfter(date, weekStart) || formatBRT(date, 'yyyy-MM-dd') === formatBRT(weekStart, 'yyyy-MM-dd')) && 
               isBefore(date, addDays(weekEnd, 1));
      }).length;

      byWeek.push({
        weekStart: formatBRT(weekStart, 'yyyy-MM-dd'),
        weekLabel,
        count,
      });
    }

    // Upcoming checkpoints list
    const upcomingCheckpoints: UpcomingCheckpoint[] = futureCheckpoints
      .slice(0, 10)
      .map(c => {
        const clientAssignments = safeAssignments.filter(a => a.account_id === c.account_id);
        return {
          id: c.id,
          checkpointDate: c.checkpoint_date,
          topic: c.topic,
          status: c.status,
          clientId: c.account_id,
          clientName: c.company?.name || 'Cliente',
          consultantNames: clientAssignments.map(a => a.consultant?.name || '').filter(Boolean),
        };
      })
      .sort((a, b) => a.checkpointDate.localeCompare(b.checkpointDate));

    // Clients without future checkpoint
    const clientsWithFutureCheckpoint = new Set(futureCheckpoints.map(c => c.account_id));
    const clientsWithoutFutureCheckpoint: ClientWithoutCheckpoint[] = safeClients
      .filter(client => !clientsWithFutureCheckpoint.has(client.id))
      .map(client => {
        const clientData = byClient.find(c => c.clientId === client.id);
        const hasConsultant = safeAssignments.some(a => a.account_id === client.id);
        const lastCheckpointDate = clientData?.lastCheckpointDate || null;
        
        return {
          id: client.id,
          name: client.name,
          lastCheckpointDate,
          daysSinceLastCheckpoint: lastCheckpointDate 
            ? differenceInDays(today, parseISO(lastCheckpointDate))
            : null,
          hasConsultant,
        };
      })
      .sort((a, b) => (b.daysSinceLastCheckpoint || 999) - (a.daysSinceLastCheckpoint || 999));

    // --- ALERTS ---
    const clientsInactive = clientsWithoutFutureCheckpoint.filter(c => 
      c.daysSinceLastCheckpoint !== null && c.daysSinceLastCheckpoint > 30
    );

    const consultantsWithEmptyAgenda = safeConsultants
      .filter(consultant => {
        const consultantClients = safeAssignments
          .filter(a => a.consultant_id === consultant.id)
          .map(a => a.account_id);
        
        const hasUpcoming = futureCheckpoints.some(c => consultantClients.includes(c.account_id));
        return !hasUpcoming;
      })
      .map(c => ({ id: c.id, name: c.name }));

    const alerts: CheckpointAlert[] = [];
    
    if (clientsInactive.length > 0) {
      alerts.push({
        type: 'inactive_client',
        severity: 'high',
        title: 'Clientes Inativos',
        description: `${clientsInactive.length} clientes sem checkpoint há mais de 30 dias`,
        count: clientsInactive.length,
        relatedIds: clientsInactive.map(c => c.id),
      });
    }

    if (overdueActionsList.length > 0) {
      alerts.push({
        type: 'overdue_action',
        severity: 'high',
        title: 'Ações Atrasadas',
        description: `${overdueActionsList.length} ações passaram do prazo`,
        count: overdueActionsList.length,
      });
    }

    if (consultantsWithEmptyAgenda.length > 0) {
      alerts.push({
        type: 'empty_agenda',
        severity: 'medium',
        title: 'Consultores sem Agenda',
        description: `${consultantsWithEmptyAgenda.length} consultores sem checkpoints agendados`,
        count: consultantsWithEmptyAgenda.length,
      });
    }

    const clientsNeverHadCheckpoint = clientsWithoutFutureCheckpoint.filter(c => c.daysSinceLastCheckpoint === null);
    if (clientsNeverHadCheckpoint.length > 0) {
      alerts.push({
        type: 'no_checkpoints',
        severity: 'medium',
        title: 'Clientes sem Histórico',
        description: `${clientsNeverHadCheckpoint.length} clientes nunca tiveram checkpoint`,
        count: clientsNeverHadCheckpoint.length,
      });
    }

    return {
      historical: {
        totalCompleted: completedCheckpoints.length,
        totalScheduled: scheduledCheckpoints.length,
        totalCancelled: cancelledCheckpoints.length,
        completionRate,
        byMonth,
        byClient,
        byConsultant,
        avgDaysBetweenCheckpoints,
      },
      actions: {
        total: safeActions.length,
        completed: completedActions.length,
        pending: pendingActions.length,
        inProgress: inProgressActions.length,
        overdue: overdueActions.length,
        completionRate: actionsCompletionRate,
        overdueActions: overdueActionsList,
        upcomingDeadlines,
      },
      upcoming: {
        next7Days,
        next14Days,
        next30Days,
        byWeek,
        byConsultant: byConsultant.filter(c => c.upcomingCount > 0),
        clientsWithoutFutureCheckpoint,
        upcomingCheckpoints,
      },
      alerts: {
        clientsInactive,
        consultantsWithEmptyAgenda,
        overdueActions: overdueActionsList,
        alerts,
      },
      isLoading: loadingCheckpoints || loadingActions || loadingAssignments || loadingClients || loadingConsultants,
      error: null,
    };
  }, [checkpoints, actions, assignments, allClients, allConsultants, filters]);

  return {
    analytics,
    filters,
    setFilters,
    consultants: allConsultants || [],
    clients: allClients || [],
  };
}
