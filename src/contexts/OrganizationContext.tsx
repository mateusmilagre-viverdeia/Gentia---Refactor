import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logEPOverrideActivated, logEPOverrideDeactivated } from '@/lib/debugConsultoria';
import type { Account, AccountMember, AccountRole } from '@/types/account.types';
import { createLogger } from '@/lib/logger';

const log = createLogger('OrganizationContext');

interface Organization {
  id: string;
  name: string;
  slug: string | null;
  sector: string | null;
  role: AccountRole;
}

interface OrganizationContextType {
  organizations: Organization[];
  currentOrganization: Organization | null;
  currentAccount: Account | null;
  currentMembership: AccountMember | null;
  loading: boolean;
  switchOrganization: (orgId: string) => void;
  reloadOrganizations: () => Promise<void>;
  // EP Override functionality
  isEPOverride: boolean;
  epOverrideOrg: Organization | null;
  setEPOrganization: (orgId: string) => Promise<void>;
  clearEPOverride: () => void;
  // Consultant project mode
  isConsultantMode: boolean;
  setConsultantProject: (accountId: string) => Promise<boolean>;
  clearConsultantProject: () => void;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

const STORAGE_KEY = 'selected_organization_id';
const EP_OVERRIDE_KEY = 'ep_override_organization';
const CONSULTANT_OVERRIDE_KEY = 'consultant_override_organization';

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);
  const [currentMembership, setCurrentMembership] = useState<AccountMember | null>(null);
  const [loading, setLoading] = useState(true);

  // EP Override state
  const [isEPOverride, setIsEPOverride] = useState(false);
  const [epOverrideOrg, setEPOverrideOrg] = useState<Organization | null>(null);
  const [originalOrg, setOriginalOrg] = useState<Organization | null>(null);
  
  // Consultant project mode state
  const [isConsultantMode, setIsConsultantMode] = useState(false);
  const [consultantOriginalOrg, setConsultantOriginalOrg] = useState<Organization | null>(null);
  
  // Ref to prevent race condition during organization switching
  const isSwitchingRef = useRef(false);

  // Restore EP override from session storage on mount
  useEffect(() => {
    const savedOverride = sessionStorage.getItem(EP_OVERRIDE_KEY);
    if (savedOverride) {
      try {
        const parsed = JSON.parse(savedOverride);
        setEPOverrideOrg(parsed.org);
        setIsEPOverride(true);
      } catch (e) {
        sessionStorage.removeItem(EP_OVERRIDE_KEY);
      }
    }
  }, []);

  const loadOrganizations = useCallback(async () => {
    // Don't reload if we're in the middle of a switch operation
    if (isSwitchingRef.current) {
      return;
    }
    
    if (!user) {
      setOrganizations([]);
      setCurrentOrganization(null);
      setCurrentAccount(null);
      setCurrentMembership(null);
      setLoading(false);
      return;
    }

    // Check if EP override is active - if so, don't show loading indicator
    // This prevents the screen from flickering during token refresh
    const savedOverride = sessionStorage.getItem(EP_OVERRIDE_KEY);
    const hasActiveOverride = !!savedOverride && isEPOverride;

    try {
      // Only show loading if we don't have data yet AND no active override
      if (!hasActiveOverride && !currentOrganization) {
        setLoading(true);
      }

      // Fetch memberships with company data
      const { data: memberships, error: membershipError } = await supabase
        .from('account_members')
        .select(`
          id,
          role,
          account_id,
          user_id,
          created_at,
          companies:account_id (
            id,
            name,
            slug,
            sector
          )
        `)
        .eq('user_id', user.id);

      if (membershipError) {
        log.error('Error fetching memberships:', membershipError);
      }

      // Also check for directly owned companies (not in account_members)
      const { data: ownedCompanies, error: ownedError } = await supabase
        .from('companies')
        .select('id, name, slug, sector')
        .eq('user_id', user.id);

      if (ownedError) {
        log.error('Error fetching owned companies:', ownedError);
      }

      // Build organizations list
      const orgsFromMemberships: Organization[] = (memberships || [])
        .filter(m => m.companies)
        .map(m => ({
          id: (m.companies as any).id,
          name: (m.companies as any).name,
          slug: (m.companies as any).slug,
          sector: (m.companies as any).sector,
          role: m.role as Organization['role'],
        }));

      // Add owned companies that aren't already in memberships
      const membershipIds = new Set(orgsFromMemberships.map(o => o.id));
      const orgsFromOwned: Organization[] = (ownedCompanies || [])
        .filter(c => !membershipIds.has(c.id))
        .map(c => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          sector: c.sector,
          role: 'owner' as const,
        }));

      const allOrgs = [...orgsFromMemberships, ...orgsFromOwned];
      setOrganizations(allOrgs);

      // If EP override is active, load the override org data
      const savedOverride = sessionStorage.getItem(EP_OVERRIDE_KEY);
      if (savedOverride) {
        try {
          const parsed = JSON.parse(savedOverride);
          // Load full account data for override org
          const { data: overrideAccount } = await supabase
            .from('companies')
            .select('*')
            .eq('id', parsed.org.id)
            .single();
          
          if (overrideAccount) {
            setCurrentOrganization(parsed.org);
            setCurrentAccount(overrideAccount as unknown as Account);
            setCurrentMembership({
              id: 'ep-override',
              account_id: parsed.org.id,
              user_id: user.id,
              role: 'admin', // EP team has admin-like access
              created_at: null,
            } as AccountMember);
            setOriginalOrg(allOrgs[0] || null);
            setLoading(false);
            return;
          }
        } catch (e) {
          sessionStorage.removeItem(EP_OVERRIDE_KEY);
        }
      }

      // If consultant mode is active, restore it (server-validated)
      const savedConsultant = sessionStorage.getItem(CONSULTANT_OVERRIDE_KEY);
      if (savedConsultant) {
        try {
          const parsed = JSON.parse(savedConsultant) as {
            org: Organization;
            originalOrgId?: string | null;
          };

          // Validate assignment server-side (never trust sessionStorage)
          const { data: consultant } = await supabase
            .from('ep_consultants')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle();

          if (!consultant) {
            sessionStorage.removeItem(CONSULTANT_OVERRIDE_KEY);
          } else {
            const { data: assignment } = await supabase
              .from('consultant_assignments')
              .select('id')
              .eq('consultant_id', consultant.id)
              .eq('account_id', parsed.org.id)
              .eq('active', true)
              .maybeSingle();

            if (!assignment) {
              sessionStorage.removeItem(CONSULTANT_OVERRIDE_KEY);
            } else {
              const { data: company } = await supabase
                .from('companies')
                .select('*')
                .eq('id', parsed.org.id)
                .single();

              if (company) {
                setIsConsultantMode(true);
                setCurrentOrganization(parsed.org);
                setCurrentAccount(company as unknown as Account);
                setCurrentMembership({
                  id: 'consultant-project',
                  account_id: parsed.org.id,
                  user_id: user.id,
                  role: 'member',
                  created_at: null,
                } as AccountMember);

                const restoredOriginal = parsed.originalOrgId
                  ? allOrgs.find((o) => o.id === parsed.originalOrgId) || null
                  : null;

                setConsultantOriginalOrg(restoredOriginal || allOrgs[0] || null);
                setLoading(false);
                return;
              }

              sessionStorage.removeItem(CONSULTANT_OVERRIDE_KEY);
            }
          }
        } catch {
          sessionStorage.removeItem(CONSULTANT_OVERRIDE_KEY);
        }
      }

      // Determine which org to select
      const savedOrgId = localStorage.getItem(STORAGE_KEY);
      let selectedOrg = allOrgs.find(o => o.id === savedOrgId);
      
      if (!selectedOrg && allOrgs.length > 0) {
        selectedOrg = allOrgs[0];
      }

      if (selectedOrg) {
        setCurrentOrganization(selectedOrg);
        localStorage.setItem(STORAGE_KEY, selectedOrg.id);

        // Load full account data
        const { data: accountData } = await supabase
          .from('companies')
          .select('*')
          .eq('id', selectedOrg.id)
          .single();

        if (accountData) {
          setCurrentAccount(accountData as unknown as Account);
        }

        // Find membership for this org
        const membership = memberships?.find(m => m.account_id === selectedOrg!.id);
        if (membership) {
          setCurrentMembership({
            id: membership.id,
            account_id: membership.account_id,
            user_id: membership.user_id,
            role: membership.role,
            created_at: membership.created_at,
          } as AccountMember);
        } else {
          // Implicit owner membership
          setCurrentMembership({
            id: 'owner-implicit',
            account_id: selectedOrg.id,
            user_id: user.id,
            role: 'owner',
            created_at: null,
          } as AccountMember);
        }
      }
    } catch (error) {
      log.error('Error in loadOrganizations:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, isEPOverride]); // Removed currentOrganization to prevent race condition during switch

  useEffect(() => {
    loadOrganizations();
  }, [loadOrganizations]);

  const switchOrganization = useCallback(async (orgId: string) => {
    const org = organizations.find(o => o.id === orgId);
    if (!org || org.id === currentOrganization?.id) return;

    // Set flag to prevent loadOrganizations from interfering
    isSwitchingRef.current = true;
    
    try {
      setCurrentOrganization(org);
      localStorage.setItem(STORAGE_KEY, orgId);

      // Load full account data
      const { data: accountData } = await supabase
        .from('companies')
        .select('*')
        .eq('id', orgId)
        .single();

      if (accountData) {
        setCurrentAccount(accountData as unknown as Account);
      }

      // Find membership
      const { data: membershipData } = await supabase
        .from('account_members')
        .select('*')
        .eq('user_id', user?.id)
        .eq('account_id', orgId)
        .maybeSingle();

      if (membershipData) {
        setCurrentMembership(membershipData as AccountMember);
      } else {
        setCurrentMembership({
          id: 'owner-implicit',
          account_id: orgId,
          user_id: user?.id || '',
          role: 'owner',
          created_at: null,
        } as AccountMember);
      }

      // Invalidate all queries to reload data for new organization
      queryClient.invalidateQueries();
    } finally {
      // Release the lock after switch is complete
      isSwitchingRef.current = false;
    }
  }, [organizations, currentOrganization, user, queryClient]);

  // EP Override: Set organization for viewing client data
  const setEPOrganization = useCallback(async (orgId: string) => {
    if (!user) return;

    try {
      // Fetch the client organization data
      const { data: company, error } = await supabase
        .from('companies')
        .select('id, name, slug, sector')
        .eq('id', orgId)
        .single();

      if (error || !company) {
        log.error('Error fetching company for EP override:', error);
        return;
      }

      const overrideOrg: Organization = {
        id: company.id,
        name: company.name,
        slug: company.slug,
        sector: company.sector,
        role: 'admin', // EP team gets admin-like view
      };

      // Save current org as original before override
      if (!isEPOverride) {
        setOriginalOrg(currentOrganization);
      }

      // Set override state
      setEPOverrideOrg(overrideOrg);
      setIsEPOverride(true);
      setCurrentOrganization(overrideOrg);

      // Load full account data
      const { data: accountData } = await supabase
        .from('companies')
        .select('*')
        .eq('id', orgId)
        .single();

      if (accountData) {
        setCurrentAccount(accountData as unknown as Account);
      }

      // Set an EP override membership
      setCurrentMembership({
        id: 'ep-override',
        account_id: orgId,
        user_id: user.id,
        role: 'admin',
        created_at: null,
      } as AccountMember);

      // Persist to session storage
      sessionStorage.setItem(EP_OVERRIDE_KEY, JSON.stringify({
        org: overrideOrg,
        timestamp: new Date().toISOString(),
      }));

      // Debug log
      logEPOverrideActivated(overrideOrg.id, overrideOrg.name, user.id);

      // Log the EP override session
      await supabase.from('impersonation_logs').insert({
        owner_id: user.id,
        impersonated_user_id: user.id, // Self - just viewing as org
        account_id: orgId,
        ip_address: null,
        user_agent: navigator.userAgent,
      });

      // Reset journey-progress queries completely to avoid stale data, then invalidate others
      // Use setTimeout(0) to ensure state updates have propagated before invalidation
      setTimeout(() => {
        queryClient.resetQueries({ queryKey: ['journey-progress'] });
        queryClient.invalidateQueries();
      }, 0);
    } catch (error) {
      log.error('Error setting EP organization:', error);
    }
  }, [user, currentOrganization, isEPOverride, queryClient]);

  // Clear EP Override and return to original organization
  const clearEPOverride = useCallback(async () => {
    // Debug log before clearing
    logEPOverrideDeactivated(originalOrg?.id || null, originalOrg?.name || null);
    
    sessionStorage.removeItem(EP_OVERRIDE_KEY);
    setIsEPOverride(false);
    setEPOverrideOrg(null);

    if (originalOrg) {
      setCurrentOrganization(originalOrg);
      
      // Load original account data
      const { data: accountData } = await supabase
        .from('companies')
        .select('*')
        .eq('id', originalOrg.id)
        .single();

      if (accountData) {
        setCurrentAccount(accountData as unknown as Account);
      }

      // Find original membership
      const { data: membershipData } = await supabase
        .from('account_members')
        .select('*')
        .eq('user_id', user?.id)
        .eq('account_id', originalOrg.id)
        .maybeSingle();

      if (membershipData) {
        setCurrentMembership(membershipData as AccountMember);
      } else {
        setCurrentMembership({
          id: 'owner-implicit',
          account_id: originalOrg.id,
          user_id: user?.id || '',
          role: 'owner',
          created_at: null,
        } as AccountMember);
      }
    }

    setOriginalOrg(null);
    
    // Reset journey-progress queries completely to avoid stale data, then invalidate others
    setTimeout(() => {
      queryClient.resetQueries({ queryKey: ['journey-progress'] });
      queryClient.invalidateQueries();
    }, 0);
  }, [originalOrg, user, queryClient]);

  // Consultant project mode: Set context for viewing assigned client project
  const setConsultantProject = useCallback(async (accountId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      // First verify the user is an EP consultant assigned to this project
      const { data: consultant } = await supabase
        .from('ep_consultants')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!consultant) return false;

      const { data: assignment } = await supabase
        .from('consultant_assignments')
        .select('id')
        .eq('consultant_id', consultant.id)
        .eq('account_id', accountId)
        .eq('active', true)
        .maybeSingle();

      if (!assignment) return false;

      // Fetch the client organization data
      const { data: company, error } = await supabase
        .from('companies')
        .select('id, name, slug, sector')
        .eq('id', accountId)
        .single();

      if (error || !company) {
        log.error('Error fetching company for consultant project:', error);
        return false;
      }

      const projectOrg: Organization = {
        id: company.id,
        name: company.name,
        slug: company.slug,
        sector: company.sector,
        role: 'member', // Limited edit: do not grant admin-like membership
      };

      // Save current org before switching
      if (!isConsultantMode) {
        setConsultantOriginalOrg(currentOrganization);
      }

      // Set consultant mode state
      setIsConsultantMode(true);
      setCurrentOrganization(projectOrg);

      // Load full account data
      const { data: accountData } = await supabase
        .from('companies')
        .select('*')
        .eq('id', accountId)
        .single();

      if (accountData) {
        setCurrentAccount(accountData as unknown as Account);
      }

      // Set a consultant mode membership
      setCurrentMembership({
        id: 'consultant-project',
        account_id: accountId,
        user_id: user.id,
        role: 'member',
        created_at: null,
      } as AccountMember);

      // Persist to session storage (validated again on restore)
      sessionStorage.setItem(
        CONSULTANT_OVERRIDE_KEY,
        JSON.stringify({
          org: projectOrg,
          originalOrgId: (consultantOriginalOrg || currentOrganization)?.id || null,
          timestamp: new Date().toISOString(),
        })
      );

      // Invalidate queries to reload data for the client project
      setTimeout(() => {
        queryClient.invalidateQueries();
      }, 0);

      return true;
    } catch (error) {
      console.error('Error setting consultant project:', error);
      return false;
    }
  }, [user, currentOrganization, consultantOriginalOrg, isConsultantMode, queryClient]);

  // Clear consultant project mode and return to original organization
  const clearConsultantProject = useCallback(async () => {
    if (!isConsultantMode) return;

    sessionStorage.removeItem(CONSULTANT_OVERRIDE_KEY);

    setIsConsultantMode(false);

    if (consultantOriginalOrg) {
      setCurrentOrganization(consultantOriginalOrg);
      
      // Load original account data
      const { data: accountData } = await supabase
        .from('companies')
        .select('*')
        .eq('id', consultantOriginalOrg.id)
        .single();

      if (accountData) {
        setCurrentAccount(accountData as unknown as Account);
      }

      // Find original membership
      const { data: membershipData } = await supabase
        .from('account_members')
        .select('*')
        .eq('user_id', user?.id)
        .eq('account_id', consultantOriginalOrg.id)
        .maybeSingle();

      if (membershipData) {
        setCurrentMembership(membershipData as AccountMember);
      } else {
        setCurrentMembership({
          id: 'owner-implicit',
          account_id: consultantOriginalOrg.id,
          user_id: user?.id || '',
          role: 'owner',
          created_at: null,
        } as AccountMember);
      }
    }

    setConsultantOriginalOrg(null);
    
    // Invalidate queries to reload data for original organization
    setTimeout(() => {
      queryClient.invalidateQueries();
    }, 0);
  }, [isConsultantMode, consultantOriginalOrg, user, queryClient]);

  return (
    <OrganizationContext.Provider
      value={{
        organizations,
        currentOrganization,
        currentAccount,
        currentMembership,
        loading,
        switchOrganization,
        reloadOrganizations: loadOrganizations,
        // EP Override
        isEPOverride,
        epOverrideOrg,
        setEPOrganization,
        clearEPOverride,
        // Consultant project mode
        isConsultantMode,
        setConsultantProject,
        clearConsultantProject,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
}
