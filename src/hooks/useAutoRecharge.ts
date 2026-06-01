import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

export interface AutoRechargeSettings {
  id?: string;
  org_id: string;
  enabled: boolean;
  threshold: number;
  recharge_package_id: string | null;
  last_recharge_at?: string | null;
  last_recharge_status?: string | null;
  last_recharge_reason?: string | null;
  last_recharge_invoice_id?: string | null;
}

export interface AutoRechargeAttempt {
  id: string;
  status: string;
  reason: string | null;
  invoice_id: string | null;
  credits_added: number | null;
  amount_charged: number | null;
  error_message: string | null;
  triggered_by: string | null;
  created_at: string;
}

interface UseAutoRechargeReturn {
  settings: AutoRechargeSettings | null;
  attempts: AutoRechargeAttempt[];
  isLoading: boolean;
  isSaving: boolean;
  save: (data: Partial<AutoRechargeSettings>) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useAutoRecharge(): UseAutoRechargeReturn {
  const { currentOrganization } = useOrganization();
  const [settings, setSettings] = useState<AutoRechargeSettings | null>(null);
  const [attempts, setAttempts] = useState<AutoRechargeAttempt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetch = useCallback(async () => {
    if (!currentOrganization?.id) {
      setSettings(null);
      setAttempts([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const [{ data, error }, attemptsRes] = await Promise.all([
        supabase
          .from('org_auto_recharge_settings')
          .select('*')
          .eq('org_id', currentOrganization.id)
          .maybeSingle(),
        supabase
          .from('recruitment_auto_recharge_attempts')
          .select('id, status, reason, invoice_id, credits_added, amount_charged, error_message, triggered_by, created_at')
          .eq('org_id', currentOrganization.id)
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      if (error) throw error;

      setSettings(data ? {
        id: data.id,
        org_id: data.org_id,
        enabled: data.enabled,
        threshold: Number(data.threshold),
        recharge_package_id: data.recharge_package_id,
        last_recharge_at: (data as any).last_recharge_at ?? null,
        last_recharge_status: (data as any).last_recharge_status ?? null,
        last_recharge_reason: (data as any).last_recharge_reason ?? null,
        last_recharge_invoice_id: (data as any).last_recharge_invoice_id ?? null,
      } : {
        org_id: currentOrganization.id,
        enabled: false,
        threshold: 5,
        recharge_package_id: null,
      });

      setAttempts((attemptsRes.data as AutoRechargeAttempt[]) || []);
    } catch (err) {
      console.error('Error fetching auto-recharge settings:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentOrganization?.id]);

  useEffect(() => { fetch(); }, [fetch]);

  const save = useCallback(async (data: Partial<AutoRechargeSettings>) => {
    if (!currentOrganization?.id) return;

    setIsSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();

      const upsertData = {
        org_id: currentOrganization.id,
        enabled: data.enabled ?? settings?.enabled ?? false,
        threshold: data.threshold ?? settings?.threshold ?? 5,
        recharge_package_id: data.recharge_package_id ?? settings?.recharge_package_id,
        updated_by: userData.user?.id,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('org_auto_recharge_settings')
        .upsert(upsertData, { onConflict: 'org_id' });

      if (error) throw error;

      toast.success(data.enabled
        ? 'Recarga automática ativada com sucesso!'
        : 'Configurações de recarga salvas'
      );
      await fetch();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar configurações';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }, [currentOrganization?.id, settings, fetch]);

  return { settings, attempts, isLoading, isSaving, save, refresh: fetch };
}
