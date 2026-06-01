import { useMemo } from 'react';
import { DISCResult, DISCDimension } from '@/types/disc.types';
import { 
  getCombinedProfile, 
  DISC_PROFILES, 
  generateAIPromptBase,
  DISCCombinedProfile,
  DISCProfileText
} from '@/data/disc-profiles';

interface UseDISCFeedbackReturn {
  combinedProfile: DISCCombinedProfile | null;
  primaryProfile: DISCProfileText | null;
  secondaryProfile: DISCProfileText | null;
  aiPromptBase: string | null;
}

/**
 * Hook para gerar devolutiva DISC com base nos resultados do assessment
 * Retorna os textos combinados e o prompt base para integração com IA
 */
export function useDISCFeedback(result: DISCResult | null): UseDISCFeedbackReturn {
  const feedback = useMemo(() => {
    if (!result) {
      return {
        combinedProfile: null,
        primaryProfile: null,
        secondaryProfile: null,
        aiPromptBase: null
      };
    }

    const primaryDimension = result.primary_profile as DISCDimension;
    const secondaryDimension = result.secondary_profile as DISCDimension | null;

    const combinedProfile = getCombinedProfile(primaryDimension, secondaryDimension);
    const primaryProfile = DISC_PROFILES[primaryDimension];
    const secondaryProfile = secondaryDimension ? DISC_PROFILES[secondaryDimension] : null;
    const aiPromptBase = generateAIPromptBase(combinedProfile);

    return {
      combinedProfile,
      primaryProfile,
      secondaryProfile,
      aiPromptBase
    };
  }, [result]);

  return feedback;
}

/**
 * Gera um resumo textual do perfil para exibição rápida
 */
export function getProfileQuickSummary(result: DISCResult): string {
  const primary = DISC_PROFILES[result.primary_profile as DISCDimension];
  const secondary = result.secondary_profile 
    ? DISC_PROFILES[result.secondary_profile as DISCDimension] 
    : null;

  if (secondary) {
    return `${primary.title} com traços de ${secondary.title}`;
  }
  
  return `${primary.title} puro`;
}

/**
 * Retorna a cor associada a uma dimensão DISC
 */
export function getDimensionColor(dimension: DISCDimension): {
  bg: string;
  text: string;
  border: string;
} {
  const colors: Record<DISCDimension, { bg: string; text: string; border: string }> = {
    D: { bg: 'bg-red-500', text: 'text-red-600', border: 'border-red-500' },
    I: { bg: 'bg-yellow-500', text: 'text-yellow-600', border: 'border-yellow-500' },
    S: { bg: 'bg-green-500', text: 'text-green-600', border: 'border-green-500' },
    C: { bg: 'bg-blue-500', text: 'text-blue-600', border: 'border-blue-500' }
  };
  return colors[dimension];
}
