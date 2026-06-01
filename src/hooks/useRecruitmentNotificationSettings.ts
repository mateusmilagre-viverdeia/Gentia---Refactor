import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface RecruitmentNotificationSettings {
  id?: string;
  account_id: string;
  notify_new_applications: boolean;
  notify_pending_evaluations: boolean;
  notify_interview_reminders: boolean;
  notify_stale_jobs: boolean;
  notify_stale_candidates: boolean;
  stale_job_days: number;
  stale_candidate_days: number;
  pending_evaluation_days: number;
  notify_owner_only: boolean;
  notify_final_evaluation: boolean;
  notify_final_evaluation_email: boolean;
  // New email options
  notify_new_applications_email: boolean;
  notify_pending_evaluations_email: boolean;
  notify_interview_reminders_email: boolean;
  notify_stale_jobs_email: boolean;
  notify_stale_candidates_email: boolean;
  // Frequency options
  digest_mode: 'realtime' | 'daily' | 'weekly';
  preferred_hour: number;
  digest_day: number;
}

const defaultSettings: Omit<RecruitmentNotificationSettings, 'account_id'> = {
  notify_new_applications: true,
  notify_pending_evaluations: true,
  notify_interview_reminders: true,
  notify_stale_jobs: true,
  notify_stale_candidates: true,
  stale_job_days: 7,
  stale_candidate_days: 5,
  pending_evaluation_days: 3,
  notify_owner_only: false,
  notify_final_evaluation: true,
  notify_final_evaluation_email: false,
  // New email options - all false by default
  notify_new_applications_email: false,
  notify_pending_evaluations_email: false,
  notify_interview_reminders_email: false,
  notify_stale_jobs_email: false,
  notify_stale_candidates_email: false,
  // Frequency options
  digest_mode: 'realtime',
  preferred_hour: 9,
  digest_day: 1,
};

export function useRecruitmentNotificationSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<RecruitmentNotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
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
      fetchSettings();
    }
  }, [accountId]);

  const fetchSettings = async () => {
    if (!accountId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('recruitment_notification_settings')
        .select('*')
        .eq('account_id', accountId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings({
          ...defaultSettings,
          ...data,
        } as RecruitmentNotificationSettings);
      } else {
        setSettings({
          ...defaultSettings,
          account_id: accountId,
        });
      }
    } catch (error) {
      console.error('Error fetching notification settings:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as configurações de notificação.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings: Partial<RecruitmentNotificationSettings>) => {
    if (!accountId) return;

    try {
      setSaving(true);

      const settingsToSave = {
        ...settings,
        ...newSettings,
        account_id: accountId,
      };

      const { data: existing } = await supabase
        .from('recruitment_notification_settings')
        .select('id')
        .eq('account_id', accountId)
        .maybeSingle();

      let error;
      if (existing) {
        const result = await supabase
          .from('recruitment_notification_settings')
          .update(settingsToSave)
          .eq('account_id', accountId);
        error = result.error;
      } else {
        const result = await supabase
          .from('recruitment_notification_settings')
          .insert(settingsToSave);
        error = result.error;
      }

      if (error) throw error;

      setSettings(settingsToSave as RecruitmentNotificationSettings);
      
      toast({
        title: 'Configurações salvas',
        description: 'As preferências de notificação foram atualizadas.',
      });
    } catch (error) {
      console.error('Error saving notification settings:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar as configurações.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof RecruitmentNotificationSettings>(
    key: K,
    value: RecruitmentNotificationSettings[K]
  ) => {
    if (!settings) return;
    const updated = { ...settings, [key]: value };
    setSettings(updated);
  };

  const sendTestNotification = async (type: 'in_app' | 'email') => {
    if (!accountId || !user?.id) return;

    try {
      setTesting(true);
      const { data, error } = await supabase.functions.invoke('test-recruitment-notification', {
        body: {
          account_id: accountId,
          user_id: user.id,
          type,
        },
      });

      if (error) throw error;

      toast({
        title: type === 'email' ? 'Email de teste enviado' : 'Notificação de teste criada',
        description: type === 'email' 
          ? 'Verifique sua caixa de entrada' 
          : 'Verifique o sino de notificações',
      });
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível enviar a notificação de teste.',
        variant: 'destructive',
      });
    } finally {
      setTesting(false);
    }
  };

  return {
    settings,
    loading,
    saving,
    testing,
    saveSettings,
    updateSetting,
    sendTestNotification,
    refetch: fetchSettings,
  };
}
