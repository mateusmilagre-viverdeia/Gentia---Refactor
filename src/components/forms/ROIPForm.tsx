import React, { useState, useEffect } from 'react';
import { DadosFormulario } from '@/utils/calculations';
import { segmentoOptions } from '@/data/benchmarks';
import { formatarMoedaInput, limparMoeda, formatarNumeroInput, formatarDecimalInput } from '@/utils/formatters';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Calculator, Building2, Users, TrendingUp, DollarSign, Percent, Clock, Target } from 'lucide-react';

interface ROIPFormProps {
  onSubmit: (dados: DadosFormulario) => void;
  loading?: boolean;
  dadosIniciais?: DadosFormulario | null;
}

export const ROIPForm: React.FC<ROIPFormProps> = ({
  onSubmit,
  loading = false,
  dadosIniciais
}) => {
  const [segmento, setSegmento] = useState('');
  const [regimeTributario, setRegimeTributario] = useState<'simples' | 'lucro_presumido'>('simples');
  const [faturamentoStr, setFaturamentoStr] = useState('');
  const [funcionariosStr, setFuncionariosStr] = useState('');
  const [rotatividadeStr, setRotatividadeStr] = useState('');
  const [salarioMedioStr, setSalarioMedioStr] = useState('');
  const [tempoOperacionalStr, setTempoOperacionalStr] = useState('70');
  const [potencialAumentoFaturamentoStr, setPotencialAumentoFaturamentoStr] = useState('');

  // Carregar dados iniciais quando fornecidos
  useEffect(() => {
    if (dadosIniciais) {
      setSegmento(dadosIniciais.segmento || '');
      setRegimeTributario(dadosIniciais.regimeTributario || 'simples');
      setFaturamentoStr(dadosIniciais.faturamento ? dadosIniciais.faturamento.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }) : '');
      setFuncionariosStr(dadosIniciais.funcionarios?.toString() || '');
      setRotatividadeStr(dadosIniciais.rotatividade?.toString() || '');
      setSalarioMedioStr(dadosIniciais.salarioMedio ? dadosIniciais.salarioMedio.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }) : '');
      setTempoOperacionalStr(dadosIniciais.tempoOperacional?.toString() || '70');
      setPotencialAumentoFaturamentoStr(dadosIniciais.potencialAumentoFaturamento ? dadosIniciais.potencialAumentoFaturamento.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }) : '');
    }
  }, [dadosIniciais]);

  const handleFaturamentoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valorFormatado = formatarMoedaInput(e.target.value);
    setFaturamentoStr(valorFormatado);
  };

  const handleSalarioMedioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valorFormatado = formatarMoedaInput(e.target.value);
    setSalarioMedioStr(valorFormatado);
  };

  const handleFuncionariosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valorFormatado = formatarNumeroInput(e.target.value);
    setFuncionariosStr(valorFormatado);
  };

  const handleRotatividadeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valorFormatado = formatarDecimalInput(e.target.value);
    setRotatividadeStr(valorFormatado);
  };

  const handleTempoOperacionalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    if (inputValue === '') {
      setTempoOperacionalStr('');
      return;
    }
    const valor = parseInt(inputValue);
    if (!isNaN(valor) && valor >= 0 && valor <= 100) {
      setTempoOperacionalStr(inputValue);
    }
  };

  const handlePotencialAumentoFaturamentoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valorFormatado = formatarMoedaInput(e.target.value);
    setPotencialAumentoFaturamentoStr(valorFormatado);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!segmento) {
      toast.error("Campo obrigatório", {
        description: "Por favor, selecione o segmento de negócio"
      });
      return;
    }

    const faturamento = limparMoeda(faturamentoStr);
    const funcionarios = parseInt(funcionariosStr);
    const rotatividade = parseFloat(rotatividadeStr);
    const salarioMedio = limparMoeda(salarioMedioStr);
    const tempoOperacional = parseInt(tempoOperacionalStr);

    if (faturamento <= 0) {
      toast.error("Valor inválido", {
        description: "Por favor, informe um faturamento válido"
      });
      return;
    }

    if (funcionarios <= 0) {
      toast.error("Valor inválido", {
        description: "Por favor, informe um número de funcionários válido"
      });
      return;
    }

    if (rotatividade < 0 || isNaN(rotatividade)) {
      toast.error("Valor inválido", {
        description: "Por favor, informe uma rotatividade válida (não pode ser negativa)"
      });
      return;
    }

    if (salarioMedio <= 0) {
      toast.error("Valor inválido", {
        description: "Por favor, informe um salário médio válido"
      });
      return;
    }

    try {
      const potencialAumentoFaturamento = potencialAumentoFaturamentoStr ? limparMoeda(potencialAumentoFaturamentoStr) : 0;

      const dados: DadosFormulario = {
        segmento,
        regimeTributario,
        faturamento,
        funcionarios,
        rotatividade,
        salarioMedio,
        tempoOperacional,
        ...(potencialAumentoFaturamento > 0 && { potencialAumentoFaturamento })
      };

      onSubmit(dados);
    } catch (error) {
      console.error('Erro ao processar dados:', error);
      toast.error("Erro no processamento", {
        description: "Ocorreu um erro ao processar os dados. Verifique os valores e tente novamente."
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardContent className="pt-6 space-y-6">
          {/* Segmento e Regime */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="segmento" className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                Segmento de Negócio
              </Label>
              <Select value={segmento} onValueChange={setSegmento}>
                <SelectTrigger id="segmento">
                  <SelectValue placeholder="Selecione o segmento" />
                </SelectTrigger>
                <SelectContent>
                  {segmentoOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="regime" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                Regime Tributário
              </Label>
              <Select value={regimeTributario} onValueChange={(v) => setRegimeTributario(v as 'simples' | 'lucro_presumido')}>
                <SelectTrigger id="regime">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="simples">Simples Nacional</SelectItem>
                  <SelectItem value="lucro_presumido">Lucro Presumido/Real</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Faturamento e Funcionários */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="faturamento" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Faturamento Anual
              </Label>
              <Input
                id="faturamento"
                type="text"
                value={faturamentoStr}
                onChange={handleFaturamentoChange}
                placeholder="R$ 0,00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="funcionarios" className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Número de Funcionários
              </Label>
              <Input
                id="funcionarios"
                type="text"
                value={funcionariosStr}
                onChange={handleFuncionariosChange}
                placeholder="Ex: 50"
                required
              />
            </div>
          </div>

          {/* Rotatividade e Salário */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="rotatividade" className="flex items-center gap-2">
                <Percent className="h-4 w-4 text-primary" />
                Taxa de Rotatividade (%)
              </Label>
              <Input
                id="rotatividade"
                type="text"
                value={rotatividadeStr}
                onChange={handleRotatividadeChange}
                placeholder="Ex: 15"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="salarioMedio" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                Salário Médio
              </Label>
              <Input
                id="salarioMedio"
                type="text"
                value={salarioMedioStr}
                onChange={handleSalarioMedioChange}
                placeholder="R$ 0,00"
                required
              />
            </div>
          </div>

          {/* Tempo Operacional e Potencial */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="tempoOperacional" className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                % Tempo Operacional Efetivo
              </Label>
              <Input
                id="tempoOperacional"
                type="number"
                min="0"
                max="100"
                value={tempoOperacionalStr}
                onChange={handleTempoOperacionalChange}
                placeholder="70"
              />
              <p className="text-xs text-muted-foreground">
                Percentual do tempo produtivo em relação ao total
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="potencial" className="flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Potencial de Aumento (R$)
              </Label>
              <Input
                id="potencial"
                type="text"
                value={potencialAumentoFaturamentoStr}
                onChange={handlePotencialAumentoFaturamentoChange}
                placeholder="R$ 0,00 (opcional)"
              />
              <p className="text-xs text-muted-foreground">
                Estimativa de crescimento com equipe engajada
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button 
        type="submit" 
        size="lg" 
        className="w-full gap-2"
        disabled={loading}
      >
        <Calculator className="h-5 w-5" />
        {loading ? 'Calculando...' : 'Calcular ROIP'}
      </Button>
    </form>
  );
};
