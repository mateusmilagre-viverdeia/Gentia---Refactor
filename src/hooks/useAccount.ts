import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import type { Account, AccountRole, AccountMember } from '@/types/account.types';
import { hasMinRole } from '@/types/account.types';
import { createLogger } from '@/lib/logger';

const log = createLogger('useAccount');

interface UseAccountReturn {
  account: Account | null;
  accountRole: AccountRole | null;
  membership: AccountMember | null;
  loading: boolean;
  // Role checks
  isOwner: boolean;
  isAdmin: boolean;       // owner | admin
  isAdminRH: boolean;     // owner | admin | admin_rh
  isLeader: boolean;      // owner | admin | admin_rh | leader
  // Permission checks
  canManage: boolean;     // owner | admin (gerenciar conta, usuários)
  canManageRH: boolean;   // owner | admin | admin_rh (gerenciar Pulse)
  canManageTeam: boolean; // owner | admin | admin_rh | leader (gerenciar equipe)
  canEdit: boolean;       // owner | admin | admin_rh | leader | member
  // Utility function
  hasMinRole: (role: AccountRole) => boolean;
  reloadAccount: () => Promise<void>;
}

export function useAccount(): UseAccountReturn {
  const { user } = useAuth();
  const { isImpersonating, impersonatedMembership } = useImpersonation();
  const { currentAccount, currentMembership, loading: orgLoading, reloadOrganizations } = useOrganization();
  
  const [localAccount, setLocalAccount] = useState<Account | null>(null);
  const [localMembership, setLocalMembership] = useState<AccountMember | null>(null);
  const [localLoading, setLocalLoading] = useState(true);

  const loadAccount = useCallback(async () => {
    if (!user) {
      setLocalAccount(null);
      setLocalMembership(null);
      setLocalLoading(false);
      return;
    }

    // If we have data from OrganizationContext, use that
    if (currentAccount) {
      setLocalLoading(false);
      return;
    }

    try {
      setLocalLoading(true);

      // Fallback: First get user's membership
      const { data: membershipData, error: membershipError } = await supabase
        .from('account_members')
        .select('*')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      if (membershipError) {
        log.error('Error fetching membership:', membershipError);
      }

      if (membershipData) {
        setLocalMembership(membershipData as AccountMember);

        // Fetch account details
        const { data: accountData, error: accountError } = await supabase
          .from('companies')
          .select('*')
          .eq('id', membershipData.account_id)
          .single();

        if (accountError) {
          log.error('Error fetching account:', accountError);
        } else {
          setLocalAccount(accountData as unknown as Account);
        }
      } else {
        // Fallback: check if user owns a company directly
        const { data: ownedCompany, error: ownedError } = await supabase
          .from('companies')
          .select('*')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle();

        if (!ownedError && ownedCompany) {
          setLocalAccount(ownedCompany as unknown as Account);
          // Create membership for owner
          setLocalMembership({
            id: 'owner-implicit',
            account_id: ownedCompany.id,
            user_id: user.id,
            role: 'owner',
            created_at: ownedCompany.created_at,
          });
        }
      }
    } catch (error) {
      log.error('Error in useAccount:', error);
    } finally {
      setLocalLoading(false);
    }
  }, [user, currentAccount]);

  // Combined reload function - must be declared before useEffect to maintain hook order
  const reloadAccount = useCallback(async () => {
    await Promise.all([reloadOrganizations(), loadAccount()]);
  }, [reloadOrganizations, loadAccount]);

  useEffect(() => {
    loadAccount();
  }, [loadAccount]);

  // Use OrganizationContext as primary source (respects EP Override / Modo Consultoria)
  const effectiveAccount = currentAccount || localAccount;
  const effectiveMembership = currentMembership || localMembership;
  
  // Use impersonated membership when active for permission checks
  const permissionMembership = isImpersonating ? impersonatedMembership : effectiveMembership;
  const accountRole = permissionMembership?.role || null;
  
  // Role checks using hierarchy (respects impersonation)
  const isOwner = accountRole === 'owner';
  const isAdmin = hasMinRole(accountRole, 'admin');           // owner, admin
  const isAdminRH = hasMinRole(accountRole, 'admin_rh');      // owner, admin, admin_rh
  const isLeader = hasMinRole(accountRole, 'leader');         // owner, admin, admin_rh, leader
  
  // Permission checks
  const canManage = isAdmin;                                  // owner, admin
  const canManageRH = isAdminRH;                              // owner, admin, admin_rh
  const canManageTeam = isLeader;                             // owner, admin, admin_rh, leader
  const canEdit = hasMinRole(accountRole, 'member');          // todos exceto viewer

  // Combined loading state
  const loading = orgLoading || localLoading;

  return {
    account: effectiveAccount,
    accountRole,
    membership: effectiveMembership,
    loading,
    isOwner,
    isAdmin,
    isAdminRH,
    isLeader,
    canManage,
    canManageRH,
    canManageTeam,
    canEdit,
    hasMinRole: (role: AccountRole) => hasMinRole(accountRole, role),
    reloadAccount,
  };
}
