import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface CompanyProgress {
  company_id: string;
  company_name: string;
  company_slug: string | null;
  member_count: number;
  mission_stage: number | null;
  vision_stage: number | null;
  values_stage: number | null;
  indicators_stage: number | null;
  decision_stage: number | null;
  energy_stage: number | null;
  development_stage: number | null;
  event_stage: number | null;
  ritual_stage: number | null;
  company_created_at: string;
  last_activity: string | null;
}

export interface CompanyMember {
  id: string;
  user_id: string;
  role: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
}

export interface CompanyDetails {
  company: any;
  members: CompanyMember[] | null;
  mission: any | null;
  vision: any | null;
  values: any | null;
  indicators: any | null;
  decision: any | null;
  energy: any | null;
  development: any | null;
  event: any | null;
  ritual: any | null;
}

export interface ValuesDetail {
  session: any;
  final_values: Array<{ value_id: string; label: string; position: number }> | null;
  behaviors: Array<{
    value_label: string;
    do_selected: string[];
    dont_selected: string[];
  }> | null;
}

export interface DecisionDetail {
  session: any;
  answers: Array<{
    question_number: number;
    answer_text: string;
    is_suggestion: boolean;
  }> | null;
}

export interface ProjectsDetail {
  id: string;
  project_name: string;
  description: string | null;
  perspective: string;
  importance: string | null;
  linked_indicator: string[] | null;
  responsible: string | null;
  involved_members: string[] | null;
  start_quarter: string | null;
  segment: string | null;
  is_custom: boolean;
}

export interface EnergyDetail {
  session: any;
  selections: Array<{
    item_id: string;
    phase: number;
    label: string;
    category: string;
    category_label: string;
  }> | null;
}

export interface DevelopmentDetail {
  session: any;
  selections: Array<{
    item_id: string;
    phase: number;
    label: string;
    category: string;
    category_label: string;
  }> | null;
}

export interface EventDetail {
  session: any;
  items: Array<{
    id: string;
    pillar_number: number;
    item_text: string;
    source: string;
  }> | null;
}

export interface RitualDetail {
  session: any;
  items: Array<{
    id: string;
    pillar_number: number;
    item_text: string;
    source: string;
  }> | null;
}

export interface IndicatorsDetail {
  id: string;
  segment: string;
  selected_step1: Record<string, string[]> | null;
  final_selection: string[] | null;
  stage: number | null;
}

export function useAdminDashboard() {
  const { user } = useAuth();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [companies, setCompanies] = useState<CompanyProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkSuperAdmin = useCallback(async () => {
    if (!user) return false;
    
    const { data, error } = await supabase.rpc('is_super_admin', { _user_id: user.id });
    if (error) {
      console.error('Error checking super admin:', error);
      return false;
    }
    return data === true;
  }, [user]);

  const loadCompanies = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const isAdmin = await checkSuperAdmin();
      setIsSuperAdmin(isAdmin);

      if (!isAdmin) {
        setCompanies([]);
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase.rpc('get_all_companies_progress');
      
      if (fetchError) {
        console.error('Error fetching companies:', fetchError);
        setError('Erro ao carregar empresas');
        return;
      }

      setCompanies(data || []);
    } catch (err) {
      console.error('Error in loadCompanies:', err);
      setError('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, [user, checkSuperAdmin]);

  const getCompanyDetails = useCallback(async (companyId: string): Promise<CompanyDetails | null> => {
    const { data, error } = await supabase.rpc('get_company_details', { _company_id: companyId });
    if (error) {
      console.error('Error fetching company details:', error);
      return null;
    }
    return data as unknown as CompanyDetails;
  }, []);

  const getValuesDetail = useCallback(async (companyId: string): Promise<ValuesDetail | null> => {
    const { data, error } = await supabase.rpc('get_company_values_detail', { _company_id: companyId });
    if (error) {
      console.error('Error fetching values detail:', error);
      return null;
    }
    return data as unknown as ValuesDetail;
  }, []);

  const getDecisionDetail = useCallback(async (companyId: string): Promise<DecisionDetail | null> => {
    const { data, error } = await supabase.rpc('get_company_decision_detail', { _company_id: companyId });
    if (error) {
      console.error('Error fetching decision detail:', error);
      return null;
    }
    return data as unknown as DecisionDetail;
  }, []);

  const getProjectsDetail = useCallback(async (companyId: string): Promise<ProjectsDetail[] | null> => {
    const { data, error } = await supabase.rpc('get_company_projects_detail', { _company_id: companyId });
    if (error) {
      console.error('Error fetching projects detail:', error);
      return null;
    }
    return data as unknown as ProjectsDetail[];
  }, []);

  const getEnergyDetail = useCallback(async (companyId: string): Promise<EnergyDetail | null> => {
    const { data, error } = await supabase.rpc('get_company_energy_detail', { _company_id: companyId });
    if (error) {
      console.error('Error fetching energy detail:', error);
      return null;
    }
    return data as unknown as EnergyDetail;
  }, []);

  const getDevelopmentDetail = useCallback(async (companyId: string): Promise<DevelopmentDetail | null> => {
    const { data, error } = await supabase.rpc('get_company_development_detail', { _company_id: companyId });
    if (error) {
      console.error('Error fetching development detail:', error);
      return null;
    }
    return data as unknown as DevelopmentDetail;
  }, []);

  const getEventDetail = useCallback(async (companyId: string): Promise<EventDetail | null> => {
    const { data, error } = await supabase.rpc('get_company_event_detail', { _company_id: companyId });
    if (error) {
      console.error('Error fetching event detail:', error);
      return null;
    }
    return data as unknown as EventDetail;
  }, []);

  const getRitualDetail = useCallback(async (companyId: string): Promise<RitualDetail | null> => {
    const { data, error } = await supabase.rpc('get_company_ritual_detail', { _company_id: companyId });
    if (error) {
      console.error('Error fetching ritual detail:', error);
      return null;
    }
    return data as unknown as RitualDetail;
  }, []);

  const getIndicatorsDetail = useCallback(async (companyId: string): Promise<IndicatorsDetail | null> => {
    const { data, error } = await supabase.rpc('get_company_indicators_detail', { _company_id: companyId });
    if (error) {
      console.error('Error fetching indicators detail:', error);
      return null;
    }
    return data as unknown as IndicatorsDetail;
  }, []);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  // Calculate metrics
  const metrics = {
    totalCompanies: companies.length,
    totalMembers: companies.reduce((sum, c) => sum + (c.member_count || 0), 0),
    activeToday: companies.filter(c => {
      if (!c.last_activity) return false;
      const lastActivity = new Date(c.last_activity);
      const today = new Date();
      return lastActivity.toDateString() === today.toDateString();
    }).length,
    averageProgress: companies.length > 0 
      ? Math.round(companies.reduce((sum, c) => {
          let completed = 0;
          if ((c.mission_stage || 0) >= 16) completed++;
          if ((c.vision_stage || 0) >= 13) completed++;
          if ((c.values_stage || 0) >= 9) completed++;
          if ((c.indicators_stage || 0) >= 3) completed++;
          if ((c.decision_stage || 0) >= 9) completed++;
          if ((c.energy_stage || 0) >= 5) completed++;
          if ((c.development_stage || 0) >= 5) completed++;
          if ((c.event_stage || 0) >= 11) completed++;
          if ((c.ritual_stage || 0) >= 7) completed++;
          return sum + (completed / 9) * 100;
        }, 0) / companies.length)
      : 0
  };

  return {
    isSuperAdmin,
    companies,
    loading,
    error,
    metrics,
    reload: loadCompanies,
    getCompanyDetails,
    getValuesDetail,
    getDecisionDetail,
    getProjectsDetail,
    getEnergyDetail,
    getDevelopmentDetail,
    getEventDetail,
    getRitualDetail,
    getIndicatorsDetail,
  };
}
