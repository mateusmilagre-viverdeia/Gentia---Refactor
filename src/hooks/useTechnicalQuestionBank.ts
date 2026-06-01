import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TechnicalQuestionBankItem {
  id: string;
  account_id: string;
  agent_id: string | null;
  skill_name: string;
  skill_category: string | null;
  question_text: string;
  level: number;
  question_type: 'conceptual' | 'practical' | 'scenario' | 'debugging';
  followup_if_superficial: string | null;
  followup_if_incorrect: string | null;
  followup_if_excellent: string | null;
  expected_keywords: string[];
  excellent_answer_example: string | null;
  is_mandatory: boolean;
  is_active: boolean;
  usage_count: number;
  avg_score: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreateQuestionInput {
  skill_name: string;
  skill_category?: string;
  question_text: string;
  level: number;
  question_type: 'conceptual' | 'practical' | 'scenario' | 'debugging';
  followup_if_superficial?: string;
  followup_if_incorrect?: string;
  followup_if_excellent?: string;
  expected_keywords?: string[];
  excellent_answer_example?: string;
  is_mandatory?: boolean;
  agent_id?: string;
}

export interface QuestionFilters {
  skill?: string;
  level?: number;
  type?: string;
  search?: string;
}

async function fetchQuestionBank(accountId: string, filters: QuestionFilters): Promise<TechnicalQuestionBankItem[]> {
  let query = supabase
    .from('technical_question_bank')
    .select('*')
    .eq('account_id', accountId)
    .eq('is_active', true)
    .order('is_mandatory', { ascending: false })
    .order('skill_name', { ascending: true })
    .order('level', { ascending: true });

  if (filters.skill) {
    query = query.ilike('skill_name', `%${filters.skill}%`);
  }
  if (filters.level) {
    query = query.eq('level', filters.level);
  }
  if (filters.type) {
    query = query.eq('question_type', filters.type);
  }
  if (filters.search) {
    query = query.ilike('question_text', `%${filters.search}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching question bank:', error);
    throw error;
  }

  return (data || []) as TechnicalQuestionBankItem[];
}

export function useTechnicalQuestionBank(accountId: string | undefined, filters: QuestionFilters = {}) {
  const queryClient = useQueryClient();

  const questionsQuery = useQuery({
    queryKey: ['technical-question-bank', accountId, filters],
    queryFn: () => fetchQuestionBank(accountId!, filters),
    enabled: !!accountId,
  });

  const createQuestion = useMutation({
    mutationFn: async (input: CreateQuestionInput) => {
      const { data, error } = await supabase
        .from('technical_question_bank')
        .insert({
          account_id: accountId,
          ...input,
          expected_keywords: input.expected_keywords || [],
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technical-question-bank', accountId] });
      toast.success('Pergunta criada com sucesso!');
    },
    onError: (error) => {
      console.error('Error creating question:', error);
      toast.error('Erro ao criar pergunta');
    },
  });

  const updateQuestion = useMutation({
    mutationFn: async ({ id, ...input }: Partial<CreateQuestionInput> & { id: string }) => {
      const { data, error } = await supabase
        .from('technical_question_bank')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technical-question-bank', accountId] });
      toast.success('Pergunta atualizada!');
    },
    onError: (error) => {
      console.error('Error updating question:', error);
      toast.error('Erro ao atualizar pergunta');
    },
  });

  const deleteQuestion = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('technical_question_bank')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technical-question-bank', accountId] });
      toast.success('Pergunta removida!');
    },
    onError: (error) => {
      console.error('Error deleting question:', error);
      toast.error('Erro ao remover pergunta');
    },
  });

  const toggleMandatory = useMutation({
    mutationFn: async ({ id, is_mandatory }: { id: string; is_mandatory: boolean }) => {
      const { error } = await supabase
        .from('technical_question_bank')
        .update({ is_mandatory })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technical-question-bank', accountId] });
    },
  });

  return {
    questions: questionsQuery.data || [],
    isLoading: questionsQuery.isLoading,
    error: questionsQuery.error,
    createQuestion,
    updateQuestion,
    deleteQuestion,
    toggleMandatory,
    refetch: questionsQuery.refetch,
  };
}
