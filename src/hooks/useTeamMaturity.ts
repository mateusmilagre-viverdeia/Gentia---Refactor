import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAccount } from '@/hooks/useAccount';
import { useOrganization } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';
import { invokeAuthenticatedFunction } from '@/lib/authenticatedFetch';
import type {
  TeamMaturityAssessment,
  TeamMaturityPoint,
  TeamMaturityVersionHistory,
  TeamMaturityAIAnalysis,
  PersonMaturityAIAnalysis,
  SavedAIAnalysis,
} from '@/types/team-maturity.types';
import { getMaturityLevelFromPosition } from '@/types/team-maturity.types';

export function useTeamMaturity() {
  const { user } = useAuth();
  const { isOwner, isAdmin, isAdminRH, loading: accountLoading } = useAccount();
  const { currentAccount: account } = useOrganization();
  const [assessments, setAssessments] = useState<TeamMaturityAssessment[]>([]);
  const [selectedAssessment, setSelectedAssessment] = useState<TeamMaturityAssessment | null>(null);
  const [points, setPoints] = useState<TeamMaturityPoint[]>([]);
  const [versionHistory, setVersionHistory] = useState<TeamMaturityVersionHistory[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  
  // AI Analysis state
  const [teamAnalysis, setTeamAnalysis] = useState<TeamMaturityAIAnalysis | null>(null);
  const [personAnalysis, setPersonAnalysis] = useState<PersonMaturityAIAnalysis | null>(null);
  const [isAnalyzingTeam, setIsAnalyzingTeam] = useState(false);
  const [isAnalyzingPerson, setIsAnalyzingPerson] = useState(false);
  
  // Saved analyses
  const [savedTeamAnalyses, setSavedTeamAnalyses] = useState<SavedAIAnalysis[]>([]);
  const [savedPersonAnalyses, setSavedPersonAnalyses] = useState<SavedAIAnalysis[]>([]);

  const canAccess = isOwner || isAdmin || isAdminRH;
  const loading = accountLoading || dataLoading;

  // Load assessments
  const loadAssessments = useCallback(async () => {
    if (!account?.id || !canAccess) return;

    try {
      const { data, error } = await supabase
        .from('team_maturity_assessments')
        .select('*')
        .eq('account_id', account.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const typed = (data || []) as TeamMaturityAssessment[];
      setAssessments(typed);

      if (typed.length > 0 && !selectedAssessment) {
        setSelectedAssessment(typed[0]);
      }
    } catch (error) {
      console.error('Error loading assessments:', error);
    }
  }, [account?.id, canAccess, selectedAssessment]);

  // Load points for selected assessment
  const loadPoints = useCallback(async () => {
    if (!selectedAssessment?.id) {
      setPoints([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('team_maturity_points')
        .select('*')
        .eq('assessment_id', selectedAssessment.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setPoints((data || []) as TeamMaturityPoint[]);
    } catch (error) {
      console.error('Error loading points:', error);
    }
  }, [selectedAssessment?.id]);

  // Load version history
  const loadVersionHistory = useCallback(async () => {
    if (!selectedAssessment?.id) {
      setVersionHistory([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('team_maturity_version_history')
        .select('*')
        .eq('assessment_id', selectedAssessment.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const typed = (data || []).map((item) => ({
        ...item,
        snapshot: item.snapshot as unknown as { points: TeamMaturityPoint[] },
      }));
      setVersionHistory(typed);
    } catch (error) {
      console.error('Error loading version history:', error);
    }
  }, [selectedAssessment?.id]);

  // Create assessment
  const createAssessment = async (name: string, description?: string) => {
    if (!account?.id) return null;

    try {
      const { data, error } = await supabase
        .from('team_maturity_assessments')
        .insert({
          account_id: account.id,
          name,
          description: description || null,
        })
        .select()
        .single();

      if (error) throw error;

      const newAssessment = data as TeamMaturityAssessment;
      setAssessments((prev) => [newAssessment, ...prev]);
      setSelectedAssessment(newAssessment);
      toast.success('Avaliação criada com sucesso!');
      return newAssessment;
    } catch (error) {
      console.error('Error creating assessment:', error);
      toast.error('Erro ao criar avaliação');
      return null;
    }
  };

  // Update assessment
  const updateAssessment = async (id: string, updates: Partial<TeamMaturityAssessment>) => {
    try {
      const { error } = await supabase
        .from('team_maturity_assessments')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      setAssessments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, ...updates } : a))
      );
      if (selectedAssessment?.id === id) {
        setSelectedAssessment((prev) => (prev ? { ...prev, ...updates } : null));
      }
      toast.success('Avaliação atualizada!');
    } catch (error) {
      console.error('Error updating assessment:', error);
      toast.error('Erro ao atualizar avaliação');
    }
  };

  // Delete assessment
  const deleteAssessment = async (id: string) => {
    try {
      const { error } = await supabase
        .from('team_maturity_assessments')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setAssessments((prev) => prev.filter((a) => a.id !== id));
      if (selectedAssessment?.id === id) {
        setSelectedAssessment(assessments.find((a) => a.id !== id) || null);
      }
      toast.success('Avaliação excluída!');
    } catch (error) {
      console.error('Error deleting assessment:', error);
      toast.error('Erro ao excluir avaliação');
    }
  };

  // Add point
  const addPoint = async (
    firstName: string,
    lastName: string,
    xPosition: number,
    yPosition: number,
    notes?: string
  ) => {
    if (!selectedAssessment?.id) return null;

    try {
      const { data, error } = await supabase
        .from('team_maturity_points')
        .insert({
          assessment_id: selectedAssessment.id,
          first_name: firstName,
          last_name: lastName,
          x_position: xPosition,
          y_position: yPosition,
          notes: notes || null,
        })
        .select()
        .single();

      if (error) throw error;

      const newPoint = data as TeamMaturityPoint;
      setPoints((prev) => [...prev, newPoint]);
      toast.success(`${firstName} ${lastName} adicionado!`);
      return newPoint;
    } catch (error) {
      console.error('Error adding point:', error);
      toast.error('Erro ao adicionar pessoa');
      return null;
    }
  };

  // Update point
  const updatePoint = async (id: string, updates: Partial<TeamMaturityPoint>) => {
    try {
      const { error } = await supabase
        .from('team_maturity_points')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      setPoints((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
      );
      toast.success('Atualizado!');
    } catch (error) {
      console.error('Error updating point:', error);
      toast.error('Erro ao atualizar');
    }
  };

  // Delete point
  const deletePoint = async (id: string) => {
    try {
      const { error } = await supabase
        .from('team_maturity_points')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setPoints((prev) => prev.filter((p) => p.id !== id));
      toast.success('Pessoa removida!');
    } catch (error) {
      console.error('Error deleting point:', error);
      toast.error('Erro ao remover');
    }
  };

  // Save version snapshot
  const saveVersionSnapshot = async (variant: string = 'manual') => {
    if (!selectedAssessment?.id || points.length === 0) return;

    // Check if identical to last version
    if (versionHistory.length > 0) {
      const lastSnapshot = versionHistory[0].snapshot;
      if (JSON.stringify(lastSnapshot.points) === JSON.stringify(points)) {
        toast.info('Nenhuma alteração para salvar');
        return;
      }
    }

    try {
      const insertData = {
        assessment_id: selectedAssessment.id,
        snapshot: JSON.parse(JSON.stringify({ points })),
        variant,
      };
      const { data, error } = await supabase
        .from('team_maturity_version_history')
        .insert([insertData] as never)
        .select()
        .single();

      if (error) throw error;

      const typed = {
        ...data,
        snapshot: data.snapshot as unknown as { points: TeamMaturityPoint[] },
      };
      setVersionHistory((prev) => [typed, ...prev]);
      if (variant === 'manual') {
        toast.success('Versão salva!');
      }
    } catch (error) {
      console.error('Error saving version:', error);
      toast.error('Erro ao salvar versão');
    }
  };

  // Restore version
  const restoreVersion = async (version: TeamMaturityVersionHistory) => {
    if (!selectedAssessment?.id) return;

    try {
      // Delete current points
      await supabase
        .from('team_maturity_points')
        .delete()
        .eq('assessment_id', selectedAssessment.id);

      // Insert restored points
      const restoredPoints = version.snapshot.points.map((p) => ({
        assessment_id: selectedAssessment.id,
        first_name: p.first_name,
        last_name: p.last_name,
        x_position: p.x_position,
        y_position: p.y_position,
        notes: p.notes,
      }));

      if (restoredPoints.length > 0) {
        const { data, error } = await supabase
          .from('team_maturity_points')
          .insert(restoredPoints)
          .select();

        if (error) throw error;
        setPoints((data || []) as TeamMaturityPoint[]);
      } else {
        setPoints([]);
      }

      toast.success('Versão restaurada!');
    } catch (error) {
      console.error('Error restoring version:', error);
      toast.error('Erro ao restaurar versão');
    }
  };

  // Analyze team (macro)
  const analyzeTeam = useCallback(async () => {
    if (points.length === 0) {
      toast.error('Adicione pessoas para analisar');
      return;
    }

    setIsAnalyzingTeam(true);
    setTeamAnalysis(null);

    try {
      const { data, error } = await invokeAuthenticatedFunction<TeamMaturityAIAnalysis>(
        'analyze-team-maturity',
        { mode: 'team', points }
      );

      if (error || !data) {
        throw new Error(error || 'Erro ao analisar');
      }

      setTeamAnalysis(data);
      toast.success('Análise do time concluída!');
    } catch (error) {
      console.error('Error analyzing team:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao analisar time');
    } finally {
      setIsAnalyzingTeam(false);
    }
  }, [points]);

  // Analyze individual person
  const analyzePerson = useCallback(async (point: TeamMaturityPoint) => {
    setIsAnalyzingPerson(true);
    setPersonAnalysis(null);

    try {
      const { data, error } = await invokeAuthenticatedFunction<PersonMaturityAIAnalysis>(
        'analyze-team-maturity',
        { mode: 'individual', points, targetPerson: point }
      );

      if (error || !data) {
        throw new Error(error || 'Erro ao analisar');
      }

      setPersonAnalysis(data);
    } catch (error) {
      console.error('Error analyzing person:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao analisar pessoa');
    } finally {
      setIsAnalyzingPerson(false);
    }
  }, [points]);

  // Clear team analysis
  const clearTeamAnalysis = useCallback(() => {
    setTeamAnalysis(null);
  }, []);

  // Clear person analysis
  const clearPersonAnalysis = useCallback(() => {
    setPersonAnalysis(null);
  }, []);

  // Load saved analyses for assessment
  const loadSavedAnalyses = useCallback(async () => {
    if (!selectedAssessment?.id) {
      setSavedTeamAnalyses([]);
      setSavedPersonAnalyses([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('team_maturity_ai_analyses')
        .select('*')
        .eq('assessment_id', selectedAssessment.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const analyses = (data || []) as unknown as SavedAIAnalysis[];
      setSavedTeamAnalyses(analyses.filter(a => a.analysis_type === 'team'));
      setSavedPersonAnalyses(analyses.filter(a => a.analysis_type === 'individual'));
    } catch (error) {
      console.error('Error loading saved analyses:', error);
    }
  }, [selectedAssessment?.id]);

  // Save team analysis
  const saveTeamAnalysis = useCallback(async (analysis: TeamMaturityAIAnalysis) => {
    if (!selectedAssessment?.id) return;

    try {
      const insertData = {
        assessment_id: selectedAssessment.id,
        point_id: null,
        analysis_type: 'team' as const,
        analysis: analysis as unknown as Record<string, unknown>,
        position_snapshot: { points: points.map(p => ({
          id: p.id,
          first_name: p.first_name,
          last_name: p.last_name,
          x_position: p.x_position,
          y_position: p.y_position,
          level: getMaturityLevelFromPosition(p.x_position, p.y_position),
        }))},
      };
      const { data, error } = await supabase
        .from('team_maturity_ai_analyses')
        .insert([insertData] as never)
        .select()
        .single();

      if (error) throw error;

      setSavedTeamAnalyses(prev => [data as unknown as SavedAIAnalysis, ...prev]);
      toast.success('Análise salva no histórico!');
    } catch (error) {
      console.error('Error saving team analysis:', error);
      toast.error('Erro ao salvar análise');
    }
  }, [selectedAssessment?.id, points]);

  // Save person analysis
  const savePersonAnalysis = useCallback(async (analysis: PersonMaturityAIAnalysis, point: TeamMaturityPoint) => {
    if (!selectedAssessment?.id) return;

    try {
      const insertData = {
        assessment_id: selectedAssessment.id,
        point_id: point.id,
        analysis_type: 'individual' as const,
        analysis: analysis as unknown as Record<string, unknown>,
        position_snapshot: {
          first_name: point.first_name,
          last_name: point.last_name,
          x_position: point.x_position,
          y_position: point.y_position,
          level: getMaturityLevelFromPosition(point.x_position, point.y_position),
        },
      };
      const { data, error } = await supabase
        .from('team_maturity_ai_analyses')
        .insert([insertData] as never)
        .select()
        .single();

      if (error) throw error;

      setSavedPersonAnalyses(prev => [data as unknown as SavedAIAnalysis, ...prev]);
      toast.success('Análise salva no histórico!');
    } catch (error) {
      console.error('Error saving person analysis:', error);
      toast.error('Erro ao salvar análise');
    }
  }, [selectedAssessment?.id]);

  // Get saved analyses for a specific person
  const getPersonAnalysisHistory = useCallback((pointId: string) => {
    return savedPersonAnalyses.filter(a => a.point_id === pointId);
  }, [savedPersonAnalyses]);

  // Initial load
  useEffect(() => {
    if (accountLoading) return;
    
    if (user && account?.id && canAccess) {
      setDataLoading(true);
      loadAssessments().finally(() => setDataLoading(false));
    } else {
      setDataLoading(false);
    }
  }, [user, account?.id, canAccess, accountLoading, loadAssessments]);

  // Load points when assessment changes
  useEffect(() => {
    loadPoints();
    loadVersionHistory();
    loadSavedAnalyses();
  }, [loadPoints, loadVersionHistory, loadSavedAnalyses]);

  return {
    assessments,
    selectedAssessment,
    setSelectedAssessment,
    points,
    versionHistory,
    loading,
    canAccess,
    createAssessment,
    updateAssessment,
    deleteAssessment,
    addPoint,
    updatePoint,
    deletePoint,
    saveVersionSnapshot,
    restoreVersion,
    loadAssessments,
    // AI Analysis
    teamAnalysis,
    personAnalysis,
    isAnalyzingTeam,
    isAnalyzingPerson,
    analyzeTeam,
    analyzePerson,
    clearTeamAnalysis,
    clearPersonAnalysis,
    // Saved analyses
    savedTeamAnalyses,
    savedPersonAnalyses,
    saveTeamAnalysis,
    savePersonAnalysis,
    getPersonAnalysisHistory,
  };
}
