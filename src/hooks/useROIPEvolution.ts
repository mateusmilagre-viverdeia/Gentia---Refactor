import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';

export interface EvolutionData {
  id: string;
  overall_score: number;
  period_month: number;
  period_year: number;
  created_at: string;
  pillar_scores?: {
    retencao: number;
    cultura: number;
    atracao: number;
    resultados: number;
  };
  ai_analysis?: string;
}

export interface MonthlyScore {
  month: string;
  monthNum: number;
  year: number;
  score: number;
  pillarScores?: {
    retencao: number;
    cultura: number;
    atracao: number;
    resultados: number;
  };
}

const MONTH_NAMES = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
];

export const useROIPEvolution = (months: number = 12) => {
  const { currentAccount } = useOrganization();

  return useQuery({
    queryKey: ['roip-evolution', currentAccount?.id, months],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      let query = supabase
        .from('roip_assessments')
        .select(`
          id,
          overall_score,
          period_month,
          period_year,
          created_at,
          roip_results (pillar_scores, ai_analysis)
        `)
        .eq('completed', true)
        .not('overall_score', 'is', null)
        .order('period_year', { ascending: false })
        .order('period_month', { ascending: false })
        .limit(months);

      query = currentAccount?.id
        ? query.eq('account_id', currentAccount.id)
        : query.eq('user_id', user.id);

      const { data, error } = await query;

      if (error) throw error;

      // Transform data to monthly scores
      const monthlyScores: MonthlyScore[] = (data || [])
        .filter(item => item.period_month && item.period_year)
        .map(item => {
          const results = Array.isArray(item.roip_results) ? item.roip_results[0] : item.roip_results;
          const pillarScores = results?.pillar_scores as Record<string, number> | undefined;
          
          return {
            month: `${MONTH_NAMES[item.period_month! - 1]}/${item.period_year}`,
            monthNum: item.period_month!,
            year: item.period_year!,
            score: item.overall_score || 0,
            pillarScores: pillarScores ? {
              retencao: pillarScores.retencao || 0,
              cultura: pillarScores.cultura || 0,
              atracao: pillarScores.atracao || 0,
              resultados: pillarScores.resultados || 0,
            } : undefined
          };
        })
        .reverse(); // Show oldest to newest

      return {
        rawData: data || [],
        monthlyScores,
        currentScore: monthlyScores.length > 0 ? monthlyScores[monthlyScores.length - 1]?.score : null,
        previousScore: monthlyScores.length > 1 ? monthlyScores[monthlyScores.length - 2]?.score : null,
      };
    },
    enabled: !!currentAccount?.id,
  });
};

export const calculateTrend = (current: number | null, previous: number | null) => {
  if (current === null || previous === null || previous === 0) {
    return { change: 0, percentage: 0, direction: 'stable' as const };
  }
  
  const change = current - previous;
  const percentage = ((change / previous) * 100);
  
  let direction: 'up' | 'down' | 'stable' = 'stable';
  if (percentage > 5) direction = 'up';
  else if (percentage < -5) direction = 'down';
  
  return { change, percentage, direction };
};
