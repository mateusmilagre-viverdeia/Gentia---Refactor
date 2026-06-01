import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ConsultantAvailabilityBlock } from "@/types/resource-planning.types";

export function useConsultantAvailabilityBlocks(params?: { limit?: number }) {
  const queryClient = useQueryClient();
  const limit = params?.limit ?? 200;

  const blocksQuery = useQuery({
    queryKey: ["resource-planning", "availability-blocks", limit],
    queryFn: async (): Promise<ConsultantAvailabilityBlock[]> => {
      const { data, error } = await supabase
        .from("consultant_availability_blocks")
        .select("*")
        .order("start_date", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data || []) as any;
    },
  });

  const createBlock = useMutation({
    mutationFn: async (input: {
      consultantId: string;
      startDate: string;
      endDate: string;
      blockType: ConsultantAvailabilityBlock["block_type"];
      hoursPerDay: number | null;
      notes?: string;
      createdBy?: string;
    }) => {
      const { error } = await supabase.from("consultant_availability_blocks").insert({
        consultant_id: input.consultantId,
        start_date: input.startDate,
        end_date: input.endDate,
        block_type: input.blockType,
        hours_per_day: input.hoursPerDay,
        notes: input.notes ?? null,
        created_by: input.createdBy ?? null,
        updated_by: input.createdBy ?? null,
      } as any);
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resource-planning", "availability-blocks"] });
      queryClient.invalidateQueries({ queryKey: ["resource-planning", "capacity-settings"] });
    },
  });

  const deleteBlock = useMutation({
    mutationFn: async (blockId: string) => {
      const { error } = await supabase.from("consultant_availability_blocks").delete().eq("id", blockId);
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resource-planning", "availability-blocks"] });
      queryClient.invalidateQueries({ queryKey: ["resource-planning", "capacity-settings"] });
    },
  });

  const updateBlock = useMutation({
    mutationFn: async (input: {
      id: string;
      consultantId: string;
      startDate: string;
      endDate: string;
      blockType: ConsultantAvailabilityBlock["block_type"];
      hoursPerDay: number | null;
      notes?: string;
      updatedBy?: string;
    }) => {
      const { error } = await supabase
        .from("consultant_availability_blocks")
        .update({
          consultant_id: input.consultantId,
          start_date: input.startDate,
          end_date: input.endDate,
          block_type: input.blockType,
          hours_per_day: input.hoursPerDay,
          notes: input.notes ?? null,
          updated_by: input.updatedBy ?? null,
        } as any)
        .eq("id", input.id);
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resource-planning", "availability-blocks"] });
      queryClient.invalidateQueries({ queryKey: ["resource-planning", "availability"] });
      queryClient.invalidateQueries({ queryKey: ["resource-planning", "capacity-settings"] });
    },
  });

  return {
    blocks: blocksQuery.data ?? [],
    loading: blocksQuery.isLoading,
    error: blocksQuery.error as any,
    refetch: blocksQuery.refetch,
    createBlock: createBlock.mutateAsync,
    creating: createBlock.isPending,
    deleteBlock: deleteBlock.mutateAsync,
    deleting: deleteBlock.isPending,
    updateBlock: updateBlock.mutateAsync,
    updating: updateBlock.isPending,
  };
}
