import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useToast } from '@/hooks/use-toast';
import type { Json } from '@/integrations/supabase/types';
import { addWeeks, addMonths, addYears, differenceInDays } from "date-fns";
import type {
  Survey,
  SurveyQuestion,
  SurveyTemplate,
  SurveyTemplateQuestion,
  SurveyResponse,
  SurveyInvitation,
  SurveyStats,
  QuestionStats,
  QuestionType,
  SurveyStatus,
  SurveySchedule,
  RecurrencePattern,
} from '@/types/survey.types';

export function useSurveys() {
  const { user } = useAuth();
  const { currentAccount: account } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ===== SURVEYS =====
  const {
    data: surveys = [],
    isLoading: isLoadingSurveys,
    refetch: refetchSurveys,
  } = useQuery({
    queryKey: ['surveys', account?.id],
    queryFn: async () => {
      if (!account?.id) return [];
      const { data, error } = await supabase
        .from('surveys')
        .select('*')
        .eq('account_id', account.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Survey[];
    },
    enabled: !!account?.id,
  });

  // ===== TEMPLATES =====
  const {
    data: templates = [],
    isLoading: isLoadingTemplates,
  } = useQuery({
    queryKey: ['survey_templates', account?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('survey_templates')
        .select('*')
        .or(`account_id.eq.${account?.id},is_public.eq.true`)
        .order('is_public', { ascending: false })
        .order('name', { ascending: true });
      if (error) throw error;
      return data as SurveyTemplate[];
    },
    enabled: !!account?.id,
  });

  // ===== CREATE SURVEY =====
  const createSurveyMutation = useMutation({
    mutationFn: async (data: {
      title: string;
      description?: string;
      category?: string;
      is_anonymous?: boolean;
      start_date: string;
      end_date: string;
      template_id?: string;
      questions?: SurveyQuestion[];
      is_recurring?: boolean;
      recurrence_pattern?: RecurrencePattern | null;
      recurrence_end_date?: string | null;
      custom_recurrence_dates?: Json | null;
      reminder_enabled?: boolean;
      reminder_days_before?: number[];
    }) => {
      if (!user?.id || !account?.id) throw new Error('Usuário não autenticado');

      // Separate questions from survey data
      const { questions, ...surveyData } = data;

      const { data: survey, error } = await supabase
        .from('surveys')
        .insert({
          ...surveyData,
          account_id: account.id,
          created_by: user.id,
          status: 'draft',
        })
        .select()
        .single();

      if (error) throw error;

      // If using template, copy questions from template
      if (data.template_id) {
        const { data: templateQuestions, error: qError } = await supabase
          .from('survey_template_questions')
          .select('*')
          .eq('template_id', data.template_id)
          .order('position');

        if (qError) throw qError;

        if (templateQuestions?.length) {
          const questionsToInsert = templateQuestions.map((q) => ({
            survey_id: survey.id,
            question_text: q.question_text,
            question_type: q.question_type,
            options: q.options,
            required: q.required,
            position: q.position,
          }));

          const { error: insertError } = await supabase
            .from('survey_questions')
            .insert(questionsToInsert);

          if (insertError) throw insertError;
        }
      } else if (questions?.length) {
        // If not using template, insert provided questions
        const questionsToInsert = questions
          .filter((q) => q.question_text?.trim())
          .map((q, idx) => ({
            survey_id: survey.id,
            question_text: q.question_text,
            question_type: q.question_type,
            options: q.options,
            required: q.required,
            position: idx + 1,
          }));

        if (questionsToInsert.length) {
          const { error: insertError } = await supabase
            .from('survey_questions')
            .insert(questionsToInsert);

          if (insertError) throw insertError;
        }
      }

      return survey as Survey;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveys'] });
      toast({ title: 'Questionário criado com sucesso!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao criar questionário', description: error.message, variant: 'destructive' });
    },
  });

  // ===== UPDATE SURVEY =====
  const updateSurveyMutation = useMutation({
    mutationFn: async ({ id, questions, ...surveyData }: Partial<Survey> & { id: string; questions?: SurveyQuestion[] }) => {
      const { data: survey, error } = await supabase
        .from('surveys')
        .update(surveyData)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;

      // Sync questions if provided
      if (questions) {
        // Delete existing questions
        await supabase.from('survey_questions').delete().eq('survey_id', id);

        // Insert new questions
        if (questions.length) {
          const questionsToInsert = questions
            .filter((q) => q.question_text?.trim())
            .map((q, idx) => ({
              survey_id: id,
              question_text: q.question_text,
              question_type: q.question_type,
              options: q.options,
              required: q.required,
              position: idx + 1,
            }));

          if (questionsToInsert.length) {
            const { error: insertError } = await supabase
              .from('survey_questions')
              .insert(questionsToInsert);

            if (insertError) throw insertError;
          }
        }
      }

      return survey as Survey;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveys'] });
      toast({ title: 'Questionário atualizado!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
    },
  });

  // ===== DELETE SURVEY =====
  const deleteSurveyMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('surveys').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveys'] });
      toast({ title: 'Questionário excluído!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    },
  });

  // ===== PUBLISH SURVEY =====
  const publishSurveyMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data: survey, error } = await supabase
        .from('surveys')
        .update({ status: 'active' as SurveyStatus })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return survey as Survey;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveys'] });
      toast({ title: 'Questionário publicado!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao publicar', description: error.message, variant: 'destructive' });
    },
  });

  // ===== CLOSE SURVEY =====
  const closeSurveyMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data: survey, error } = await supabase
        .from('surveys')
        .update({ status: 'closed' as SurveyStatus })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return survey as Survey;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveys'] });
      toast({ title: 'Questionário encerrado!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao encerrar', description: error.message, variant: 'destructive' });
    },
  });

  // ===== REACTIVATE SURVEY =====
  const reactivateSurveyMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data: survey, error } = await supabase
        .from('surveys')
        .update({ status: 'active' as SurveyStatus })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return survey as Survey;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveys'] });
      toast({ title: 'Questionário reativado!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao reativar', description: error.message, variant: 'destructive' });
    },
  });

  // ===== ARCHIVE SURVEY =====
  const archiveSurveyMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data: survey, error } = await supabase
        .from('surveys')
        .update({ status: 'archived' as SurveyStatus })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return survey as Survey;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveys'] });
      toast({ title: 'Questionário arquivado!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao arquivar', description: error.message, variant: 'destructive' });
    },
  });

  // ===== DRAFT SURVEY =====
  const draftSurveyMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data: survey, error } = await supabase
        .from('surveys')
        .update({ status: 'draft' as SurveyStatus })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return survey as Survey;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveys'] });
      toast({ title: 'Questionário voltou para rascunho!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao alterar status', description: error.message, variant: 'destructive' });
    },
  });

  // ===== DUPLICATE SURVEY =====
  const duplicateSurveyMutation = useMutation({
    mutationFn: async (surveyId: string) => {
      if (!user?.id || !account?.id) throw new Error('Usuário não autenticado');

      // Get original survey
      const { data: original, error: surveyError } = await supabase
        .from('surveys')
        .select('*')
        .eq('id', surveyId)
        .single();

      if (surveyError) throw surveyError;

      // Get original questions
      const { data: questions, error: questionsError } = await supabase
        .from('survey_questions')
        .select('*')
        .eq('survey_id', surveyId)
        .order('position');

      if (questionsError) throw questionsError;

      // Calculate future dates based on original duration
      const originalStart = new Date(original.start_date);
      const originalEnd = new Date(original.end_date);
      const durationMs = originalEnd.getTime() - originalStart.getTime();
      const newStart = new Date();
      const newEnd = new Date(newStart.getTime() + durationMs);

      // Adjust recurrence_end_date proportionally if present
      let newRecurrenceEndDate = original.recurrence_end_date;
      if (original.recurrence_end_date) {
        const originalRecEnd = new Date(original.recurrence_end_date);
        const recOffsetMs = originalRecEnd.getTime() - originalStart.getTime();
        newRecurrenceEndDate = new Date(newStart.getTime() + recOffsetMs).toISOString();
      }

      // Create new survey with "(Cópia)" suffix
      const { data: newSurvey, error: createError } = await supabase
        .from('surveys')
        .insert({
          account_id: account.id,
          created_by: user.id,
          title: `${original.title} (Cópia)`,
          description: original.description,
          category: original.category,
          is_anonymous: original.is_anonymous,
          start_date: newStart.toISOString(),
          end_date: newEnd.toISOString(),
          is_recurring: original.is_recurring,
          recurrence_pattern: original.recurrence_pattern,
          recurrence_end_date: newRecurrenceEndDate,
          custom_recurrence_dates: original.custom_recurrence_dates,
          reminder_enabled: original.reminder_enabled,
          reminder_days_before: original.reminder_days_before,
          status: 'draft',
        })
        .select()
        .single();

      if (createError) throw createError;

      // Copy questions
      if (questions?.length) {
        const questionsToInsert = questions.map((q) => ({
          survey_id: newSurvey.id,
          question_text: q.question_text,
          question_type: q.question_type,
          options: q.options,
          required: q.required,
          position: q.position,
        }));

        const { error: insertError } = await supabase
          .from('survey_questions')
          .insert(questionsToInsert);

        if (insertError) throw insertError;
      }

      return newSurvey as Survey;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveys'] });
      toast({ title: 'Questionário duplicado com sucesso!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao duplicar', description: error.message, variant: 'destructive' });
    },
  });

  // ===== GET SURVEY WITH QUESTIONS =====
  const getSurveyWithQuestions = useCallback(async (surveyId: string) => {
    const { data: survey, error } = await supabase
      .from('surveys')
      .select('*')
      .eq('id', surveyId)
      .single();

    if (error) throw error;

    const { data: questions, error: qError } = await supabase
      .from('survey_questions')
      .select('*')
      .eq('survey_id', surveyId)
      .order('position');

    if (qError) throw qError;

    return { ...survey, questions } as Survey & { questions: SurveyQuestion[] };
  }, []);

  // ===== ADD QUESTION =====
  const addQuestionMutation = useMutation({
    mutationFn: async (data: {
      survey_id: string;
      question_text: string;
      question_type: string;
      options?: Json;
      required?: boolean;
      position: number;
    }) => {
      const { data: question, error } = await supabase
        .from('survey_questions')
        .insert({
          survey_id: data.survey_id,
          question_text: data.question_text,
          question_type: data.question_type,
          options: data.options ?? null,
          required: data.required ?? true,
          position: data.position,
        })
        .select()
        .single();
      if (error) throw error;
      return question as SurveyQuestion;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['survey_questions'] });
    },
    onError: (error) => {
      toast({ title: 'Erro ao adicionar pergunta', description: error.message, variant: 'destructive' });
    },
  });

  // ===== UPDATE QUESTION =====
  const updateQuestionMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; question_text?: string; question_type?: string; options?: Json; required?: boolean; position?: number }) => {
      const { data: question, error } = await supabase
        .from('survey_questions')
        .update(data as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return question as SurveyQuestion;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['survey_questions'] });
    },
    onError: (error) => {
      toast({ title: 'Erro ao atualizar pergunta', description: error.message, variant: 'destructive' });
    },
  });

  // ===== DELETE QUESTION =====
  const deleteQuestionMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('survey_questions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['survey_questions'] });
    },
    onError: (error) => {
      toast({ title: 'Erro ao excluir pergunta', description: error.message, variant: 'destructive' });
    },
  });

  // ===== REORDER QUESTIONS =====
  const reorderQuestionsMutation = useMutation({
    mutationFn: async (questions: { id: string; position: number }[]) => {
      const updates = questions.map((q) =>
        supabase.from('survey_questions').update({ position: q.position }).eq('id', q.id)
      );
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['survey_questions'] });
    },
    onError: (error) => {
      toast({ title: 'Erro ao reordenar', description: error.message, variant: 'destructive' });
    },
  });

  // ===== SEND INVITATIONS =====
  const sendInvitationsMutation = useMutation({
    mutationFn: async ({ surveyId, userIds }: { surveyId: string; userIds: string[] }) => {
      const invitations = userIds.map((userId) => ({
        survey_id: surveyId,
        user_id: userId,
        status: 'pending',
      }));

      const { error } = await supabase.from('survey_invitations').insert(invitations);
      if (error) throw error;

      // Create notifications for each user
      const { data: survey } = await supabase
        .from('surveys')
        .select('title')
        .eq('id', surveyId)
        .single();

      const notifications = userIds.map((userId) => ({
        user_id: userId,
        account_id: account?.id,
        type: 'survey_invite',
        title: 'Novo questionário disponível',
        message: `Você foi convidado para responder: ${survey?.title}`,
        link: `/responder-questionario/${surveyId}`,
      }));

      await supabase.from('notifications').insert(notifications);

      return invitations;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['survey_invitations'] });
      toast({ title: 'Convites enviados com sucesso!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao enviar convites', description: error.message, variant: 'destructive' });
    },
  });

  // ===== SEND REMINDER =====
  const sendReminderMutation = useMutation({
    mutationFn: async ({ surveyId, userId }: { surveyId: string; userId: string }) => {
      const { data, error } = await supabase.functions.invoke('send-survey-reminder', {
        body: { surveyId, userId },
      });
      
      if (error) throw error;
      
      if (data?.success === false) {
        throw new Error(data.message || 'Failed to send reminder');
      }
      
      return data;
    },
    onSuccess: (data) => {
      toast({ 
        title: 'Lembrete enviado!', 
        description: data?.emailSent ? 'Email de lembrete enviado com sucesso.' : 'Notificação criada com sucesso.' 
      });
    },
    onError: (error: Error) => {
      if (error.message?.includes('24 hours')) {
        toast({ 
          title: 'Lembrete já enviado', 
          description: 'Aguarde 24 horas antes de enviar outro lembrete.',
          variant: 'destructive' 
        });
      } else {
        toast({ title: 'Erro ao enviar lembrete', description: error.message, variant: 'destructive' });
      }
    },
  });

  // ===== GET INVITATIONS =====
  const getInvitations = useCallback(async (surveyId: string) => {
    const { data, error } = await supabase
      .from('survey_invitations')
      .select('*')
      .eq('survey_id', surveyId)
      .order('sent_at', { ascending: false });

    if (error) throw error;

    // Get user details
    const userIds = data.map((i) => i.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email')
      .in('id', userIds);

    return data.map((inv) => {
      const profile = profiles?.find((p) => p.id === inv.user_id);
      return {
        ...inv,
        user_name: profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 'Usuário',
        user_email: profile?.email || '',
      };
    }) as SurveyInvitation[];
  }, []);

  // ===== GET STATS =====
  const getSurveyStats = useCallback(async (surveyId: string): Promise<SurveyStats> => {
    const { data: invitations } = await supabase
      .from('survey_invitations')
      .select('status')
      .eq('survey_id', surveyId);

    const totalInvited = invitations?.length || 0;
    const totalResponded = invitations?.filter((i) => i.status === 'completed').length || 0;
    const pending = invitations?.filter((i) => i.status === 'pending').length || 0;
    const viewed = invitations?.filter((i) => i.status === 'viewed').length || 0;

    return {
      totalInvited,
      totalResponded,
      responseRate: totalInvited > 0 ? Math.round((totalResponded / totalInvited) * 100) : 0,
      pending,
      viewed,
    };
  }, []);

  // ===== GET QUESTION STATS =====
  const getQuestionStats = useCallback(async (surveyId: string): Promise<QuestionStats[]> => {
    const { data: questions } = await supabase
      .from('survey_questions')
      .select('*')
      .eq('survey_id', surveyId)
      .order('position');

    if (!questions) return [];

    const { data: responses } = await supabase
      .from('survey_responses')
      .select('id')
      .eq('survey_id', surveyId)
      .not('submitted_at', 'is', null);

    if (!responses?.length) {
      return questions.map((q) => ({
        questionId: q.id,
        questionText: q.question_text,
        questionType: q.question_type as QuestionType,
        responses: 0,
      }));
    }

    const responseIds = responses.map((r) => r.id);
    const { data: answers } = await supabase
      .from('survey_answers')
      .select('*')
      .in('response_id', responseIds);

    return questions.map((q) => {
      const qAnswers = answers?.filter((a) => a.question_id === q.id) || [];
      const stats: QuestionStats = {
        questionId: q.id,
        questionText: q.question_text,
        questionType: q.question_type as QuestionType,
        responses: qAnswers.length,
      };

      if (q.question_type === 'single_choice' || q.question_type === 'multiple_choice') {
        const distribution: Record<string, number> = {};
        qAnswers.forEach((a) => {
          if (a.answer_text) {
            distribution[a.answer_text] = (distribution[a.answer_text] || 0) + 1;
          }
          if (a.answer_options) {
            const opts = a.answer_options as string[];
            opts.forEach((opt) => {
              distribution[opt] = (distribution[opt] || 0) + 1;
            });
          }
        });
        stats.distribution = distribution;
      }

      if (q.question_type === 'scale') {
        const scales = qAnswers.filter((a) => a.answer_scale != null).map((a) => a.answer_scale!);
        if (scales.length) {
          stats.average = scales.reduce((a, b) => a + b, 0) / scales.length;
        }
      }

      if (q.question_type === 'nps') {
        const scores = qAnswers.filter((a) => a.answer_scale != null).map((a) => a.answer_scale!);
        if (scores.length) {
          const promoters = scores.filter((s) => s >= 9).length;
          const passives = scores.filter((s) => s >= 7 && s <= 8).length;
          const detractors = scores.filter((s) => s <= 6).length;
          stats.nps = {
            promoters,
            passives,
            detractors,
            score: Math.round(((promoters - detractors) / scores.length) * 100),
          };
        }
      }

      if (q.question_type === 'text') {
        stats.textResponses = qAnswers.filter((a) => a.answer_text).map((a) => a.answer_text!);
      }

      return stats;
    });
  }, []);

  // ===== SAVE AS TEMPLATE =====
  const saveAsTemplateMutation = useMutation({
    mutationFn: async ({ surveyId, name, description }: { surveyId: string; name: string; description?: string }) => {
      if (!account?.id || !user?.id) throw new Error('Não autenticado');

      const { data: survey } = await supabase
        .from('surveys')
        .select('category')
        .eq('id', surveyId)
        .single();

      const { data: template, error } = await supabase
        .from('survey_templates')
        .insert({
          account_id: account.id,
          name,
          description,
          category: survey?.category,
          created_by: user.id,
          is_public: false,
        })
        .select()
        .single();

      if (error) throw error;

      const { data: questions } = await supabase
        .from('survey_questions')
        .select('*')
        .eq('survey_id', surveyId)
        .order('position');

      if (questions?.length) {
        const templateQuestions = questions.map((q) => ({
          template_id: template.id,
          question_text: q.question_text,
          question_type: q.question_type,
          options: q.options,
          required: q.required,
          position: q.position,
        }));

        await supabase.from('survey_template_questions').insert(templateQuestions);
      }

      return template as SurveyTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['survey_templates'] });
      toast({ title: 'Modelo salvo com sucesso!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao salvar modelo', description: error.message, variant: 'destructive' });
    },
  });

  // ===== GET TEMPLATE QUESTIONS =====
  const getTemplateQuestions = useCallback(async (templateId: string) => {
    const { data, error } = await supabase
      .from('survey_template_questions')
      .select('*')
      .eq('template_id', templateId)
      .order('position');
    if (error) throw error;
    return data as SurveyTemplateQuestion[];
  }, []);

  // ===== SUBMIT RESPONSE =====
  const submitResponseMutation = useMutation({
    mutationFn: async ({
      surveyId,
      answers,
      isAnonymous,
    }: {
      surveyId: string;
      answers: { questionId: string; text?: string; options?: string[]; scale?: number }[];
      isAnonymous: boolean;
    }) => {
      const { data: response, error } = await supabase
        .from('survey_responses')
        .insert({
          survey_id: surveyId,
          respondent_id: isAnonymous ? null : user?.id,
          is_anonymous: isAnonymous,
          submitted_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      const answersToInsert = answers.map((a) => ({
        response_id: response.id,
        question_id: a.questionId,
        answer_text: a.text || null,
        answer_options: a.options || null,
        answer_scale: a.scale ?? null,
      }));

      const { error: answerError } = await supabase.from('survey_answers').insert(answersToInsert);
      if (answerError) throw answerError;

      // Update invitation status
      if (user?.id) {
        await supabase
          .from('survey_invitations')
          .update({ status: 'completed', responded_at: new Date().toISOString() })
          .eq('survey_id', surveyId)
          .eq('user_id', user.id);
      }

      return response as SurveyResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['survey_invitations'] });
      toast({ title: 'Resposta enviada com sucesso!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao enviar resposta', description: error.message, variant: 'destructive' });
    },
  });

  // ===== GENERATE RECURRENCE SCHEDULE =====
  const generateRecurrenceSchedule = useCallback(
    (
      startDate: Date,
      endDate: Date,
      pattern: RecurrencePattern,
      recurrenceEndDate: Date
    ): { start: Date; end: Date }[] => {
      const schedules: { start: Date; end: Date }[] = [];
      const duration = differenceInDays(endDate, startDate);
      let currentStart = startDate;
      let iterations = 0;
      const maxIterations = 100;

      while (currentStart < recurrenceEndDate && iterations < maxIterations) {
        let nextStart: Date;

        switch (pattern) {
          case 'weekly':
            nextStart = addWeeks(currentStart, 1);
            break;
          case 'biweekly':
            nextStart = addWeeks(currentStart, 2);
            break;
          case 'monthly':
            nextStart = addMonths(currentStart, 1);
            break;
          case 'quarterly':
            nextStart = addMonths(currentStart, 3);
            break;
          case 'biannual':
            nextStart = addMonths(currentStart, 6);
            break;
          case 'annually':
            nextStart = addYears(currentStart, 1);
            break;
          default:
            nextStart = addMonths(currentStart, 1);
        }

        if (nextStart <= recurrenceEndDate) {
          const nextEnd = new Date(nextStart);
          nextEnd.setDate(nextEnd.getDate() + duration);
          schedules.push({ start: nextStart, end: nextEnd });
        }

        currentStart = nextStart;
        iterations++;
      }

      return schedules;
    },
    []
  );

  // ===== SAVE SCHEDULES =====
  const saveSchedulesMutation = useMutation({
    mutationFn: async ({
      surveyId,
      schedules,
    }: {
      surveyId: string;
      schedules: { start: Date; end: Date }[];
    }) => {
      // Delete existing pending schedules
      await supabase
        .from('survey_schedules')
        .delete()
        .eq('survey_id', surveyId)
        .eq('status', 'pending');

      if (schedules.length === 0) return [];

      const schedulesToInsert = schedules.map((s) => ({
        survey_id: surveyId,
        scheduled_start_date: s.start.toISOString(),
        scheduled_end_date: s.end.toISOString(),
        status: 'pending',
      }));

      const { data, error } = await supabase
        .from('survey_schedules')
        .insert(schedulesToInsert)
        .select();

      if (error) throw error;
      return data as SurveySchedule[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['survey_schedules'] });
      toast({ title: 'Agendamentos salvos!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao salvar agendamentos', description: error.message, variant: 'destructive' });
    },
  });

  // ===== GET SCHEDULES =====
  const getSchedules = useCallback(async (surveyId: string): Promise<SurveySchedule[]> => {
    const { data, error } = await supabase
      .from('survey_schedules')
      .select('*')
      .eq('survey_id', surveyId)
      .order('scheduled_start_date');

    if (error) throw error;
    return data as SurveySchedule[];
  }, []);

  // ===== CANCEL FUTURE SCHEDULES =====
  const cancelFutureSchedulesMutation = useMutation({
    mutationFn: async (surveyId: string) => {
      const { error } = await supabase
        .from('survey_schedules')
        .update({ status: 'cancelled' })
        .eq('survey_id', surveyId)
        .eq('status', 'pending');

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['survey_schedules'] });
      toast({ title: 'Agendamentos futuros cancelados!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao cancelar agendamentos', description: error.message, variant: 'destructive' });
    },
  });

  // ===== GET RECURRING SURVEY COMPARISON =====
  const getRecurringSurveyComparison = useCallback(async (parentSurveyId: string) => {
    // Get all surveys with this parent_survey_id or the survey itself
    const { data: relatedSurveys, error } = await supabase
      .from('surveys')
      .select('*')
      .or(`id.eq.${parentSurveyId},parent_survey_id.eq.${parentSurveyId}`)
      .order('start_date');

    if (error) throw error;
    if (!relatedSurveys?.length) return [];

    // Get stats for each survey
    const instancesData = await Promise.all(
      relatedSurveys.map(async (survey) => {
        const [stats, questionStats] = await Promise.all([
          getSurveyStats(survey.id),
          getQuestionStats(survey.id),
        ]);
        return { survey: survey as Survey, stats, questionStats };
      })
    );

    return instancesData;
  }, [getSurveyStats, getQuestionStats]);

  // ===== GET CALENDAR DATA =====
  const getCalendarData = useCallback(async (month: Date) => {
    const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
    const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);

    // Get surveys that overlap with this month
    const { data: monthSurveys, error: surveysError } = await supabase
      .from('surveys')
      .select('*')
      .eq('account_id', account?.id)
      .or(`start_date.lte.${monthEnd.toISOString()},end_date.gte.${monthStart.toISOString()}`);

    if (surveysError) throw surveysError;

    // Get pending schedules for this month
    const { data: monthSchedules, error: schedulesError } = await supabase
      .from('survey_schedules')
      .select('*')
      .eq('status', 'pending')
      .or(`scheduled_start_date.lte.${monthEnd.toISOString()},scheduled_end_date.gte.${monthStart.toISOString()}`);

    if (schedulesError) throw schedulesError;

    return {
      surveys: (monthSurveys || []) as Survey[],
      schedules: (monthSchedules || []) as SurveySchedule[],
    };
  }, [account?.id]);

  return {
    // Data
    surveys,
    templates,
    isLoadingSurveys,
    isLoadingTemplates,

    // Survey CRUD
    createSurvey: createSurveyMutation.mutateAsync,
    updateSurvey: updateSurveyMutation.mutateAsync,
    deleteSurvey: deleteSurveyMutation.mutateAsync,
    publishSurvey: publishSurveyMutation.mutateAsync,
    closeSurvey: closeSurveyMutation.mutateAsync,
    reactivateSurvey: reactivateSurveyMutation.mutateAsync,
    archiveSurvey: archiveSurveyMutation.mutateAsync,
    draftSurvey: draftSurveyMutation.mutateAsync,
    duplicateSurvey: duplicateSurveyMutation.mutateAsync,
    getSurveyWithQuestions,
    refetchSurveys,

    // Questions
    addQuestion: addQuestionMutation.mutateAsync,
    updateQuestion: updateQuestionMutation.mutateAsync,
    deleteQuestion: deleteQuestionMutation.mutateAsync,
    reorderQuestions: reorderQuestionsMutation.mutateAsync,

    // Invitations
    sendInvitations: sendInvitationsMutation.mutateAsync,
    sendReminder: sendReminderMutation.mutateAsync,
    getInvitations,

    // Stats
    getSurveyStats,
    getQuestionStats,
    getRecurringSurveyComparison,

    // Calendar
    getCalendarData,

    // Templates
    saveAsTemplate: saveAsTemplateMutation.mutateAsync,
    getTemplateQuestions,

    // Response
    submitResponse: submitResponseMutation.mutateAsync,

    // Schedules & Recurrence
    generateRecurrenceSchedule,
    saveSchedules: saveSchedulesMutation.mutateAsync,
    getSchedules,
    cancelFutureSchedules: cancelFutureSchedulesMutation.mutateAsync,

    // Loading states
    isCreating: createSurveyMutation.isPending,
    isUpdating: updateSurveyMutation.isPending,
    isDeleting: deleteSurveyMutation.isPending,
    isPublishing: publishSurveyMutation.isPending,
    isDuplicating: duplicateSurveyMutation.isPending,
    isReactivating: reactivateSurveyMutation.isPending,
    isArchiving: archiveSurveyMutation.isPending,
    isDrafting: draftSurveyMutation.isPending,
    isSavingSchedules: saveSchedulesMutation.isPending,
  };
}
