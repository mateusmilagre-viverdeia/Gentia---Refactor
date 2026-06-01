import { useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { subDays } from "date-fns";
import type { PulseDriver } from '@/types/pulse.types';
import { formatBRT } from "@/lib/datetime";

export interface TeamMember {
  id: string;
  user_id: string;
  display_name: string;
  email: string | null;
  current_streak: number;
  total_responses: number;
  last_response_date: string | null;
  avg_score: number | null;
}

export interface TeamInfo {
  id: string;
  name: string;
  member_count: number;
  participation_rate: number;
  avg_engagement: number;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  display_name: string;
  team_name: string | null;
  total_points: number;
  current_level: number;
  current_streak: number;
  badges_count: number;
}

export interface TeamComparison {
  metric: string;
  team_value: number;
  company_avg: number;
  diff: number;
}

export function usePulseLeader(accountId: string | null, userId: string | null) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [teams, setTeams] = useState<TeamInfo[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [drivers, setDrivers] = useState<PulseDriver[]>([]);
  const [teamMetrics, setTeamMetrics] = useState<{ date: string; engagement: number; participation: number }[]>([]);

  // Fetch teams led by this user
  const fetchMyTeams = useCallback(async () => {
    if (!accountId || !userId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pulse_teams')
        .select('*')
        .eq('account_id', accountId)
        .eq('leader_user_id', userId)
        .eq('is_active', true);

      if (error) throw error;

      // Get member counts
      const teamsWithCounts = await Promise.all(
        (data || []).map(async (team) => {
          const { count } = await supabase
            .from('pulse_user_profiles')
            .select('*', { count: 'exact', head: true })
            .eq('team_id', team.id)
            .eq('is_active', true);

          return {
            id: team.id,
            name: team.name,
            member_count: count || 0,
            participation_rate: 0,
            avg_engagement: 0,
          };
        })
      );

      setTeams(teamsWithCounts);
      if (teamsWithCounts.length > 0 && !selectedTeamId) {
        setSelectedTeamId(teamsWithCounts[0].id);
      }
    } catch (error: any) {
      toast({ title: 'Erro ao carregar times', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [accountId, userId, selectedTeamId, toast]);

  // Fetch team members with their stats
  const fetchTeamMembers = useCallback(async (teamId: string) => {
    if (!accountId) return;
    try {
      const { data: pulseProfiles, error } = await supabase
        .from('pulse_user_profiles')
        .select(`
          id,
          user_id,
          profiles(first_name, last_name, email)
        `)
        .eq('team_id', teamId)
        .eq('is_active', true);

      if (error) throw error;

      // Get streaks for each member
      const membersWithStats = await Promise.all(
        (pulseProfiles || []).map(async (pulseProfile: any) => {
          const { data: streak } = await supabase
            .from('pulse_user_streaks')
            .select('current_streak, total_responses, last_response_date')
            .eq('user_id', pulseProfile.user_id)
            .eq('account_id', accountId)
            .single();

          // Get avg score from last 7 days
          const { data: responses } = await supabase
            .from('pulse_responses')
            .select('numeric_score')
            .eq('respondent_user_id', pulseProfile.user_id)
            .eq('account_id', accountId)
            .gte('date', formatBRT(subDays(new Date(), 7), 'yyyy-MM-dd'))
            .not('numeric_score', 'is', null);

          const scores = (responses || []).map(r => r.numeric_score).filter(Boolean) as number[];
          const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;

          const profile = pulseProfile.profiles;
          const displayName = profile?.first_name && profile?.last_name
            ? `${profile.first_name} ${profile.last_name}`
            : profile?.first_name || profile?.email || 'Usuário';

          return {
            id: pulseProfile.id,
            user_id: pulseProfile.user_id,
            display_name: displayName,
            email: profile?.email || null,
            current_streak: streak?.current_streak || 0,
            total_responses: streak?.total_responses || 0,
            last_response_date: streak?.last_response_date || null,
            avg_score: avgScore,
          };
        })
      );

      setTeamMembers(membersWithStats);
    } catch (error: any) {
      console.error('Error fetching team members:', error);
    }
  }, [accountId]);

  // Fetch team metrics over time
  const fetchTeamMetrics = useCallback(async (teamId: string) => {
    if (!accountId) return;
    try {
      const endDate = formatBRT(new Date(), 'yyyy-MM-dd');
      const startDate = formatBRT(subDays(new Date(), 14), 'yyyy-MM-dd');

      // Get responses for team members
      const { data: teamProfiles } = await supabase
        .from('pulse_user_profiles')
        .select('user_id')
        .eq('team_id', teamId)
        .eq('is_active', true);

      const memberIds = (teamProfiles || []).map(p => p.user_id);
      if (memberIds.length === 0) {
        setTeamMetrics([]);
        return;
      }

      const { data: responses } = await supabase
        .from('pulse_responses')
        .select('date, numeric_score, respondent_user_id')
        .eq('account_id', accountId)
        .in('respondent_user_id', memberIds)
        .gte('date', startDate)
        .lte('date', endDate);

      // Group by date
      const byDate: Record<string, { scores: number[]; respondents: Set<string> }> = {};
      (responses || []).forEach(r => {
        if (!byDate[r.date]) byDate[r.date] = { scores: [], respondents: new Set() };
        if (r.numeric_score !== null) byDate[r.date].scores.push(r.numeric_score);
        if (r.respondent_user_id) byDate[r.date].respondents.add(r.respondent_user_id);
      });

      const metrics = Object.entries(byDate).map(([date, data]) => ({
        date: formatBRT(new Date(date), 'dd/MM'),
        engagement: data.scores.length > 0
          ? Math.round((data.scores.reduce((a, b) => a + b, 0) / data.scores.length) * 10)
          : 0,
        participation: Math.round((data.respondents.size / memberIds.length) * 100),
      })).sort((a, b) => a.date.localeCompare(b.date));

      setTeamMetrics(metrics);
    } catch (error: any) {
      console.error('Error fetching team metrics:', error);
    }
  }, [accountId]);

  // Fetch company leaderboard
  const fetchLeaderboard = useCallback(async () => {
    if (!accountId) return;
    try {
      const { data: progress, error } = await supabase
        .from('pulse_user_progress')
        .select('user_id, total_points, current_level')
        .eq('account_id', accountId)
        .order('total_points', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Get streaks, badge counts, and profile info
      const leaderboardData = await Promise.all(
        (progress || []).map(async (p, idx) => {
          const [streakRes, badgesRes, profileRes, teamRes] = await Promise.all([
            supabase
              .from('pulse_user_streaks')
              .select('current_streak')
              .eq('user_id', p.user_id)
              .eq('account_id', accountId)
              .single(),
            supabase
              .from('pulse_user_badges')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', p.user_id)
              .eq('account_id', accountId),
            supabase
              .from('profiles')
              .select('first_name, last_name, email')
              .eq('id', p.user_id)
              .single(),
            supabase
              .from('pulse_user_profiles')
              .select('team_id, pulse_teams(name)')
              .eq('user_id', p.user_id)
              .eq('account_id', accountId)
              .eq('is_active', true)
              .single(),
          ]);

          const profile = profileRes.data;
          const displayName = profile?.first_name && profile?.last_name
            ? `${profile.first_name} ${profile.last_name}`
            : profile?.first_name || profile?.email || 'Usuário';

          return {
            rank: idx + 1,
            user_id: p.user_id,
            display_name: displayName,
            team_name: (teamRes.data?.pulse_teams as any)?.name || null,
            total_points: p.total_points || 0,
            current_level: p.current_level || 1,
            current_streak: streakRes.data?.current_streak || 0,
            badges_count: badgesRes.count || 0,
          };
        })
      );

      setLeaderboard(leaderboardData);
    } catch (error: any) {
      console.error('Error fetching leaderboard:', error);
    }
  }, [accountId]);

  // Fetch drivers
  const fetchDrivers = useCallback(async () => {
    if (!accountId) return;
    try {
      const { data, error } = await supabase
        .from('pulse_drivers')
        .select('*')
        .or(`account_id.eq.${accountId},account_id.is.null`)
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      setDrivers(data as PulseDriver[]);
    } catch (error: any) {
      console.error('Error fetching drivers:', error);
    }
  }, [accountId]);

  // Calculate team vs company comparison
  const teamComparison = useMemo<TeamComparison[]>(() => {
    if (teamMetrics.length === 0) return [];

    const teamAvgEngagement = teamMetrics.reduce((sum, m) => sum + m.engagement, 0) / teamMetrics.length;
    const teamAvgParticipation = teamMetrics.reduce((sum, m) => sum + m.participation, 0) / teamMetrics.length;

    // Mock company averages (in real app, would come from pulse_metrics_daily)
    const companyAvgEngagement = 65;
    const companyAvgParticipation = 72;

    return [
      {
        metric: 'Engajamento',
        team_value: Math.round(teamAvgEngagement),
        company_avg: companyAvgEngagement,
        diff: Math.round(teamAvgEngagement - companyAvgEngagement),
      },
      {
        metric: 'Participação',
        team_value: Math.round(teamAvgParticipation),
        company_avg: companyAvgParticipation,
        diff: Math.round(teamAvgParticipation - companyAvgParticipation),
      },
    ];
  }, [teamMetrics]);

  // Fetch all data
  const fetchAll = useCallback(async () => {
    setLoading(true);
    await fetchMyTeams();
    await fetchDrivers();
    await fetchLeaderboard();
    setLoading(false);
  }, [fetchMyTeams, fetchDrivers, fetchLeaderboard]);

  // When selected team changes, fetch its data
  const selectTeam = useCallback(async (teamId: string) => {
    setSelectedTeamId(teamId);
    await Promise.all([
      fetchTeamMembers(teamId),
      fetchTeamMetrics(teamId),
    ]);
  }, [fetchTeamMembers, fetchTeamMetrics]);

  return {
    loading,
    teams,
    selectedTeamId,
    teamMembers,
    teamMetrics,
    leaderboard,
    drivers,
    teamComparison,
    // Actions
    fetchAll,
    selectTeam,
    fetchMyTeams,
    fetchTeamMembers,
    fetchTeamMetrics,
    fetchLeaderboard,
  };
}
