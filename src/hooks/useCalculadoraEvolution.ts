import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';

export interface SimulationData {
  id: string;
  nome_empresa: string;
  email: string;
  created_at: string;
  dados_simulacao: {
    faturamentoAnual: number;
    quantidadeColaboradores: number;
    taxaRotatividade: number;
    percentualDesengajados: number;
    salarioMedio: number;
    percentualImprodutividade: number;
    setor: string;
  };
  resultados_calculadora: {
    resultados: {
      perdaTotal: number;
      percentualPerda: number;
      custoRotatividade: number;
      custoDesengajamento: number;
      custoImprodutividade: number;
      cenariosEconomia: {
        pessimista: { economia: number };
        realista: { economia: number };
        otimista: { economia: number };
      };
    };
    dadosOriginais: any;
  };
}

export interface CalculadoraMonthlyData {
  month: string;
  monthNum: number;
  year: number;
  date: Date;
  perdaTotal: number;
  percentualPerda: number;
  custoRotatividade: number;
  custoDesengajamento: number;
  custoImprodutividade: number;
  economiaRealista: number;
  nomeEmpresa: string;
  simulationId: string;
}

const MONTH_NAMES = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
];

export const useCalculadoraEvolution = (months: number = 12) => {
  const { currentAccount } = useOrganization();
  const [data, setData] = useState<SimulationData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSimulations = async () => {
      setLoading(true);
      try {
        const cutoffDate = new Date();
        cutoffDate.setMonth(cutoffDate.getMonth() - months);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setData([]);
          return;
        }

        let query = supabase
          .from('roip_simulations')
          .select('id, nome_empresa, created_at, dados_simulacao, resultados_calculadora')
          .gte('created_at', cutoffDate.toISOString())
          .order('created_at', { ascending: true });

        query = currentAccount?.id
          ? query.eq('account_id', currentAccount.id)
          : query.eq('user_id', user.id);

        const { data: simulations, error } = await query;
        if (error) throw error;

        setData((simulations || []) as unknown as SimulationData[]);
      } catch (e) {
        console.error('Erro ao carregar simulações:', e);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    loadSimulations();
  }, [currentAccount?.id, months]);

  // Transform to monthly data
  const monthlyData: CalculadoraMonthlyData[] = data
    .map(sim => {
      const date = new Date(sim.created_at);
      const resultados = sim.resultados_calculadora?.resultados;
      
      if (!resultados) return null;

      return {
        month: `${MONTH_NAMES[date.getMonth()]}/${date.getFullYear()}`,
        monthNum: date.getMonth() + 1,
        year: date.getFullYear(),
        date,
        perdaTotal: resultados.perdaTotal || 0,
        percentualPerda: resultados.percentualPerda || 0,
        custoRotatividade: resultados.custoRotatividade || 0,
        custoDesengajamento: resultados.custoDesengajamento || 0,
        custoImprodutividade: resultados.custoImprodutividade || 0,
        economiaRealista: resultados.cenariosEconomia?.realista?.economia || 0,
        nomeEmpresa: sim.nome_empresa,
        simulationId: sim.id,
      };
    })
    .filter((item): item is CalculadoraMonthlyData => item !== null)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  // Calculate current and previous values
  const currentData = monthlyData.length > 0 ? monthlyData[monthlyData.length - 1] : null;
  const previousData = monthlyData.length > 1 ? monthlyData[monthlyData.length - 2] : null;

  // Calculate trend
  const calculateTrend = () => {
    if (!currentData || !previousData || previousData.perdaTotal === 0) {
      return { change: 0, percentage: 0, direction: 'stable' as const };
    }
    
    const change = currentData.perdaTotal - previousData.perdaTotal;
    const percentage = (change / previousData.perdaTotal) * 100;
    
    let direction: 'up' | 'down' | 'stable' = 'stable';
    if (percentage > 5) direction = 'up';
    else if (percentage < -5) direction = 'down';
    
    return { change, percentage, direction };
  };

  return {
    simulations: data,
    monthlyData,
    currentData,
    previousData,
    trend: calculateTrend(),
    loading,
    isEmpty: data.length === 0,
  };
};
