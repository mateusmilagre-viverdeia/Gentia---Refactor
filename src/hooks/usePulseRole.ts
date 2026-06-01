import { useAccount } from "@/hooks/useAccount";
import type { AccountRole } from "@/types/account.types";

/**
 * @deprecated Este hook está sendo descontinuado. Use useAccount() diretamente.
 * 
 * Este hook agora é um wrapper de compatibilidade que usa o sistema unificado de roles.
 * Os roles admin_rh e leader foram migrados para account_role.
 */

// Mantendo o tipo por compatibilidade, mas agora mapeia para AccountRole
export type PulseUserRole = 'admin_rh' | 'leader' | 'employee';

interface PulseRoleReturn {
  isAdmin: boolean;
  isLeader: boolean;
  isEmployee: boolean;
  pulseRole: PulseUserRole | null;
  /** @deprecated Use accountRole de useAccount() */
  hasPulseProfile: boolean;
  loading: boolean;
  // Novos campos do sistema unificado
  accountRole: AccountRole | null;
}

/**
 * @deprecated Use useAccount() diretamente para verificar roles.
 * 
 * Mapeamento de roles:
 * - isAdmin: owner, admin, admin_rh têm acesso admin no Pulse
 * - isLeader: owner, admin, admin_rh, leader têm acesso de líder
 * - isEmployee: qualquer role exceto viewer pode usar o Pulse
 */
export const usePulseRole = (): PulseRoleReturn => {
  const { accountRole, isAdminRH, isLeader, loading } = useAccount();

  // Mapear accountRole para PulseUserRole (compatibilidade)
  const getPulseRole = (): PulseUserRole | null => {
    if (!accountRole) return null;
    if (accountRole === 'owner' || accountRole === 'admin' || accountRole === 'admin_rh') {
      return 'admin_rh';
    }
    if (accountRole === 'leader') {
      return 'leader';
    }
    if (accountRole === 'member') {
      return 'employee';
    }
    return null; // viewer não tem acesso ao Pulse
  };

  return {
    // Permissões Pulse baseadas no role unificado
    isAdmin: isAdminRH,              // owner, admin, admin_rh
    isLeader: isLeader,              // owner, admin, admin_rh, leader
    isEmployee: accountRole !== null && accountRole !== 'viewer',
    
    // Compatibilidade
    pulseRole: getPulseRole(),
    hasPulseProfile: accountRole !== null && accountRole !== 'viewer',
    loading,
    
    // Novo campo para facilitar migração
    accountRole,
  };
};
