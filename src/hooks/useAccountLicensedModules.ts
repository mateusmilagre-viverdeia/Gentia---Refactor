import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAccount } from '@/hooks/useAccount';

export type AccessLevel = 'full' | 'view_only' | 'disabled';

export interface LicensedModule {
  moduleSlug: string;
  moduleName: string;
  moduleCategory: string;
  accessLevel: AccessLevel;
  configuredBy?: string;
  updatedAt?: string;
}

export interface ModuleCategory {
  category: string;
  label: string;
  icon: string;
  modules: LicensedModule[];
}

interface UseAccountLicensedModulesReturn {
  // State
  loading: boolean;
  licenses: LicensedModule[];
  licensesGrouped: ModuleCategory[];
  
  // For consultant: manage client licenses
  loadLicenses: (accountId: string) => Promise<void>;
  updateModuleLicense: (accountId: string, moduleSlug: string, accessLevel: AccessLevel) => Promise<boolean>;
  updateCategoryLicense: (accountId: string, category: string, accessLevel: AccessLevel) => Promise<boolean>;
  resetToDefault: (accountId: string) => Promise<boolean>;
  
  // For client: check own access
  getMyAccessLevel: (moduleSlug: string) => AccessLevel;
  canEdit: (moduleSlug: string) => boolean;
  isDisabled: (moduleSlug: string) => boolean;
  isViewOnly: (moduleSlug: string) => boolean;
}

const CATEGORY_CONFIG: Record<string, { label: string; icon: string }> = {
  cultura: { label: 'Cultura', icon: '🎯' },
  diagnostico: { label: 'Diagnóstico', icon: '📊' },
  atracao: { label: 'Atração', icon: '🎯' },
  contratacao: { label: 'Contratação', icon: '📋' },
  retencao: { label: 'Retenção', icon: '🔒' },
  conta: { label: 'Conta', icon: '⚙️' },
};

// Type assertion helper for new table not yet in types
const TABLE_NAME = 'account_licensed_modules';

async function queryLicenses(accountId: string) {
  const client = supabase as any;
  return client.from(TABLE_NAME).select('*').eq('account_id', accountId);
}

async function upsertLicense(data: any) {
  const client = supabase as any;
  return client.from(TABLE_NAME).upsert(data, { onConflict: 'account_id,module_slug' });
}

async function deleteLicenses(accountId: string) {
  const client = supabase as any;
  return client.from(TABLE_NAME).delete().eq('account_id', accountId);
}

export function useAccountLicensedModules(): UseAccountLicensedModulesReturn {
  const { user } = useAuth();
  const { account } = useAccount();
  const [loading, setLoading] = useState(false);
  const [licenses, setLicenses] = useState<LicensedModule[]>([]);
  const [myLicenses, setMyLicenses] = useState<Map<string, AccessLevel>>(new Map());

  // Load licenses for current account (for client use)
  useEffect(() => {
    async function loadMyLicenses() {
      if (!account?.id) return;

      try {
        const { data: licensesData, error: licensesError } = await queryLicenses(account.id);

        const licenseMap = new Map<string, AccessLevel>();
        
        if (!licensesError && licensesData) {
          (licensesData as any[]).forEach((row: any) => {
            licenseMap.set(row.module_slug, row.access_level as AccessLevel);
          });
        }
        
        setMyLicenses(licenseMap);
      } catch (err) {
        console.error('Error in loadMyLicenses:', err);
      }
    }

    loadMyLicenses();
  }, [account?.id]);

  // Load licenses for a specific account (for consultant use)
  const loadLicenses = useCallback(async (accountId: string) => {
    setLoading(true);
    try {
      // Get all active modules
      const modulesClient = supabase as any;
      const { data: modules, error: modulesError } = await modulesClient
        .from('modules')
        .select('slug, name, category')
        .order('category')
        .order('sort_order');

      if (modulesError) {
        console.error('Error loading modules:', modulesError);
        setLoading(false);
        return;
      }

      // Get licenses for this account
      const { data: licensesData, error: licensesError } = await queryLicenses(accountId);

      const licenseMap = new Map<string, any>();
      if (!licensesError && licensesData) {
        (licensesData as any[]).forEach((row: any) => {
          licenseMap.set(row.module_slug, row);
        });
      }

      // Combine modules with their licenses
      const licensedModules: LicensedModule[] = (modules || []).map((module) => {
        const license = licenseMap.get(module.slug);
        return {
          moduleSlug: module.slug,
          moduleName: module.name,
          moduleCategory: module.category,
          accessLevel: (license?.access_level || 'full') as AccessLevel,
          configuredBy: license?.configured_by,
          updatedAt: license?.updated_at,
        };
      });

      setLicenses(licensedModules);
    } catch (err) {
      console.error('Error in loadLicenses:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Update a single module license
  const updateModuleLicense = useCallback(async (
    accountId: string, 
    moduleSlug: string, 
    accessLevel: AccessLevel
  ): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const { error } = await upsertLicense({
        account_id: accountId,
        module_slug: moduleSlug,
        access_level: accessLevel,
        configured_by: user.id,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        console.error('Error updating license:', error);
        return false;
      }

      // Refresh licenses
      await loadLicenses(accountId);
      return true;
    } catch (err) {
      console.error('Error in updateModuleLicense:', err);
      return false;
    }
  }, [user?.id, loadLicenses]);

  // Update all modules in a category
  const updateCategoryLicense = useCallback(async (
    accountId: string, 
    category: string, 
    accessLevel: AccessLevel
  ): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      // Get all modules for this category
      const modulesClient = supabase as any;
      const { data: modules, error: modulesError } = await modulesClient
        .from('modules')
        .select('slug')
        .eq('category', category);

      if (modulesError || !modules || modules.length === 0) {
        console.error('Error loading category modules:', modulesError);
        return false;
      }

      // Update all at once
      const updates = modules.map((m: any) => ({
        account_id: accountId,
        module_slug: m.slug,
        access_level: accessLevel,
        configured_by: user.id,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await upsertLicense(updates);

      if (error) {
        console.error('Error updating category licenses:', error);
        return false;
      }

      await loadLicenses(accountId);
      return true;
    } catch (err) {
      console.error('Error in updateCategoryLicense:', err);
      return false;
    }
  }, [user?.id, loadLicenses]);

  // Reset all licenses to default (full)
  const resetToDefault = useCallback(async (accountId: string): Promise<boolean> => {
    try {
      const { error } = await deleteLicenses(accountId);

      if (error) {
        console.error('Error resetting licenses:', error);
        return false;
      }

      await loadLicenses(accountId);
      return true;
    } catch (err) {
      console.error('Error in resetToDefault:', err);
      return false;
    }
  }, [loadLicenses]);

  // Get access level for a module (for current account)
  const getMyAccessLevel = useCallback((moduleSlug: string): AccessLevel => {
    return myLicenses.get(moduleSlug) || 'full';
  }, [myLicenses]);

  // Check if user can edit this module
  const canEdit = useCallback((moduleSlug: string): boolean => {
    const level = getMyAccessLevel(moduleSlug);
    return level === 'full';
  }, [getMyAccessLevel]);

  // Check if module is disabled
  const isDisabled = useCallback((moduleSlug: string): boolean => {
    const level = getMyAccessLevel(moduleSlug);
    return level === 'disabled';
  }, [getMyAccessLevel]);

  // Check if module is view only
  const isViewOnly = useCallback((moduleSlug: string): boolean => {
    const level = getMyAccessLevel(moduleSlug);
    return level === 'view_only';
  }, [getMyAccessLevel]);

  // Group licenses by category
  const licensesGrouped: ModuleCategory[] = Object.entries(CATEGORY_CONFIG)
    .map(([category, config]) => ({
      category,
      label: config.label,
      icon: config.icon,
      modules: licenses.filter(m => m.moduleCategory === category),
    }))
    .filter(group => group.modules.length > 0);

  return {
    loading,
    licenses,
    licensesGrouped,
    loadLicenses,
    updateModuleLicense,
    updateCategoryLicense,
    resetToDefault,
    getMyAccessLevel,
    canEdit,
    isDisabled,
    isViewOnly,
  };
}
