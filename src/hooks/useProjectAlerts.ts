import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type ProjectAlertType = 'overdue' | 'blocked' | 'inactivity' | 'health_critical' | 'health_drop';
export type ProjectAlertSeverity = 'info' | 'warning' | 'critical';
export type ProjectAlertStatus = 'active' | 'dismissed' | 'resolved';

export interface ProjectAlert {
  id: string;
  account_id: string;
  alert_type: ProjectAlertType;
  severity: ProjectAlertSeverity;
  status: ProjectAlertStatus;
  title: string;
  description: string | null;
  dedupe_key: string;
  metadata: Record<string, unknown>;
  first_detected_at: string;
  last_detected_at: string;
  resolved_at: string | null;
  dismissed_at: string | null;
  dismissed_by: string | null;
  created_at: string;
  updated_at: string;
}

interface UseProjectAlertsReturn {
  alerts: ProjectAlert[];
  activeAlerts: ProjectAlert[];
  criticalAlerts: ProjectAlert[];
  loading: boolean;
  error: string | null;
  dismissAlert: (alertId: string) => Promise<boolean>;
  resolveAlert: (alertId: string) => Promise<boolean>;
  refreshAlerts: () => Promise<void>;
  activeCount: number;
  criticalCount: number;
}

export function useProjectAlerts(accountId: string | null): UseProjectAlertsReturn {
  const [alerts, setAlerts] = useState<ProjectAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchAlerts = useCallback(async () => {
    if (!accountId) {
      setAlerts([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('project_alerts')
        .select('*')
        .eq('account_id', accountId)
        .order('severity', { ascending: false })
        .order('last_detected_at', { ascending: false });

      if (fetchError) throw fetchError;

      const typedAlerts: ProjectAlert[] = (data || []).map(alert => ({
        ...alert,
        alert_type: alert.alert_type as ProjectAlertType,
        severity: alert.severity as ProjectAlertSeverity,
        status: alert.status as ProjectAlertStatus,
        metadata: (alert.metadata || {}) as Record<string, unknown>,
      }));

      setAlerts(typedAlerts);
    } catch (err) {
      console.error('Error fetching project alerts:', err);
      setError('Erro ao carregar alertas do projeto');
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  // Real-time subscription
  useEffect(() => {
    if (!accountId) return;

    const channel = supabase
      .channel(`project_alerts_${accountId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_alerts',
          filter: `account_id=eq.${accountId}`,
        },
        () => {
          fetchAlerts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [accountId, fetchAlerts]);

  const dismissAlert = async (alertId: string): Promise<boolean> => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { error: updateError } = await supabase
        .from('project_alerts')
        .update({
          status: 'dismissed',
          dismissed_at: new Date().toISOString(),
          dismissed_by: userData?.user?.id || null,
        })
        .eq('id', alertId);

      if (updateError) throw updateError;

      setAlerts(prev =>
        prev.map(a =>
          a.id === alertId
            ? { ...a, status: 'dismissed' as ProjectAlertStatus, dismissed_at: new Date().toISOString() }
            : a
        )
      );

      toast({
        title: "Alerta dispensado",
        description: "O alerta foi marcado como dispensado.",
      });

      return true;
    } catch (err) {
      console.error('Error dismissing alert:', err);
      toast({
        title: "Erro",
        description: "Não foi possível dispensar o alerta.",
        variant: "destructive",
      });
      return false;
    }
  };

  const resolveAlert = async (alertId: string): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('project_alerts')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
        })
        .eq('id', alertId);

      if (updateError) throw updateError;

      setAlerts(prev =>
        prev.map(a =>
          a.id === alertId
            ? { ...a, status: 'resolved' as ProjectAlertStatus, resolved_at: new Date().toISOString() }
            : a
        )
      );

      toast({
        title: "Alerta resolvido",
        description: "O alerta foi marcado como resolvido.",
      });

      return true;
    } catch (err) {
      console.error('Error resolving alert:', err);
      toast({
        title: "Erro",
        description: "Não foi possível resolver o alerta.",
        variant: "destructive",
      });
      return false;
    }
  };

  const activeAlerts = alerts.filter(a => a.status === 'active');
  const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical');

  return {
    alerts,
    activeAlerts,
    criticalAlerts,
    loading,
    error,
    dismissAlert,
    resolveAlert,
    refreshAlerts: fetchAlerts,
    activeCount: activeAlerts.length,
    criticalCount: criticalAlerts.length,
  };
}
