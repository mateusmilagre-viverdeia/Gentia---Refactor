import React from 'react';
import { DetalhesRotatividade, DetalhesDesengajamento } from '@/utils/calculations';
import { formatarMoeda, formatarPercentual } from '@/utils/formatters';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface DetailBreakdownProps {
  type: 'rotatividade' | 'desengajamento' | 'improdutividade';
  isOpen: boolean;
  onToggle: () => void;
  rotatividadeDetails?: DetalhesRotatividade;
  desengajamentoDetails?: DetalhesDesengajamento;
  improdutividadeValue?: number;
  faturamento?: number;
  funcionarios?: number;
}

export const DetailBreakdown: React.FC<DetailBreakdownProps> = ({
  type,
  isOpen,
  onToggle,
  rotatividadeDetails,
  desengajamentoDetails,
  improdutividadeValue,
  faturamento,
  funcionarios
}) => {
  const renderRotatividadeDetails = () => {
    if (!rotatividadeDetails) return null;

    return (
      <div className="space-y-4">
        <div className="bg-muted/50 p-4 rounded-lg">
          <h4 className="font-semibold mb-2">Base de Cálculo</h4>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Funcionários Desligados:</span>
            <span className="font-medium">{rotatividadeDetails.funcionariosDesligados.toFixed(1)}</span>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
          <h4 className="font-semibold mb-2 text-blue-700 dark:text-blue-400">A. Custo com Horas do RH</h4>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Horas por vaga:</span>
            <span className="font-medium">{rotatividadeDetails.detalhesRH.horasPorVaga.toFixed(1)}h</span>
          </div>
          <div className="flex justify-between text-sm mt-1 pt-1 border-t">
            <span className="font-medium">Subtotal A:</span>
            <span className="font-bold text-blue-700 dark:text-blue-400">{formatarMoeda(rotatividadeDetails.custoRH)}</span>
          </div>
        </div>

        <div className="bg-purple-50 dark:bg-purple-950/20 p-4 rounded-lg">
          <h4 className="font-semibold mb-2 text-purple-700 dark:text-purple-400">B. Custo de Entrevistas</h4>
          <div className="flex justify-between text-sm pt-1 border-t">
            <span className="font-medium">Subtotal B:</span>
            <span className="font-bold text-purple-700 dark:text-purple-400">{formatarMoeda(rotatividadeDetails.custoEntrevistas)}</span>
          </div>
        </div>

        <div className="bg-orange-50 dark:bg-orange-950/20 p-4 rounded-lg">
          <h4 className="font-semibold mb-2 text-orange-700 dark:text-orange-400">C. Custo com Treinamentos</h4>
          <div className="flex justify-between text-sm pt-1 border-t">
            <span className="font-medium">Subtotal C:</span>
            <span className="font-bold text-orange-700 dark:text-orange-400">{formatarMoeda(rotatividadeDetails.custoTreinamentos)}</span>
          </div>
        </div>

        <div className="bg-red-50 dark:bg-red-950/20 p-4 rounded-lg">
          <h4 className="font-semibold mb-2 text-red-700 dark:text-red-400">D. Salários e Encargos</h4>
          <div className="flex justify-between text-sm pt-1 border-t">
            <span className="font-medium">Subtotal D:</span>
            <span className="font-bold text-red-700 dark:text-red-400">{formatarMoeda(rotatividadeDetails.custoSalariosEncargos)}</span>
          </div>
        </div>

        <div className="bg-gray-900 dark:bg-gray-800 p-4 rounded-lg text-white">
          <h4 className="font-semibold mb-2">Total Anual</h4>
          <div className="flex justify-between text-lg">
            <span>Custo Total:</span>
            <span className="font-bold">{formatarMoeda(rotatividadeDetails.total)}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderDesengajamentoDetails = () => {
    if (!desengajamentoDetails) return null;

    return (
      <div className="space-y-4">
        <div className="bg-muted/50 p-4 rounded-lg">
          <h4 className="font-semibold mb-3">Metodologia</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Engajados ({desengajamentoDetails.detalhes.percentualEngajados}%):</span>
              <span className="font-medium text-green-600">{desengajamentoDetails.detalhes.produtividadeEngajados}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Não Engajados ({desengajamentoDetails.detalhes.percentualNaoEngajados}%):</span>
              <span className="font-medium text-yellow-600">{desengajamentoDetails.detalhes.produtividadeNaoEngajados}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Desengajados ({desengajamentoDetails.detalhes.percentualDesengajados}%):</span>
              <span className="font-medium text-red-600">{desengajamentoDetails.detalhes.produtividadeDesengajados}%</span>
            </div>
          </div>
        </div>

        <div className="bg-orange-50 dark:bg-orange-950/20 p-4 rounded-lg">
          <h4 className="font-semibold mb-3 text-orange-700 dark:text-orange-400">Situação Atual</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Produtividade Efetiva:</span>
              <span className="font-medium">{formatarPercentual(desengajamentoDetails.produtividadeAtual)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Funcionários Extra:</span>
              <span className="font-medium">{desengajamentoDetails.deficitFuncionarios}</span>
            </div>
          </div>
        </div>

        <div className="bg-red-900 dark:bg-red-950 p-4 rounded-lg text-white">
          <h4 className="font-semibold mb-2">Custo Atual</h4>
          <div className="flex justify-between text-lg">
            <span>Custo Anual do Desengajamento:</span>
            <span className="font-bold">{formatarMoeda(desengajamentoDetails.custoAtual)}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderImprodutividadeDetails = () => {
    if (!improdutividadeValue || !faturamento) return null;

    return (
      <div className="space-y-4">
        <div className="bg-muted/50 p-4 rounded-lg">
          <h4 className="font-semibold mb-3">Base do Cálculo</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Faturamento Anual:</span>
              <span className="font-medium">{formatarMoeda(faturamento)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Percentual de Improdutividade:</span>
              <span className="font-medium">3,83%</span>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 dark:bg-yellow-950/20 p-4 rounded-lg">
          <h4 className="font-semibold mb-3 text-yellow-700 dark:text-yellow-400">Principais Fatores</h4>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>• Processos ineficientes</li>
            <li>• Ferramentas inadequadas</li>
            <li>• Falhas de comunicação</li>
            <li>• Retrabalho constante</li>
          </ul>
        </div>

        <div className="bg-yellow-900 dark:bg-yellow-950 p-4 rounded-lg text-white">
          <h4 className="font-semibold mb-2">Total Anual</h4>
          <div className="flex justify-between text-lg">
            <span>Custo da Improdutividade:</span>
            <span className="font-bold">{formatarMoeda(improdutividadeValue)}</span>
          </div>
        </div>
      </div>
    );
  };

  const getTitle = () => {
    switch (type) {
      case 'rotatividade':
        return 'Detalhamento - Custos de Rotatividade';
      case 'desengajamento':
        return 'Detalhamento - Custos de Desengajamento';
      case 'improdutividade':
        return 'Detalhamento - Custos de Improdutividade';
      default:
        return 'Detalhamento';
    }
  };

  if (!isOpen) return null;

  return (
    <Card className="mt-4 border-2 border-primary/20">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg">{getTitle()}</CardTitle>
        <Button variant="ghost" size="icon" onClick={onToggle}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {type === 'rotatividade' && renderRotatividadeDetails()}
        {type === 'desengajamento' && renderDesengajamentoDetails()}
        {type === 'improdutividade' && renderImprodutividadeDetails()}
      </CardContent>
    </Card>
  );
};
