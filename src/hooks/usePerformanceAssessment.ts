import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAccount } from '@/hooks/useAccount';
import { useOrganization } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';
import type {
  PerformanceAssessment,
  PerformanceAssessmentPoint,
  PerformanceAssessmentVersionHistory,
} from '@/types/performance-assessment.types';

export function usePerformanceAssessment() {
  const { user } = useAuth();
  const { isOwner, isAdmin, isAdminRH, loading: accountLoading } = useAccount();
  const { currentAccount: account } = useOrganization();
  const [assessments, setAssessments] = useState<PerformanceAssessment[]>([]);
  const [selectedAssessment, setSelectedAssessment] = useState<PerformanceAssessment | null>(null);
  const [points, setPoints] = useState<PerformanceAssessmentPoint[]>([]);
  const [versionHistory, setVersionHistory] = useState<PerformanceAssessmentVersionHistory[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const canAccess = isOwner || isAdmin || isAdminRH;
  
  // Loading is true while account OR data is loading
  const loading = accountLoading || dataLoading;

  // Load assessments
  const loadAssessments = useCallback(async () => {
    if (!account?.id || !canAccess) return;

    try {
      const { data, error } = await supabase
        .from('performance_assessments')
        .select('*')
        .eq('account_id', account.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const typed = (data || []) as PerformanceAssessment[];
      setAssessments(typed);

      // Auto-select first if none selected
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
        .from('performance_assessment_points')
        .select('*')
        .eq('assessment_id', selectedAssessment.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setPoints((data || []) as PerformanceAssessmentPoint[]);
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
        .from('performance_assessment_version_history')
        .select('*')
        .eq('assessment_id', selectedAssessment.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const typed = (data || []).map((item) => ({
        ...item,
        snapshot: item.snapshot as unknown as { points: PerformanceAssessmentPoint[] },
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
        .from('performance_assessments')
        .insert({
          account_id: account.id,
          name,
          description: description || null,
        })
        .select()
        .single();

      if (error) throw error;

      const newAssessment = data as PerformanceAssessment;
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
  const updateAssessment = async (id: string, updates: Partial<PerformanceAssessment>) => {
    try {
      const { error } = await supabase
        .from('performance_assessments')
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
        .from('performance_assessments')
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
        .from('performance_assessment_points')
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

      const newPoint = data as PerformanceAssessmentPoint;
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
  const updatePoint = async (id: string, updates: Partial<PerformanceAssessmentPoint>) => {
    try {
      const { error } = await supabase
        .from('performance_assessment_points')
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
        .from('performance_assessment_points')
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
        .from('performance_assessment_version_history')
        .insert([insertData] as never)
        .select()
        .single();

      if (error) throw error;

      const typed = {
        ...data,
        snapshot: data.snapshot as unknown as { points: PerformanceAssessmentPoint[] },
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
  const restoreVersion = async (version: PerformanceAssessmentVersionHistory) => {
    if (!selectedAssessment?.id) return;

    try {
      // Delete current points
      await supabase
        .from('performance_assessment_points')
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
          .from('performance_assessment_points')
          .insert(restoredPoints)
          .select();

        if (error) throw error;
        setPoints((data || []) as PerformanceAssessmentPoint[]);
      } else {
        setPoints([]);
      }

      toast.success('Versão restaurada!');
    } catch (error) {
      console.error('Error restoring version:', error);
      toast.error('Erro ao restaurar versão');
    }
  };

  // Initial load - wait for account to load first
  useEffect(() => {
    if (accountLoading) return; // Wait for account to finish loading
    
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
  }, [loadPoints, loadVersionHistory]);

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
  };
}
