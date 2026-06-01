/**
 * Debug helper for Modo Consultoria (EP Override)
 * Logs data isolation issues and helps diagnose problems
 * Uses centralized logger for production safety
 */

import { createLogger } from './logger';

const logger = createLogger('Consultoria');

type DebugContext = 
  | 'OrganizationContext'
  | 'useActionPlans'
  | 'useSurveys'
  | 'useHiringFunnels'
  | 'useTeamMaturity'
  | 'usePeopleAnalysis'
  | 'usePerformanceAssessment'
  | 'useUniqueAbility'
  | 'useSellingCompany'
  | 'ProjectsContext'
  | 'ValuesContext'
  | 'ValuesQuestionsContext'
  | 'EnergyContext'
  | 'DevelopmentContext'
  | 'DecisionContext'
  | 'RitualContext'
  | 'EventContext';

export function debugConsultoria(
  context: DebugContext,
  action: string,
  data: Record<string, unknown>
) {
  const isEPOverride = sessionStorage.getItem('ep_override_organization');
  
  // Only log if EP override is active OR explicitly debugging
  if (!isEPOverride && !data.forceLog) return;

  const emoji = getContextEmoji(context);
  
  logger.log(
    `${emoji} [${context}] ${action}`,
    {
      ...data,
      _isEPOverride: !!isEPOverride,
    }
  );
}

function getContextEmoji(context: DebugContext): string {
  const emojiMap: Record<DebugContext, string> = {
    OrganizationContext: '🏢',
    useActionPlans: '📋',
    useSurveys: '📊',
    useHiringFunnels: '🎯',
    useTeamMaturity: '📈',
    usePeopleAnalysis: '👥',
    usePerformanceAssessment: '⚡',
    useUniqueAbility: '💎',
    useSellingCompany: '🏪',
    ProjectsContext: '📁',
    ValuesContext: '💜',
    ValuesQuestionsContext: '❓',
    EnergyContext: '⚡',
    DevelopmentContext: '🌱',
    DecisionContext: '🎲',
    RitualContext: '🔮',
    EventContext: '📅',
  };
  return emojiMap[context] || '🔍';
}

export function logEPOverrideActivated(orgId: string, orgName: string, userId: string) {
  logger.log('🔄 [EP Override] ===== ATIVADO =====', {
    orgId,
    orgName,
    userId,
    timestamp: new Date().toISOString(),
  });
}

export function logEPOverrideDeactivated(originalOrgId: string | null, originalOrgName: string | null) {
  logger.log('🔄 [EP Override] ===== DESATIVADO =====', {
    returningToOrgId: originalOrgId,
    returningToOrgName: originalOrgName,
    timestamp: new Date().toISOString(),
  });
}

export function logDataFetch(context: DebugContext, accountId: string | null, resultCount: number) {
  debugConsultoria(context, 'Data fetched', {
    accountId,
    resultCount,
  });
}
