import { useCallback, useMemo } from 'react';
import { useAccountLicensedModules, AccessLevel } from './useAccountLicensedModules';

// Map journey IDs to module categories
const JOURNEY_TO_CATEGORY: Record<string, string[]> = {
  diagnostico: ['diagnostico'],
  cultura: ['cultura'],
  atracao: ['atracao', 'contratacao'],
  retencao: ['retencao'],
  educacao: ['educacao'],
};

// Map specific routes to module slugs
const ROUTE_TO_MODULE: Record<string, string> = {
  // Cultura
  '/cultura': 'cultura_criacao',
  '/cultura/visao': 'cultura_criacao',
  '/cultura/missao': 'cultura_criacao',
  '/cultura/valores': 'cultura_criacao',
  '/cultura/energia': 'cultura_criacao',
  '/cultura/desenvolvimento': 'cultura_criacao',
  '/cultura/decisao': 'cultura_criacao',
  '/cultura/eventos': 'cultura_eventos',
  '/cultura/rituais': 'cultura_rituais',
  '/cultura/culture-code': 'cultura_code',
  
  // Diagnóstico
  '/diagnostico': 'diagnostico_roi',
  '/diagnostico/roi': 'diagnostico_roi',
  
  // Atração
  '/atracao-contratacao': 'atracao_vendendo',
  '/atracao-contratacao/vendendo': 'atracao_vendendo',
  '/atracao-contratacao/job-descriptions': 'atracao_job_desc',
  '/atracao-contratacao/organograma': 'atracao_organograma',
  '/atracao-contratacao/funil': 'contratacao_funil',
  '/atracao-contratacao/perguntas': 'contratacao_perguntas',
  
  // Retenção  
  '/retencao': 'retencao_pulse',
  '/retencao/pulse': 'retencao_pulse',
  '/retencao/disc': 'retencao_disc',
  '/retencao/desempenho': 'retencao_desempenho',
  '/retencao/maturidade': 'retencao_maturidade',
  '/retencao/onboarding': 'retencao_onboarding',
  '/retencao/analisador': 'retencao_analisador',
  '/retencao/habilidades': 'retencao_habilidade',
  
  // Educação
  '/educacao': 'educacao_cursos',
  
  // Conta
  '/configuracoes': 'conta_empresa',
  '/configuracoes/empresa': 'conta_empresa',
  '/configuracoes/usuarios': 'conta_usuarios',
  '/configuracoes/permissoes': 'conta_permissoes',
  '/configuracoes/plano-acao': 'conta_plano_acao',
};

export interface UseLicensedAccessReturn {
  // Check if a journey is fully disabled (all modules disabled)
  isJourneyDisabled: (journeyId: string) => boolean;
  
  // Check if a journey is view-only (all modules are view_only or disabled)
  isJourneyViewOnly: (journeyId: string) => boolean;
  
  // Get the most restrictive access level for a journey
  getJourneyAccessLevel: (journeyId: string) => AccessLevel;
  
  // Check route access
  isRouteDisabled: (path: string) => boolean;
  isRouteViewOnly: (path: string) => boolean;
  getRouteAccessLevel: (path: string) => AccessLevel;
  
  // Check specific module access (re-exported for convenience)
  getModuleAccessLevel: (moduleSlug: string) => AccessLevel;
  isModuleDisabled: (moduleSlug: string) => boolean;
  isModuleViewOnly: (moduleSlug: string) => boolean;
  canEditModule: (moduleSlug: string) => boolean;
}

export function useLicensedAccess(): UseLicensedAccessReturn {
  const { getMyAccessLevel, isDisabled, isViewOnly, canEdit } = useAccountLicensedModules();

  // Get all module slugs for a journey
  const getJourneyModules = useCallback((journeyId: string): string[] => {
    const categories = JOURNEY_TO_CATEGORY[journeyId] || [];
    const categoryToModules: Record<string, string[]> = {
      cultura: ['cultura_criacao', 'cultura_eventos', 'cultura_rituais', 'cultura_code'],
      diagnostico: ['diagnostico_roi'],
      atracao: ['atracao_vendendo', 'atracao_job_desc', 'atracao_organograma'],
      contratacao: ['contratacao_funil', 'contratacao_perguntas'],
      retencao: ['retencao_pulse', 'retencao_disc', 'retencao_desempenho', 'retencao_maturidade', 'retencao_onboarding', 'retencao_analisador', 'retencao_habilidade'],
      educacao: ['educacao_cursos'],
      conta: ['conta_empresa', 'conta_usuarios', 'conta_permissoes', 'conta_plano_acao'],
    };
    
    return categories.flatMap(cat => categoryToModules[cat] || []);
  }, []);

  // Check if all modules in a journey are disabled
  const isJourneyDisabled = useCallback((journeyId: string): boolean => {
    const modules = getJourneyModules(journeyId);
    if (modules.length === 0) return false;
    return modules.every(slug => isDisabled(slug));
  }, [getJourneyModules, isDisabled]);

  // Check if journey is view-only (no full access modules)
  const isJourneyViewOnly = useCallback((journeyId: string): boolean => {
    const modules = getJourneyModules(journeyId);
    if (modules.length === 0) return false;
    
    // Journey is view-only if NO modules have full access and at least one is view_only
    const hasFullAccess = modules.some(slug => canEdit(slug));
    const hasViewOnly = modules.some(slug => isViewOnly(slug));
    
    return !hasFullAccess && hasViewOnly;
  }, [getJourneyModules, canEdit, isViewOnly]);

  // Get the best access level for a journey (most permissive that exists)
  const getJourneyAccessLevel = useCallback((journeyId: string): AccessLevel => {
    const modules = getJourneyModules(journeyId);
    if (modules.length === 0) return 'full';
    
    const levels = modules.map(slug => getMyAccessLevel(slug));
    
    // Return most permissive level found
    if (levels.includes('full')) return 'full';
    if (levels.includes('view_only')) return 'view_only';
    return 'disabled';
  }, [getJourneyModules, getMyAccessLevel]);

  // Get module slug for a route
  const getRouteModule = useCallback((path: string): string | null => {
    // Try exact match first
    if (ROUTE_TO_MODULE[path]) {
      return ROUTE_TO_MODULE[path];
    }
    
    // Try prefix match for nested routes
    const sortedPaths = Object.keys(ROUTE_TO_MODULE).sort((a, b) => b.length - a.length);
    for (const routePath of sortedPaths) {
      if (path.startsWith(routePath)) {
        return ROUTE_TO_MODULE[routePath];
      }
    }
    
    return null;
  }, []);

  const isRouteDisabled = useCallback((path: string): boolean => {
    const moduleSlug = getRouteModule(path);
    if (!moduleSlug) return false;
    return isDisabled(moduleSlug);
  }, [getRouteModule, isDisabled]);

  const isRouteViewOnly = useCallback((path: string): boolean => {
    const moduleSlug = getRouteModule(path);
    if (!moduleSlug) return false;
    return isViewOnly(moduleSlug);
  }, [getRouteModule, isViewOnly]);

  const getRouteAccessLevel = useCallback((path: string): AccessLevel => {
    const moduleSlug = getRouteModule(path);
    if (!moduleSlug) return 'full';
    return getMyAccessLevel(moduleSlug);
  }, [getRouteModule, getMyAccessLevel]);

  return {
    isJourneyDisabled,
    isJourneyViewOnly,
    getJourneyAccessLevel,
    isRouteDisabled,
    isRouteViewOnly,
    getRouteAccessLevel,
    getModuleAccessLevel: getMyAccessLevel,
    isModuleDisabled: isDisabled,
    isModuleViewOnly: isViewOnly,
    canEditModule: canEdit,
  };
}
