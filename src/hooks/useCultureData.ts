import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { CultureCodeInput } from '@/types/culture-code.types';

export function useCultureData() {
  const { user } = useAuth();
  const [cultureData, setCultureData] = useState<CultureCodeInput | null>(null);
  const [loading, setLoading] = useState(true);
  const [completionStatus, setCompletionStatus] = useState({
    mission: false,
    vision: false,
    values: false,
    indicators: false,
    projects: false,
    energy: false,
    development: false,
    decision: false,
  });

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      setLoading(true);

      try {
        // Get account_id
        const { data: profile } = await supabase
          .from('profiles')
          .select('account_id')
          .eq('id', user.id)
          .single();

        if (!profile?.account_id) {
          setLoading(false);
          return;
        }

        const accountId = profile.account_id;

        // Load company name
        const { data: company } = await supabase
          .from('companies')
          .select('name')
          .eq('id', accountId)
          .single();

        // Load all pillar data in parallel
        const [
          missionResult,
          visionResult,
          valuesResult,
          indicatorsResult,
          projectsResult,
          energyResult,
          developmentResult,
          decisionResult,
        ] = await Promise.all([
          // Mission
          supabase
            .from('mission_sessions')
            .select('analysis, stage')
            .eq('account_id', accountId)
            .single(),
          // Vision
          supabase
            .from('vision_sessions')
            .select('analysis, final_vision, stage')
            .eq('account_id', accountId)
            .single(),
          // Values
          supabase
            .from('values_sessions')
            .select('id, stage')
            .eq('account_id', accountId)
            .single(),
          // Indicators
          supabase
            .from('strategic_indicators')
            .select('selected_step1, final_selection, stage')
            .eq('account_id', accountId)
            .single(),
          // Projects
          supabase
            .from('strategic_projects')
            .select('project_name, perspective, responsible')
            .eq('account_id', accountId),
          // Energy
          supabase
            .from('energy_sessions')
            .select('id, stage')
            .eq('account_id', accountId)
            .single(),
          // Development
          supabase
            .from('development_sessions')
            .select('id, stage')
            .eq('account_id', accountId)
            .single(),
          // Decision
          supabase
            .from('decision_sessions')
            .select('id, stage')
            .eq('account_id', accountId)
            .single(),
        ]);

        // Load values behaviors if values session exists
        let values: CultureCodeInput['values'] = [];
        if (valuesResult.data?.id) {
          const { data: behaviors } = await supabase
            .from('values_behaviors_selections')
            .select('value_label, do_selected, dont_selected')
            .eq('session_id', valuesResult.data.id);
          
          if (behaviors) {
            values = behaviors.map(b => ({
              label: b.value_label,
              dos: b.do_selected || [],
              donts: b.dont_selected || [],
            }));
          }
        }

        // Load energy selections
        let energyRituals: string[] = [];
        if (energyResult.data?.id) {
          const { data: selections } = await supabase
            .from('energy_selections')
            .select('item_id')
            .eq('session_id', energyResult.data.id)
            .eq('phase', 3);
          
          if (selections?.length) {
            const { data: catalog } = await supabase
              .from('energy_catalog')
              .select('id, label')
              .in('id', selections.map(s => s.item_id));
            
            energyRituals = catalog?.map(c => c.label) || [];
          }
        }

        // Load development selections
        let developmentRituals: string[] = [];
        if (developmentResult.data?.id) {
          const { data: selections } = await supabase
            .from('development_selections')
            .select('item_id')
            .eq('session_id', developmentResult.data.id)
            .eq('phase', 3);
          
          if (selections?.length) {
            const { data: catalog } = await supabase
              .from('development_catalog')
              .select('id, label')
              .in('id', selections.map(s => s.item_id));
            
            developmentRituals = catalog?.map(c => c.label) || [];
          }
        }

        // Load decision answers
        let decisionAnswers: Record<number, string[]> = {};
        if (decisionResult.data?.id) {
          const { data: answers } = await supabase
            .from('decision_answers')
            .select('question_number, answer_text')
            .eq('session_id', decisionResult.data.id);
          
          if (answers) {
            answers.forEach(a => {
              if (!decisionAnswers[a.question_number]) {
                decisionAnswers[a.question_number] = [];
              }
              decisionAnswers[a.question_number].push(a.answer_text);
            });
          }
        }

        // Parse mission
        const missionAnalysis = missionResult.data?.analysis as any;
        const mission = missionAnalysis?.mission || '';

        // Parse vision
        const visionData = visionResult.data;
        const vision = visionData?.final_vision || 
          (visionData?.analysis as any)?.visionInspirational || '';

        // Parse indicators
        const indicatorsData = indicatorsResult.data;
        const indicatorsByPerspective: Record<string, string[]> = {};
        if (indicatorsData?.selected_step1) {
          const step1 = indicatorsData.selected_step1 as Record<string, string[]>;
          Object.entries(step1).forEach(([key, vals]) => {
            indicatorsByPerspective[key] = vals;
          });
        }

        // Set completion status
        setCompletionStatus({
          mission: (missionResult.data?.stage || 0) >= 16,
          vision: (visionResult.data?.stage || 0) >= 13,
          values: values.length >= 3,
          indicators: Object.values(indicatorsByPerspective).flat().length >= 1,
          projects: (projectsResult.data?.length || 0) >= 1,
          energy: energyRituals.length >= 1,
          development: developmentRituals.length >= 1,
          decision: Object.keys(decisionAnswers).length >= 1,
        });

        setCultureData({
          companyName: company?.name || '',
          mission,
          vision,
          values,
          indicatorsByPerspective,
          projects: projectsResult.data?.map(p => ({
            name: p.project_name,
            perspective: p.perspective,
            responsible: p.responsible || undefined,
          })) || [],
          energyRituals,
          developmentRituals,
          decisionAnswers,
        });

      } catch (error) {
        console.error('Error loading culture data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  const isReady = completionStatus.mission && 
    completionStatus.vision && 
    completionStatus.values;

  const missingPillars = Object.entries(completionStatus)
    .filter(([_, complete]) => !complete)
    .map(([key]) => key);

  return { cultureData, loading, completionStatus, isReady, missingPillars };
}
