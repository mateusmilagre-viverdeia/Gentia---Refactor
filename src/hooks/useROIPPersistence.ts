import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAssessmentStore } from '@/store/assessmentStore';
import { useOrganization } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

export function useROIPPersistence() {
  const { currentAccount } = useOrganization();
  // Use specific selectors for stability - prevents infinite loops
  const setAnswer = useAssessmentStore(state => state.setAnswer);
  const calculateScores = useAssessmentStore(state => state.calculateScores);
  const setAIAnalysis = useAssessmentStore(state => state.setAIAnalysis);
  const setRoipAssessmentId = useAssessmentStore(state => state.setRoipAssessmentId);
  const getAnswers = useCallback(() => useAssessmentStore.getState().answers, []);
  const getScores = useCallback(() => {
    const state = useAssessmentStore.getState();
    return {
      overallScore: state.overallScore,
      pillarScores: state.pillarScores,
      analysisData: state.aiAnalysis,
    };
  }, []);
  
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  // Load latest assessment on mount
  const loadLatestAssessment = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      let query = supabase
        .from('roip_assessments')
        .select(`
          *,
          roip_results(*),
          roip_answers(*)
        `)
        .eq('completed', true)
        .order('created_at', { ascending: false })
        .limit(1);

      query = currentAccount?.id
        ? query.eq('account_id', currentAccount.id)
        : query.eq('user_id', user.id);

      const { data: assessments, error } = await query.maybeSingle();

      if (error) throw error;
      if (!assessments) return null;

      // Check if assessment is complete
      const result = Array.isArray(assessments.roip_results) ? assessments.roip_results[0] : assessments.roip_results;
      const isComplete = assessments.completed && result;
      
      if (isComplete) {
        // Load data into store
        const answers = assessments.roip_answers || [];

        // Reconstruct answers array for store
        const answersArray = answers.map(ans => ({
          questionId: ans.question_id,
          value: ans.answer_value,
        }));

        // Set store state by answering each question
        answersArray.forEach(ans => {
          setAnswer(ans.questionId, ans.value);
        });
        
        // Trigger score calculation
        calculateScores();
        
        // Load AI analysis if exists
        if (result.ai_analysis) {
          setAIAnalysis(result.ai_analysis as any);
        }

        setRoipAssessmentId(assessments.id);
        
        return assessments;
      }

      return null;
    } catch (error) {
      console.error('Error loading assessment:', error);
      return null;
    }
  }, [currentAccount?.id, setAnswer, calculateScores, setAIAnalysis, setRoipAssessmentId]);

  // Create new assessment record
  const createNewAssessment = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Usuário não autenticado');
        return null;
      }

      // Buscar a última simulação do usuário para vincular automaticamente
      let simQuery = supabase
        .from('roip_simulations')
        .select('id, nome_empresa, resultados_calculadora, account_id')
        .order('created_at', { ascending: false })
        .limit(1);

      simQuery = currentAccount?.id
        ? simQuery.eq('account_id', currentAccount.id)
        : simQuery.eq('user_id', user.id);

      const { data: latestSimulation, error: simError } = await simQuery.maybeSingle();

      if (simError) {
        console.error('[createNewAssessment] Error fetching simulation:', simError);
      }

      const roipSimulationId = latestSimulation?.id || null;
      const companyName = latestSimulation?.nome_empresa || '';

      console.log('[createNewAssessment] Linking to simulation:', {
        simulation_id: roipSimulationId,
        company_name: companyName,
        has_calculator_data: !!latestSimulation?.resultados_calculadora
      });

      const { data, error } = await supabase
        .from('roip_assessments')
        .insert({
          user_id: user.id,
          company_name: companyName,
          company_segment: '',
          company_size: '',
          completed: false,
          current_step: 0,
          overall_score: 0,
          roip_simulation_id: roipSimulationId,
          account_id: latestSimulation?.account_id || currentAccount?.id || null,
        })
        .select()
        .single();

      if (error) throw error;

      console.log('[createNewAssessment] Created new assessment:', data.id, 'linked to simulation:', roipSimulationId);
      setRoipAssessmentId(data.id);
      return data;
    } catch (error) {
      console.error('Error creating assessment:', error);
      toast.error('Erro ao criar assessment');
      return null;
    }
  }, [currentAccount?.id, setRoipAssessmentId]);

  // Link existing assessment to latest simulation if not already linked
  const linkAssessmentToSimulation = useCallback(async (assessmentId: string): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // Check if assessment already has a simulation linked
      const { data: assessment, error: assessmentError } = await supabase
        .from('roip_assessments')
        .select('roip_simulation_id, account_id')
        .eq('id', assessmentId)
        .single();

      if (assessmentError) {
        console.error('[linkAssessmentToSimulation] Error fetching assessment:', assessmentError);
        return false;
      }

      if (assessment?.roip_simulation_id) {
        console.log('[linkAssessmentToSimulation] Assessment already linked to simulation:', assessment.roip_simulation_id);
        return true; // Already linked
      }

      // Fetch latest simulation
      let simQuery = supabase
        .from('roip_simulations')
        .select('id, nome_empresa, account_id')
        .order('created_at', { ascending: false })
        .limit(1);

      simQuery = currentAccount?.id
        ? simQuery.eq('account_id', currentAccount.id)
        : simQuery.eq('user_id', user.id);

      const { data: latestSim, error: simError } = await simQuery.maybeSingle();

      if (simError) {
        console.error('[linkAssessmentToSimulation] Error fetching simulation:', simError);
        return false;
      }

      if (!latestSim?.id) {
        console.log('[linkAssessmentToSimulation] No simulation found for user');
        return false;
      }

      // Update assessment with simulation ID
      const { error: updateError } = await supabase
        .from('roip_assessments')
        .update({
          roip_simulation_id: latestSim.id,
          account_id: assessment.account_id || latestSim.account_id || currentAccount?.id || null,
        })
        .eq('id', assessmentId);

      if (updateError) {
        console.error('[linkAssessmentToSimulation] Error updating assessment:', updateError);
        return false;
      }

      console.log('[linkAssessmentToSimulation] ✓ Linked assessment', assessmentId, 'to simulation:', latestSim.id);
      return true;
    } catch (error) {
      console.error('[linkAssessmentToSimulation] Error:', error);
      return false;
    }
  }, [currentAccount?.id]);

  // Save progress immediately - UPSERT for incremental saves
  const saveProgress = useCallback(async (assessmentId: string) => {
    if (!assessmentId) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = undefined;
    }

    const answers = getAnswers();
    
    if (answers.length === 0) {
      console.log('[saveProgress] No answers to save');
      return;
    }

    console.log('[saveProgress] Saving', answers.length, 'answers using UPSERT');

    const answersToUpsert = answers.map(ans => ({
      roip_assessment_id: assessmentId,
      question_id: ans.questionId,
      answer_value: ans.value,
    }));

    const { error: upsertError } = await supabase
      .from('roip_answers')
      .upsert(answersToUpsert, {
        onConflict: 'roip_assessment_id,question_id',
        ignoreDuplicates: false,
      });

    if (upsertError) throw upsertError;

    console.log('[saveProgress] ✓ Progress saved successfully');
  }, [getAnswers]);

  // Save final results
  const saveResults = useCallback(async (assessmentId: string) => {
    if (!assessmentId) return;

    try {
      const { overallScore, pillarScores, analysisData } = getScores();

      // Save final answers before marking the assessment as completed
      await saveProgress(assessmentId);

      // Save results
      const { error: resultsError } = await supabase
        .from('roip_results')
        .upsert({
          roip_assessment_id: assessmentId,
          overall_score: overallScore,
          pillar_scores: pillarScores as any,
          ai_analysis: analysisData as any,
        }, {
          onConflict: 'roip_assessment_id',
          ignoreDuplicates: false,
        });

      if (resultsError) throw resultsError;

      // Mark assessment as completed
      const { error: assessmentError } = await supabase
        .from('roip_assessments')
        .update({ completed: true })
        .eq('id', assessmentId);

      if (assessmentError) throw assessmentError;

      console.log('[saveResults] ✓ Results saved successfully');
    } catch (error) {
      console.error('Error saving results:', error);
      toast.error('Erro ao salvar resultados');
      throw error;
    }
  }, [getScores, saveProgress]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    loadLatestAssessment,
    createNewAssessment,
    linkAssessmentToSimulation,
    saveProgress,
    saveResults,
  };
}
