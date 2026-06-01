import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { differenceInDays, parseISO, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from "date-fns";
import { formatBRT } from "@/lib/datetime";

export interface RecruitmentGoal {
  id: string;
  account_id: string;
  period_type: 'monthly' | 'quarterly' | 'yearly';
  period_start: string;
  period_end: string;
  goal_hires: number | null;
  goal_applications: number | null;
  goal_time_to_hire: number | null;
  goal_conversion_rate: number | null;
  goal_fill_rate: number | null;
  alert_deviation_threshold: number;
  status: 'active' | 'completed' | 'cancelled';
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface MetricProgress {
  current: number;
  target: number;
  percentage: number;
  onTrack: boolean;
}

export interface GoalProgress {
  goal: RecruitmentGoal;
  progress: {
    hires: MetricProgress;
    applications: MetricProgress;
    timeToHire: MetricProgress;
    conversionRate: MetricProgress;
    fillRate: MetricProgress;
  };
  daysRemaining: number;
  daysElapsed: number;
  totalDays: number;
  expectedProgress: number;
  overallProgress: number;
  overallStatus: 'ahead' | 'on_track' | 'behind' | 'critical';
}

export interface CreateGoalInput {
  period_type: 'monthly' | 'quarterly' | 'yearly';
  period_start: string;
  goal_hires?: number | null;
  goal_applications?: number | null;
  goal_time_to_hire?: number | null;
  goal_conversion_rate?: number | null;
  goal_fill_rate?: number | null;
  alert_deviation_threshold?: number;
  notes?: string;
}

export function calculatePeriodEnd(periodType: string, periodStart: Date): Date {
  switch (periodType) {
    case 'monthly':
      return endOfMonth(periodStart);
    case 'quarterly':
      return endOfQuarter(periodStart);
    case 'yearly':
      return endOfYear(periodStart);
    default:
      return endOfMonth(periodStart);
  }
}

export function calculateGoalStatus(
  overallProgress: number,
  expectedProgress: number,
  threshold: number
): 'ahead' | 'on_track' | 'behind' | 'critical' {
  const deviation = overallProgress - expectedProgress;
  
  if (deviation >= 10) return 'ahead';
  if (deviation >= -threshold / 2) return 'on_track';
  if (deviation >= -threshold) return 'behind';
  return 'critical';
}

export function useRecruitmentGoals() {
  const { currentOrganization } = useOrganization();
  const accountId = currentOrganization?.id;
  const queryClient = useQueryClient();

  const goalsQuery = useQuery({
    queryKey: ['recruitment-goals', accountId],
    queryFn: async () => {
      if (!accountId) return [];
      
      const { data, error } = await supabase
        .from('recruitment_goals')
        .select('*')
        .eq('account_id', accountId)
        .order('period_start', { ascending: false });
      
      if (error) throw error;
      return data as RecruitmentGoal[];
    },
    enabled: !!accountId,
  });

  const activeGoalQuery = useQuery({
    queryKey: ['recruitment-goals', 'active', accountId],
    queryFn: async () => {
      if (!accountId) return null;
      
      const today = formatBRT(new Date(), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('recruitment_goals')
        .select('*')
        .eq('account_id', accountId)
        .eq('status', 'active')
        .lte('period_start', today)
        .gte('period_end', today)
        .order('created_at', { ascending: false })
        .maybeSingle();
      
      if (error) throw error;
      return data as RecruitmentGoal | null;
    },
    enabled: !!accountId,
  });

  const createGoalMutation = useMutation({
    mutationFn: async (input: CreateGoalInput) => {
      if (!accountId) throw new Error('Account ID not found');
      
      const periodStart = parseISO(input.period_start);
      const periodEnd = calculatePeriodEnd(input.period_type, periodStart);
      
      const { data, error } = await supabase
        .from('recruitment_goals')
        .insert({
          account_id: accountId,
          period_type: input.period_type,
          period_start: input.period_start,
          period_end: formatBRT(periodEnd, 'yyyy-MM-dd'),
          goal_hires: input.goal_hires,
          goal_applications: input.goal_applications,
          goal_time_to_hire: input.goal_time_to_hire,
          goal_conversion_rate: input.goal_conversion_rate,
          goal_fill_rate: input.goal_fill_rate,
          alert_deviation_threshold: input.alert_deviation_threshold ?? 20,
          notes: input.notes,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recruitment-goals'] });
    },
  });

  const updateGoalMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<RecruitmentGoal> & { id: string }) => {
      const { data, error } = await supabase
        .from('recruitment_goals')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recruitment-goals'] });
    },
  });

  const cancelGoalMutation = useMutation({
    mutationFn: async (goalId: string) => {
      const { data, error } = await supabase
        .from('recruitment_goals')
        .update({ status: 'cancelled' })
        .eq('id', goalId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recruitment-goals'] });
    },
  });

  return {
    goals: goalsQuery.data ?? [],
    activeGoal: activeGoalQuery.data,
    isLoading: goalsQuery.isLoading,
    isLoadingActive: activeGoalQuery.isLoading,
    createGoal: createGoalMutation.mutateAsync,
    updateGoal: updateGoalMutation.mutateAsync,
    cancelGoal: cancelGoalMutation.mutateAsync,
    isCreating: createGoalMutation.isPending,
    isUpdating: updateGoalMutation.isPending,
  };
}

export function useGoalProgress(goal: RecruitmentGoal | null) {
  const { currentOrganization } = useOrganization();
  const accountId = currentOrganization?.id;

  return useQuery({
    queryKey: ['goal-progress', goal?.id, accountId],
    queryFn: async (): Promise<GoalProgress | null> => {
      if (!goal || !accountId) return null;

      const periodStart = parseISO(goal.period_start);
      const periodEnd = parseISO(goal.period_end);
      const today = new Date();
      
      const totalDays = differenceInDays(periodEnd, periodStart) + 1;
      const daysElapsed = Math.max(0, differenceInDays(today, periodStart) + 1);
      const daysRemaining = Math.max(0, differenceInDays(periodEnd, today));
      const expectedProgress = Math.min(100, (daysElapsed / totalDays) * 100);

      // Fetch jobs for the period
      const { data: jobs } = await supabase
        .from('recruitment_jobs')
        .select('id, status, created_at')
        .eq('account_id', accountId);

      const jobIds = jobs?.map(j => j.id) ?? [];

      // Fetch applications for the period
      const { data: applications } = await supabase
        .from('recruitment_applications')
        .select('id, status, applied_at, updated_at')
        .in('job_id', jobIds.length > 0 ? jobIds : ['no-jobs'])
        .gte('applied_at', goal.period_start)
        .lte('applied_at', goal.period_end);

      const totalApplications = applications?.length ?? 0;
      const hiredCount = applications?.filter(a => a.status === 'hired').length ?? 0;

      // Calculate time to hire (average days from application to hired)
      const hiredApps = applications?.filter(a => a.status === 'hired') ?? [];
      let avgTimeToHire = 0;
      if (hiredApps.length > 0) {
        const totalDaysToHire = hiredApps.reduce((sum, app) => {
          const appliedDate = parseISO(app.applied_at);
          const hiredDate = app.updated_at ? parseISO(app.updated_at) : today;
          return sum + differenceInDays(hiredDate, appliedDate);
        }, 0);
        avgTimeToHire = Math.round(totalDaysToHire / hiredApps.length);
      }

      // Calculate conversion rate
      const conversionRate = totalApplications > 0 
        ? (hiredCount / totalApplications) * 100 
        : 0;

      // Calculate fill rate (jobs filled / total jobs)
      const activeJobs = jobs?.filter(j => j.status === 'open' || j.status === 'filled').length ?? 0;
      const filledJobs = jobs?.filter(j => j.status === 'filled').length ?? 0;
      const fillRate = activeJobs > 0 ? (filledJobs / activeJobs) * 100 : 0;

      // Build progress object
      const createProgress = (current: number, target: number | null, isInverse = false): MetricProgress => {
        if (target === null || target === 0) {
          return { current, target: 0, percentage: 0, onTrack: true };
        }
        const percentage = isInverse 
          ? (current <= target ? 100 : Math.max(0, 100 - ((current - target) / target) * 100))
          : Math.min(100, (current / target) * 100);
        const onTrack = isInverse ? current <= target : percentage >= expectedProgress;
        return { current, target, percentage, onTrack };
      };

      const progress = {
        hires: createProgress(hiredCount, goal.goal_hires),
        applications: createProgress(totalApplications, goal.goal_applications),
        timeToHire: createProgress(avgTimeToHire, goal.goal_time_to_hire, true),
        conversionRate: createProgress(conversionRate, goal.goal_conversion_rate ? Number(goal.goal_conversion_rate) : null),
        fillRate: createProgress(fillRate, goal.goal_fill_rate ? Number(goal.goal_fill_rate) : null),
      };

      // Calculate overall progress (weighted average of active metrics)
      const activeMetrics = Object.values(progress).filter(m => m.target > 0);
      const overallProgress = activeMetrics.length > 0
        ? activeMetrics.reduce((sum, m) => sum + m.percentage, 0) / activeMetrics.length
        : 0;

      const overallStatus = calculateGoalStatus(
        overallProgress,
        expectedProgress,
        goal.alert_deviation_threshold
      );

      return {
        goal,
        progress,
        daysRemaining,
        daysElapsed,
        totalDays,
        expectedProgress,
        overallProgress,
        overallStatus,
      };
    },
    enabled: !!goal && !!accountId,
  });
}
