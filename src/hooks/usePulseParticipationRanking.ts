import { useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface MemberParticipation {
  userId: string;
  userName: string;
  userEmail: string;
  teamId: string | null;
  teamName: string | null;
  totalDays: number;
  respondedDays: number;
  participationRate: number;
  lastResponseDate: string | null;
  streak: number;
  status: 'active' | 'at_risk' | 'inactive';
  /** Indica se os dados são agregados devido a equipe pequena */
  isAggregated?: boolean;
}

export interface ParticipationStats {
  totalMembers: number;
  activeMembers: number;
  atRiskMembers: number;
  inactiveMembers: number;
  avgParticipationRate: number;
}

export interface TeamPrivacyStatus {
  teamId: string;
  teamSize: number;
  threshold: number;
  isSmallTeam: boolean;
}

export type ParticipationStatusFilter = 'all' | 'active' | 'at_risk' | 'inactive';

export function usePulseParticipationRanking(accountId: string | null, userId?: string | null) {
  const { toast } = useToast();
  const [members, setMembers] = useState<MemberParticipation[]>([]);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState<number>(30);
  const [statusFilter, setStatusFilter] = useState<ParticipationStatusFilter>('all');
  const [teamFilter, setTeamFilter] = useState<string | null>(null);
  const [teamsPrivacy, setTeamsPrivacy] = useState<Record<string, TeamPrivacyStatus>>({});

  const fetchParticipation = useCallback(async (days: number = period) => {
    if (!accountId) return;
    setLoading(true);

    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = startDate.toISOString().split('T')[0];

      // Get all active members (não usar join com profiles: não existe relacionamento FK)
      const { data: accountMembers, error: membersError } = await supabase
        .from('account_members')
        .select('user_id')
        .eq('account_id', accountId)
        .eq('is_active', true);

      if (membersError) throw membersError;

      const userIds = (accountMembers || []).map((m: any) => m.user_id).filter(Boolean) as string[];

      // Buscar profiles via query separada (compatível com o schema atual)
      const { data: profiles, error: profilesError } = userIds.length
        ? await supabase
            .from('profiles')
            .select('id, first_name, last_name, email')
            .in('id', userIds)
        : { data: [], error: null };

      if (profilesError) throw profilesError;

      const profileMap = new Map<string, { name: string; email: string }>();
      (profiles || []).forEach((p: any) => {
        const first = p?.first_name ?? '';
        const last = p?.last_name ?? '';
        const name = `${first} ${last}`.trim() || 'Usuário';
        profileMap.set(p.id, { name, email: p?.email ?? '' });
      });

      // Get pulse user profiles for team info
      const { data: pulseProfiles } = await supabase
        .from('pulse_user_profiles')
        .select(`
          user_id,
          team_id,
          pulse_teams(id, name)
        `)
        .eq('account_id', accountId)
        .eq('is_active', true);

      // Get pulse assignments for the period
      const { data: assignments } = await supabase
        .from('pulse_daily_assignments')
        .select('id, date')
        .eq('account_id', accountId)
        .gte('date', startDateStr)
        .order('date', { ascending: false });

      const assignmentDates = new Set(assignments?.map(a => a.date) || []);
      const totalDaysWithPulse = assignmentDates.size;

      // Get responses grouped by user
      const { data: responses } = await supabase
        .from('pulse_responses')
        .select('respondent_user_id, date')
        .eq('account_id', accountId)
        .gte('date', startDateStr);

      // Build user response map
      const userResponseDates: Record<string, Set<string>> = {};
      responses?.forEach(r => {
        if (r.respondent_user_id) {
          if (!userResponseDates[r.respondent_user_id]) {
            userResponseDates[r.respondent_user_id] = new Set();
          }
          userResponseDates[r.respondent_user_id].add(r.date);
        }
      });

      // Get user streaks
      const { data: streaks } = await supabase
        .from('pulse_user_streaks')
        .select('user_id, current_streak')
        .eq('account_id', accountId);

      const streakMap: Record<string, number> = {};
      streaks?.forEach(s => {
        streakMap[s.user_id] = s.current_streak || 0;
      });

      // Build team map
      const teamMap: Record<string, { id: string; name: string }> = {};
      pulseProfiles?.forEach((p: any) => {
        if (p.pulse_teams) {
          teamMap[p.user_id] = {
            id: p.pulse_teams.id,
            name: p.pulse_teams.name,
          };
        }
      });

      // Build participation data for each member
      const participation: MemberParticipation[] = (accountMembers || []).map((member: any) => {
        const userId = member.user_id as string;
        const profile = profileMap.get(userId);
        const responseDates = userResponseDates[userId] || new Set();
        const respondedDays = responseDates.size;
        const participationRate = totalDaysWithPulse > 0 
          ? Math.round((respondedDays / totalDaysWithPulse) * 100) 
          : 0;

        // Find last response date
        const sortedDates = Array.from(responseDates).sort().reverse();
        const lastResponseDate = sortedDates[0] || null;

        // Calculate days since last response
        const daysSinceLastResponse = lastResponseDate 
          ? Math.floor((Date.now() - new Date(lastResponseDate).getTime()) / (1000 * 60 * 60 * 24))
          : days;

        // Determine status
        let status: 'active' | 'at_risk' | 'inactive';
        if (daysSinceLastResponse <= 3) {
          status = 'active';
        } else if (daysSinceLastResponse <= 7) {
          status = 'at_risk';
        } else {
          status = 'inactive';
        }

        const team = teamMap[userId];

        return {
          userId,
          userName: profile?.name || 'Usuário',
          userEmail: profile?.email || '',
          teamId: team?.id || null,
          teamName: team?.name || null,
          totalDays: totalDaysWithPulse,
          respondedDays,
          participationRate,
          lastResponseDate,
          streak: streakMap[userId] || 0,
          status,
        };
      });

      // Sort by participation rate (descending), then by name
      participation.sort((a, b) => {
        if (b.participationRate !== a.participationRate) {
          return b.participationRate - a.participationRate;
        }
        return a.userName.localeCompare(b.userName);
      });

      setMembers(participation);
    } catch (error) {
      console.error('Error fetching participation ranking:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar o ranking de participação.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [accountId, period, toast]);

  // Filtered members based on status and team
  const filteredMembers = useMemo(() => {
    return members.filter(m => {
      if (statusFilter !== 'all' && m.status !== statusFilter) return false;
      if (teamFilter && m.teamId !== teamFilter) return false;
      return true;
    });
  }, [members, statusFilter, teamFilter]);

  // Stats
  const stats: ParticipationStats = useMemo(() => {
    const active = members.filter(m => m.status === 'active').length;
    const atRisk = members.filter(m => m.status === 'at_risk').length;
    const inactive = members.filter(m => m.status === 'inactive').length;
    const avgRate = members.length > 0
      ? Math.round(members.reduce((sum, m) => sum + m.participationRate, 0) / members.length)
      : 0;

    return {
      totalMembers: members.length,
      activeMembers: active,
      atRiskMembers: atRisk,
      inactiveMembers: inactive,
      avgParticipationRate: avgRate,
    };
  }, [members]);

  // Get unique teams for filter
  const teams = useMemo(() => {
    const teamSet = new Map<string, string>();
    members.forEach(m => {
      if (m.teamId && m.teamName) {
        teamSet.set(m.teamId, m.teamName);
      }
    });
    return Array.from(teamSet.entries()).map(([id, name]) => ({ id, name }));
  }, [members]);

  // Verificar privacidade das equipes
  const checkTeamsPrivacy = useCallback(async () => {
    if (!accountId) return;

    try {
      // Buscar threshold da conta
      const { data: threshold } = await supabase
        .rpc('get_account_anonymity_threshold', { _account_id: accountId });

      const minThreshold = threshold ?? 5;

      // Para cada equipe única, verificar tamanho
      const uniqueTeamIds = Array.from(new Set(members.map(m => m.teamId).filter(Boolean))) as string[];
      
      const privacyMap: Record<string, TeamPrivacyStatus> = {};
      
      for (const teamId of uniqueTeamIds) {
        const { data: size } = await supabase
          .rpc('get_team_size', { _team_id: teamId });
        
        const teamSize = size ?? 0;
        privacyMap[teamId] = {
          teamId,
          teamSize,
          threshold: minThreshold,
          isSmallTeam: teamSize < minThreshold,
        };
      }
      
      setTeamsPrivacy(privacyMap);
    } catch (error) {
      console.error('Error checking teams privacy:', error);
    }
  }, [accountId, members]);

  // Membros filtrados com informação de agregação
  const membersWithPrivacy = useMemo(() => {
    return filteredMembers.map(member => {
      const privacy = member.teamId ? teamsPrivacy[member.teamId] : null;
      return {
        ...member,
        isAggregated: privacy?.isSmallTeam ?? false,
      };
    });
  }, [filteredMembers, teamsPrivacy]);

  return {
    members: membersWithPrivacy,
    allMembers: members,
    loading,
    period,
    setPeriod,
    statusFilter,
    setStatusFilter,
    teamFilter,
    setTeamFilter,
    fetchParticipation,
    stats,
    teams,
    teamsPrivacy,
    checkTeamsPrivacy,
  };
}
