import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DISCDimension, DISCTeamAggregation, DISCTeamMember, DISCTeamAnalysis } from '@/types/disc.types';
import { analyzeTeamDISC } from '@/data/disc-team-analysis';

interface TeamWithLeader {
  id: string;
  name: string;
  memberCount: number;
  leaderId: string | null;
  leaderName: string | null;
}

interface LeaderOption {
  id: string;
  name: string;
  teamCount: number;
}

interface UseDISCTeamDashboardReturn {
  teams: TeamWithLeader[];
  leaders: LeaderOption[];
  isLoadingTeams: boolean;
  selectedTeamData: DISCTeamAggregation | null;
  teamAnalysis: DISCTeamAnalysis | null;
  isLoadingTeamData: boolean;
  allAccountData: DISCTeamAggregation | null;
  allAccountAnalysis: DISCTeamAnalysis | null;
  isLoadingAllData: boolean;
  leaderFilteredData: DISCTeamAggregation | null;
  leaderFilteredAnalysis: DISCTeamAnalysis | null;
  isLoadingLeaderData: boolean;
}

export function useDISCTeamDashboard(
  selectedTeamId?: string | null,
  selectedLeaderId?: string | null
): UseDISCTeamDashboardReturn {
  const { user } = useAuth();

  // Fetch account_id from profile
  const { data: accountId } = useQuery({
    queryKey: ['user-account-id', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('id', user.id)
        .single();
      return data?.account_id || null;
    },
    enabled: !!user?.id
  });

  // Fetch all teams for the account with leader info
  const { data: teamsData = [], isLoading: isLoadingTeams } = useQuery({
    queryKey: ['disc-teams-with-leaders', accountId],
    queryFn: async () => {
      if (!accountId) return [];
      
      // First get teams with leader_user_id
      const { data: teamsRaw, error } = await supabase
        .from('pulse_teams')
        .select('id, name, leader_user_id')
        .eq('account_id', accountId)
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      
      // Get leader profiles for teams that have leaders
      const leaderIds = [...new Set((teamsRaw || []).map(t => t.leader_user_id).filter(Boolean))];
      
      let leaderProfiles: Record<string, string> = {};
      if (leaderIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', leaderIds);
        
        if (profiles) {
          profiles.forEach(p => {
            leaderProfiles[p.id] = [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Sem nome';
          });
        }
      }
      
      // Get member count for each team
      const teamsWithDetails: TeamWithLeader[] = await Promise.all(
        (teamsRaw || []).map(async (team) => {
          const { count } = await supabase
            .from('disc_sessions')
            .select('*', { count: 'exact', head: true })
            .eq('team_id', team.id)
            .eq('status', 'completed');
          
          return {
            id: team.id,
            name: team.name,
            memberCount: count || 0,
            leaderId: team.leader_user_id,
            leaderName: team.leader_user_id ? leaderProfiles[team.leader_user_id] || null : null
          };
        })
      );
      
      return teamsWithDetails;
    },
    enabled: !!accountId
  });

  // Extract unique leaders from teams
  const leaders: LeaderOption[] = Object.values(
    teamsData.reduce((acc, team) => {
      if (team.leaderId && team.leaderName) {
        if (!acc[team.leaderId]) {
          acc[team.leaderId] = {
            id: team.leaderId,
            name: team.leaderName,
            teamCount: 0
          };
        }
        acc[team.leaderId].teamCount++;
      }
      return acc;
    }, {} as Record<string, LeaderOption>)
  ).sort((a, b) => a.name.localeCompare(b.name));

  // Filter teams by selected leader
  const filteredTeams = selectedLeaderId 
    ? teamsData.filter(t => t.leaderId === selectedLeaderId)
    : teamsData;

  // Fetch data for a specific team
  const { data: selectedTeamData, isLoading: isLoadingTeamData } = useQuery({
    queryKey: ['disc-team-data', selectedTeamId],
    queryFn: async () => {
      if (!selectedTeamId) return null;
      
      const team = teamsData.find(t => t.id === selectedTeamId);
      if (!team) return null;
      
      return await fetchTeamAggregation(selectedTeamId, team.name);
    },
    enabled: !!selectedTeamId && teamsData.length > 0
  });

  // Fetch all account data (no team filter)
  const { data: allAccountData, isLoading: isLoadingAllData } = useQuery({
    queryKey: ['disc-account-data', accountId],
    queryFn: async () => {
      if (!accountId) return null;
      
      return await fetchAccountAggregation(accountId);
    },
    enabled: !!accountId
  });

  // Fetch data filtered by leader (all teams of that leader)
  const { data: leaderFilteredData, isLoading: isLoadingLeaderData } = useQuery({
    queryKey: ['disc-leader-data', selectedLeaderId, teamsData],
    queryFn: async () => {
      if (!selectedLeaderId || !accountId) return null;
      
      const leaderTeamIds = teamsData
        .filter(t => t.leaderId === selectedLeaderId)
        .map(t => t.id);
      
      if (leaderTeamIds.length === 0) return null;
      
      const leader = leaders.find(l => l.id === selectedLeaderId);
      return await fetchLeaderTeamsAggregation(leaderTeamIds, leader?.name || 'Líder');
    },
    enabled: !!selectedLeaderId && !selectedTeamId && teamsData.length > 0
  });

  // Calculate analyses
  const teamAnalysis = selectedTeamData ? analyzeTeamDISC(selectedTeamData) : null;
  const allAccountAnalysis = allAccountData ? analyzeTeamDISC(allAccountData) : null;
  const leaderFilteredAnalysis = leaderFilteredData ? analyzeTeamDISC(leaderFilteredData) : null;

  return {
    teams: filteredTeams,
    leaders,
    isLoadingTeams,
    selectedTeamData,
    teamAnalysis,
    isLoadingTeamData,
    allAccountData,
    allAccountAnalysis,
    isLoadingAllData,
    leaderFilteredData,
    leaderFilteredAnalysis,
    isLoadingLeaderData
  };
}

/**
 * Fetch and aggregate DISC data for a specific team
 */
async function fetchTeamAggregation(teamId: string, teamName: string): Promise<DISCTeamAggregation> {
  // Fetch completed sessions with results for this team
  const { data: sessions, error: sessionsError } = await supabase
    .from('disc_sessions')
    .select(`
      id,
      participant_name,
      participant_email,
      completed_at,
      disc_results (
        d_normalized,
        i_normalized,
        s_normalized,
        c_normalized,
        primary_profile,
        secondary_profile,
        intensity,
        is_balanced
      )
    `)
    .eq('team_id', teamId)
    .eq('status', 'completed')
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: false });

  if (sessionsError) throw sessionsError;

  return processSessionsIntoAggregation(teamId, teamName, sessions || []);
}

/**
 * Fetch and aggregate DISC data for entire account
 */
async function fetchAccountAggregation(accountId: string): Promise<DISCTeamAggregation> {
  const { data: sessions, error: sessionsError } = await supabase
    .from('disc_sessions')
    .select(`
      id,
      participant_name,
      participant_email,
      completed_at,
      disc_results (
        d_normalized,
        i_normalized,
        s_normalized,
        c_normalized,
        primary_profile,
        secondary_profile,
        intensity,
        is_balanced
      )
    `)
    .eq('account_id', accountId)
    .eq('status', 'completed')
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: false });

  if (sessionsError) throw sessionsError;

  return processSessionsIntoAggregation('all', 'Toda a Empresa', sessions || []);
}

/**
 * Fetch and aggregate DISC data for multiple teams (filtered by leader)
 */
async function fetchLeaderTeamsAggregation(teamIds: string[], leaderName: string): Promise<DISCTeamAggregation> {
  const { data: sessions, error: sessionsError } = await supabase
    .from('disc_sessions')
    .select(`
      id,
      participant_name,
      participant_email,
      completed_at,
      disc_results (
        d_normalized,
        i_normalized,
        s_normalized,
        c_normalized,
        primary_profile,
        secondary_profile,
        intensity,
        is_balanced
      )
    `)
    .in('team_id', teamIds)
    .eq('status', 'completed')
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: false });

  if (sessionsError) throw sessionsError;

  return processSessionsIntoAggregation('leader', `Times de ${leaderName}`, sessions || []);
}

/**
 * Process sessions into aggregated team data
 */
function processSessionsIntoAggregation(
  id: string, 
  name: string, 
  sessions: any[]
): DISCTeamAggregation {
  const members: DISCTeamMember[] = [];
  const profileDistribution: Record<DISCDimension, number> = { D: 0, I: 0, S: 0, C: 0 };
  const scoreSums: Record<DISCDimension, number> = { D: 0, I: 0, S: 0, C: 0 };
  
  let latestDate: string | null = null;

  sessions.forEach((session) => {
    const result = session.disc_results?.[0];
    if (!result) return;

    const primaryProfile = result.primary_profile as DISCDimension;
    const secondaryProfile = result.secondary_profile as DISCDimension | null;

    // Add member
    members.push({
      sessionId: session.id,
      participantName: session.participant_name,
      participantEmail: session.participant_email,
      primaryProfile,
      secondaryProfile,
      intensity: result.intensity as 'baixa' | 'média' | 'alta',
      isBalanced: result.is_balanced || false,
      scores: {
        D: result.d_normalized,
        I: result.i_normalized,
        S: result.s_normalized,
        C: result.c_normalized
      },
      completedAt: session.completed_at
    });

    // Update profile distribution
    profileDistribution[primaryProfile]++;

    // Sum scores for average calculation
    scoreSums.D += result.d_normalized;
    scoreSums.I += result.i_normalized;
    scoreSums.S += result.s_normalized;
    scoreSums.C += result.c_normalized;

    // Track latest date
    if (!latestDate || session.completed_at > latestDate) {
      latestDate = session.completed_at;
    }
  });

  const memberCount = members.length;

  // Calculate averages
  const avgScores: Record<DISCDimension, number> = {
    D: memberCount > 0 ? Math.round(scoreSums.D / memberCount) : 0,
    I: memberCount > 0 ? Math.round(scoreSums.I / memberCount) : 0,
    S: memberCount > 0 ? Math.round(scoreSums.S / memberCount) : 0,
    C: memberCount > 0 ? Math.round(scoreSums.C / memberCount) : 0
  };

  return {
    teamId: id,
    teamName: name,
    memberCount,
    completedAssessments: memberCount,
    avgScores,
    profileDistribution,
    members,
    lastAssessmentDate: latestDate
  };
}
