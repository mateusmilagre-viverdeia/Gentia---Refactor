import React, { useState, useEffect } from 'react';
import { ChevronDown, Calendar, Building2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { DadosFormulario, ResultadosROIP, recalcularCenariosEconomia } from '@/utils/calculations';

interface Simulation {
  id: string;
  nome_empresa: string;
  created_at: string;
  dados_simulacao: unknown;
  resultados_calculadora: unknown;
}

interface SimulationSelectorProps {
  currentSimulationName?: string;
  onSelect: (resultados: ResultadosROIP, dadosOriginais: DadosFormulario, nomeEmpresa: string) => void;
}

export function SimulationSelector({ currentSimulationName, onSelect }: SimulationSelectorProps) {
  const { user } = useAuth();
  const { currentAccount } = useOrganization();
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadSimulations = async () => {
      if (!user) return;

      setLoading(true);
      try {
        let query = supabase
          .from('roip_simulations')
          .select('id, nome_empresa, created_at, dados_simulacao, resultados_calculadora')
          .order('created_at', { ascending: false })
          .limit(10);

        query = currentAccount?.id
          ? query.eq('account_id', currentAccount.id)
          : query.eq('user_id', user.id);

        const { data, error } = await query;

        if (error) throw error;
        setSimulations(data || []);
      } catch (error) {
        console.error('Error loading simulations:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSimulations();
  }, [user, currentAccount?.id]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleSelect = (simulation: Simulation) => {
    const storedResultados = (simulation.resultados_calculadora as any)?.resultados;
    const storedDados = simulation.dados_simulacao as unknown as DadosFormulario;

    if (storedResultados && storedDados) {
      const resultadosCorrigidos = {
        ...storedResultados,
        cenariosEconomia: recalcularCenariosEconomia(storedResultados, storedDados)
      };
      onSelect(resultadosCorrigidos, storedDados, simulation.nome_empresa || 'Empresa');
    }
  };

  if (simulations.length <= 1) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Building2 className="h-4 w-4" />
          <span className="max-w-[150px] truncate">{currentSimulationName || 'Selecionar'}</span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>Simulações Salvas</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {loading ? (
          <div className="p-2 text-center text-sm text-muted-foreground">
            Carregando...
          </div>
        ) : (
          simulations.map((simulation) => (
            <DropdownMenuItem
              key={simulation.id}
              onClick={() => handleSelect(simulation)}
              className="flex flex-col items-start gap-1 cursor-pointer"
            >
              <span className="font-medium">{simulation.nome_empresa}</span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDate(simulation.created_at)}
              </span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
