import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useOrganization } from '@/contexts/OrganizationContext';

export interface SearchTemplate {
  id: string;
  account_id: string;
  name: string;
  category: string | null;
  boolean_query: string;
  filters: Record<string, unknown>;
  usage_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useSearchTemplates() {
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();
  const [templates, setTemplates] = useState<SearchTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchTemplates = useCallback(async () => {
    if (!currentOrganization?.id) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('hunting_search_templates')
        .select('*')
        .eq('account_id', currentOrganization.id)
        .order('usage_count', { ascending: false });
      if (error) throw error;
      setTemplates((data || []) as SearchTemplate[]);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentOrganization?.id]);

  const createTemplate = useCallback(async (params: {
    name: string;
    category?: string;
    boolean_query: string;
    filters?: Record<string, unknown>;
  }) => {
    if (!currentOrganization?.id) return null;
    try {
      const { data: session } = await supabase.auth.getSession();
      const { data, error } = await supabase
        .from('hunting_search_templates')
        .insert({
          account_id: currentOrganization.id,
          name: params.name,
          category: params.category || null,
          boolean_query: params.boolean_query,
          filters: params.filters || {},
          created_by: session.session?.user?.id || null,
        } as any)
        .select()
        .single();
      if (error) throw error;
      toast({ title: 'Template salvo com sucesso' });
      await fetchTemplates();
      return data as SearchTemplate;
    } catch (error) {
      console.error('Error creating template:', error);
      toast({ title: 'Erro ao salvar template', variant: 'destructive' });
      return null;
    }
  }, [currentOrganization?.id, toast, fetchTemplates]);

  const deleteTemplate = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('hunting_search_templates')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast({ title: 'Template removido' });
      await fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({ title: 'Erro ao remover template', variant: 'destructive' });
    }
  }, [toast, fetchTemplates]);

  const incrementUsage = useCallback(async (id: string) => {
    try {
      const template = templates.find(t => t.id === id);
      if (!template) return;
      await supabase
        .from('hunting_search_templates')
        .update({ usage_count: template.usage_count + 1 } as any)
        .eq('id', id);
    } catch (error) {
      console.error('Error incrementing usage:', error);
    }
  }, [templates]);

  return {
    templates,
    isLoading,
    fetchTemplates,
    createTemplate,
    deleteTemplate,
    incrementUsage,
  };
}
