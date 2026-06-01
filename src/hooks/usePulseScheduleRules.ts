import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Json } from '@/integrations/supabase/types';

export interface PulseScheduleRule {
  id: string;
  account_id: string;
  daily_questions_count: number | null;
  must_include_driver_keys: string[];
  prefer_driver_keys: string[];
  rotation_pool_driver_keys: string[];
  anonymous_driver_keys: string[];
  max_repeat_block_days: number | null;
  // Culture-specific repetition blocking / rotation
  culture_max_repeat_block_days: number | null;
  culture_rotation_enabled: boolean | null;
  culture_rotation_next_pillar: string | null;
  timezone: string | null;
  is_active: boolean | null;
  culture_questions_count: number | null;
  weekdays_only: boolean | null;
  // New scheduling fields
  send_time: string | null;
  send_days: number[];
  is_recurring: boolean | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface UpdateScheduleRulesData {
  daily_questions_count?: number;
  must_include_driver_keys?: string[];
  prefer_driver_keys?: string[];
  rotation_pool_driver_keys?: string[];
  anonymous_driver_keys?: string[];
  max_repeat_block_days?: number;
  // Culture-specific repetition blocking / rotation
  culture_max_repeat_block_days?: number;
  culture_rotation_enabled?: boolean;
  culture_rotation_next_pillar?: string | null;
  timezone?: string;
  is_active?: boolean;
  culture_questions_count?: number;
  weekdays_only?: boolean;
  // New scheduling fields
  send_time?: string;
  send_days?: number[];
  is_recurring?: boolean;
  start_date?: string | null;
  end_date?: string | null;
}

const DEFAULT_RULES: Omit<PulseScheduleRule, 'id' | 'account_id' | 'created_at' | 'updated_at'> = {
  daily_questions_count: 3,
  must_include_driver_keys: [],
  prefer_driver_keys: [],
  rotation_pool_driver_keys: [],
  anonymous_driver_keys: [],
  max_repeat_block_days: 30,
  culture_max_repeat_block_days: 14,
  culture_rotation_enabled: true,
  culture_rotation_next_pillar: 'mission',
  timezone: 'America/Sao_Paulo',
  is_active: true,
  culture_questions_count: 2,
  weekdays_only: true,
  // New defaults
  send_time: '08:59',
  send_days: [1, 2, 3, 4, 5], // Mon-Fri
  is_recurring: true,
  start_date: null,
  end_date: null,
};

// Helper to safely parse integer arrays
const parseIntArray = (value: unknown): number[] => {
  if (!value) return [1, 2, 3, 4, 5];
  if (Array.isArray(value)) return value.map(Number);
  return [1, 2, 3, 4, 5];
};

// Helper to safely parse JSON arrays
const parseJsonArray = (value: Json | null): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value as string[];
  return [];
};

export function usePulseScheduleRules(accountId: string | null) {
  const { toast } = useToast();
  const [rules, setRules] = useState<PulseScheduleRule | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchRules = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pulse_schedule_rules')
        .select('*')
        .eq('account_id', accountId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        const parsedData: PulseScheduleRule = {
          ...data,
          must_include_driver_keys: parseJsonArray(data.must_include_driver_keys),
          prefer_driver_keys: parseJsonArray(data.prefer_driver_keys),
          rotation_pool_driver_keys: parseJsonArray(data.rotation_pool_driver_keys),
          anonymous_driver_keys: parseJsonArray(data.anonymous_driver_keys),
          send_days: parseIntArray(data.send_days),
           culture_max_repeat_block_days: (data as any).culture_max_repeat_block_days ?? DEFAULT_RULES.culture_max_repeat_block_days,
           culture_rotation_enabled: (data as any).culture_rotation_enabled ?? DEFAULT_RULES.culture_rotation_enabled,
           culture_rotation_next_pillar: (data as any).culture_rotation_next_pillar ?? DEFAULT_RULES.culture_rotation_next_pillar,
        };
        setRules(parsedData);
      } else {
        // Create default rules if not exists
        const { data: newRules, error: createError } = await supabase
          .from('pulse_schedule_rules')
          .insert({
            account_id: accountId,
            daily_questions_count: DEFAULT_RULES.daily_questions_count,
            must_include_driver_keys: DEFAULT_RULES.must_include_driver_keys,
            prefer_driver_keys: DEFAULT_RULES.prefer_driver_keys,
            rotation_pool_driver_keys: DEFAULT_RULES.rotation_pool_driver_keys,
            anonymous_driver_keys: DEFAULT_RULES.anonymous_driver_keys,
            max_repeat_block_days: DEFAULT_RULES.max_repeat_block_days,
            culture_max_repeat_block_days: DEFAULT_RULES.culture_max_repeat_block_days,
            culture_rotation_enabled: DEFAULT_RULES.culture_rotation_enabled,
            culture_rotation_next_pillar: DEFAULT_RULES.culture_rotation_next_pillar,
            timezone: DEFAULT_RULES.timezone,
            is_active: DEFAULT_RULES.is_active,
            culture_questions_count: DEFAULT_RULES.culture_questions_count,
            weekdays_only: DEFAULT_RULES.weekdays_only,
            send_time: DEFAULT_RULES.send_time,
            send_days: DEFAULT_RULES.send_days,
            is_recurring: DEFAULT_RULES.is_recurring,
          })
          .select()
          .single();

        if (createError) throw createError;
        
        if (newRules) {
          const parsedNewRules: PulseScheduleRule = {
            ...newRules,
            must_include_driver_keys: parseJsonArray(newRules.must_include_driver_keys),
            prefer_driver_keys: parseJsonArray(newRules.prefer_driver_keys),
            rotation_pool_driver_keys: parseJsonArray(newRules.rotation_pool_driver_keys),
            anonymous_driver_keys: parseJsonArray(newRules.anonymous_driver_keys),
            send_days: parseIntArray(newRules.send_days),
             culture_max_repeat_block_days: (newRules as any).culture_max_repeat_block_days ?? DEFAULT_RULES.culture_max_repeat_block_days,
             culture_rotation_enabled: (newRules as any).culture_rotation_enabled ?? DEFAULT_RULES.culture_rotation_enabled,
             culture_rotation_next_pillar: (newRules as any).culture_rotation_next_pillar ?? DEFAULT_RULES.culture_rotation_next_pillar,
          };
          setRules(parsedNewRules);
        }
      }
    } catch (error) {
      console.error('Error fetching schedule rules:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as regras de agendamento.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [accountId, toast]);

  const updateRules = useCallback(async (data: UpdateScheduleRulesData) => {
    if (!accountId || !rules) return false;
    try {
      const { error } = await supabase
        .from('pulse_schedule_rules')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', rules.id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Regras de agendamento atualizadas.',
      });

      await fetchRules();
      return true;
    } catch (error) {
      console.error('Error updating schedule rules:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar as regras.',
        variant: 'destructive',
      });
      return false;
    }
  }, [accountId, rules, fetchRules, toast]);

  const resetToDefaults = useCallback(async () => {
    return updateRules({
      daily_questions_count: DEFAULT_RULES.daily_questions_count ?? undefined,
      must_include_driver_keys: DEFAULT_RULES.must_include_driver_keys,
      prefer_driver_keys: DEFAULT_RULES.prefer_driver_keys,
      rotation_pool_driver_keys: DEFAULT_RULES.rotation_pool_driver_keys,
      anonymous_driver_keys: DEFAULT_RULES.anonymous_driver_keys,
      max_repeat_block_days: DEFAULT_RULES.max_repeat_block_days ?? undefined,
      culture_max_repeat_block_days: DEFAULT_RULES.culture_max_repeat_block_days ?? undefined,
      culture_rotation_enabled: DEFAULT_RULES.culture_rotation_enabled ?? undefined,
      culture_rotation_next_pillar: DEFAULT_RULES.culture_rotation_next_pillar ?? undefined,
      timezone: DEFAULT_RULES.timezone ?? undefined,
      is_active: DEFAULT_RULES.is_active ?? undefined,
      culture_questions_count: DEFAULT_RULES.culture_questions_count ?? undefined,
      weekdays_only: DEFAULT_RULES.weekdays_only ?? undefined,
      send_time: DEFAULT_RULES.send_time ?? undefined,
      send_days: DEFAULT_RULES.send_days,
      is_recurring: DEFAULT_RULES.is_recurring ?? undefined,
      start_date: null,
      end_date: null,
    });
  }, [updateRules]);

  return {
    rules,
    loading,
    fetchRules,
    updateRules,
    resetToDefaults,
    DEFAULT_RULES,
  };
}
