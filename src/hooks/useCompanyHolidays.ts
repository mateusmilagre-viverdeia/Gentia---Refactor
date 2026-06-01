import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import type { CompanyHoliday } from "@/types/resource-planning.types";

export function useCompanyHolidays(params?: { limit?: number }) {
  const { user } = useAuth();
  const { currentAccount } = useOrganization();
  const queryClient = useQueryClient();
  const limit = params?.limit ?? 400;
  const accountId = currentAccount?.id ?? null;

  const holidaysQuery = useQuery({
    queryKey: ["resource-planning", "company-holidays", accountId, limit],
    queryFn: async (): Promise<CompanyHoliday[]> => {
      if (!accountId) return [];
      const { data, error } = await supabase
        .from("company_holidays")
        .select("*")
        .eq("account_id", accountId)
        .order("holiday_date", { ascending: true })
        .limit(limit);
      if (error) throw error;
      return (data || []) as any;
    },
    enabled: !!accountId,
  });

  const createHoliday = useMutation({
    mutationFn: async (input: { date: string; name: string; notes?: string }) => {
      if (!accountId) throw new Error("Conta não selecionada");
      if (!user?.id) throw new Error("Usuário não autenticado");
      const { error } = await supabase.from("company_holidays").insert({
        account_id: accountId,
        holiday_date: input.date,
        name: input.name,
        notes: input.notes ?? null,
        created_by: user.id,
        updated_by: user.id,
      } as any);
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resource-planning", "company-holidays"] });
      queryClient.invalidateQueries({ queryKey: ["resource-planning", "availability"] });
    },
  });

  const updateHoliday = useMutation({
    mutationFn: async (input: { id: string; date: string; name: string; notes?: string }) => {
      if (!user?.id) throw new Error("Usuário não autenticado");
      const { error } = await supabase
        .from("company_holidays")
        .update({
          holiday_date: input.date,
          name: input.name,
          notes: input.notes ?? null,
          updated_by: user.id,
        } as any)
        .eq("id", input.id);
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resource-planning", "company-holidays"] });
      queryClient.invalidateQueries({ queryKey: ["resource-planning", "availability"] });
    },
  });

  const deleteHoliday = useMutation({
    mutationFn: async (holidayId: string) => {
      const { error } = await supabase.from("company_holidays").delete().eq("id", holidayId);
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resource-planning", "company-holidays"] });
      queryClient.invalidateQueries({ queryKey: ["resource-planning", "availability"] });
    },
  });

  return {
    accountId,
    holidays: holidaysQuery.data ?? [],
    loading: holidaysQuery.isLoading,
    error: holidaysQuery.error as any,
    createHoliday: createHoliday.mutateAsync,
    creating: createHoliday.isPending,
    updateHoliday: updateHoliday.mutateAsync,
    updating: updateHoliday.isPending,
    deleteHoliday: deleteHoliday.mutateAsync,
    deleting: deleteHoliday.isPending,
  };
}
