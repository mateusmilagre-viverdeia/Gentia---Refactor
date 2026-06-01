import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { addDays } from "date-fns";
import { 
  PlaybookWithDetails, 
  ProjectPlaybookApplication,
  PlaybookApplicationWithDetails,
  ChecklistProgressItem 
} from '@/types/playbook.types';
import { formatBRT } from "@/lib/datetime";

// Type assertion helper for playbook tables not yet in generated types
const db = supabase as any;

interface UseApplyPlaybookReturn {
  applying: boolean;
  error: string | null;
  applyPlaybook: (
    accountId: string,
    playbookId: string,
    startDate: Date,
    notes?: string
  ) => Promise<boolean>;
  getAppliedPlaybook: (accountId: string) => Promise<PlaybookApplicationWithDetails | null>;
  removePlaybookApplication: (accountId: string) => Promise<boolean>;
}

export function useApplyPlaybook(): UseApplyPlaybookReturn {
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyPlaybook = useCallback(async (
    accountId: string,
    playbookId: string,
    startDate: Date,
    notes?: string
  ): Promise<boolean> => {
    try {
      setApplying(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Check if a playbook is already applied
      const { data: existingApplication } = await db
        .from('project_playbook_applications')
        .select('id')
        .eq('account_id', accountId)
        .maybeSingle();

      if (existingApplication) {
        throw new Error('Este projeto já possui um playbook aplicado. Remova o playbook atual antes de aplicar um novo.');
      }

      // Fetch playbook with all details
      const { data: playbookData, error: playbookError } = await db
        .from('project_playbooks')
        .select('*')
        .eq('id', playbookId)
        .single();

      if (playbookError) throw playbookError;

      // Fetch phases
      const { data: phasesData, error: phasesError } = await db
        .from('playbook_phases')
        .select('*')
        .eq('playbook_id', playbookId)
        .order('order_index');

      if (phasesError) throw phasesError;

      // Fetch milestones for all phases
      const phaseIds = phasesData?.map((p: any) => p.id) || [];
      let milestonesData: any[] = [];
      if (phaseIds.length > 0) {
        const { data: milestones, error: milestonesError } = await db
          .from('playbook_milestones')
          .select('*')
          .in('phase_id', phaseIds)
          .order('order_index');

        if (milestonesError) throw milestonesError;
        milestonesData = milestones || [];
      }

      // Fetch checklist items for all milestones
      const milestoneIds = milestonesData.map((m: any) => m.id);
      let checklistData: any[] = [];
      if (milestoneIds.length > 0) {
        const { data: checklist, error: checklistError } = await db
          .from('playbook_checklist_items')
          .select('*')
          .in('milestone_id', milestoneIds)
          .order('order_index');

        if (checklistError) throw checklistError;
        checklistData = checklist || [];
      }

      // Calculate dates for each phase and milestone
      let currentPhaseStart = startDate;
      const milestonesToCreate: any[] = [];
      let orderIndex = 0;

      for (const phase of phasesData || []) {
        const phaseMilestones = milestonesData.filter((m: any) => m.phase_id === phase.id);

        for (const milestone of phaseMilestones) {
          const milestoneStart = addDays(currentPhaseStart, milestone.relative_start_days);
          const milestoneEnd = addDays(milestoneStart, milestone.duration_days);

          // Get checklist items for this milestone
          const milestoneChecklist = checklistData.filter((c: any) => c.milestone_id === milestone.id);
          const checklistProgress: ChecklistProgressItem[] = milestoneChecklist.map((item: any) => ({
            checklist_item_id: item.id,
            completed: false,
            completed_at: null,
            completed_by: null,
          }));

          milestonesToCreate.push({
            account_id: accountId,
            pillar: milestone.pillar,
            milestone_name: milestone.milestone_name,
            milestone_type: milestone.milestone_type,
            description: milestone.description,
            planned_start: formatBRT(milestoneStart, 'yyyy-MM-dd'),
            planned_end: formatBRT(milestoneEnd, 'yyyy-MM-dd'),
            status: 'pending',
            progress_percentage: 0,
            depends_on: [],
            order_index: orderIndex++,
            playbook_milestone_id: milestone.id,
            checklist_progress: checklistProgress,
            created_by: user.id,
          });
        }

        // Move to next phase start (current phase start + phase duration in weeks)
        currentPhaseStart = addDays(currentPhaseStart, phase.duration_weeks * 7);
      }

      // Insert all milestones
      if (milestonesToCreate.length > 0) {
        const { error: insertMilestonesError } = await supabase
          .from('project_milestones')
          .insert(milestonesToCreate);

        if (insertMilestonesError) throw insertMilestonesError;
      }

      // Create playbook application record
      const { error: applicationError } = await db
        .from('project_playbook_applications')
        .insert({
          account_id: accountId,
          playbook_id: playbookId,
          applied_by: user.id,
          start_date: formatBRT(startDate, 'yyyy-MM-dd'),
          notes,
        });

      if (applicationError) throw applicationError;

      toast.success(`Playbook "${playbookData.name}" aplicado com sucesso! ${milestonesToCreate.length} marcos criados.`);
      return true;
    } catch (err: any) {
      console.error('Error applying playbook:', err);
      setError(err.message || 'Erro ao aplicar playbook');
      toast.error(err.message || 'Erro ao aplicar playbook');
      return false;
    } finally {
      setApplying(false);
    }
  }, []);

  const getAppliedPlaybook = useCallback(async (accountId: string): Promise<PlaybookApplicationWithDetails | null> => {
    try {
      const { data, error: fetchError } = await db
        .from('project_playbook_applications')
        .select(`
          *,
          playbook:project_playbooks(*)
        `)
        .eq('account_id', accountId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!data) return null;

      return {
        ...data,
        playbook: data.playbook,
      } as PlaybookApplicationWithDetails;
    } catch (err) {
      console.error('Error fetching applied playbook:', err);
      return null;
    }
  }, []);

  const removePlaybookApplication = useCallback(async (accountId: string): Promise<boolean> => {
    try {
      // First, remove the playbook_milestone_id from project_milestones
      // This doesn't delete the milestones, just unlinks them from the playbook
      const { error: unlinkError } = await supabase
        .from('project_milestones')
        .update({ playbook_milestone_id: null })
        .eq('account_id', accountId)
        .not('playbook_milestone_id', 'is', null);

      if (unlinkError) throw unlinkError;

      // Then delete the application record
      const { error: deleteError } = await db
        .from('project_playbook_applications')
        .delete()
        .eq('account_id', accountId);

      if (deleteError) throw deleteError;

      toast.success('Playbook desvinculado do projeto');
      return true;
    } catch (err) {
      console.error('Error removing playbook application:', err);
      toast.error('Erro ao desvincular playbook');
      return false;
    }
  }, []);

  return {
    applying,
    error,
    applyPlaybook,
    getAppliedPlaybook,
    removePlaybookApplication,
  };
}
