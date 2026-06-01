import { useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ParticipationAlert {
  id: string;
  alert_type: 'low_participation';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string | null;
  is_read: boolean;
  is_resolved: boolean;
  related_user_id: string | null;
  related_team_id: string | null;
  created_at: string;
  metadata: {
    days_inactive?: number;
    last_response_date?: string | null;
    participation_rate?: number;
    total_members?: number;
    responded_count?: number;
  } | null;
  pulse_teams?: {
    name: string;
  } | null;
  profiles?: {
    first_name: string | null;
    last_name: string | null;
  } | null;
}

export function usePulseParticipationAlerts(accountId: string | null) {
  const [alerts, setAlerts] = useState<ParticipationAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchAlerts = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('pulse_alerts')
        .select(`
          id,
          alert_type,
          severity,
          title,
          description,
          is_read,
          is_resolved,
          related_user_id,
          related_team_id,
          created_at,
          pulse_teams:related_team_id(name)
        `)
        .eq('account_id', accountId)
        .eq('alert_type', 'low_participation')
        .eq('is_resolved', false)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profile names for member alerts
      const alertsData = data as unknown as Array<{
        id: string;
        alert_type: string;
        severity: string;
        title: string;
        description: string | null;
        is_read: boolean;
        is_resolved: boolean;
        related_user_id: string | null;
        related_team_id: string | null;
        created_at: string;
        pulse_teams: { name: string } | null;
      }>;
      
      const memberAlerts = alertsData?.filter(a => a.related_user_id) || [];
      const userIds = memberAlerts.map(a => a.related_user_id).filter(Boolean) as string[];

      let profilesMap = new Map<string, { first_name: string | null; last_name: string | null }>();
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', userIds);

        profiles?.forEach(p => {
          profilesMap.set(p.id, { first_name: p.first_name, last_name: p.last_name });
        });
      }

      const alertsWithProfiles = (alertsData || []).map(alert => ({
        ...alert,
        metadata: null,
        profiles: alert.related_user_id ? profilesMap.get(alert.related_user_id) || null : null,
      })) as ParticipationAlert[];

      setAlerts(alertsWithProfiles);
    } catch (error) {
      console.error('Error fetching participation alerts:', error);
      toast({
        title: 'Erro ao carregar alertas',
        description: 'Não foi possível carregar os alertas de participação.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [accountId, toast]);

  const markAsRead = useCallback(async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('pulse_alerts')
        .update({ is_read: true })
        .eq('id', alertId);

      if (error) throw error;

      setAlerts(prev => prev.map(a => 
        a.id === alertId ? { ...a, is_read: true } : a
      ));
    } catch (error) {
      console.error('Error marking alert as read:', error);
    }
  }, []);

  const resolveAlert = useCallback(async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('pulse_alerts')
        .update({ 
          is_resolved: true,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', alertId);

      if (error) throw error;

      setAlerts(prev => prev.filter(a => a.id !== alertId));
      
      toast({
        title: 'Alerta resolvido',
        description: 'O alerta foi marcado como resolvido.',
      });
    } catch (error) {
      console.error('Error resolving alert:', error);
      toast({
        title: 'Erro ao resolver alerta',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const dismissAlert = useCallback(async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('pulse_alerts')
        .update({ 
          is_resolved: true,
          resolved_at: new Date().toISOString(),
          metadata: supabase.rpc ? undefined : { dismissed: true },
        })
        .eq('id', alertId);

      if (error) throw error;

      setAlerts(prev => prev.filter(a => a.id !== alertId));
      
      toast({
        title: 'Alerta dispensado',
      });
    } catch (error) {
      console.error('Error dismissing alert:', error);
    }
  }, [toast]);

  // Derived data - count member alerts (have related_user_id)
  const inactiveCount = useMemo(() => 
    alerts.filter(a => a.related_user_id !== null).length,
  [alerts]);

  // Count team alerts (have related_team_id but no related_user_id)
  const teamAlertCount = useMemo(() => 
    alerts.filter(a => a.related_user_id === null && a.related_team_id !== null).length,
  [alerts]);

  const unreadCount = useMemo(() => 
    alerts.filter(a => !a.is_read).length,
  [alerts]);

  const byTeam = useMemo(() => {
    const map = new Map<string, ParticipationAlert[]>();
    
    alerts.forEach(alert => {
      const teamName = alert.pulse_teams?.name || 'Sem time';
      if (!map.has(teamName)) {
        map.set(teamName, []);
      }
      map.get(teamName)!.push(alert);
    });

    return Object.fromEntries(map);
  }, [alerts]);

  const criticalAlerts = useMemo(() => 
    alerts.filter(a => a.severity === 'critical'),
  [alerts]);

  return {
    alerts,
    loading,
    fetchAlerts,
    markAsRead,
    resolveAlert,
    dismissAlert,
    inactiveCount,
    teamAlertCount,
    unreadCount,
    byTeam,
    criticalAlerts,
  };
}
