import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AccessLevel } from './useAccountLicensedModules';

export interface LicenseChange {
  id: string;
  accountId: string;
  accountName?: string;
  moduleSlug: string;
  previousAccessLevel: AccessLevel | null;
  newAccessLevel: AccessLevel;
  changedBy: string;
  changedByName?: string;
  changedAt: string;
  changeType: 'create' | 'update' | 'delete' | 'reset' | 'template_applied';
  notes?: string;
}

interface UseLicenseHistoryReturn {
  history: LicenseChange[];
  loading: boolean;
  loadHistory: (limit?: number) => Promise<void>;
  loadHistoryForAccount: (accountId: string, limit?: number) => Promise<void>;
  logChange: (
    accountId: string,
    moduleSlug: string,
    previousLevel: AccessLevel | null,
    newLevel: AccessLevel,
    changeType: LicenseChange['changeType'],
    notes?: string
  ) => Promise<boolean>;
  logBatchChanges: (
    accountId: string,
    changes: Array<{
      moduleSlug: string;
      previousLevel: AccessLevel | null;
      newLevel: AccessLevel;
    }>,
    changeType: LicenseChange['changeType'],
    notes?: string
  ) => Promise<boolean>;
}

const HISTORY_TABLE = 'license_change_history';

export function useLicenseHistory(): UseLicenseHistoryReturn {
  const [history, setHistory] = useState<LicenseChange[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchProfiles = async (userIds: string[]): Promise<Map<string, string>> => {
    const nameMap = new Map<string, string>();
    if (userIds.length === 0) return nameMap;

    const { data } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', userIds);

    (data || []).forEach((p: any) => {
      nameMap.set(p.id, p.full_name || 'Usuário');
    });

    return nameMap;
  };

  const fetchCompanies = async (accountIds: string[]): Promise<Map<string, string>> => {
    const nameMap = new Map<string, string>();
    if (accountIds.length === 0) return nameMap;

    const { data } = await supabase
      .from('companies')
      .select('id, name')
      .in('id', accountIds);

    (data || []).forEach((c: any) => {
      nameMap.set(c.id, c.name);
    });

    return nameMap;
  };

  const loadHistory = useCallback(async (limit: number = 100) => {
    setLoading(true);
    try {
      const client = supabase as any;

      const { data, error } = await client
        .from(HISTORY_TABLE)
        .select('*')
        .order('changed_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error loading history:', error);
        setLoading(false);
        return;
      }

      // Get unique user and account IDs
      const userIds = [...new Set((data || []).map((h: any) => h.changed_by))] as string[];
      const accountIds = [...new Set((data || []).map((h: any) => h.account_id))] as string[];

      const [userNames, accountNames] = await Promise.all([
        fetchProfiles(userIds),
        fetchCompanies(accountIds),
      ]);

      const historyItems: LicenseChange[] = (data || []).map((h: any) => ({
        id: h.id,
        accountId: h.account_id,
        accountName: accountNames.get(h.account_id),
        moduleSlug: h.module_slug,
        previousAccessLevel: h.previous_access_level as AccessLevel | null,
        newAccessLevel: h.new_access_level as AccessLevel,
        changedBy: h.changed_by,
        changedByName: userNames.get(h.changed_by),
        changedAt: h.changed_at,
        changeType: h.change_type,
        notes: h.notes,
      }));

      setHistory(historyItems);
    } catch (err) {
      console.error('Error in loadHistory:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadHistoryForAccount = useCallback(async (accountId: string, limit: number = 50) => {
    setLoading(true);
    try {
      const client = supabase as any;

      const { data, error } = await client
        .from(HISTORY_TABLE)
        .select('*')
        .eq('account_id', accountId)
        .order('changed_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error loading account history:', error);
        setLoading(false);
        return;
      }

      // Get unique user IDs
      const userIds = [...new Set((data || []).map((h: any) => h.changed_by))] as string[];
      const userNames = await fetchProfiles(userIds);

      const historyItems: LicenseChange[] = (data || []).map((h: any) => ({
        id: h.id,
        accountId: h.account_id,
        moduleSlug: h.module_slug,
        previousAccessLevel: h.previous_access_level as AccessLevel | null,
        newAccessLevel: h.new_access_level as AccessLevel,
        changedBy: h.changed_by,
        changedByName: userNames.get(h.changed_by),
        changedAt: h.changed_at,
        changeType: h.change_type,
        notes: h.notes,
      }));

      setHistory(historyItems);
    } catch (err) {
      console.error('Error in loadHistoryForAccount:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const logChange = useCallback(async (
    accountId: string,
    moduleSlug: string,
    previousLevel: AccessLevel | null,
    newLevel: AccessLevel,
    changeType: LicenseChange['changeType'],
    notes?: string
  ): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) return false;

      const client = supabase as any;

      const { error } = await client.from(HISTORY_TABLE).insert({
        account_id: accountId,
        module_slug: moduleSlug,
        previous_access_level: previousLevel,
        new_access_level: newLevel,
        changed_by: user.id,
        change_type: changeType,
        notes,
      });

      if (error) {
        console.error('Error logging change:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Error in logChange:', err);
      return false;
    }
  }, []);

  const logBatchChanges = useCallback(async (
    accountId: string,
    changes: Array<{
      moduleSlug: string;
      previousLevel: AccessLevel | null;
      newLevel: AccessLevel;
    }>,
    changeType: LicenseChange['changeType'],
    notes?: string
  ): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) return false;

      const client = supabase as any;

      const inserts = changes.map(c => ({
        account_id: accountId,
        module_slug: c.moduleSlug,
        previous_access_level: c.previousLevel,
        new_access_level: c.newLevel,
        changed_by: user.id,
        change_type: changeType,
        notes,
      }));

      const { error } = await client.from(HISTORY_TABLE).insert(inserts);

      if (error) {
        console.error('Error logging batch changes:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Error in logBatchChanges:', err);
      return false;
    }
  }, []);

  return {
    history,
    loading,
    loadHistory,
    loadHistoryForAccount,
    logChange,
    logBatchChanges,
  };
}
