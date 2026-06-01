import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DISCAnalysisLevel, DISCAIAnalysis } from '@/types/disc.types';
import { toast } from 'sonner';

export interface DISCAIAnalysisResult {
  level: DISCAnalysisLevel;
  profileCode: string;
  profileName: string;
  intensity: string;
  isBalanced: boolean;
  scores: {
    D: number;
    I: number;
    S: number;
    C: number;
  };
  executiveSummary: string;
  leadershipStyle: string;
  motivationEngagement: string;
  risksBlindSpots: string;
  communication: string;
  idealEnvironment: string;
  developmentPlan: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
}

interface UseDISCAIAnalysisReturn {
  analysis: DISCAIAnalysisResult | null;
  isLoading: boolean;
  error: string | null;
  generateAnalysis: (sessionId: string, level: DISCAnalysisLevel) => Promise<DISCAIAnalysisResult | null>;
  clearAnalysis: () => void;
}

export function useDISCAIAnalysis(): UseDISCAIAnalysisReturn {
  const [analysis, setAnalysis] = useState<DISCAIAnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateAnalysis = useCallback(async (
    sessionId: string, 
    level: DISCAnalysisLevel
  ): Promise<DISCAIAnalysisResult | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('analyze-disc', {
        body: { sessionId, analysisLevel: level }
      });
      
      if (fnError) {
        throw new Error(fnError.message || 'Failed to generate analysis');
      }
      
      if (data?.error) {
        if (data.error.includes('Rate limit')) {
          toast.error('Limite de requisições atingido. Tente novamente em alguns minutos.');
        } else if (data.error.includes('credits')) {
          toast.error('Créditos de IA esgotados. Entre em contato com o suporte.');
        } else {
          toast.error(data.error);
        }
        throw new Error(data.error);
      }
      
      setAnalysis(data);
      return data;
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao gerar análise';
      setError(message);
      console.error('Error generating DISC AI analysis:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearAnalysis = useCallback(() => {
    setAnalysis(null);
    setError(null);
  }, []);

  return {
    analysis,
    isLoading,
    error,
    generateAnalysis,
    clearAnalysis
  };
}
