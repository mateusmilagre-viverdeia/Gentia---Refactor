import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';
import type { JobDescription, JobDescriptionFormData, CustomField, IdealDiscProfile } from '@/types/job-description.types';

interface OrgNode {
  id: string;
  title: string;
  roles: string[] | null;
  parent_id: string | null;
}

interface CultureContext {
  mission?: string;
  vision?: string;
  sellingCompanyContent?: string;
  values?: string[];
}

interface SuggestionContext {
  area?: string;
  mission?: string;
  indicators?: string[];
}

export function useJobDescriptions() {
  const { currentAccount: account } = useOrganization();
  const [jobDescriptions, setJobDescriptions] = useState<JobDescription[]>([]);
  const [orgNodes, setOrgNodes] = useState<OrgNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [cultureContext, setCultureContext] = useState<CultureContext>({});

  // Load job descriptions
  useEffect(() => {
    if (account?.id) {
      loadJobDescriptions();
      loadOrgNodes();
      loadCultureContext();
    }
  }, [account?.id]);

  const loadJobDescriptions = async () => {
    if (!account?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('job_descriptions')
        .select('*')
        .eq('account_id', account.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      
      setJobDescriptions((data || []).map(jd => ({
        ...jd,
        development: Array.isArray(jd.development) ? jd.development : (jd.development ? [jd.development] : []),
        custom_fields: Array.isArray(jd.custom_fields) ? jd.custom_fields as unknown as CustomField[] : [],
        ai_suggestions: (jd.ai_suggestions || {}) as Record<string, unknown>,
        ideal_disc_profile: (jd.ideal_disc_profile as unknown as IdealDiscProfile) || null,
      })) as unknown as JobDescription[]);
    } catch (error) {
      console.error('Error loading job descriptions:', error);
      toast.error('Erro ao carregar job descriptions');
    } finally {
      setLoading(false);
    }
  };

  const loadOrgNodes = async () => {
    if (!account?.id) return;

    try {
      // First get the default org chart
      const { data: charts } = await supabase
        .from('org_charts')
        .select('id')
        .eq('account_id', account.id)
        .eq('is_default', true)
        .maybeSingle();

      if (!charts?.id) return;

      const { data: nodes, error } = await supabase
        .from('org_chart_nodes')
        .select('id, title, roles, parent_id')
        .eq('chart_id', charts.id);

      if (error) throw error;
      setOrgNodes(nodes || []);
    } catch (error) {
      console.error('Error loading org nodes:', error);
    }
  };

  const loadCultureContext = async () => {
    if (!account?.id) return;

    try {
      // Load mission
      const { data: missionData } = await supabase
        .from('mission_sessions')
        .select('analysis')
        .eq('account_id', account.id)
        .maybeSingle();

      // Load vision
      const { data: visionData } = await supabase
        .from('vision_sessions')
        .select('final_vision')
        .eq('account_id', account.id)
        .maybeSingle();

      // Load selling company content (approved version)
      const { data: sellingSession } = await supabase
        .from('selling_company_sessions')
        .select('id')
        .eq('account_id', account.id)
        .maybeSingle();

      let sellingCompanyContent = '';
      if (sellingSession?.id) {
        const { data: sellingVersion } = await supabase
          .from('selling_company_versions')
          .select('content')
          .eq('session_id', sellingSession.id)
          .eq('approved', true)
          .maybeSingle();
        sellingCompanyContent = sellingVersion?.content || '';
      }

      // Load values
      const { data: valuesSession } = await supabase
        .from('values_sessions')
        .select('id')
        .eq('account_id', account.id)
        .maybeSingle();

      let values: string[] = [];
      if (valuesSession?.id) {
        const { data: behaviors } = await supabase
          .from('values_behaviors_selections')
          .select('value_label')
          .eq('session_id', valuesSession.id);
        values = behaviors?.map(b => b.value_label) || [];
      }

      setCultureContext({
        mission: (missionData?.analysis as any)?.mission || '',
        vision: visionData?.final_vision || '',
        sellingCompanyContent,
        values,
      });
    } catch (error) {
      console.error('Error loading culture context:', error);
    }
  };

  const createJobDescription = useCallback(async (orgNodeId?: string) => {
    if (!account?.id) return null;

    let title = 'Novo Cargo';
    let responsibilities: string[] = [];
    let area = '';

    // If from org chart, pre-populate
    if (orgNodeId) {
      const node = orgNodes.find(n => n.id === orgNodeId);
      if (node) {
        title = node.title;
        responsibilities = node.roles || [];
        // Get area from parent node
        if (node.parent_id) {
          const parent = orgNodes.find(n => n.id === node.parent_id);
          area = parent?.title || '';
        }
      }
    }

    try {
      const { data, error } = await supabase
        .from('job_descriptions')
        .insert([{
          account_id: account.id,
          org_node_id: orgNodeId || null,
          title,
          responsibilities,
          area,
          development: [],
          status: 'draft',
          wizard_step: 1,
        }])
        .select()
        .single();

      if (error) throw error;

      const newJd = {
        ...data,
        development: Array.isArray(data.development) ? data.development : [],
        custom_fields: [],
        ideal_disc_profile: null,
      } as unknown as JobDescription;

      setJobDescriptions(prev => [newJd, ...prev]);
      toast.success('Job description criado!');
      return newJd;
    } catch (error: any) {
      console.error('Error creating job description:', error?.message || error, error);
      toast.error(`Erro ao criar job description: ${error?.message || 'verifique o console para detalhes'}`);
      return null;
    }
  }, [account?.id, orgNodes]);

  const updateJobDescription = useCallback(async (
    id: string,
    updates: Partial<JobDescription>
  ) => {
    try {
      const { custom_fields, ai_suggestions, ...rest } = updates;
      const dbUpdates: Record<string, unknown> = {
        ...rest,
        updated_at: new Date().toISOString(),
      };
      if (custom_fields !== undefined) {
        dbUpdates.custom_fields = custom_fields;
      }
      
      const { error } = await supabase
        .from('job_descriptions')
        .update(dbUpdates)
        .eq('id', id);

      if (error) throw error;

      setJobDescriptions(prev => 
        prev.map(jd => jd.id === id ? { ...jd, ...updates } : jd)
      );
      return true;
    } catch (error) {
      console.error('Error updating job description:', error);
      toast.error('Erro ao atualizar');
      return false;
    }
  }, []);

  const duplicateJobDescription = useCallback(async (id: string) => {
    const original = jobDescriptions.find(jd => jd.id === id);
    if (!original || !account?.id) return null;

    try {
      const { data, error } = await supabase
        .from('job_descriptions')
        .insert([{
          account_id: account.id,
          org_node_id: null,
          title: `${original.title} (Cópia)`,
          mission: original.mission,
          indicators: original.indicators,
          responsibilities: original.responsibilities,
          required_skills: original.required_skills,
          desired_skills: original.desired_skills,
          behavioral_competencies: original.behavioral_competencies,
          development: original.development,
          benefits: original.benefits,
          custom_fields: original.custom_fields as unknown as Json,
          area: original.area,
          status: 'draft' as const,
          wizard_step: 10,
        }])
        .select()
        .single();

      if (error) throw error;

      const newJd = {
        ...data,
        development: Array.isArray(data.development) ? data.development : [],
        custom_fields: original.custom_fields,
        ideal_disc_profile: (original.ideal_disc_profile as unknown as IdealDiscProfile) || null,
      } as unknown as JobDescription;

      setJobDescriptions(prev => [newJd, ...prev]);
      toast.success('Job description duplicado!');
      return newJd;
    } catch (error) {
      console.error('Error duplicating job description:', error);
      toast.error('Erro ao duplicar');
      return null;
    }
  }, [account?.id, jobDescriptions]);

  const deleteJobDescription = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('job_descriptions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setJobDescriptions(prev => prev.filter(jd => jd.id !== id));
      toast.success('Job description excluído!');
      return true;
    } catch (error) {
      console.error('Error deleting job description:', error);
      toast.error('Erro ao excluir');
      return false;
    }
  }, []);

  const archiveJobDescription = useCallback(async (id: string) => {
    return updateJobDescription(id, { status: 'archived' });
  }, [updateJobDescription]);

  const approveJobDescription = useCallback(async (id: string) => {
    return updateJobDescription(id, { status: 'approved', wizard_step: 10 });
  }, [updateJobDescription]);

  const getSuggestion = useCallback(async (
    field: string,
    jobTitle: string,
    responsibilities: string[],
    context?: SuggestionContext
  ) => {
    try {
      const { data, error } = await supabase.functions.invoke('suggest-job-description', {
        body: {
          field,
          jobTitle,
          responsibilities,
          area: context?.area,
          mission: context?.mission,
          indicators: context?.indicators,
          companyMission: cultureContext.mission,
          companyVision: cultureContext.vision,
          sellingCompanyContent: cultureContext.sellingCompanyContent,
          existingValues: cultureContext.values,
        },
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting suggestion:', error);
      toast.error('Erro ao gerar sugestão');
      return null;
    }
  }, [cultureContext]);

  // Get areas for filtering
  const areas = Array.from(new Set(jobDescriptions.map(jd => jd.area).filter(Boolean))) as string[];

  // Get org nodes that don't have a job description yet
  const availableOrgNodes = orgNodes.filter(
    node => !jobDescriptions.some(jd => jd.org_node_id === node.id)
  );

  return {
    jobDescriptions,
    orgNodes,
    availableOrgNodes,
    loading,
    cultureContext,
    areas,
    createJobDescription,
    updateJobDescription,
    duplicateJobDescription,
    deleteJobDescription,
    archiveJobDescription,
    approveJobDescription,
    getSuggestion,
    reload: loadJobDescriptions,
  };
}
