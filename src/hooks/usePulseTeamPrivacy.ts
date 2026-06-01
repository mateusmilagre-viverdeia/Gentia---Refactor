import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TeamPrivacyInfo {
  teamId: string;
  teamSize: number;
  threshold: number;
  isSmallTeam: boolean;
  canViewIndividualResponses: boolean;
}

/**
 * Hook para verificar políticas de privacidade de equipe no Pulse
 * Equipes pequenas (< threshold) só podem ver dados agregados semanais
 */
export function usePulseTeamPrivacy(accountId: string | null, userId: string | null) {
  const [teamPrivacy, setTeamPrivacy] = useState<Record<string, TeamPrivacyInfo>>({});
  const [globalThreshold, setGlobalThreshold] = useState<number>(5);
  const [loading, setLoading] = useState(false);

  // Buscar threshold global da conta
  const fetchAccountThreshold = useCallback(async () => {
    if (!accountId) return 5;

    try {
      const { data, error } = await supabase
        .rpc('get_account_anonymity_threshold', { _account_id: accountId });

      if (error) {
        console.error('Error fetching threshold:', error);
        return 5;
      }

      const threshold = data ?? 5;
      setGlobalThreshold(threshold);
      return threshold;
    } catch {
      return 5;
    }
  }, [accountId]);

  // Verificar se pode ver respostas de uma equipe específica
  const checkTeamPrivacy = useCallback(async (teamId: string): Promise<TeamPrivacyInfo> => {
    if (!accountId || !userId) {
      return {
        teamId,
        teamSize: 0,
        threshold: 5,
        isSmallTeam: true,
        canViewIndividualResponses: false,
      };
    }

    try {
      // Buscar tamanho da equipe
      const { data: sizeData } = await supabase
        .rpc('get_team_size', { _team_id: teamId });

      const teamSize = sizeData ?? 0;

      // Verificar se pode visualizar
      const { data: canViewData } = await supabase
        .rpc('can_view_team_responses', {
          _user_id: userId,
          _team_id: teamId,
          _account_id: accountId,
        });

      const canView = canViewData ?? false;
      const threshold = globalThreshold;

      const info: TeamPrivacyInfo = {
        teamId,
        teamSize,
        threshold,
        isSmallTeam: teamSize < threshold,
        canViewIndividualResponses: canView,
      };

      setTeamPrivacy(prev => ({ ...prev, [teamId]: info }));
      return info;
    } catch (error) {
      console.error('Error checking team privacy:', error);
      return {
        teamId,
        teamSize: 0,
        threshold: 5,
        isSmallTeam: true,
        canViewIndividualResponses: false,
      };
    }
  }, [accountId, userId, globalThreshold]);

  // Verificar múltiplas equipes de uma vez
  const checkTeamsPrivacy = useCallback(async (teamIds: string[]): Promise<Record<string, TeamPrivacyInfo>> => {
    setLoading(true);
    try {
      const results = await Promise.all(teamIds.map(checkTeamPrivacy));
      const privacyMap = results.reduce((acc, info) => {
        acc[info.teamId] = info;
        return acc;
      }, {} as Record<string, TeamPrivacyInfo>);
      setLoading(false);
      return privacyMap;
    } catch {
      setLoading(false);
      return {};
    }
  }, [checkTeamPrivacy]);

  // Inicializar threshold ao carregar
  useEffect(() => {
    if (accountId) {
      fetchAccountThreshold();
    }
  }, [accountId, fetchAccountThreshold]);

  return {
    teamPrivacy,
    globalThreshold,
    loading,
    checkTeamPrivacy,
    checkTeamsPrivacy,
    fetchAccountThreshold,
  };
}
