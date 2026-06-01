import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAccount } from "@/hooks/useAccount";
import type { Json } from "@/integrations/supabase/types";
import type { 
  CompensationModel, 
  CreateCompensationModelInput,
  CompensationModelWithFamilies,
  JobFamilyWithPositions,
  PositionWithLevels,
  CareerTrack,
  PositionLevel
} from "@/types/compensation.types";

const MODELS_KEY = "compensation-models";

export const useCompensationModels = () => {
  const { account } = useAccount();
  const accountId = account?.id;
  const queryClient = useQueryClient();

  const { data: models, isLoading, refetch } = useQuery({
    queryKey: [MODELS_KEY, accountId],
    queryFn: async () => {
      if (!accountId) return [];
      
      const { data, error } = await supabase
        .from("compensation_models")
        .select("*")
        .eq("account_id", accountId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as CompensationModel[];
    },
    enabled: !!accountId,
  });

  const useModelWithDetails = (modelId: string | undefined) => {
    return useQuery({
      queryKey: [MODELS_KEY, modelId, "details"],
      queryFn: async () => {
        if (!modelId) return null;

        const { data: model, error: modelError } = await supabase
          .from("compensation_models")
          .select("*")
          .eq("id", modelId)
          .single();

        if (modelError) throw modelError;

        const { data: families, error: familiesError } = await supabase
          .from("job_families")
          .select("*")
          .eq("model_id", modelId)
          .order("display_order");

        if (familiesError) throw familiesError;

        const familyIds = families.map(f => f.id);
        const { data: positions, error: positionsError } = await supabase
          .from("positions")
          .select("*")
          .in("family_id", familyIds.length > 0 ? familyIds : ['00000000-0000-0000-0000-000000000000'])
          .eq("is_active", true);

        if (positionsError) throw positionsError;

        const positionIds = positions.map(p => p.id);
        const { data: levels, error: levelsError } = await supabase
          .from("position_levels")
          .select("*")
          .in("position_id", positionIds.length > 0 ? positionIds : ['00000000-0000-0000-0000-000000000000'])
          .order("level_order");

        if (levelsError) throw levelsError;

        const positionsWithLevels: PositionWithLevels[] = positions.map(pos => ({
          ...pos,
          levels: levels.filter(l => l.position_id === pos.id).map(l => ({
            ...l,
            custom_criteria: (l.custom_criteria as Record<string, unknown>) || {},
          })) as PositionLevel[],
        }));

        const familiesWithPositions: JobFamilyWithPositions[] = families.map(fam => ({
          ...fam,
          career_track: fam.career_track as CareerTrack,
          positions: positionsWithLevels.filter(p => p.family_id === fam.id),
        }));

        return {
          ...model,
          strategy_type: model.strategy_type as CompensationModel['strategy_type'],
          settings: (model.settings as Record<string, unknown>) || {},
          families: familiesWithPositions,
        } as CompensationModelWithFamilies;
      },
      enabled: !!modelId,
    });
  };

  const createModel = useMutation({
    mutationFn: async (input: CreateCompensationModelInput) => {
      if (!accountId) throw new Error("Account ID não encontrado");

      const { data, error } = await supabase
        .from("compensation_models")
        .insert([{
          name: input.name,
          description: input.description || null,
          strategy_type: input.strategy_type || 'growth',
          settings: (input.settings || {}) as Json,
          account_id: accountId,
        }])
        .select()
        .single();

      if (error) throw error;
      return data as CompensationModel;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MODELS_KEY] });
      toast.success("Modelo de cargos criado com sucesso");
    },
    onError: (error) => {
      console.error("Error creating model:", error);
      toast.error("Erro ao criar modelo");
    },
  });

  const updateModel = useMutation({
    mutationFn: async ({ id, ...input }: Partial<CompensationModel> & { id: string }) => {
      const { data, error } = await supabase
        .from("compensation_models")
        .update({
          name: input.name,
          description: input.description,
          strategy_type: input.strategy_type,
          is_active: input.is_active,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as CompensationModel;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MODELS_KEY] });
      toast.success("Modelo atualizado");
    },
    onError: (error) => {
      console.error("Error updating model:", error);
      toast.error("Erro ao atualizar modelo");
    },
  });

  const deleteModel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("compensation_models")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MODELS_KEY] });
      toast.success("Modelo excluído");
    },
    onError: (error) => {
      console.error("Error deleting model:", error);
      toast.error("Erro ao excluir modelo");
    },
  });

  return {
    models,
    isLoading,
    refetch,
    useModelWithDetails,
    createModel,
    updateModel,
    deleteModel,
  };
};
