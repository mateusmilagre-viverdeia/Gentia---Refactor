import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PulseGamificationRule {
  id: string;
  account_id: string | null;
  event_key: string;
  name: string;
  description: string | null;
  points: number;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
}

export interface UpdateGamificationRuleData {
  name?: string;
  description?: string;
  points?: number;
  is_active?: boolean;
}

export function usePulseGamificationRules(accountId: string | null) {
  const { toast } = useToast();
  const [rules, setRules] = useState<PulseGamificationRule[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRules = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    try {
      // Get account-specific rules or default rules
      const { data, error } = await supabase
        .from('pulse_gamification_rules')
        .select('*')
        .or(`account_id.eq.${accountId},and(account_id.is.null,is_default.eq.true)`)
        .order('event_key');

      if (error) throw error;

      // If no account rules exist, create them from defaults
      const accountRules = (data || []).filter(r => r.account_id === accountId);
      const defaultRules = (data || []).filter(r => r.is_default && r.account_id === null);

      if (accountRules.length === 0 && defaultRules.length > 0) {
        // Create account-specific copies of default rules
        const newRules = defaultRules.map(dr => ({
          account_id: accountId,
          event_key: dr.event_key,
          name: dr.name,
          description: dr.description,
          points: dr.points,
          is_active: true,
          is_default: false,
        }));

        const { data: createdRules, error: createError } = await supabase
          .from('pulse_gamification_rules')
          .insert(newRules)
          .select();

        if (createError) throw createError;
        setRules(createdRules || []);
      } else {
        setRules(accountRules.length > 0 ? accountRules : defaultRules);
      }
    } catch (error) {
      console.error('Error fetching gamification rules:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as regras de gamificação.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [accountId, toast]);

  const updateRule = useCallback(async (ruleId: string, data: UpdateGamificationRuleData) => {
    try {
      const { error } = await supabase
        .from('pulse_gamification_rules')
        .update(data)
        .eq('id', ruleId);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Regra atualizada com sucesso.',
      });

      await fetchRules();
      return true;
    } catch (error) {
      console.error('Error updating gamification rule:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar a regra.',
        variant: 'destructive',
      });
      return false;
    }
  }, [fetchRules, toast]);

  const toggleRule = useCallback(async (ruleId: string, isActive: boolean) => {
    return updateRule(ruleId, { is_active: isActive });
  }, [updateRule]);

  const updatePoints = useCallback(async (ruleId: string, points: number) => {
    return updateRule(ruleId, { points });
  }, [updateRule]);

  return {
    rules,
    loading,
    fetchRules,
    updateRule,
    toggleRule,
    updatePoints,
  };
}
