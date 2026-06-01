import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type {
  PulseDriver,
  PulsePillar,
  PulseQuestion,
  PulseCompanyValue,
  PulseEmojiSet,
  PulseDailyAssignment,
  PulseDailyAssignmentItem,
  ActionStatus,
} from '@/types/pulse.types';
import type { CulturePillar } from '@/types/pulseCulture.types';

export interface PulseAdminAction {
  id: string;
  account_id: string;
  title: string;
  description: string | null;
  status: ActionStatus;
  priority: string | null;
  due_date: string | null;
  related_pillar_id: string | null;
  related_driver_id: string | null;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  pulse_pillars?: PulsePillar;
  pulse_drivers?: PulseDriver;
}

export interface DailyRules {
  daily_questions_count: number;
  must_include_driver_keys: string[];
  prefer_driver_keys: string[];
  rotation_pool_driver_keys: string[];
  max_repeat_block_days: number;
  anonymous_driver_keys: string[];
}

export interface QuestionFilters {
  driver_id?: string;
  is_active?: boolean;
  ai_generated?: boolean;
  search?: string;
}

export function usePulseAdmin(accountId: string | null) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  // Drivers
  const [drivers, setDrivers] = useState<PulseDriver[]>([]);
  const [pillars, setPillars] = useState<PulsePillar[]>([]);
  const [emojiSets, setEmojiSets] = useState<PulseEmojiSet[]>([]);
  const [companyValues, setCompanyValues] = useState<PulseCompanyValue[]>([]);
  const [questions, setQuestions] = useState<PulseQuestion[]>([]);
  const [assignments, setAssignments] = useState<(PulseDailyAssignment & { items: PulseDailyAssignmentItem[] })[]>([]);
  const [adminActions, setAdminActions] = useState<PulseAdminAction[]>([]);

  // ========== DRIVERS ==========
  const fetchDrivers = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pulse_drivers')
        .select('*')
        .or(`account_id.eq.${accountId},account_id.is.null`)
        .order('sort_order');
      
      if (error) throw error;
      setDrivers(data as PulseDriver[]);
    } catch (error: any) {
      toast({ title: 'Erro ao carregar drivers', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [accountId, toast]);

  const toggleDriver = useCallback(async (driverId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('pulse_drivers')
        .update({ is_active: isActive })
        .eq('id', driverId);
      
      if (error) throw error;
      setDrivers(prev => prev.map(d => d.id === driverId ? { ...d, is_active: isActive } : d));
      toast({ title: isActive ? 'Driver ativado' : 'Driver desativado' });
    } catch (error: any) {
      toast({ title: 'Erro ao atualizar driver', description: error.message, variant: 'destructive' });
    }
  }, [toast]);

  // ========== PILLARS ==========
  const fetchPillars = useCallback(async () => {
    if (!accountId) return;
    try {
      const { data, error } = await supabase
        .from('pulse_pillars')
        .select('*')
        .or(`account_id.eq.${accountId},account_id.is.null`)
        .order('sort_order');
      
      if (error) throw error;
      setPillars(data as PulsePillar[]);
    } catch (error: any) {
      toast({ title: 'Erro ao carregar pilares', description: error.message, variant: 'destructive' });
    }
  }, [accountId, toast]);

  // ========== EMOJI SETS ==========
  const fetchEmojiSets = useCallback(async () => {
    if (!accountId) return;
    try {
      const { data, error } = await supabase
        .from('pulse_emoji_sets')
        .select('*')
        .or(`account_id.eq.${accountId},account_id.is.null`)
        .order('is_default', { ascending: false });
      
      if (error) throw error;
      setEmojiSets(data as unknown as PulseEmojiSet[]);
    } catch (error: any) {
      toast({ title: 'Erro ao carregar emoji sets', description: error.message, variant: 'destructive' });
    }
  }, [accountId, toast]);

  const createEmojiSet = useCallback(async (emojiSet: Partial<PulseEmojiSet>) => {
    if (!accountId) return null;
    try {
      const { data, error } = await supabase
        .from('pulse_emoji_sets')
        .insert({
          account_id: accountId,
          name: emojiSet.name || 'Novo Conjunto',
          type: emojiSet.type || 'likert5',
          options: JSON.parse(JSON.stringify(emojiSet.options || [])),
          is_default: false,
        })
        .select()
        .single();
      
      if (error) throw error;
      setEmojiSets(prev => [...prev, data as unknown as PulseEmojiSet]);
      toast({ title: 'Conjunto de resposta criado com sucesso' });
      return data;
    } catch (error: any) {
      toast({ title: 'Erro ao criar conjunto', description: error.message, variant: 'destructive' });
      return null;
    }
  }, [accountId, toast]);

  const updateEmojiSet = useCallback(async (id: string, updates: Partial<PulseEmojiSet>) => {
    try {
      const updateData: Record<string, any> = { ...updates };
      if (updates.options) {
        updateData.options = JSON.parse(JSON.stringify(updates.options));
      }
      const { error } = await supabase
        .from('pulse_emoji_sets')
        .update(updateData)
        .eq('id', id);
      
      if (error) throw error;
      setEmojiSets(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
      toast({ title: 'Conjunto atualizado' });
    } catch (error: any) {
      toast({ title: 'Erro ao atualizar conjunto', description: error.message, variant: 'destructive' });
    }
  }, [toast]);

  const deleteEmojiSet = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('pulse_emoji_sets')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      setEmojiSets(prev => prev.filter(s => s.id !== id));
      toast({ title: 'Conjunto removido' });
    } catch (error: any) {
      toast({ title: 'Erro ao remover conjunto', description: error.message, variant: 'destructive' });
    }
  }, [toast]);

  // ========== COMPANY VALUES ==========
  const fetchCompanyValues = useCallback(async () => {
    if (!accountId) return;
    try {
      const { data, error } = await supabase
        .from('pulse_company_values')
        .select('*')
        .eq('account_id', accountId)
        .order('sort_order');
      
      if (error) throw error;
      setCompanyValues(data as PulseCompanyValue[]);
    } catch (error: any) {
      toast({ title: 'Erro ao carregar valores', description: error.message, variant: 'destructive' });
    }
  }, [accountId, toast]);

  const createCompanyValue = useCallback(async (value: Partial<PulseCompanyValue>) => {
    if (!accountId) return null;
    try {
      const { data, error } = await supabase
        .from('pulse_company_values')
        .insert({
          account_id: accountId,
          key: value.key || value.name?.toLowerCase().replace(/\s+/g, '_') || 'value',
          name: value.name || '',
          emoji: value.emoji || '⭐',
          description: value.description || null,
          sort_order: companyValues.length,
          is_active: true,
        })
        .select()
        .single();
      
      if (error) throw error;
      setCompanyValues(prev => [...prev, data as PulseCompanyValue]);
      toast({ title: 'Valor criado com sucesso' });
      return data;
    } catch (error: any) {
      toast({ title: 'Erro ao criar valor', description: error.message, variant: 'destructive' });
      return null;
    }
  }, [accountId, companyValues.length, toast]);

  const updateCompanyValue = useCallback(async (id: string, updates: Partial<PulseCompanyValue>) => {
    try {
      const { error } = await supabase
        .from('pulse_company_values')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
      setCompanyValues(prev => prev.map(v => v.id === id ? { ...v, ...updates } : v));
      toast({ title: 'Valor atualizado' });
    } catch (error: any) {
      toast({ title: 'Erro ao atualizar valor', description: error.message, variant: 'destructive' });
    }
  }, [toast]);

  const deleteCompanyValue = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('pulse_company_values')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      setCompanyValues(prev => prev.filter(v => v.id !== id));
      toast({ title: 'Valor removido' });
    } catch (error: any) {
      toast({ title: 'Erro ao remover valor', description: error.message, variant: 'destructive' });
    }
  }, [toast]);

  // ========== IMPORT FROM CULTURE ==========
  const importValuesFromCulture = useCallback(async () => {
    if (!accountId) return { success: false, imported: 0, skipped: 0 };
    
    try {
      // 1. Buscar sessão de valores da conta
      const { data: valuesSession } = await supabase
        .from('values_sessions')
        .select('id')
        .eq('account_id', accountId)
        .maybeSingle();
      
      if (!valuesSession) {
        toast({ 
          title: 'Nenhum valor encontrado', 
          description: 'Complete primeiro a seção de Valores em Cultura → Criação de Cultura',
          variant: 'destructive' 
        });
        return { success: false, imported: 0, skipped: 0 };
      }

      // 2. Buscar seleções da fase 3 (valores finais)
      const { data: selections } = await supabase
        .from('values_selections')
        .select('value_id, values_catalog(label)')
        .eq('session_id', valuesSession.id)
        .eq('phase', 3);

      if (!selections?.length) {
        toast({ 
          title: 'Nenhum valor encontrado', 
          description: 'Complete a etapa de seleção de valores na Criação de Cultura',
          variant: 'destructive' 
        });
        return { success: false, imported: 0, skipped: 0 };
      }

      // 3. Buscar comportamentos selecionados
      const { data: behaviors } = await supabase
        .from('values_behaviors_selections')
        .select('value_label, do_selected, dont_selected')
        .eq('session_id', valuesSession.id);

      // Mapear comportamentos por label do valor
      const behaviorsMap = new Map<string, { dos: string[], donts: string[] }>();
      behaviors?.forEach(b => {
        behaviorsMap.set(b.value_label, {
          dos: b.do_selected || [],
          donts: b.dont_selected || []
        });
      });

      // 4. Verificar quais já existem para evitar duplicatas
      const existingNames = companyValues.map(v => v.name.toLowerCase());
      
      let imported = 0;
      let skipped = 0;

      // 5. Criar valores com comportamentos
      for (const sel of selections) {
        const label = (sel.values_catalog as any)?.label;
        if (!label) continue;

        if (existingNames.includes(label.toLowerCase())) {
          skipped++;
          continue;
        }

        const valueBehaviors = behaviorsMap.get(label);
        
        const { error } = await supabase
          .from('pulse_company_values')
          .insert({
            account_id: accountId,
            key: label.toLowerCase().replace(/\s+/g, '_'),
            name: label,
            emoji: '⭐',
            description: `Valor importado da Criação de Cultura`,
            dos: valueBehaviors?.dos || [],
            donts: valueBehaviors?.donts || [],
            sort_order: companyValues.length + imported,
            is_active: true,
          });

        if (!error) imported++;
      }

      // 6. Feedback e refresh
      if (imported > 0) {
        toast({ 
          title: `${imported} valor(es) importado(s) com sucesso`,
          description: skipped > 0 ? `${skipped} já existiam e foram ignorados` : undefined
        });
        await fetchCompanyValues();
      } else if (skipped > 0) {
        toast({ title: 'Todos os valores já foram importados anteriormente' });
      }
      
      return { success: true, imported, skipped };
    } catch (error: any) {
      toast({ title: 'Erro ao importar valores', description: error.message, variant: 'destructive' });
      return { success: false, imported: 0, skipped: 0 };
    }
  }, [accountId, companyValues, fetchCompanyValues, toast]);

  // ========== QUESTIONS ==========
  const fetchQuestions = useCallback(async (filters?: QuestionFilters) => {
    if (!accountId) return;
    setLoading(true);
    try {
      // 1. Fetch regular questions
      let query = supabase
        .from('pulse_questions')
        .select('*, pulse_drivers(*), pulse_emoji_sets(*)')
        .or(`account_id.eq.${accountId},account_id.is.null`)
        .order('created_at', { ascending: false });
      
      if (filters?.driver_id) {
        query = query.eq('driver_id', filters.driver_id);
      }
      if (filters?.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }
      if (filters?.ai_generated !== undefined) {
        query = query.eq('ai_generated', filters.ai_generated);
      }
      if (filters?.search) {
        query = query.ilike('question_text', `%${filters.search}%`);
      }
      
      const { data: regularData, error: regularError } = await query;
      if (regularError) throw regularError;

      // 2. Fetch culture questions (only if not filtering by specific driver)
      let cultureQuestions: PulseQuestion[] = [];
      if (!filters?.driver_id) {
        let cultureQuery = supabase
          .from('pulse_culture_questions')
          .select('*')
          .eq('account_id', accountId);

        if (filters?.is_active !== undefined) {
          cultureQuery = cultureQuery.eq('is_active', filters.is_active);
        }
        if (filters?.search) {
          cultureQuery = cultureQuery.ilike('question_text', `%${filters.search}%`);
        }

        const { data: cultureData, error: cultureError } = await cultureQuery;
        if (cultureError) {
          console.error('Error fetching culture questions:', cultureError);
        } else {
          // Normalize culture questions to PulseQuestion format
          cultureQuestions = (cultureData || []).map(cq => ({
            id: cq.id,
            account_id: cq.account_id,
            driver_id: null,
            question_text: cq.question_text,
            answer_type: 'emoji_scale' as const,
            emoji_set_id: null,
            multi_select_source: null,
            is_anonymous: false,
            max_repeat_per_month: 2,
            is_active: cq.is_active,
            ai_generated: true,
            tags: [],
            created_by_user_id: null,
            created_at: cq.created_at,
            updated_at: cq.last_used_at || cq.created_at,
            // Culture-specific fields
            is_culture_question: true,
            pillar_type: cq.pillar_type,
            reference_text: cq.reference_text,
          }));
        }
      }

      // 3. Merge both lists
      const allQuestions = [
        ...(regularData as unknown as PulseQuestion[]),
        ...cultureQuestions,
      ];
      
      setQuestions(allQuestions);
    } catch (error: any) {
      toast({ title: 'Erro ao carregar perguntas', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [accountId, toast]);

  const createQuestion = useCallback(async (question: Partial<PulseQuestion> & { pillar_type?: string }) => {
    if (!accountId) return null;
    try {
      // Check if the selected driver is the culture driver
      const driver = drivers.find(d => d.id === question.driver_id);
      const isCultureDriver = driver?.key === 'culture_pulse';

      if (isCultureDriver && question.pillar_type) {
        // Save to pulse_culture_questions table
        const { data, error } = await supabase
          .from('pulse_culture_questions')
          .insert({
            account_id: accountId,
            pillar_type: question.pillar_type as CulturePillar,
            question_text: question.question_text || '',
            reference_text: 'Pergunta manual',
            is_active: true,
          })
          .select()
          .single();

        if (error) throw error;

        // Normalize to unified PulseQuestion format and add to state
        const normalizedQuestion: PulseQuestion = {
          id: data.id,
          account_id: data.account_id,
          driver_id: null,
          question_text: data.question_text,
          answer_type: 'emoji_scale',
          emoji_set_id: null,
          multi_select_source: null,
          is_anonymous: false,
          max_repeat_per_month: 2,
          is_active: data.is_active,
          ai_generated: false,
          tags: [],
          created_by_user_id: null,
          created_at: data.created_at,
          updated_at: data.created_at,
          is_culture_question: true,
          pillar_type: data.pillar_type,
          reference_text: data.reference_text,
        };

        setQuestions(prev => [normalizedQuestion, ...prev]);
        toast({ title: 'Pergunta de cultura criada com sucesso' });
        return data;
      }

      // Regular question flow - save to pulse_questions
      const { data, error } = await supabase
        .from('pulse_questions')
        .insert({
          account_id: accountId,
          driver_id: question.driver_id,
          question_text: question.question_text || '',
          answer_type: question.answer_type || 'emoji_scale',
          emoji_set_id: question.emoji_set_id || null,
          multi_select_source: question.multi_select_source || null,
          is_anonymous: question.is_anonymous || false,
          max_repeat_per_month: question.max_repeat_per_month || 2,
          is_active: true,
          ai_generated: false,
          tags: question.tags || [],
        })
        .select('*, pulse_drivers(*), pulse_emoji_sets(*)')
        .single();
      
      if (error) throw error;
      setQuestions(prev => [data as unknown as PulseQuestion, ...prev]);
      toast({ title: 'Pergunta criada com sucesso' });
      return data;
    } catch (error: any) {
      toast({ title: 'Erro ao criar pergunta', description: error.message, variant: 'destructive' });
      return null;
    }
  }, [accountId, drivers, toast]);

  const updateQuestion = useCallback(async (id: string, updates: Partial<PulseQuestion>) => {
    try {
      const { error } = await supabase
        .from('pulse_questions')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
      setQuestions(prev => prev.map(q => q.id === id ? { ...q, ...updates } : q));
      toast({ title: 'Pergunta atualizada' });
    } catch (error: any) {
      toast({ title: 'Erro ao atualizar pergunta', description: error.message, variant: 'destructive' });
    }
  }, [toast]);

  const toggleQuestion = useCallback(async (id: string, isActive: boolean) => {
    // Check if it's a culture question by looking at current questions state
    const question = questions.find(q => q.id === id);
    if (question?.is_culture_question) {
      // Toggle in pulse_culture_questions table
      try {
        const { error } = await supabase
          .from('pulse_culture_questions')
          .update({ is_active: isActive })
          .eq('id', id);
        
        if (error) throw error;
        setQuestions(prev => prev.map(q => q.id === id ? { ...q, is_active: isActive } : q));
        toast({ title: isActive ? 'Pergunta de cultura ativada' : 'Pergunta de cultura desativada' });
      } catch (error: any) {
        toast({ title: 'Erro ao atualizar pergunta', description: error.message, variant: 'destructive' });
      }
    } else {
      await updateQuestion(id, { is_active: isActive });
    }
  }, [updateQuestion, questions, toast]);

  const deleteQuestion = useCallback(async (id: string) => {
    try {
      // Check if it's a culture question to delete from the correct table
      const question = questions.find(q => q.id === id);
      const table = question?.is_culture_question 
        ? 'pulse_culture_questions' 
        : 'pulse_questions';

      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      setQuestions(prev => prev.filter(q => q.id !== id));
      toast({ title: 'Pergunta removida' });
    } catch (error: any) {
      toast({ title: 'Erro ao remover pergunta', description: error.message, variant: 'destructive' });
    }
  }, [questions, toast]);

  // ========== AI GENERATION ==========
  const generateQuestionsWithAI = useCallback(async (
    driverKeys: string[],
    questionsPerDriver: number = 3,
    includeCultureQuestions: boolean = true
  ) => {
    if (!accountId) return { success: false, count: 0 };
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-generate-questions', {
        body: {
          account_id: accountId,
          driver_keys: driverKeys,
          questions_per_driver: questionsPerDriver,
          include_culture_questions: includeCultureQuestions,
        },
      });
      
      if (error) throw error;
      
      toast({ title: `${data.count} perguntas geradas com sucesso` });
      await fetchQuestions();
      return { success: true, count: data.count };
    } catch (error: any) {
      toast({ title: 'Erro ao gerar perguntas', description: error.message, variant: 'destructive' });
      return { success: false, count: 0 };
    } finally {
      setLoading(false);
    }
  }, [accountId, fetchQuestions, toast]);

  // ========== ASSIGNMENTS ==========
  const fetchAssignments = useCallback(async (month?: string) => {
    if (!accountId) return;
    try {
      let query = supabase
        .from('pulse_daily_assignments')
        .select('*, pulse_daily_assignment_items(*, pulse_questions(*, pulse_drivers(*)))')
        .eq('account_id', accountId)
        .order('date', { ascending: false });
      
      if (month) {
        const startDate = `${month}-01`;
        const endDate = `${month}-31`;
        query = query.gte('date', startDate).lte('date', endDate);
      }
      
      const { data, error } = await query.limit(31);
      if (error) throw error;
      
      setAssignments(data.map(a => ({
        ...a,
        items: a.pulse_daily_assignment_items || [],
      })) as any);
    } catch (error: any) {
      toast({ title: 'Erro ao carregar agenda', description: error.message, variant: 'destructive' });
    }
  }, [accountId, toast]);

  const generateDailyPulse = useCallback(async (date: string, force: boolean = false) => {
    if (!accountId) return null;
    setLoading(true);
    try {
      // Check if assignment already exists
      if (!force) {
        const { data: existing } = await supabase
          .from('pulse_daily_assignments')
          .select('id')
          .eq('account_id', accountId)
          .eq('date', date)
          .single();
        
        if (existing) {
          toast({ title: 'Já existe um pulso para esta data', variant: 'destructive' });
          return null;
        }
      } else {
        // Delete existing if forcing
        await supabase
          .from('pulse_daily_assignments')
          .delete()
          .eq('account_id', accountId)
          .eq('date', date);
      }

      // Get active questions with driver info
      const { data: activeQuestions, error: qError } = await supabase
        .from('pulse_questions')
        .select('*, pulse_drivers(*)')
        .eq('account_id', accountId)
        .eq('is_active', true);
      
      if (qError) throw qError;
      if (!activeQuestions?.length) {
        toast({ title: 'Nenhuma pergunta ativa disponível', variant: 'destructive' });
        return null;
      }

      // Simple selection: pick 3 random questions from different drivers
      const shuffled = activeQuestions.sort(() => Math.random() - 0.5);
      const selected: typeof activeQuestions = [];
      const usedDrivers = new Set<string>();
      
      for (const q of shuffled) {
        if (selected.length >= 3) break;
        if (q.driver_id && !usedDrivers.has(q.driver_id)) {
          selected.push(q);
          usedDrivers.add(q.driver_id);
        }
      }
      
      // If we don't have 3, fill with any remaining
      if (selected.length < 3) {
        for (const q of shuffled) {
          if (selected.length >= 3) break;
          if (!selected.includes(q)) {
            selected.push(q);
          }
        }
      }

      // Create assignment
      const { data: assignment, error: aError } = await supabase
        .from('pulse_daily_assignments')
        .insert({
          account_id: accountId,
          date,
          generated_by: 'admin',
          notes: null,
        })
        .select()
        .single();
      
      if (aError) throw aError;

      // Create assignment items
      const items = selected.map((q, idx) => ({
        assignment_id: assignment.id,
        question_id: q.id,
        order_index: idx,
      }));

      const { error: iError } = await supabase
        .from('pulse_daily_assignment_items')
        .insert(items);
      
      if (iError) throw iError;

      toast({ title: 'Pulso diário gerado com sucesso' });
      await fetchAssignments();
      return assignment;
    } catch (error: any) {
      toast({ title: 'Erro ao gerar pulso', description: error.message, variant: 'destructive' });
      return null;
    } finally {
      setLoading(false);
    }
  }, [accountId, fetchAssignments, toast]);

  // ========== ADMIN ACTIONS ==========
  const fetchAdminActions = useCallback(async () => {
    if (!accountId) return;
    try {
      const { data, error } = await supabase
        .from('pulse_admin_actions')
        .select('*, pulse_pillars(*), pulse_drivers(*)')
        .eq('account_id', accountId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setAdminActions(data as PulseAdminAction[]);
    } catch (error: any) {
      toast({ title: 'Erro ao carregar ações', description: error.message, variant: 'destructive' });
    }
  }, [accountId, toast]);

  const createAdminAction = useCallback(async (action: Partial<PulseAdminAction>) => {
    if (!accountId) return null;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('pulse_admin_actions')
        .insert({
          account_id: accountId,
          title: action.title || '',
          description: action.description || null,
          status: action.status || 'planned',
          priority: action.priority || 'medium',
          due_date: action.due_date || null,
          related_pillar_id: action.related_pillar_id || null,
          related_driver_id: action.related_driver_id || null,
          created_by_user_id: user?.id || null,
        })
        .select('*, pulse_pillars(*), pulse_drivers(*)')
        .single();
      
      if (error) throw error;
      setAdminActions(prev => [data as PulseAdminAction, ...prev]);
      toast({ title: 'Ação criada com sucesso' });
      return data;
    } catch (error: any) {
      toast({ title: 'Erro ao criar ação', description: error.message, variant: 'destructive' });
      return null;
    }
  }, [accountId, toast]);

  const updateAdminAction = useCallback(async (id: string, updates: Partial<PulseAdminAction>) => {
    try {
      const { error } = await supabase
        .from('pulse_admin_actions')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
      setAdminActions(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
      toast({ title: 'Ação atualizada' });
    } catch (error: any) {
      toast({ title: 'Erro ao atualizar ação', description: error.message, variant: 'destructive' });
    }
  }, [toast]);

  const deleteAdminAction = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('pulse_admin_actions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      setAdminActions(prev => prev.filter(a => a.id !== id));
      toast({ title: 'Ação removida' });
    } catch (error: any) {
      toast({ title: 'Erro ao remover ação', description: error.message, variant: 'destructive' });
    }
  }, [toast]);

  // ========== FETCH ALL ==========
  const fetchAll = useCallback(async () => {
    await Promise.all([
      fetchDrivers(),
      fetchPillars(),
      fetchEmojiSets(),
      fetchCompanyValues(),
      fetchQuestions(),
      fetchAdminActions(),
    ]);
  }, [fetchDrivers, fetchPillars, fetchEmojiSets, fetchCompanyValues, fetchQuestions, fetchAdminActions]);

  return {
    loading,
    // Data
    drivers,
    pillars,
    emojiSets,
    companyValues,
    questions,
    assignments,
    adminActions,
    // Driver operations
    fetchDrivers,
    toggleDriver,
    // Pillar operations
    fetchPillars,
    // Emoji operations
    fetchEmojiSets,
    createEmojiSet,
    updateEmojiSet,
    deleteEmojiSet,
    // Company values operations
    fetchCompanyValues,
    createCompanyValue,
    updateCompanyValue,
    deleteCompanyValue,
    importValuesFromCulture,
    // Question operations
    fetchQuestions,
    createQuestion,
    updateQuestion,
    toggleQuestion,
    deleteQuestion,
    generateQuestionsWithAI,
    // Assignment operations
    fetchAssignments,
    generateDailyPulse,
    // Action operations
    fetchAdminActions,
    createAdminAction,
    updateAdminAction,
    deleteAdminAction,
    // Bulk
    fetchAll,
  };
}
