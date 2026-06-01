import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AccessLevel } from './useAccountLicensedModules';

export interface ExpiringLicense {
  id: string;
  accountId: string;
  accountName: string;
  moduleSlug: string;
  accessLevel: AccessLevel;
  expiresAt: string;
  expirationNotifiedAt: string | null;
  daysUntilExpiration: number;
}

export interface LicenseWithExpiration {
  id: string;
  accountId: string;
  moduleSlug: string;
  accessLevel: AccessLevel;
  expiresAt: string | null;
  configuredBy: string | null;
  updatedAt: string | null;
}

interface UseLicenseExpirationReturn {
  expiringLicenses: ExpiringLicense[];
  loading: boolean;
  loadExpiringLicenses: (daysAhead?: number) => Promise<void>;
  setLicenseExpiration: (
    accountId: string,
    moduleSlug: string,
    expiresAt: Date | null
  ) => Promise<boolean>;
  markNotified: (licenseId: string) => Promise<boolean>;
  getExpirationStatus: (expiresAt: string | null) => 'none' | 'warning' | 'critical' | 'expired';
}

const TABLE_NAME = 'account_licensed_modules';

export function useLicenseExpiration(): UseLicenseExpirationReturn {
  const [expiringLicenses, setExpiringLicenses] = useState<ExpiringLicense[]>([]);
  const [loading, setLoading] = useState(false);

  const loadExpiringLicenses = useCallback(async (daysAhead: number = 30) => {
    setLoading(true);
    try {
      const client = supabase as any;
      const now = new Date();
      const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

      const { data, error } = await client
        .from(TABLE_NAME)
        .select('id, account_id, module_slug, access_level, expires_at, expiration_notified_at')
        .not('expires_at', 'is', null)
        .gt('expires_at', now.toISOString())
        .lte('expires_at', futureDate.toISOString())
        .order('expires_at', { ascending: true });

      if (error) {
        console.error('Error loading expiring licenses:', error);
        setLoading(false);
        return;
      }

      // Get account names
      const accountIds = [...new Set((data || []).map((l: any) => l.account_id))] as string[];
      
      const { data: companies } = await supabase
        .from('companies')
        .select('id, name')
        .in('id', accountIds);

      const companyMap = new Map<string, string>();
      (companies || []).forEach((c: any) => {
        companyMap.set(c.id, c.name);
      });

      const licenses: ExpiringLicense[] = (data || []).map((l: any) => {
        const expiresAt = new Date(l.expires_at);
        const daysUntil = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        return {
          id: l.id,
          accountId: l.account_id,
          accountName: companyMap.get(l.account_id) || 'Empresa',
          moduleSlug: l.module_slug,
          accessLevel: l.access_level as AccessLevel,
          expiresAt: l.expires_at,
          expirationNotifiedAt: l.expiration_notified_at,
          daysUntilExpiration: daysUntil,
        };
      });

      setExpiringLicenses(licenses);
    } catch (err) {
      console.error('Error in loadExpiringLicenses:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const setLicenseExpiration = useCallback(async (
    accountId: string,
    moduleSlug: string,
    expiresAt: Date | null
  ): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) return false;

      const client = supabase as any;

      const { error } = await client
        .from(TABLE_NAME)
        .upsert({
          account_id: accountId,
          module_slug: moduleSlug,
          expires_at: expiresAt?.toISOString() || null,
          configured_by: user.id,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'account_id,module_slug' });

      if (error) {
        console.error('Error setting expiration:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Error in setLicenseExpiration:', err);
      return false;
    }
  }, []);

  const markNotified = useCallback(async (licenseId: string): Promise<boolean> => {
    try {
      const client = supabase as any;

      const { error } = await client
        .from(TABLE_NAME)
        .update({ expiration_notified_at: new Date().toISOString() })
        .eq('id', licenseId);

      if (error) {
        console.error('Error marking notified:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Error in markNotified:', err);
      return false;
    }
  }, []);

  const getExpirationStatus = useCallback((expiresAt: string | null): 'none' | 'warning' | 'critical' | 'expired' => {
    if (!expiresAt) return 'none';

    const now = new Date();
    const expDate = new Date(expiresAt);
    const daysUntil = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntil <= 0) return 'expired';
    if (daysUntil <= 7) return 'critical';
    if (daysUntil <= 30) return 'warning';
    return 'none';
  }, []);

  return {
    expiringLicenses,
    loading,
    loadExpiringLicenses,
    setLicenseExpiration,
    markNotified,
    getExpirationStatus,
  };
}
