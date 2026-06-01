import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { useToast } from '@/hooks/use-toast';

export interface ConsultantNotificationPreferences {
  id: string;
  consultant_id: string;
  notify_pending_actions: boolean;
  notify_upcoming_checkpoints: boolean;
  notify_overdue_actions: boolean;
  checkpoint_reminder_days: number;
  email_notifications: boolean;
  created_at: string;
  updated_at: string;
}

const defaultPreferences: Omit<ConsultantNotificationPreferences, 'id' | 'consultant_id' | 'created_at' | 'updated_at'> = {
  notify_pending_actions: true,
  notify_upcoming_checkpoints: true,
  notify_overdue_actions: true,
  checkpoint_reminder_days: 3,
  email_notifications: true
};

export function useConsultantNotificationPreferences() {
  const { user } = useAuth();
  const { isImpersonating, impersonatedUser } = useImpersonation();
  const { toast } = useToast();
  const [preferences, setPreferences] = useState<ConsultantNotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Use impersonated user's ID when impersonating
  const effectiveUserId = isImpersonating ? impersonatedUser?.id : user?.id;

  const fetchPreferences = useCallback(async () => {
    if (!effectiveUserId) {
      setPreferences(null);
      setLoading(false);
      return;
    }

    try {
      // First get the consultant_id for this user using effectiveUserId
      const { data: consultant } = await supabase
        .from('ep_consultants')
        .select('id')
        .eq('user_id', effectiveUserId)
        .eq('active', true)
        .maybeSingle();

      if (!consultant) {
        setPreferences(null);
        setLoading(false);
        return;
      }

      // Then get preferences
      const { data, error } = await supabase
        .from('consultant_notification_preferences')
        .select('*')
        .eq('consultant_id', consultant.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setPreferences(data as ConsultantNotificationPreferences);
      } else {
        // Return default preferences structure (not saved yet)
        setPreferences({
          id: '',
          consultant_id: consultant.id,
          ...defaultPreferences,
          created_at: '',
          updated_at: ''
        });
      }
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
    } finally {
      setLoading(false);
    }
  }, [effectiveUserId]);

  const updatePreferences = useCallback(async (
    updates: Partial<Omit<ConsultantNotificationPreferences, 'id' | 'consultant_id' | 'created_at' | 'updated_at'>>
  ): Promise<boolean> => {
    if (!user || !preferences?.consultant_id) return false;

    setSaving(true);
    try {
      if (preferences.id) {
        // Update existing
        const { error } = await supabase
          .from('consultant_notification_preferences')
          .update(updates)
          .eq('id', preferences.id);

        if (error) throw error;
      } else {
        // Create new
        const { data, error } = await supabase
          .from('consultant_notification_preferences')
          .insert({
            consultant_id: preferences.consultant_id,
            ...defaultPreferences,
            ...updates
          })
          .select()
          .single();

        if (error) throw error;
        setPreferences(data as ConsultantNotificationPreferences);
      }

      setPreferences(prev => prev ? { ...prev, ...updates } : null);
      
      toast({
        title: 'Preferências salvas',
        description: 'Suas preferências de notificação foram atualizadas.',
      });

      return true;
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar as preferências.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setSaving(false);
    }
  }, [user, preferences, toast]);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  return {
    preferences,
    loading,
    saving,
    updatePreferences,
    refetch: fetchPreferences
  };
}
