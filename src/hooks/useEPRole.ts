import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { supabase } from '@/integrations/supabase/client';
import type { EPRole } from '@/types/consultant.types';

const EP_PARTNERS_ACCOUNT_ID = '67f66f7a-d9a8-455e-8820-ee836cfe7401';

interface UseEPRoleReturn {
  isSuperAdmin: boolean;
  isHeadCS: boolean;
  isEPConsultant: boolean;
  isEPPartner: boolean;
  isEPTeam: boolean;
  isEPAdminRH: boolean;
  epRole: EPRole | null;
  loading: boolean;
}

export function useEPRole(): UseEPRoleReturn {
  const { user } = useAuth();
  const { isImpersonating, impersonatedUser } = useImpersonation();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isHeadCS, setIsHeadCS] = useState(false);
  const [isEPConsultant, setIsEPConsultant] = useState(false);
  const [isEPPartner, setIsEPPartner] = useState(false);
  const [isEPAdminRH, setIsEPAdminRH] = useState(false);
  const [loading, setLoading] = useState(true);

  // Platform roles use real user ID; account membership uses effective (impersonated) ID
  const realUserId = user?.id;
  const effectiveUserId = isImpersonating ? impersonatedUser?.id : user?.id;

  useEffect(() => {
    async function checkRoles() {
      if (!realUserId) {
        setIsSuperAdmin(false);
        setIsHeadCS(false);
        setIsEPConsultant(false);
        setIsEPPartner(false);
        setIsEPAdminRH(false);
        setLoading(false);
        return;
      }

      try {
        // Check platform roles and EP Partners membership in parallel
        const [rolesResult, epMemberResult] = await Promise.all([
          supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', realUserId),
          supabase
            .from('account_members')
            .select('role')
            .eq('user_id', effectiveUserId)
            .eq('account_id', EP_PARTNERS_ACCOUNT_ID)
            .eq('is_active', true)
            .maybeSingle(),
        ]);

        const roleSet = new Set(rolesResult.data?.map(r => r.role) || []);
        
        setIsSuperAdmin(roleSet.has('super_admin'));
        setIsHeadCS(roleSet.has('head_cs'));
        setIsEPConsultant(roleSet.has('ep_consultant'));
        setIsEPPartner(roleSet.has('ep_partner'));

        // Check if user is admin_rh+ in the EP Partners account
        const epRole = epMemberResult.data?.role;
        const epAdminRoles = ['owner', 'admin', 'admin_rh'];
        setIsEPAdminRH(!!epRole && epAdminRoles.includes(epRole));
      } catch (error) {
        console.error('Error checking EP roles:', error);
      } finally {
        setLoading(false);
      }
    }

    checkRoles();
  }, [realUserId, effectiveUserId]);

  const epRole: EPRole | null = isSuperAdmin 
    ? 'super_admin' 
    : isHeadCS 
      ? 'head_cs' 
      : isEPConsultant 
        ? 'ep_consultant' 
        : null;

  return {
    isSuperAdmin,
    isHeadCS,
    isEPConsultant,
    isEPPartner,
    isEPTeam: isSuperAdmin || isHeadCS || isEPConsultant || isEPPartner,
    isEPAdminRH,
    epRole,
    loading,
  };
}
