import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { 
  Position, 
  CreatePositionInput,
  PositionLevel,
  CreatePositionLevelInput,
  SalaryRange,
  CreateSalaryRangeInput,
  LevelOutcome,
  CreateLevelOutcomeInput,
  PositionLevelWithRange,
  Periodicity,
  OutcomeType,
  ConnectedTo
} from "@/types/compensation.types";

const MODELS_KEY = "compensation-models";
const POSITIONS_KEY = "positions";

export const usePositions = () => {
  const queryClient = useQueryClient();

  const usePositionWithDetails = (positionId: string | undefined) => {
    return useQuery({
      queryKey: [POSITIONS_KEY, positionId, "details"],
      queryFn: async () => {
        if (!positionId) return null;

        const { data: position, error: posError } = await supabase
          .from("positions")
          .select("*, job_families(*)")
          .eq("id", positionId)
          .single();

        if (posError) throw posError;

        const { data: levels, error: levelsError } = await supabase
          .from("position_levels")
          .select("*")
          .eq("position_id", positionId)
          .order("level_order");

        if (levelsError) throw levelsError;

        const levelIds = levels.map(l => l.id);
        
        const [salaryResult, outcomesResult] = await Promise.all([
          supabase
            .from("salary_ranges")
            .select("*")
            .in("level_id", levelIds.length > 0 ? levelIds : ['00000000-0000-0000-0000-000000000000']),
          supabase
            .from("level_outcomes")
            .select("*")
            .in("level_id", levelIds.length > 0 ? levelIds : ['00000000-0000-0000-0000-000000000000']),
        ]);

        const levelsWithDetails: PositionLevelWithRange[] = levels.map(level => {
          const salaryRange = salaryResult.data?.find(s => s.level_id === level.id);
          const outcomes = outcomesResult.data?.filter(o => o.level_id === level.id) || [];
          
          return {
            ...level,
            custom_criteria: (level.custom_criteria as Record<string, unknown>) || {},
            salary_range: salaryRange ? {
              ...salaryRange,
              periodicity: salaryRange.periodicity as Periodicity,
              market_reference: (salaryRange.market_reference as Record<string, unknown>) || null,
            } as SalaryRange : null,
            outcomes: outcomes.map(o => ({
              ...o,
              outcome_type: o.outcome_type as OutcomeType,
              connected_to: o.connected_to as ConnectedTo | null,
            })) as LevelOutcome[],
          };
        });

        return { ...position, levels: levelsWithDetails };
      },
      enabled: !!positionId,
    });
  };

  const createPosition = useMutation({
    mutationFn: async (input: CreatePositionInput) => {
      const { data, error } = await supabase
        .from("positions")
        .insert([{
          family_id: input.family_id,
          name: input.name,
          code: input.code,
          mission: input.mission,
          strategic_value: input.strategic_value,
          business_problem: input.business_problem,
          strategic_delivery: input.strategic_delivery,
          area: input.area,
          sub_area: input.sub_area,
          reports_to: input.reports_to,
          critical_interfaces: input.critical_interfaces,
        }])
        .select()
        .single();

      if (error) throw error;
      return data as Position;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MODELS_KEY] });
      queryClient.invalidateQueries({ queryKey: [POSITIONS_KEY] });
      toast.success("Cargo criado com sucesso");
    },
    onError: (error) => {
      console.error("Error creating position:", error);
      toast.error("Erro ao criar cargo");
    },
  });

  const updatePosition = useMutation({
    mutationFn: async ({ id, ...input }: Partial<Position> & { id: string }) => {
      const { data, error } = await supabase
        .from("positions")
        .update({
          name: input.name,
          code: input.code,
          mission: input.mission,
          area: input.area,
          sub_area: input.sub_area,
          reports_to: input.reports_to,
          is_active: input.is_active,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Position;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MODELS_KEY] });
      queryClient.invalidateQueries({ queryKey: [POSITIONS_KEY] });
      toast.success("Cargo atualizado");
    },
    onError: (error) => {
      console.error("Error updating position:", error);
      toast.error("Erro ao atualizar cargo");
    },
  });

  const deletePosition = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("positions")
        .update({ is_active: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MODELS_KEY] });
      queryClient.invalidateQueries({ queryKey: [POSITIONS_KEY] });
      toast.success("Cargo removido");
    },
    onError: (error) => {
      console.error("Error deleting position:", error);
      toast.error("Erro ao remover cargo");
    },
  });

  const createLevel = useMutation({
    mutationFn: async (input: CreatePositionLevelInput) => {
      const { data, error } = await supabase
        .from("position_levels")
        .insert([{
          position_id: input.position_id,
          code: input.code,
          name: input.name,
          description: input.description || null,
          level_order: input.level_order,
          autonomy_level: input.autonomy_level || null,
          complexity_level: input.complexity_level || null,
          impact_level: input.impact_level || null,
          decision_scope: input.decision_scope || null,
          influence_degree: input.influence_degree || null,
        }])
        .select()
        .single();

      if (error) throw error;
      return data as PositionLevel;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MODELS_KEY] });
      queryClient.invalidateQueries({ queryKey: [POSITIONS_KEY] });
      toast.success("Nível criado");
    },
    onError: (error) => {
      console.error("Error creating level:", error);
      toast.error("Erro ao criar nível");
    },
  });

  const updateLevel = useMutation({
    mutationFn: async ({ id, ...input }: Partial<PositionLevel> & { id: string }) => {
      const { data, error } = await supabase
        .from("position_levels")
        .update({
          code: input.code,
          name: input.name,
          description: input.description,
          level_order: input.level_order,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as PositionLevel;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MODELS_KEY] });
      queryClient.invalidateQueries({ queryKey: [POSITIONS_KEY] });
      toast.success("Nível atualizado");
    },
    onError: (error) => {
      console.error("Error updating level:", error);
      toast.error("Erro ao atualizar nível");
    },
  });

  const deleteLevel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("position_levels")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MODELS_KEY] });
      queryClient.invalidateQueries({ queryKey: [POSITIONS_KEY] });
      toast.success("Nível excluído");
    },
    onError: (error) => {
      console.error("Error deleting level:", error);
      toast.error("Erro ao excluir nível");
    },
  });

  const upsertSalaryRange = useMutation({
    mutationFn: async (input: CreateSalaryRangeInput & { id?: string }) => {
      const { id, ...data } = input;
      
      const rangeData = {
        level_id: data.level_id,
        minimum: data.minimum,
        midpoint: data.midpoint,
        maximum: data.maximum,
        currency: data.currency || 'BRL',
        periodicity: data.periodicity || 'monthly',
      };
      
      if (id) {
        const { data: result, error } = await supabase
          .from("salary_ranges")
          .update(rangeData)
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        return result as SalaryRange;
      } else {
        const { data: result, error } = await supabase
          .from("salary_ranges")
          .insert([rangeData])
          .select()
          .single();
        if (error) throw error;
        return result as SalaryRange;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [POSITIONS_KEY] });
      toast.success("Faixa salarial salva");
    },
    onError: (error) => {
      console.error("Error saving salary range:", error);
      toast.error("Erro ao salvar faixa salarial");
    },
  });

  const createOutcome = useMutation({
    mutationFn: async (input: CreateLevelOutcomeInput) => {
      const { data, error } = await supabase
        .from("level_outcomes")
        .insert([{
          level_id: input.level_id,
          outcome_type: input.outcome_type,
          description: input.description,
          measurement: input.measurement,
          connected_to: input.connected_to,
        }])
        .select()
        .single();

      if (error) throw error;
      return data as LevelOutcome;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [POSITIONS_KEY] });
      toast.success("Entrega adicionada");
    },
    onError: (error) => {
      console.error("Error creating outcome:", error);
      toast.error("Erro ao adicionar entrega");
    },
  });

  const deleteOutcome = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("level_outcomes")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [POSITIONS_KEY] });
      toast.success("Entrega removida");
    },
    onError: (error) => {
      console.error("Error deleting outcome:", error);
      toast.error("Erro ao remover entrega");
    },
  });

  return {
    usePositionWithDetails,
    createPosition,
    updatePosition,
    deletePosition,
    createLevel,
    updateLevel,
    deleteLevel,
    upsertSalaryRange,
    createOutcome,
    deleteOutcome,
  };
};
