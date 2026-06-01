import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calculator, TrendingDown, TrendingUp, Wallet, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCalculadoraEvolution } from '@/hooks/useCalculadoraEvolution';
import { CostEvolutionChart } from '@/components/calculadora/CostEvolutionChart';
import { CostBreakdownChart } from '@/components/calculadora/CostBreakdownChart';
import { SimulationsComparisonTable } from '@/components/calculadora/SimulationsComparisonTable';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value);
};

const CalculadoraEvolutionDashboard = () => {
  const navigate = useNavigate();
  const [months, setMonths] = useState(12);
  const { simulations, monthlyData, currentData, trend, loading, isEmpty } = useCalculadoraEvolution(months);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate('/diagnostico/calculadora-roip')}
                className="text-primary-foreground hover:bg-primary-foreground/10"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-primary-foreground/10 rounded-lg flex items-center justify-center">
                  <Calculator className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">Evolução Calculadora ROIP™</h1>
                  <p className="text-primary-foreground/80 text-sm">
                    Acompanhe a evolução das suas simulações
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Select value={months.toString()} onValueChange={(v) => setMonths(Number(v))}>
                <SelectTrigger className="w-[140px] bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">Últimos 3 meses</SelectItem>
                  <SelectItem value="6">Últimos 6 meses</SelectItem>
                  <SelectItem value="12">Últimos 12 meses</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                onClick={() => navigate('/diagnostico/calculadora-roip')}
                className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
              >
                Nova Simulação
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : isEmpty ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Calculator className="h-16 w-16 text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Nenhuma simulação encontrada</h2>
              <p className="text-muted-foreground mb-6 max-w-md">
                Faça sua primeira simulação na Calculadora ROIP™ para começar a acompanhar a evolução.
              </p>
              <Button onClick={() => navigate('/diagnostico/calculadora-roip')}>
                Fazer Simulação
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                      <Wallet className="h-5 w-5 text-destructive" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Perda Total Atual</p>
                      <p className="text-2xl font-bold text-destructive">
                        {currentData ? formatCurrency(currentData.perdaTotal) : 'R$ 0'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                      trend.direction === 'down' ? 'bg-green-100' : 
                      trend.direction === 'up' ? 'bg-destructive/10' : 'bg-muted'
                    }`}>
                      {trend.direction === 'down' ? (
                        <TrendingDown className="h-5 w-5 text-green-600" />
                      ) : trend.direction === 'up' ? (
                        <TrendingUp className="h-5 w-5 text-destructive" />
                      ) : (
                        <TrendingUp className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Variação de Perdas</p>
                      <p className={`text-2xl font-bold ${
                        trend.direction === 'down' ? 'text-green-600' : 
                        trend.direction === 'up' ? 'text-destructive' : 'text-muted-foreground'
                      }`}>
                        {trend.percentage > 0 ? '+' : ''}{trend.percentage.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Economia Potencial</p>
                      <p className="text-2xl font-bold text-green-600">
                        {currentData ? formatCurrency(currentData.economiaRealista) : 'R$ 0'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <CostEvolutionChart data={monthlyData} />
              <CostBreakdownChart data={monthlyData} />
            </div>

            {/* Table */}
            <SimulationsComparisonTable simulations={simulations} />
          </>
        )}
      </div>
    </div>
  );
};

export default CalculadoraEvolutionDashboard;
