export interface EPPartner {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string | null;
  cpf_cnpj: string | null;
  company_name: string | null;
  promo_code: string;
  active: boolean | null;
  notes: string | null;
  created_at: string | null;
  created_by: string;
  own_project_grant_id: string | null;
}

export interface PartnerLicense {
  id: string;
  partner_id: string;
  total_seats: number;
  valid_from: string | null;
  valid_until: string | null;
  active: boolean | null;
  notes: string | null;
  created_at: string | null;
  created_by: string;
}

export interface PartnerClientGrant {
  id: string;
  partner_id: string;
  org_id: string | null;
  user_id: string | null;
  promo_code_used: string | null;
  granted_at: string | null;
  granted_by: string;
  expires_at: string;
  revoked_at: string | null;
  revoked_by: string | null;
  notes: string | null;
  // Joined data
  company?: {
    id: string;
    name: string;
    slug: string | null;
  };
}

export interface PartnerRoyalty {
  id: string;
  partner_id: string;
  org_id: string | null;
  grant_id: string;
  period_start: string;
  period_end: string;
  base_plan_amount: number;
  seat_amount: number;
  additional_seats: number;
  total_client_amount: number;
  royalty_percentage: number;
  royalty_amount: number;
  status: string | null;
  invoiced_at: string | null;
  paid_at: string | null;
  created_at: string | null;
  // Joined data
  company?: {
    id: string;
    name: string;
  };
}

export interface PromoCodeRedemption {
  id: string;
  promo_code: string;
  partner_id: string;
  org_id: string | null;
  user_id: string | null;
  redeemed_at: string;
  ip_address: string | null;
}

export interface PartnerDashboardStats {
  totalSeats: number;
  usedSeats: number;
  availableSeats: number;
  activeClients: number;
  monthlyRoyalties: number;
  pendingRoyalties: number;
}

export interface PartnerWithLicenses extends EPPartner {
  licenses?: PartnerLicense[];
  totalSeats?: number;
  usedSeats?: number;
}

// New: EP Partner Users (multiple users per partner company)
export type EPPartnerUserRole = 'owner' | 'admin' | 'viewer';

export interface EPPartnerUser {
  id: string;
  partner_id: string;
  user_id: string;
  role: EPPartnerUserRole;
  invited_by: string | null;
  created_at: string;
  // Joined data
  profile?: {
    id: string;
    email: string | null;
    first_name: string | null;
    last_name: string | null;
  };
}

export interface EPPartnerUserWithProfile extends EPPartnerUser {
  profile: {
    id: string;
    email: string | null;
    first_name: string | null;
    last_name: string | null;
  };
}
