import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAccount } from '@/hooks/useAccount';

export interface ManagerOption {
  user_id: string;
  role: string | null;
  first_name: string | null;
  last_name: string | null;
}

export interface OrgNodeOption {
  id: string;
  title: string;
  chart_id: string;
  chart_name?: string;
}

export function useHierarchy() {
  const { user } = useAuth();
  const { account, isAdmin, isOwner } = useAccount();
  const [subordinateIds, setSubordinateIds] = useState<string[]>([]);
  const [loadingSubordinates, setLoadingSubordinates] = useState(false);

  const fetchSubordinates = useCallback(async (): Promise<string[]> => {
    if (!user || !account) return [];
    
    setLoadingSubordinates(true);
    try {
      const { data, error } = await supabase.rpc('get_all_subordinates', {
        p_manager_id: user.id,
        p_account_id: account.id
      });
      
      if (error) return [];
      const ids = (data as string[]) || [];
      setSubordinateIds(ids);
      return ids;
    } finally {
      setLoadingSubordinates(false);
    }
  }, [user, account]);

  const canViewUser = useCallback(async (targetUserId: string): Promise<boolean> => {
    if (!user || !account) return false;
    if (isAdmin || isOwner) return true;
    
    const { data } = await supabase.rpc('can_view_subordinate', {
      p_viewer_id: user.id,
      p_target_id: targetUserId,
      p_account_id: account.id
    });
    return (data as boolean) || false;
  }, [user, account, isAdmin, isOwner]);

  const fetchAvailableManagers = useCallback(async (): Promise<ManagerOption[]> => {
    if (!account) return [];
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profiles } = await (supabase
      .from('pulse_user_profiles')
      .select('user_id, role')
      .eq('account_id', account.id)
      .eq('is_active', true)
      .in('role', ['admin_rh', 'leader'])) as { data: any[] | null };
    
    if (!profiles?.length) return [];

    const userIds = profiles.map(p => p.user_id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: users } = await (supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .in('id', userIds)) as { data: any[] | null };
    
    const userMap = new Map((users || []).map(u => [u.id, u]));
    
    return profiles.map(item => ({
      user_id: item.user_id,
      role: item.role,
      first_name: userMap.get(item.user_id)?.first_name || null,
      last_name: userMap.get(item.user_id)?.last_name || null,
    }));
  }, [account]);

  const fetchOrgNodes = useCallback(async (): Promise<OrgNodeOption[]> => {
    if (!account) return [];
    
    // Bypass type system completely to avoid deep instantiation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = supabase as any;
    const { data: nodes, error: nodesError } = await client
      .from('org_chart_nodes')
      .select('id, title, chart_id')
      .eq('account_id', account.id);
    
    if (nodesError || !nodes?.length) return [];
    
    const sortedNodes = [...nodes].sort((a: any, b: any) => 
      (a.title || '').localeCompare(b.title || '')
    );

    const chartIds = [...new Set(sortedNodes.map((n: any) => n.chart_id).filter(Boolean))] as string[];
    
    let chartMap = new Map<string, string>();
    if (chartIds.length > 0) {
      const { data: charts } = await client
        .from('org_charts')
        .select('id, name')
        .in('id', chartIds);
      
      if (charts) {
        chartMap = new Map(charts.map((c: any) => [c.id, c.name]));
      }
    }
    
    return sortedNodes.map((item: any) => ({
      id: item.id,
      title: item.title,
      chart_id: item.chart_id,
      chart_name: item.chart_id ? chartMap.get(item.chart_id) : undefined,
    }));
  }, [account]);

  const isLeaderWithSubordinates = useCallback(async (): Promise<boolean> => {
    if (!user || !account) return false;
    if (isAdmin || isOwner) return true;
    const subs = await fetchSubordinates();
    return subs.length > 0;
  }, [user, account, isAdmin, isOwner, fetchSubordinates]);

  return {
    subordinateIds,
    loadingSubordinates,
    fetchSubordinates,
    canViewUser,
    fetchAvailableManagers,
    fetchOrgNodes,
    isLeaderWithSubordinates,
    isAdmin,
    isOwner,
  };
}
