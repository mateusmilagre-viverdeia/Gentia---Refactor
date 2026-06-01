import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { 
  PulseDailyAssignmentItem, 
  PulseQuestion,
  PulseResponse,
  PulseUserStreak,
  PulseAnswerPayload,
  EmojiOption
} from '@/types/pulse.types';

interface PulseDailyAssignmentDB {
  id: string;
  account_id: string;
  date: string;
  generated_by: string | null;
  notes: string | null;
  created_at: string | null;
}

interface NormalizedQuestion {
  id: string;
  question_text: string;
  answer_type: string;
  is_anonymous: boolean;
  is_active?: boolean;
  is_culture_question?: boolean;
  pillar_type?: string;
  pulse_emoji_sets?: { options: EmojiOption[] } | null;
  pulse_drivers?: { name: string } | null;
  account_id?: string | null;
  driver_id?: string | null;
  created_at?: string | null;
  created_by?: string | null;
  emoji_set_id?: string | null;
  multi_select_source?: string | null;
  max_repeat_per_month?: number | null;
  ai_generated?: boolean | null;
  source_value_id?: string | null;
  source_behavior_id?: string | null;
  last_used_at?: string | null;
}

interface NormalizedItem {
  id: string;
  assignment_id: string;
  question_id: string | null;
  culture_question_id: string | null;
  is_culture_question: boolean;
  order_index: number;
  created_at: string | null;
  pulse_questions: NormalizedQuestion | null;
}

interface TodayPulse {
  assignment: PulseDailyAssignmentDB | null;
  items: NormalizedItem[];
  todayResponses: PulseResponse[];
  streak: PulseUserStreak | null;
  isCompleted: boolean;
}

export function usePulseDaily() {
  const { user } = useAuth();
  const [accountId, setAccountId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [todayPulse, setTodayPulse] = useState<TodayPulse>({
    assignment: null,
    items: [],
    todayResponses: [],
    streak: null,
    isCompleted: false,
  });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const userId = user?.id;
  const today = new Date().toISOString().split('T')[0];

  // Fetch account_id from profile
  useEffect(() => {
    if (!userId) return;
    supabase
      .from('profiles')
      .select('account_id')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        setAccountId(data?.account_id || null);
      });
  }, [userId]);

  // Fetch today's pulse data
  const fetchTodayPulse = useCallback(async () => {
    if (!accountId || !userId) return;

    setIsLoading(true);
    try {
      // Get today's assignment
      const { data: assignment, error: assignmentError } = await supabase
        .from('pulse_daily_assignments')
        .select('*')
        .eq('account_id', accountId)
        .eq('date', today)
        .maybeSingle();

      if (assignmentError) throw assignmentError;

      let items: any[] = [];
      let todayResponses: PulseResponse[] = [];

      if (assignment) {
        // Get assignment items with standard questions
        const { data: itemsData, error: itemsError } = await supabase
          .from('pulse_daily_assignment_items')
          .select(`
            *,
            pulse_questions (
              *,
              pulse_emoji_sets (options)
            )
          `)
          .eq('assignment_id', assignment.id)
          .order('order_index');

        if (itemsError) throw itemsError;
        
        // Fetch culture questions separately for items that need them
        const cultureQuestionIds = (itemsData || [])
          .filter((item: any) => item.is_culture_question && item.culture_question_id)
          .map((item: any) => item.culture_question_id);

        let cultureQuestionsMap = new Map<string, any>();
        if (cultureQuestionIds.length > 0) {
          const { data: cultureQuestions } = await supabase
            .from('pulse_culture_questions')
            .select('*')
            .in('id', cultureQuestionIds);
          
          cultureQuestionsMap = new Map(
            (cultureQuestions || []).map((q: any) => [q.id, q])
          );
        }
        
        // Normalize items - merge culture questions manually
        const normalizedItems: NormalizedItem[] = (itemsData || []).map((item: any) => {
          if (item.is_culture_question && item.culture_question_id) {
            const cultureQ = cultureQuestionsMap.get(item.culture_question_id);
            if (cultureQ) {
              return {
                id: item.id,
                assignment_id: item.assignment_id,
                question_id: item.question_id,
                culture_question_id: item.culture_question_id,
                is_culture_question: true,
                order_index: item.order_index,
                created_at: item.created_at,
                pulse_questions: {
                  id: cultureQ.id,
                  question_text: cultureQ.question_text,
                  answer_type: 'emoji_scale',
                  is_anonymous: false,
                  is_active: true,
                  is_culture_question: true,
                  pillar_type: cultureQ.pillar_type,
                  pulse_emoji_sets: null,
                  account_id: cultureQ.account_id,
                  driver_id: null,
                  created_at: cultureQ.created_at,
                  created_by: cultureQ.created_by,
                },
              } as NormalizedItem;
            }
          }
          return {
            ...item,
            is_culture_question: false,
          } as NormalizedItem;
        });

        items = normalizedItems;

        // Get today's responses for this user
        const { data: responsesData, error: responsesError } = await supabase
          .from('pulse_responses')
          .select('*, culture_question_id')
          .eq('account_id', accountId)
          .eq('date', today)
          .eq('respondent_user_id', userId);

        if (responsesError) throw responsesError;
        todayResponses = (responsesData || []) as PulseResponse[];
      }

      // Get user streak
      const { data: streak, error: streakError } = await supabase
        .from('pulse_user_streaks')
        .select('*')
        .eq('account_id', accountId)
        .eq('user_id', userId)
        .maybeSingle();

      if (streakError && streakError.code !== 'PGRST116') throw streakError;

      // Filter out items without valid questions (shouldn't happen, but safety check)
      const validItems = items.filter(item => item.pulse_questions !== null);
      items = validItems;

      const isCompleted = items.length > 0 && todayResponses.length >= items.length;

      // Find first unanswered question - check both question_id and culture_question_id
      const answeredQuestionIds = new Set(
        todayResponses.filter(r => r.question_id).map(r => r.question_id)
      );
      const answeredCultureIds = new Set(
        todayResponses.filter((r: any) => r.culture_question_id).map((r: any) => r.culture_question_id)
      );
      const firstUnansweredIndex = items.findIndex(item => {
        if (item.is_culture_question) {
          return !answeredCultureIds.has(item.culture_question_id);
        }
        return !answeredQuestionIds.has(item.question_id);
      });

      setTodayPulse({
        assignment,
        items: items as any,
        todayResponses: todayResponses,
        streak: streak as PulseUserStreak | null,
        isCompleted,
      });

      setCurrentIndex(firstUnansweredIndex >= 0 ? firstUnansweredIndex : items.length);

    } catch (error) {
      console.error('Error fetching pulse:', error);
      toast.error('Erro ao carregar o pulso de hoje');
    } finally {
      setIsLoading(false);
    }
  }, [accountId, userId, today]);

  useEffect(() => {
    fetchTodayPulse();
  }, [fetchTodayPulse]);

  // Submit answer
  const submitAnswer = async (payload: PulseAnswerPayload) => {
    if (!accountId || !userId || !todayPulse.assignment) return false;

    setIsSubmitting(true);
    try {
      const currentItem = todayPulse.items[currentIndex];
      if (!currentItem) return false;

      const question = currentItem.pulse_questions;
      
      // Get user's team info
      const { data: pulseProfile } = await supabase
        .from('pulse_user_profiles')
        .select('team_id')
        .eq('user_id', userId)
        .eq('account_id', accountId)
        .maybeSingle();

      let leaderUserId: string | null = null;
      if (pulseProfile?.team_id) {
        const { data: team } = await supabase
          .from('pulse_teams')
          .select('leader_user_id')
          .eq('id', pulseProfile.team_id)
          .single();
        leaderUserId = team?.leader_user_id || null;
      }

      // Create response - use correct column based on question type
      const isCultureQuestion = currentItem.is_culture_question;

      const responseData: any = {
        account_id: accountId,
        assignment_id: todayPulse.assignment.id,
        // Use question_id for standard questions, null for culture questions
        question_id: isCultureQuestion ? null : payload.question_id,
        // Use culture_question_id for culture questions
        culture_question_id: isCultureQuestion ? payload.question_id : null,
        date: today,
        respondent_user_id: question.is_anonymous ? null : userId,
        respondent_team_id: pulseProfile?.team_id || null,
        respondent_leader_user_id: leaderUserId,
        numeric_score: payload.numeric_score ?? null,
        raw_emoji: payload.raw_emoji ?? null,
        multi_select_values: payload.multi_select_values ?? null,
        is_anonymous: question.is_anonymous,
      };

      const { error: responseError } = await supabase
        .from('pulse_responses')
        .insert(responseData);

      if (responseError) throw responseError;

      // Update local state
      const newResponses = [...todayPulse.todayResponses, responseData as PulseResponse];
      const isNowCompleted = newResponses.length >= todayPulse.items.length;

      // Update streak if completed
      if (isNowCompleted) {
        await updateStreak();
        // Trigger metrics aggregation after completing the pulse
        await triggerMetricsAggregation();
      }

      setTodayPulse(prev => ({
        ...prev,
        todayResponses: newResponses,
        isCompleted: isNowCompleted,
      }));

      // Move to next question
      if (currentIndex < todayPulse.items.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        setCurrentIndex(todayPulse.items.length);
      }

      return true;

    } catch (error) {
      console.error('Error submitting answer:', error);
      toast.error('Erro ao enviar resposta');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Trigger metrics aggregation
  const triggerMetricsAggregation = async () => {
    if (!accountId) return;

    try {
      const { error } = await supabase.functions.invoke('aggregate-pulse-metrics', {
        body: { account_id: accountId, date: today },
      });

      if (error) {
        console.error('Error triggering metrics aggregation:', error);
      }
    } catch (error) {
      console.error('Error triggering metrics aggregation:', error);
    }
  };

  // Update streak
  const updateStreak = async () => {
    if (!accountId || !userId) return;

    try {
      const { data: existingStreak } = await supabase
        .from('pulse_user_streaks')
        .select('*')
        .eq('account_id', accountId)
        .eq('user_id', userId)
        .maybeSingle();

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      if (existingStreak) {
        // Check if last response was yesterday (continue streak) or earlier (reset)
        const lastDate = existingStreak.last_response_date;
        const isConsecutive = lastDate === yesterdayStr;
        const isToday = lastDate === today;

        if (isToday) {
          // Already responded today, just increment total
          return;
        }

        const newStreak = isConsecutive ? existingStreak.current_streak + 1 : 1;
        const newLongest = Math.max(newStreak, existingStreak.longest_streak);

        await supabase
          .from('pulse_user_streaks')
          .update({
            current_streak: newStreak,
            longest_streak: newLongest,
            last_response_date: today,
            total_responses: existingStreak.total_responses + 1,
          })
          .eq('id', existingStreak.id);

        setTodayPulse(prev => ({
          ...prev,
          streak: {
            ...existingStreak,
            current_streak: newStreak,
            longest_streak: newLongest,
            last_response_date: today,
            total_responses: existingStreak.total_responses + 1,
          },
        }));

      } else {
        // Create new streak
        const { data: newStreak } = await supabase
          .from('pulse_user_streaks')
          .insert({
            account_id: accountId,
            user_id: userId,
            current_streak: 1,
            longest_streak: 1,
            last_response_date: today,
            total_responses: 1,
          })
          .select()
          .single();

        if (newStreak) {
          setTodayPulse(prev => ({
            ...prev,
            streak: newStreak as PulseUserStreak,
          }));
        }
      }

      // Award points for daily response
      await awardPoints('daily_response');

    } catch (error) {
      console.error('Error updating streak:', error);
    }
  };

  // Award gamification points
  const awardPoints = async (eventKey: string) => {
    if (!accountId || !userId) return;

    try {
      // Get points for this event
      const { data: rule } = await supabase
        .from('pulse_gamification_rules')
        .select('points')
        .or(`account_id.is.null,account_id.eq.${accountId}`)
        .eq('event_key', eventKey)
        .eq('is_active', true)
        .maybeSingle();

      if (!rule || rule.points <= 0) return;

      // Log points
      await supabase
        .from('pulse_gamification_points_log')
        .insert({
          account_id: accountId,
          user_id: userId,
          event_key: eventKey,
          points_delta: rule.points,
          meta: { date: today },
        });

      // Update user progress
      const { data: progress } = await supabase
        .from('pulse_user_progress')
        .select('*')
        .eq('account_id', accountId)
        .eq('user_id', userId)
        .maybeSingle();

      if (progress) {
        await supabase
          .from('pulse_user_progress')
          .update({
            total_points: progress.total_points + rule.points,
          })
          .eq('id', progress.id);
      } else {
        await supabase
          .from('pulse_user_progress')
          .insert({
            account_id: accountId,
            user_id: userId,
            total_points: rule.points,
            current_level: 1,
          });
      }

    } catch (error) {
      console.error('Error awarding points:', error);
    }
  };

  return {
    isLoading,
    isSubmitting,
    todayPulse,
    currentIndex,
    currentQuestion: todayPulse.items[currentIndex]?.pulse_questions || null,
    progress: {
      current: todayPulse.todayResponses.length,
      total: todayPulse.items.length,
      percentage: todayPulse.items.length > 0 
        ? (todayPulse.todayResponses.length / todayPulse.items.length) * 100 
        : 0,
    },
    submitAnswer,
    refetch: fetchTodayPulse,
  };
}
