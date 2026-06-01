import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAccount } from "@/hooks/useAccount";

/**
 * Hook to check if the current user can invite others to assessments
 * Only Owner, Admin, and Admin_RH roles can invite
 */
export function useCanInviteAssessment() {
  const { user } = useAuth();
  const { account } = useAccount();

  const { data: userRole, isLoading } = useQuery({
    queryKey: ['user-role', user?.id, account?.id],
    queryFn: async () => {
      if (!user?.id || !account?.id) return null;

      const { data, error } = await supabase
        .from('account_members')
        .select('role')
        .eq('user_id', user.id)
        .eq('account_id', account.id)
        .single();

      if (error) {
        console.error('Error fetching user role:', error);
        return null;
      }

      return data?.role;
    },
    enabled: !!user?.id && !!account?.id
  });

  const canInvite = useMemo(() => {
    if (!userRole) return false;
    return ['owner', 'admin', 'admin_rh'].includes(userRole);
  }, [userRole]);

  return { 
    canInvite, 
    isLoading,
    userRole 
  };
}
