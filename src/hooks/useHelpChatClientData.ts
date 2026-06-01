import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface RichClientContext {
  companyName?: string;
  sector?: string;
  teamSize?: number;
  mission?: string | null;
  vision?: string | null;
  values?: string[];
  ritualsCount?: number;
  lastBadge?: string | null;
}

interface AccountData {
  id: string;
  name: string;
  sector?: string | null;
  current_mission?: string | null;
  current_vision?: string | null;
}

interface ClientData {
  account: AccountData | null;
  userId: string | null;
  values: string[];
  ritualsCount: number;
  lastBadge: string | null;
  teamSize: number;
}

export function useHelpChatClientData() {
  const [data, setData] = useState<ClientData>({
    account: null,
    userId: null,
    values: [],
    ritualsCount: 0,
    lastBadge: null,
    teamSize: 0,
  });
  
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    
    const fetchAllData = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !isMounted.current) return;

        // Get current account from localStorage or fetch first membership
        const storedAccountId = localStorage.getItem('ep-current-account-id');
        let account: AccountData | null = null;
        
        if (storedAccountId) {
          const { data: acc } = await supabase
            .from('companies')
            .select('id, name, sector, current_mission, current_vision')
            .eq('id', storedAccountId)
            .maybeSingle();
          
          if (acc) account = acc;
        }

        if (!account) {
          const { data: membership } = await supabase
            .from('account_members')
            .select('account:companies(id, name, sector, current_mission, current_vision)')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .limit(1)
            .maybeSingle();

          if (membership?.account) {
            account = membership.account as unknown as AccountData;
          }
        }

        if (!account || !isMounted.current) {
          setData(prev => ({ ...prev, userId: user.id }));
          return;
        }

        // Fetch all additional data in parallel
        const [cultureResult, energyResult, teamResult, badgeResult] = await Promise.all([
          supabase
            .from('culture_code_sessions')
            .select('structure')
            .eq('account_id', account.id)
            .maybeSingle(),
          supabase
            .from('energy_sessions')
            .select('id')
            .eq('account_id', account.id)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from('account_members')
            .select('*', { count: 'exact', head: true })
            .eq('account_id', account.id)
            .eq('is_active', true),
          supabase
            .from('user_badges')
            .select('badge:badges(name)')
            .eq('user_id', user.id)
            .eq('account_id', account.id)
            .order('earned_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

        if (!isMounted.current) return;

        // Extract values
        let values: string[] = [];
        if (cultureResult.data?.structure) {
          const structure = cultureResult.data.structure as { values?: Array<{ name: string }> };
          if (structure.values && Array.isArray(structure.values)) {
            values = structure.values.map(v => v.name).filter(Boolean);
          }
        }

        // Fetch rituals count if we have energy session
        let ritualsCount = 0;
        if (energyResult.data?.id) {
          const { count } = await supabase
            .from('energy_selections')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', energyResult.data.id);
          ritualsCount = count || 0;
        }

        // Extract badge name
        let lastBadge: string | null = null;
        if (badgeResult.data?.badge) {
          const badge = badgeResult.data.badge as { name: string };
          lastBadge = badge.name;
        }

        if (isMounted.current) {
          setData({
            account,
            userId: user.id,
            values,
            ritualsCount,
            lastBadge,
            teamSize: teamResult.count || 0,
          });
        }
      } catch (error) {
        console.error('Error fetching help chat client data:', error);
      }
    };

    fetchAllData();

    return () => {
      isMounted.current = false;
    };
  }, []);

  // Build rich client context
  const clientContext = useMemo((): RichClientContext | null => {
    if (!data.account) return null;

    return {
      companyName: data.account.name,
      sector: data.account.sector || undefined,
      teamSize: data.teamSize,
      mission: data.account.current_mission,
      vision: data.account.current_vision,
      values: data.values.length > 0 ? data.values : undefined,
      ritualsCount: data.ritualsCount > 0 ? data.ritualsCount : undefined,
      lastBadge: data.lastBadge,
    };
  }, [data]);

  return { clientContext };
}
