import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SimulationData } from '@/hooks/useCalculadoraEvolution';
import { ROIPDashboard } from '@/components/dashboard/ROIPDashboard';

import { ScrollArea } from '@/components/ui/scroll-area';
import { ResultadosROIP, DadosFormulario } from '@/utils/calculations';
import { formatBRT } from "@/lib/datetime";

interface SimulationDetailModalProps {
  simulation: SimulationData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SimulationDetailModal = ({
  simulation,
  open,
  onOpenChange,
}: SimulationDetailModalProps) => {
  if (!simulation) return null;

  // Try to get full data from dadosOriginais (stored with full types)
  const dadosOriginais = simulation.resultados_calculadora?.dadosOriginais as DadosFormulario | undefined;
  
  // For resultados, we need to check if we have the full structure or just the summary
  const resultadosRaw = simulation.resultados_calculadora?.resultados;
  
  // Check if we have the complete ResultadosROIP or just a summary
  const hasCompleteData = dadosOriginais && resultadosRaw && 
    'faturamentoPorColaborador' in resultadosRaw;

  if (!hasCompleteData) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Dados Incompletos</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Esta simulação não possui dados completos para visualização detalhada.
            Os dados resumidos estão disponíveis na tabela.
          </p>
        </DialogContent>
      </Dialog>
    );
  }

  const resultados = resultadosRaw as unknown as ResultadosROIP;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex flex-col gap-1">
            <span>Simulação: {simulation.nome_empresa}</span>
            <span className="text-sm font-normal text-muted-foreground">
              {formatBRT(new Date(simulation.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm")}
            </span>
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(90vh-100px)]">
          <div className="p-6">
            <ROIPDashboard
              resultados={resultados}
              dadosOriginais={dadosOriginais}
              nomeEmpresa={simulation.nome_empresa}
              isSharedView={true}
            />
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
