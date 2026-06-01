import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface MetricThresholds {
  id?: string;
  account_id: string;
  
  // Alert toggles
  alert_time_to_hire: boolean;
  alert_conversion_rate: boolean;
  alert_rejection_rate: boolean;
  alert_stagnant_pipeline: boolean;
  
  // Threshold values
  max_time_to_hire_days: number;
  min_conversion_rate: number;
  max_rejection_rate: number;
  max_stagnant_days: number;
  
  // Email configuration
  email_enabled: boolean;
  email_frequency: 'instant' | 'daily' | 'weekly';
  notify_emails: string[];
  
  // Timestamps
  last_check_at?: string;
  last_alert_at?: string;
  created_at?: string;
  updated_at?: string;
}

const defaultThresholds: Omit<MetricThresholds, 'account_id'> = {
  alert_time_to_hire: true,
  alert_conversion_rate: true,
  alert_rejection_rate: true,
  alert_stagnant_pipeline: true,
  max_time_to_hire_days: 30,
  min_conversion_rate: 3.0,
  max_rejection_rate: 80.0,
  max_stagnant_days: 14,
  email_enabled: true,
  email_frequency: 'daily',
  notify_emails: [],
};

export interface MetricAlert {
  id: string;
  account_id: string;
  alert_type: 'time_to_hire' | 'conversion_rate' | 'rejection_rate' | 'stagnant_pipeline';
  metric_value: number;
  threshold_value: number;
  severity: 'info' | 'warning' | 'critical';
  is_resolved: boolean;
  resolved_at?: string;
  email_sent: boolean;
  email_sent_at?: string;
  emails_sent_to: string[];
  created_at: string;
}

export function useMetricThresholds() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [thresholds, setThresholds] = useState<MetricThresholds | null>(null);
  const [alerts, setAlerts] = useState<MetricAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [accountId, setAccountId] = useState<string | null>(null);

  // Fetch account_id from profiles
  useEffect(() => {
    const fetchAccountId = async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('id', user.id)
        .single();
      if (data?.account_id) {
        setAccountId(data.account_id);
      }
    };
    fetchAccountId();
  }, [user?.id]);

  useEffect(() => {
    if (accountId) {
      fetchThresholds();
      fetchAlerts();
    }
  }, [accountId]);

  const fetchThresholds = async () => {
    if (!accountId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('recruitment_metric_thresholds')
        .select('*')
        .eq('account_id', accountId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setThresholds({
          ...data,
          notify_emails: data.notify_emails || [],
        } as MetricThresholds);
      } else {
        setThresholds({
          ...defaultThresholds,
          account_id: accountId,
        });
      }
    } catch (error) {
      console.error('Error fetching metric thresholds:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as configurações de alertas.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAlerts = async () => {
    if (!accountId) return;

    try {
      const { data, error } = await supabase
        .from('recruitment_metric_alerts')
        .select('*')
        .eq('account_id', accountId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      setAlerts((data || []) as MetricAlert[]);
    } catch (error) {
      console.error('Error fetching metric alerts:', error);
    }
  };

  const saveThresholds = async (newThresholds: Partial<MetricThresholds>) => {
    if (!accountId) return;

    try {
      setSaving(true);

      const thresholdsToSave = {
        ...thresholds,
        ...newThresholds,
        account_id: accountId,
        updated_at: new Date().toISOString(),
      };

      const { data: existing } = await supabase
        .from('recruitment_metric_thresholds')
        .select('id')
        .eq('account_id', accountId)
        .maybeSingle();

      let error;
      if (existing) {
        const result = await supabase
          .from('recruitment_metric_thresholds')
          .update(thresholdsToSave)
          .eq('account_id', accountId);
        error = result.error;
      } else {
        const result = await supabase
          .from('recruitment_metric_thresholds')
          .insert(thresholdsToSave);
        error = result.error;
      }

      if (error) throw error;

      setThresholds(thresholdsToSave as MetricThresholds);
      
      toast({
        title: 'Configurações salvas',
        description: 'Os limites de alertas foram atualizados.',
      });
    } catch (error) {
      console.error('Error saving metric thresholds:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar as configurações.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const updateThreshold = <K extends keyof MetricThresholds>(
    key: K,
    value: MetricThresholds[K]
  ) => {
    if (!thresholds) return;
    const updated = { ...thresholds, [key]: value };
    setThresholds(updated);
  };

  const resolveAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('recruitment_metric_alerts')
        .update({
          is_resolved: true,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', alertId);

      if (error) throw error;

      setAlerts(prev => 
        prev.map(alert => 
          alert.id === alertId 
            ? { ...alert, is_resolved: true, resolved_at: new Date().toISOString() }
            : alert
        )
      );

      toast({
        title: 'Alerta resolvido',
        description: 'O alerta foi marcado como resolvido.',
      });
    } catch (error) {
      console.error('Error resolving alert:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível resolver o alerta.',
        variant: 'destructive',
      });
    }
  };

  return {
    thresholds,
    alerts,
    loading,
    saving,
    saveThresholds,
    updateThreshold,
    resolveAlert,
    refetch: fetchThresholds,
    refetchAlerts: fetchAlerts,
  };
}
