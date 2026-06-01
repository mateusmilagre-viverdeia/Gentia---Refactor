import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Plus, TrendingUp, BarChart3, Target, Calculator } from 'lucide-react';
import { useROIPEvolution, calculateTrend } from '@/hooks/useROIPEvolution';
import { TrendIndicator } from '@/components/roip/TrendIndicator';
import { EvolutionLineChart } from '@/components/roip/EvolutionLineChart';
import { PillarComparisonChart } from '@/components/roip/PillarComparisonChart';
import { PillarEvolutionTable } from '@/components/roip/PillarEvolutionTable';
import { AIEvolutionAnalysis } from '@/components/roip/AIEvolutionAnalysis';
import { AppLayout } from '@/components/layout/AppLayout';

const ROIPEvolutionDashboard = () => {
  const navigate = useNavigate();
  const [monthsRange, setMonthsRange] = useState('6');
  
  const { data, isLoading, error } = useROIPEvolution(parseInt(monthsRange));

  const currentScore = data?.currentScore ?? null;
  const previousScore = data?.previousScore ?? null;
  const trend = calculateTrend(currentScore, previousScore);

  const currentMonth = data?.monthlyScores?.[data.monthlyScores.length - 1];
  const previousMonth = data?.monthlyScores?.[data.monthlyScores.length - 2];

  const assessmentIds = data?.rawData?.map(a => a.id) || [];

  if (error) {
    return (
      <AppLayout title="Evolução ROIP">
        <div className="container mx-auto p-6">
          <div className="text-center py-12">
            <p className="text-destructive">Erro ao carregar dados de evolução.</p>
            <Button onClick={() => navigate(-1)} className="mt-4">
              Voltar
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Evolução ROIP">
      <div className="container mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Evolução ROIP</h1>
              <p className="text-muted-foreground text-sm">
                Acompanhe a evolução dos seus diagnósticos ao longo do tempo
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Select value={monthsRange} onValueChange={setMonthsRange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">Últimos 3 meses</SelectItem>
                <SelectItem value="6">Últimos 6 meses</SelectItem>
                <SelectItem value="12">Últimos 12 meses</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => navigate('/roip/calculadora-evolution')}>
              <Calculator className="h-4 w-4 mr-2" />
              Evolução Calculadora
            </Button>
            <Button onClick={() => navigate('/app/assessment-roip')}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Avaliação
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : data?.monthlyScores && data.monthlyScores.length > 0 ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Score Atual</p>
                      <p className="text-3xl font-bold">
                        {currentScore?.toFixed(1) ?? '-'}%
                      </p>
                    </div>
                    <div className="p-3 rounded-full bg-primary/10">
                      <Target className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Variação</p>
                      <p className="text-3xl font-bold">
                        {previousScore !== null ? (
                          `${trend.percentage > 0 ? '+' : ''}${trend.percentage.toFixed(1)}%`
                        ) : '-'}
                      </p>
                    </div>
                    <div className="p-3 rounded-full bg-muted">
                      <BarChart3 className="h-6 w-6 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Tendência</p>
                      <div className="mt-2">
                        <TrendIndicator 
                          direction={trend.direction}
                          showLabel
                          size="lg"
                        />
                      </div>
                    </div>
                    <div className="p-3 rounded-full bg-muted">
                      <TrendingUp className="h-6 w-6 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <EvolutionLineChart data={data.monthlyScores} />
              <PillarComparisonChart current={currentMonth} previous={previousMonth} />
            </div>

            {/* Pillar Evolution Table */}
            <PillarEvolutionTable current={currentMonth} previous={previousMonth} />

            {/* AI Analysis */}
            <AIEvolutionAnalysis 
              assessmentIds={assessmentIds}
              hasData={assessmentIds.length >= 2}
            />
          </>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <BarChart3 className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Nenhum diagnóstico encontrado</h3>
              <p className="text-muted-foreground mb-6">
                Complete pelo menos um diagnóstico ROIP para visualizar a evolução.
              </p>
              <Button onClick={() => navigate('/app/assessment-roip')}>
                <Plus className="h-4 w-4 mr-2" />
                Iniciar Diagnóstico
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};

export default ROIPEvolutionDashboard;
