import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ConsultantAssignment {
  id: string;
  account_id: string;
  active: boolean;
  assigned_at: string;
  account?: {
    id: string;
    name: string;
    slug: string | null;
  };
}

export function useConsultantAssignments() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["consultant-assignments", user?.id],
    queryFn: async (): Promise<ConsultantAssignment[]> => {
      if (!user?.id) return [];

      // First get the consultant
      const { data: consultant, error: consultantError } = await supabase
        .from("ep_consultants")
        .select("id")
        .eq("user_id", user.id)
        .eq("active", true)
        .maybeSingle();

      if (consultantError) throw consultantError;
      if (!consultant) return [];

      // Get assignments with company info
      const { data: assignments, error: assignmentsError } = await supabase
        .from("consultant_assignments")
        .select(`
          id,
          account_id,
          active,
          assigned_at,
          account:companies(id, name, slug)
        `)
        .eq("consultant_id", consultant.id)
        .eq("active", true);

      if (assignmentsError) throw assignmentsError;

      return (assignments || []).map((a) => ({
        id: a.id,
        account_id: a.account_id,
        active: a.active,
        assigned_at: a.assigned_at,
        account: a.account as ConsultantAssignment["account"],
      }));
    },
    enabled: !!user?.id,
  });

  return {
    assignments: query.data || [],
    isLoading: query.isLoading,
    error: query.error?.message || null,
    refetch: query.refetch,
  };
}
