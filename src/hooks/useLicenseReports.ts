import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AccessLevel } from './useAccountLicensedModules';

export interface LicenseSnapshot {
  id: string;
  snapshotDate: string;
  totalAccounts: number;
  fullAccessCount: number;
  viewOnlyCount: number;
  disabledCount: number;
  accountsWithRestrictions: number;
  moduleStats: Record<string, { full: number; view_only: number; disabled: number }>;
}

export interface LicenseDistribution {
  accessLevel: AccessLevel;
  count: number;
  percentage: number;
}

export interface ModuleUsageStats {
  moduleSlug: string;
  moduleName?: string;
  fullCount: number;
  viewOnlyCount: number;
  disabledCount: number;
  totalAccounts: number;
}

export interface ChangeTrend {
  date: string;
  creates: number;
  updates: number;
  templateApplied: number;
  total: number;
}

interface UseLicenseReportsReturn {
  snapshots: LicenseSnapshot[];
  distribution: LicenseDistribution[];
  moduleStats: ModuleUsageStats[];
  changeTrends: ChangeTrend[];
  loading: boolean;
  loadSnapshots: (startDate: Date, endDate: Date) => Promise<void>;
  loadCurrentDistribution: () => Promise<void>;
  loadModuleStats: () => Promise<void>;
  loadChangeTrends: (startDate: Date, endDate: Date) => Promise<void>;
  generateSnapshot: () => Promise<boolean>;
}

const SNAPSHOTS_TABLE = 'license_usage_snapshots';
const LICENSES_TABLE = 'account_licensed_modules';
const HISTORY_TABLE = 'license_change_history';

export function useLicenseReports(): UseLicenseReportsReturn {
  const [snapshots, setSnapshots] = useState<LicenseSnapshot[]>([]);
  const [distribution, setDistribution] = useState<LicenseDistribution[]>([]);
  const [moduleStats, setModuleStats] = useState<ModuleUsageStats[]>([]);
  const [changeTrends, setChangeTrends] = useState<ChangeTrend[]>([]);
  const [loading, setLoading] = useState(false);

  const loadSnapshots = useCallback(async (startDate: Date, endDate: Date) => {
    setLoading(true);
    try {
      const client = supabase as any;

      const { data, error } = await client
        .from(SNAPSHOTS_TABLE)
        .select('*')
        .gte('snapshot_date', startDate.toISOString().split('T')[0])
        .lte('snapshot_date', endDate.toISOString().split('T')[0])
        .order('snapshot_date', { ascending: true });

      if (error) {
        console.error('Error loading snapshots:', error);
        setLoading(false);
        return;
      }

      const snapshotList: LicenseSnapshot[] = (data || []).map((s: any) => ({
        id: s.id,
        snapshotDate: s.snapshot_date,
        totalAccounts: s.total_accounts,
        fullAccessCount: s.full_access_count,
        viewOnlyCount: s.view_only_count,
        disabledCount: s.disabled_count,
        accountsWithRestrictions: s.accounts_with_restrictions,
        moduleStats: s.module_stats || {},
      }));

      setSnapshots(snapshotList);
    } catch (err) {
      console.error('Error in loadSnapshots:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCurrentDistribution = useCallback(async () => {
    setLoading(true);
    try {
      const client = supabase as any;

      // Get total accounts
      const { data: companies, error: companiesError } = await supabase
        .from('companies')
        .select('id')
        .eq('status', 'active');

      const totalAccounts = companies?.length || 0;

      // Get license counts by access level
      const { data: licenses, error: licensesError } = await client
        .from(LICENSES_TABLE)
        .select('access_level');

      if (licensesError) {
        console.error('Error loading licenses:', licensesError);
        setLoading(false);
        return;
      }

      const counts: Record<AccessLevel, number> = {
        full: 0,
        view_only: 0,
        disabled: 0,
      };

      (licenses || []).forEach((l: any) => {
        const level = l.access_level as AccessLevel;
        if (counts[level] !== undefined) {
          counts[level]++;
        }
      });

      const total = counts.full + counts.view_only + counts.disabled || 1;

      const dist: LicenseDistribution[] = [
        { accessLevel: 'full', count: counts.full, percentage: (counts.full / total) * 100 },
        { accessLevel: 'view_only', count: counts.view_only, percentage: (counts.view_only / total) * 100 },
        { accessLevel: 'disabled', count: counts.disabled, percentage: (counts.disabled / total) * 100 },
      ];

      setDistribution(dist);
    } catch (err) {
      console.error('Error in loadCurrentDistribution:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadModuleStats = useCallback(async () => {
    setLoading(true);
    try {
      const client = supabase as any;

      // Get all modules
      const { data: modules, error: modulesError } = await client
        .from('modules')
        .select('slug, name')
        .order('category')
        .order('sort_order');

      if (modulesError) {
        console.error('Error loading modules:', modulesError);
        setLoading(false);
        return;
      }

      // Get total accounts
      const { data: companies } = await supabase
        .from('companies')
        .select('id')
        .eq('status', 'active');

      const totalAccounts = companies?.length || 0;

      // Get license counts per module
      const { data: licenses, error: licensesError } = await client
        .from(LICENSES_TABLE)
        .select('module_slug, access_level');

      if (licensesError) {
        console.error('Error loading licenses:', licensesError);
        setLoading(false);
        return;
      }

      // Group by module
      const moduleMap = new Map<string, { full: number; view_only: number; disabled: number }>();

      (licenses || []).forEach((l: any) => {
        const existing = moduleMap.get(l.module_slug) || { full: 0, view_only: 0, disabled: 0 };
        if (l.access_level === 'full') existing.full++;
        else if (l.access_level === 'view_only') existing.view_only++;
        else if (l.access_level === 'disabled') existing.disabled++;
        moduleMap.set(l.module_slug, existing);
      });

      const stats: ModuleUsageStats[] = (modules || []).map((m: any) => {
        const counts = moduleMap.get(m.slug) || { full: 0, view_only: 0, disabled: 0 };
        // Accounts without explicit licenses have full access
        const explicitRestrictions = counts.view_only + counts.disabled;
        
        return {
          moduleSlug: m.slug,
          moduleName: m.name,
          fullCount: totalAccounts - explicitRestrictions,
          viewOnlyCount: counts.view_only,
          disabledCount: counts.disabled,
          totalAccounts,
        };
      });

      setModuleStats(stats);
    } catch (err) {
      console.error('Error in loadModuleStats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadChangeTrends = useCallback(async (startDate: Date, endDate: Date) => {
    setLoading(true);
    try {
      const client = supabase as any;

      const { data, error } = await client
        .from(HISTORY_TABLE)
        .select('changed_at, change_type')
        .gte('changed_at', startDate.toISOString())
        .lte('changed_at', endDate.toISOString())
        .order('changed_at', { ascending: true });

      if (error) {
        console.error('Error loading change history:', error);
        setLoading(false);
        return;
      }

      // Group by date
      const dateMap = new Map<string, ChangeTrend>();

      (data || []).forEach((h: any) => {
        const date = h.changed_at.split('T')[0];
        const existing = dateMap.get(date) || {
          date,
          creates: 0,
          updates: 0,
          templateApplied: 0,
          total: 0,
        };

        if (h.change_type === 'create') existing.creates++;
        else if (h.change_type === 'update') existing.updates++;
        else if (h.change_type === 'template_applied') existing.templateApplied++;
        
        existing.total++;
        dateMap.set(date, existing);
      });

      // Fill in missing dates
      const trends: ChangeTrend[] = [];
      const current = new Date(startDate);
      while (current <= endDate) {
        const dateStr = current.toISOString().split('T')[0];
        trends.push(dateMap.get(dateStr) || {
          date: dateStr,
          creates: 0,
          updates: 0,
          templateApplied: 0,
          total: 0,
        });
        current.setDate(current.getDate() + 1);
      }

      setChangeTrends(trends);
    } catch (err) {
      console.error('Error in loadChangeTrends:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const generateSnapshot = useCallback(async (): Promise<boolean> => {
    try {
      const client = supabase as any;

      const { error } = await client.rpc('generate_license_snapshot');

      if (error) {
        console.error('Error generating snapshot:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Error in generateSnapshot:', err);
      return false;
    }
  }, []);

  return {
    snapshots,
    distribution,
    moduleStats,
    changeTrends,
    loading,
    loadSnapshots,
    loadCurrentDistribution,
    loadModuleStats,
    loadChangeTrends,
    generateSnapshot,
  };
}
