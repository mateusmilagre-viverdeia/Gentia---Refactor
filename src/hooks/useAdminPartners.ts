import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { EPPartner, PartnerLicense, PartnerClientGrant } from '@/types/partner.types';

export interface PartnerWithStats extends EPPartner {
  licenses: PartnerLicense[];
  grants: PartnerClientGrant[];
  totalSeats: number;
  usedSeats: number;
}

interface CreatePartnerData {
  userId: string;
  email: string;
  name: string;
  phone?: string;
  cpfCnpj?: string;
  companyName?: string;
  totalSeats: number;
  validUntil: Date;
  notes?: string;
  ownProjectOrgId?: string;
}

interface UseAdminPartnersReturn {
  partners: PartnerWithStats[];
  loading: boolean;
  error: string | null;
  fetchAllPartners: () => Promise<void>;
  createPartner: (data: CreatePartnerData) => Promise<{ success: boolean; error?: string; partnerId?: string }>;
  updatePartner: (partnerId: string, data: Partial<EPPartner>) => Promise<{ success: boolean; error?: string }>;
  togglePartnerStatus: (partnerId: string, active: boolean) => Promise<{ success: boolean; error?: string }>;
  adjustLicenseQuota: (partnerId: string, newQuota: number, validUntil: Date) => Promise<{ success: boolean; error?: string }>;
  createOwnProjectGrant: (partnerId: string, orgId: string) => Promise<{ success: boolean; error?: string }>;
}

export function useAdminPartners(): UseAdminPartnersReturn {
  const { user } = useAuth();
  const [partners, setPartners] = useState<PartnerWithStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAllPartners = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all partners
      const { data: partnersData, error: partnersError } = await supabase
        .from('ep_partners')
        .select('*')
        .order('created_at', { ascending: false });

      if (partnersError) throw partnersError;

      // Fetch all licenses
      const { data: licensesData, error: licensesError } = await supabase
        .from('partner_licenses')
        .select('*')
        .eq('active', true);

      if (licensesError) throw licensesError;

      // Fetch all active grants
      const { data: grantsData, error: grantsError } = await supabase
        .from('partner_client_grants')
        .select(`
          *,
          company:companies!partner_client_grants_org_id_fkey(id, name, slug)
        `)
        .is('revoked_at', null);

      if (grantsError) throw grantsError;

      // Map partners with their stats
      const partnersWithStats: PartnerWithStats[] = (partnersData || []).map(partner => {
        const partnerLicenses = (licensesData || []).filter(l => l.partner_id === partner.id);
        const partnerGrants = (grantsData || []).filter(g => g.partner_id === partner.id);
        const totalSeats = partnerLicenses.reduce((acc, l) => acc + (l.total_seats || 0), 0);
        const usedSeats = partnerGrants.length;

        return {
          ...partner,
          licenses: partnerLicenses as PartnerLicense[],
          grants: partnerGrants as PartnerClientGrant[],
          totalSeats,
          usedSeats,
        };
      });

      setPartners(partnersWithStats);
    } catch (err) {
      console.error('Error fetching partners:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar parceiros');
    } finally {
      setLoading(false);
    }
  }, []);

  const createPartner = useCallback(async (data: CreatePartnerData): Promise<{ success: boolean; error?: string; partnerId?: string }> => {
    if (!user) return { success: false, error: 'Usuário não autenticado' };

    try {
      // Generate unique promo code
      const promoCode = `EP-${data.name.substring(0, 3).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      // Create partner record
      const { data: partnerData, error: partnerError } = await supabase
        .from('ep_partners')
        .insert({
          user_id: data.userId,
          email: data.email,
          name: data.name,
          phone: data.phone || null,
          cpf_cnpj: data.cpfCnpj || null,
          company_name: data.companyName || null,
          promo_code: promoCode,
          notes: data.notes || null,
          active: true,
          created_by: user.id,
        })
        .select()
        .single();

      if (partnerError) throw partnerError;

      // Assign ep_partner role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: data.userId,
          role: 'ep_partner',
        });

      if (roleError && !roleError.message.includes('duplicate')) {
        console.error('Role assignment error:', roleError);
      }

      // Create initial license
      const { error: licenseError } = await supabase
        .from('partner_licenses')
        .insert({
          partner_id: partnerData.id,
          total_seats: data.totalSeats,
          valid_from: new Date().toISOString(),
          valid_until: data.validUntil.toISOString(),
          active: true,
          created_by: user.id,
        });

      if (licenseError) throw licenseError;

      // If own project org is specified, create auto-grant
      if (data.ownProjectOrgId) {
        const oneYearFromNow = new Date();
        oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 10); // Long validity for own project

        const { data: grantData, error: grantError } = await supabase
          .from('partner_client_grants')
          .insert({
            partner_id: partnerData.id,
            org_id: data.ownProjectOrgId,
            granted_by: user.id,
            expires_at: oneYearFromNow.toISOString(),
            notes: 'Projeto próprio do sócio - acesso gratuito',
          })
          .select()
          .single();

        if (grantError) throw grantError;

        // Update partner with own_project_grant_id
        await supabase
          .from('ep_partners')
          .update({ own_project_grant_id: grantData.id })
          .eq('id', partnerData.id);
      }

      await fetchAllPartners();
      return { success: true, partnerId: partnerData.id };
    } catch (err) {
      console.error('Error creating partner:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Erro ao criar parceiro' };
    }
  }, [user, fetchAllPartners]);

  const updatePartner = useCallback(async (partnerId: string, data: Partial<EPPartner>): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error: updateError } = await supabase
        .from('ep_partners')
        .update({
          name: data.name,
          phone: data.phone,
          cpf_cnpj: data.cpf_cnpj,
          company_name: data.company_name,
          notes: data.notes,
        })
        .eq('id', partnerId);

      if (updateError) throw updateError;

      await fetchAllPartners();
      return { success: true };
    } catch (err) {
      console.error('Error updating partner:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Erro ao atualizar parceiro' };
    }
  }, [fetchAllPartners]);

  const togglePartnerStatus = useCallback(async (partnerId: string, active: boolean): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error: updateError } = await supabase
        .from('ep_partners')
        .update({ active })
        .eq('id', partnerId);

      if (updateError) throw updateError;

      await fetchAllPartners();
      return { success: true };
    } catch (err) {
      console.error('Error toggling partner status:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Erro ao alterar status do parceiro' };
    }
  }, [fetchAllPartners]);

  const adjustLicenseQuota = useCallback(async (partnerId: string, newQuota: number, validUntil: Date): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Usuário não autenticado' };

    try {
      // Deactivate current licenses
      await supabase
        .from('partner_licenses')
        .update({ active: false })
        .eq('partner_id', partnerId);

      // Create new license with updated quota
      const { error: licenseError } = await supabase
        .from('partner_licenses')
        .insert({
          partner_id: partnerId,
          total_seats: newQuota,
          valid_from: new Date().toISOString(),
          valid_until: validUntil.toISOString(),
          active: true,
          created_by: user.id,
        });

      if (licenseError) throw licenseError;

      await fetchAllPartners();
      return { success: true };
    } catch (err) {
      console.error('Error adjusting license quota:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Erro ao ajustar quota' };
    }
  }, [user, fetchAllPartners]);

  const createOwnProjectGrant = useCallback(async (partnerId: string, orgId: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Usuário não autenticado' };

    try {
      const tenYearsFromNow = new Date();
      tenYearsFromNow.setFullYear(tenYearsFromNow.getFullYear() + 10);

      const { data: grantData, error: grantError } = await supabase
        .from('partner_client_grants')
        .insert({
          partner_id: partnerId,
          org_id: orgId,
          granted_by: user.id,
          expires_at: tenYearsFromNow.toISOString(),
          notes: 'Projeto próprio do sócio - acesso gratuito',
        })
        .select()
        .single();

      if (grantError) throw grantError;

      // Update partner with own_project_grant_id
      await supabase
        .from('ep_partners')
        .update({ own_project_grant_id: grantData.id })
        .eq('id', partnerId);

      await fetchAllPartners();
      return { success: true };
    } catch (err) {
      console.error('Error creating own project grant:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Erro ao criar acesso do projeto próprio' };
    }
  }, [user, fetchAllPartners]);

  return {
    partners,
    loading,
    error,
    fetchAllPartners,
    createPartner,
    updatePartner,
    togglePartnerStatus,
    adjustLicenseQuota,
    createOwnProjectGrant,
  };
}
