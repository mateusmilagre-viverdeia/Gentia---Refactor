import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { toast } from "sonner";
import type { 
  CreateEmployeePositionInput, 
  ChangeType,
  ProgressionStatus 
} from "@/types/compensation.types";

// ============================================
// TYPES
// ============================================

export interface EmployeePositionWithDetails {
  id: string;
  profile_id: string;
  level_id: string;
  current_salary: number | null;
  effective_date: string | null;
  range_position: number | null;
  progression_status: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  profile: {
    id: string;
    email: string | null;
    first_name: string | null;
    last_name: string | null;
  };
  level: {
    id: string;
    code: string;
    name: string;
    level_order: number;
    position: {
      id: string;
      name: string;
      code: string | null;
      family: {
        id: string;
        name: string;
        model_id: string;
      };
    };
  };
  salary_range: {
    id: string;
    minimum: number;
    midpoint: number;
    maximum: number;
    currency: string;
  } | null;
}

export interface SalaryHistoryEntry {
  id: string;
  employee_position_id: string;
  previous_salary: number | null;
  new_salary: number | null;
  change_type: string;
  reason: string | null;
  effective_date: string;
  approved_by: string | null;
  created_at: string;
}

// ============================================
// HELPERS
// ============================================

function calculateRangePosition(salary: number, min: number, max: number): number {
  if (max === min) return 50;
  const position = ((salary - min) / (max - min)) * 100;
  return Math.max(0, Math.min(100, position));
}

function determineProgressionStatus(rangePosition: number): ProgressionStatus {
  if (rangePosition < 25) return 'entry';
  if (rangePosition < 50) return 'developing';
  if (rangePosition < 75) return 'ready';
  return 'exceeding';
}

// ============================================
// HOOKS
// ============================================

export function useEmployeePositionsByModel(modelId: string | undefined) {
  const { currentOrganization } = useOrganization();

  return useQuery({
    queryKey: ["employee-positions", "by-model", modelId, currentOrganization?.id],
    queryFn: async () => {
      if (!modelId || !currentOrganization?.id) return [];

      // First get all levels belonging to this model
      const { data: levels, error: levelsError } = await supabase
        .from("position_levels")
        .select(`
          id,
          positions!inner (
            id,
            job_families!inner (
              id,
              model_id
            )
          )
        `)
        .eq("positions.job_families.model_id", modelId);

      if (levelsError) throw levelsError;
      if (!levels || levels.length === 0) return [];

      const levelIds = levels.map(l => l.id);

      // Get employee positions for these levels
      const { data, error } = await supabase
        .from("employee_positions")
        .select(`
          *,
          profiles:profile_id (
            id,
            email,
            first_name,
            last_name
          ),
          position_levels:level_id (
            id,
            code,
            name,
            level_order,
            positions!inner (
              id,
              name,
              code,
              job_families!inner (
                id,
                name,
                model_id
              )
            )
          )
        `)
        .in("level_id", levelIds)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get salary ranges for these levels
      const { data: ranges } = await supabase
        .from("salary_ranges")
        .select("*")
        .in("level_id", levelIds);

      const rangeMap = new Map(ranges?.map(r => [r.level_id, r]) || []);

      // Transform data
      return (data || []).map(ep => {
        const level = ep.position_levels as any;
        const position = level?.positions;
        const family = position?.job_families;
        const range = rangeMap.get(ep.level_id);

        return {
          id: ep.id,
          profile_id: ep.profile_id,
          level_id: ep.level_id,
          current_salary: ep.current_salary,
          effective_date: ep.effective_date,
          range_position: ep.range_position,
          progression_status: ep.progression_status,
          notes: ep.notes,
          created_at: ep.created_at,
          updated_at: ep.updated_at,
          profile: ep.profiles,
          level: {
            id: level?.id,
            code: level?.code,
            name: level?.name,
            level_order: level?.level_order,
            position: {
              id: position?.id,
              name: position?.name,
              code: position?.code,
              family: {
                id: family?.id,
                name: family?.name,
                model_id: family?.model_id,
              },
            },
          },
          salary_range: range ? {
            id: range.id,
            minimum: range.minimum,
            midpoint: range.midpoint,
            maximum: range.maximum,
            currency: range.currency,
          } : null,
        } as EmployeePositionWithDetails;
      });
    },
    enabled: !!modelId && !!currentOrganization?.id,
  });
}

export function useEmployeePositionWithHistory(positionId: string | undefined) {
  return useQuery({
    queryKey: ["employee-position", positionId, "with-history"],
    queryFn: async () => {
      if (!positionId) return null;

      const { data: history, error } = await supabase
        .from("salary_history")
        .select("*")
        .eq("employee_position_id", positionId)
        .order("effective_date", { ascending: false });

      if (error) throw error;
      return history as SalaryHistoryEntry[];
    },
    enabled: !!positionId,
  });
}

export function useOrganizationProfiles() {
  const { currentOrganization } = useOrganization();

  return useQuery({
    queryKey: ["organization-profiles", currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return [];

      // Get profiles that are members of the organization
      const { data: members, error: membersError } = await supabase
        .from("account_members")
        .select("user_id")
        .eq("account_id", currentOrganization.id);

      if (membersError) throw membersError;
      if (!members || members.length === 0) return [];

      const userIds = members.map(m => m.user_id);

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email, first_name, last_name")
        .in("id", userIds)
        .order("first_name");

      if (profilesError) throw profilesError;
      return profiles || [];
    },
    enabled: !!currentOrganization?.id,
  });
}

// ============================================
// MUTATIONS
// ============================================

export function useEmployeePositions() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useOrganization();

  const createPosition = useMutation({
    mutationFn: async (input: CreateEmployeePositionInput & { salary_range?: { minimum: number; maximum: number } }) => {
      // Calculate range position if salary and range provided
      let rangePosition = input.range_position;
      let progressionStatus = input.progression_status;

      if (input.current_salary && input.salary_range) {
        rangePosition = calculateRangePosition(
          input.current_salary,
          input.salary_range.minimum,
          input.salary_range.maximum
        );
        progressionStatus = determineProgressionStatus(rangePosition);
      }

      const { data, error } = await supabase
        .from("employee_positions")
        .insert({
          profile_id: input.profile_id,
          level_id: input.level_id,
          current_salary: input.current_salary,
          effective_date: input.effective_date || new Date().toISOString().split('T')[0],
          range_position: rangePosition,
          progression_status: progressionStatus || 'entry',
          notes: input.notes,
        })
        .select()
        .single();

      if (error) throw error;

      // Create initial salary history entry
      if (input.current_salary) {
        await supabase.from("salary_history").insert({
          employee_position_id: data.id,
          new_salary: input.current_salary,
          change_type: "initial" as ChangeType,
          effective_date: input.effective_date || new Date().toISOString().split('T')[0],
          reason: "Posicionamento inicial",
        });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-positions"] });
      toast.success("Colaborador vinculado com sucesso!");
    },
    onError: (error) => {
      console.error("Error creating employee position:", error);
      toast.error("Erro ao vincular colaborador");
    },
  });

  const updatePosition = useMutation({
    mutationFn: async ({ 
      id, 
      ...updates 
    }: Partial<CreateEmployeePositionInput> & { 
      id: string; 
      salary_range?: { minimum: number; maximum: number };
      record_history?: boolean;
      previous_salary?: number;
      change_type?: ChangeType;
      reason?: string;
    }) => {
      // Calculate range position if salary changed
      let rangePosition = updates.range_position;
      let progressionStatus = updates.progression_status;

      if (updates.current_salary && updates.salary_range) {
        rangePosition = calculateRangePosition(
          updates.current_salary,
          updates.salary_range.minimum,
          updates.salary_range.maximum
        );
        progressionStatus = determineProgressionStatus(rangePosition);
      }

      const { data, error } = await supabase
        .from("employee_positions")
        .update({
          level_id: updates.level_id,
          current_salary: updates.current_salary,
          effective_date: updates.effective_date,
          range_position: rangePosition,
          progression_status: progressionStatus,
          notes: updates.notes,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      // Record salary history if requested
      if (updates.record_history && updates.current_salary) {
        await supabase.from("salary_history").insert({
          employee_position_id: id,
          previous_salary: updates.previous_salary,
          new_salary: updates.current_salary,
          change_type: updates.change_type || "adjustment",
          effective_date: updates.effective_date || new Date().toISOString().split('T')[0],
          reason: updates.reason,
        });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-positions"] });
      queryClient.invalidateQueries({ queryKey: ["employee-position"] });
      toast.success("Posicionamento atualizado!");
    },
    onError: (error) => {
      console.error("Error updating employee position:", error);
      toast.error("Erro ao atualizar posicionamento");
    },
  });

  const deletePosition = useMutation({
    mutationFn: async (id: string) => {
      // Delete salary history first
      await supabase
        .from("salary_history")
        .delete()
        .eq("employee_position_id", id);

      const { error } = await supabase
        .from("employee_positions")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-positions"] });
      toast.success("Vínculo removido!");
    },
    onError: (error) => {
      console.error("Error deleting employee position:", error);
      toast.error("Erro ao remover vínculo");
    },
  });

  return {
    createPosition,
    updatePosition,
    deletePosition,
  };
}
