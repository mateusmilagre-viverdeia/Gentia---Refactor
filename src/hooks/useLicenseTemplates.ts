import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AccessLevel } from './useAccountLicensedModules';

export interface LicenseTemplate {
  id: string;
  name: string;
  description: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  isDefault: boolean;
  modules: TemplateModule[];
}

export interface TemplateModule {
  moduleSlug: string;
  accessLevel: AccessLevel;
}

interface UseLicenseTemplatesReturn {
  templates: LicenseTemplate[];
  loading: boolean;
  loadTemplates: () => Promise<void>;
  createTemplate: (name: string, description: string, modules: TemplateModule[]) => Promise<boolean>;
  updateTemplate: (id: string, name: string, description: string, modules: TemplateModule[]) => Promise<boolean>;
  deleteTemplate: (id: string) => Promise<boolean>;
  createFromAccount: (accountId: string, name: string, description: string) => Promise<boolean>;
  getTemplate: (id: string) => LicenseTemplate | undefined;
}

// Type assertion for new tables
const TEMPLATES_TABLE = 'license_templates';
const TEMPLATE_MODULES_TABLE = 'license_template_modules';

export function useLicenseTemplates(): UseLicenseTemplatesReturn {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<LicenseTemplate[]>([]);
  const [loading, setLoading] = useState(false);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const client = supabase as any;
      
      // Load templates
      const { data: templatesData, error: templatesError } = await client
        .from(TEMPLATES_TABLE)
        .select('*')
        .order('is_default', { ascending: false })
        .order('name');

      if (templatesError) {
        console.error('Error loading templates:', templatesError);
        setLoading(false);
        return;
      }

      // Load all template modules
      const { data: modulesData, error: modulesError } = await client
        .from(TEMPLATE_MODULES_TABLE)
        .select('*');

      if (modulesError) {
        console.error('Error loading template modules:', modulesError);
        setLoading(false);
        return;
      }

      // Group modules by template
      const modulesByTemplate = new Map<string, TemplateModule[]>();
      (modulesData || []).forEach((m: any) => {
        const existing = modulesByTemplate.get(m.template_id) || [];
        existing.push({
          moduleSlug: m.module_slug,
          accessLevel: m.access_level as AccessLevel,
        });
        modulesByTemplate.set(m.template_id, existing);
      });

      // Combine templates with their modules
      const combinedTemplates: LicenseTemplate[] = (templatesData || []).map((t: any) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        createdBy: t.created_by,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
        isDefault: t.is_default,
        modules: modulesByTemplate.get(t.id) || [],
      }));

      setTemplates(combinedTemplates);
    } catch (err) {
      console.error('Error in loadTemplates:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createTemplate = useCallback(async (
    name: string,
    description: string,
    modules: TemplateModule[]
  ): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const client = supabase as any;

      // Create template
      const { data: templateData, error: templateError } = await client
        .from(TEMPLATES_TABLE)
        .insert({
          name,
          description,
          created_by: user.id,
        })
        .select()
        .single();

      if (templateError || !templateData) {
        console.error('Error creating template:', templateError);
        return false;
      }

      // Create template modules
      if (modules.length > 0) {
        const moduleInserts = modules.map(m => ({
          template_id: templateData.id,
          module_slug: m.moduleSlug,
          access_level: m.accessLevel,
        }));

        const { error: modulesError } = await client
          .from(TEMPLATE_MODULES_TABLE)
          .insert(moduleInserts);

        if (modulesError) {
          console.error('Error creating template modules:', modulesError);
          // Rollback template
          await client.from(TEMPLATES_TABLE).delete().eq('id', templateData.id);
          return false;
        }
      }

      await loadTemplates();
      return true;
    } catch (err) {
      console.error('Error in createTemplate:', err);
      return false;
    }
  }, [user?.id, loadTemplates]);

  const updateTemplate = useCallback(async (
    id: string,
    name: string,
    description: string,
    modules: TemplateModule[]
  ): Promise<boolean> => {
    try {
      const client = supabase as any;

      // Update template
      const { error: templateError } = await client
        .from(TEMPLATES_TABLE)
        .update({ name, description, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (templateError) {
        console.error('Error updating template:', templateError);
        return false;
      }

      // Delete existing modules and recreate
      await client.from(TEMPLATE_MODULES_TABLE).delete().eq('template_id', id);

      if (modules.length > 0) {
        const moduleInserts = modules.map(m => ({
          template_id: id,
          module_slug: m.moduleSlug,
          access_level: m.accessLevel,
        }));

        const { error: modulesError } = await client
          .from(TEMPLATE_MODULES_TABLE)
          .insert(moduleInserts);

        if (modulesError) {
          console.error('Error updating template modules:', modulesError);
          return false;
        }
      }

      await loadTemplates();
      return true;
    } catch (err) {
      console.error('Error in updateTemplate:', err);
      return false;
    }
  }, [loadTemplates]);

  const deleteTemplate = useCallback(async (id: string): Promise<boolean> => {
    try {
      const client = supabase as any;

      const { error } = await client
        .from(TEMPLATES_TABLE)
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting template:', error);
        return false;
      }

      await loadTemplates();
      return true;
    } catch (err) {
      console.error('Error in deleteTemplate:', err);
      return false;
    }
  }, [loadTemplates]);

  const createFromAccount = useCallback(async (
    accountId: string,
    name: string,
    description: string
  ): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const client = supabase as any;

      // Get current licenses for the account
      const { data: licensesData, error: licensesError } = await client
        .from('account_licensed_modules')
        .select('module_slug, access_level')
        .eq('account_id', accountId);

      if (licensesError) {
        console.error('Error loading account licenses:', licensesError);
        return false;
      }

      // Get all modules to fill in defaults
      const { data: allModules, error: modulesError } = await client
        .from('modules')
        .select('slug');

      if (modulesError) {
        console.error('Error loading modules:', modulesError);
        return false;
      }

      // Create license map
      const licenseMap = new Map<string, AccessLevel>();
      (licensesData || []).forEach((l: any) => {
        licenseMap.set(l.module_slug, l.access_level as AccessLevel);
      });

      // Create modules array with all modules
      const modules: TemplateModule[] = (allModules || []).map((m: any) => ({
        moduleSlug: m.slug,
        accessLevel: licenseMap.get(m.slug) || 'full',
      }));

      return await createTemplate(name, description, modules);
    } catch (err) {
      console.error('Error in createFromAccount:', err);
      return false;
    }
  }, [user?.id, createTemplate]);

  const getTemplate = useCallback((id: string): LicenseTemplate | undefined => {
    return templates.find(t => t.id === id);
  }, [templates]);

  return {
    templates,
    loading,
    loadTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    createFromAccount,
    getTemplate,
  };
}
