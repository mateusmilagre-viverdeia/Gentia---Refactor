import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SimulationData } from '@/hooks/useCalculadoraEvolution';

import { ListOrdered, TrendingDown, TrendingUp, Minus, Eye } from 'lucide-react';
import { SimulationDetailModal } from './SimulationDetailModal';
import { formatBRT } from "@/lib/datetime";

interface SimulationsComparisonTableProps {
  simulations: SimulationData[];
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value);
};

export const SimulationsComparisonTable = ({ simulations }: SimulationsComparisonTableProps) => {
  const [selectedSimulation, setSelectedSimulation] = useState<SimulationData | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Sort by date descending
  const sortedSimulations = [...simulations].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // Calculate variation between consecutive simulations
  const getVariation = (current: SimulationData, index: number) => {
    if (index >= sortedSimulations.length - 1) return null;
    
    const previous = sortedSimulations[index + 1];
    const currentLoss = current.resultados_calculadora?.resultados?.perdaTotal || 0;
    const previousLoss = previous.resultados_calculadora?.resultados?.perdaTotal || 0;
    
    if (previousLoss === 0) return null;
    
    const variation = ((currentLoss - previousLoss) / previousLoss) * 100;
    return variation;
  };

  if (simulations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListOrdered className="h-5 w-5 text-primary" />
            Histórico de Simulações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px] text-muted-foreground">
            Nenhuma simulação encontrada
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ListOrdered className="h-5 w-5 text-primary" />
          Histórico de Simulações
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead className="text-right">Perda Total</TableHead>
                <TableHead className="text-right">% Perda</TableHead>
                <TableHead className="text-right">Economia Potencial</TableHead>
                <TableHead className="text-center">Variação</TableHead>
                <TableHead className="text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedSimulations.map((sim, index) => {
                const resultados = sim.resultados_calculadora?.resultados;
                const variation = getVariation(sim, index);
                
                return (
                  <TableRow key={sim.id}>
                    <TableCell className="font-medium">
                      {formatBRT(new Date(sim.created_at), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell>{sim.nome_empresa}</TableCell>
                    <TableCell className="text-right text-destructive font-medium">
                      {formatCurrency(resultados?.perdaTotal || 0)}
                    </TableCell>
                    <TableCell className="text-right">
                      {(resultados?.percentualPerda || 0).toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-right text-green-600 font-medium">
                      {formatCurrency(resultados?.cenariosEconomia?.realista?.economia || 0)}
                    </TableCell>
                    <TableCell className="text-center">
                      {variation !== null ? (
                        <Badge 
                          variant={variation < 0 ? "default" : variation > 0 ? "destructive" : "secondary"}
                          className="gap-1"
                        >
                          {variation < 0 ? (
                            <TrendingDown className="h-3 w-3" />
                          ) : variation > 0 ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : (
                            <Minus className="h-3 w-3" />
                          )}
                          {Math.abs(variation).toFixed(1)}%
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedSimulation(sim);
                          setModalOpen(true);
                        }}
                        title="Ver detalhes"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <SimulationDetailModal
        simulation={selectedSimulation}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </Card>
  );
};
