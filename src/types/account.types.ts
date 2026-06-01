export type AccountRole = 'owner' | 'admin' | 'admin_rh' | 'leader' | 'member' | 'viewer';

export type AccountStatus = 'active' | 'suspended' | 'pending';

export type AccountType = 'agency' | 'employer';

export interface Account {
  id: string;
  name: string;
  slug: string | null;
  status: AccountStatus;
  user_id: string;
  cnpj: string | null;
  sector: string | null;
  employees_count: number | null;
  revenue_last_12_months: number | null;
  current_mission: string | null;
  current_vision: string | null;
  account_type?: AccountType;
  employer_linked_agency_id?: string | null;
  employer_linked_client_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AccountMember {
  id: string;
  account_id: string;
  user_id: string;
  role: AccountRole;
  created_at: string;
  profile?: Profile;
}

export type InviteStatus = 'pending' | 'awaiting_payment' | 'paid_ready_to_send' | 'sent' | 'accepted' | 'expired' | 'cancelled';

export interface AccountInvite {
  id: string;
  account_id: string;
  email: string;
  role: AccountRole;
  invited_by: string;
  accepted: boolean;
  created_at: string;
  expires_at: string;
  status?: InviteStatus;
  token?: string;
  stripe_checkout_session_id?: string;
  stripe_payment_intent_id?: string;
  account?: { id: string; name: string } | Account;
}

export interface Profile {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  account_id: string | null;
  created_at: string;
  updated_at: string;
}

export const roleLabels: Record<AccountRole, string> = {
  owner: 'Proprietário',
  admin: 'Administrador',
  admin_rh: 'Admin RH',
  leader: 'Líder',
  member: 'Membro',
  viewer: 'Visualizador',
};

export const roleDescriptions: Record<AccountRole, string> = {
  owner: 'Controle total da conta',
  admin: 'Gerencia toda a conta e usuários',
  admin_rh: 'Gerencia Pulse, times e colaboradores',
  leader: 'Gerencia sua equipe no Pulse',
  member: 'Acesso padrão às funcionalidades',
  viewer: 'Apenas visualização',
};

export const roleHierarchy: Record<AccountRole, number> = {
  owner: 6,
  admin: 5,
  admin_rh: 4,
  leader: 3,
  member: 2,
  viewer: 1,
};

/**
 * Verifica se um role tem nível igual ou superior a outro
 */
export function hasMinRole(userRole: AccountRole | null, requiredRole: AccountRole): boolean {
  if (!userRole) return false;
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}
