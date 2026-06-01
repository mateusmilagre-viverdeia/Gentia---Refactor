import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, TrendingUp, TrendingDown, Minus, Target, Award, BarChart3, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAccount } from '@/hooks/useAccount';
import { useSurveys } from '@/hooks/useSurveys';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart, BarChart, Bar, Cell, Legend } from 'recharts';
import { formatBRT } from "@/lib/datetime";


interface Benchmark {
  id: string;
  benchmark_type: string;
  sector: string;
  metric_name: string;
  metric_label: string | null;
  min_value: number | null;
  max_value: number | null;
  average_value: number;
  top_quartile: number | null;
  bottom_quartile: number | null;
  source: string | null;
}

interface SurveyHistoryItem {
  surveyId: string;
  title: string;
  date: string;
  value: number;
  category: string;
}

interface QuestionComparison {
  questionNumber: number;
  label: string;
  yourValue: number | null;
  benchmarkAvg: number;
  benchmarkTop: number | null;
  status: 'above' | 'average' | 'below';
}

interface Props {
  onBack: () => void;
}

export function SurveyBenchmarkDashboard({ onBack }: Props) {
  const { account } = useAccount();
  const { surveys, getSurveyStats, getQuestionStats } = useSurveys();
  
  const [benchmarks, setBenchmarks] = useState<Benchmark[]>([]);
  const [selectedSector, setSelectedSector] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<string>('enps');
  const [isLoading, setIsLoading] = useState(true);
  
  // E-NPS data
  const [enpsHistory, setEnpsHistory] = useState<SurveyHistoryItem[]>([]);
  const [currentEnps, setCurrentEnps] = useState<number | null>(null);
  
  // Gallup Q12 data
  const [gallupHistory, setGallupHistory] = useState<SurveyHistoryItem[]>([]);
  const [currentGallupAvg, setCurrentGallupAvg] = useState<number | null>(null);
  const [questionComparisons, setQuestionComparisons] = useState<QuestionComparison[]>([]);

  // Load benchmarks
  useEffect(() => {
    const loadBenchmarks = async () => {
      const { data, error } = await supabase
        .from('survey_benchmarks')
        .select('*')
        .order('benchmark_type')
        .order('metric_name');
      
      if (!error && data) {
        setBenchmarks(data);
      }
    };
    loadBenchmarks();
  }, []);

  // Load survey history and calculate metrics
  const loadSurveyData = useCallback(async () => {
    if (!account?.id) return;
    setIsLoading(true);

    try {
      // Filter surveys by category
      // 'satisfaction' = E-NPS (Pesquisa de Satisfação do Time)
      // 'engagement' = Clima Organizacional (Gallup Q12)
      const enpsSurveys = surveys.filter(s => 
        s.category === 'satisfaction' && s.status === 'closed'
      ).sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
      
      const climaSurveys = surveys.filter(s => 
        s.category === 'engagement' && s.status === 'closed'
      ).sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

      // Calculate E-NPS history
      const enpsItems: SurveyHistoryItem[] = [];
      for (const survey of enpsSurveys) {
        const questionStats = await getQuestionStats(survey.id);
        const npsQuestion = questionStats.find(q => q.questionType === 'nps');
        if (npsQuestion?.nps?.score !== undefined) {
          enpsItems.push({
            surveyId: survey.id,
            title: survey.title,
            date: survey.start_date,
            value: npsQuestion.nps.score,
            category: 'enps',
          });
        }
      }
      setEnpsHistory(enpsItems);
      setCurrentEnps(enpsItems.length > 0 ? enpsItems[enpsItems.length - 1].value : null);

      // Calculate Gallup Q12 history
      const gallupItems: SurveyHistoryItem[] = [];
      let latestQuestionStats: QuestionComparison[] = [];
      
      for (const survey of climaSurveys) {
        const questionStats = await getQuestionStats(survey.id);
        const scaleQuestions = questionStats.filter(q => q.questionType === 'scale');
        
        if (scaleQuestions.length > 0) {
          const avgScore = scaleQuestions.reduce((sum, q) => sum + (q.average || 0), 0) / scaleQuestions.length;
          gallupItems.push({
            surveyId: survey.id,
            title: survey.title,
            date: survey.start_date,
            value: avgScore,
            category: 'gallup_q12',
          });

          // Build question comparisons for the latest survey
          if (survey.id === climaSurveys[climaSurveys.length - 1]?.id) {
            latestQuestionStats = scaleQuestions.slice(0, 12).map((q, index) => {
              const qNum = index + 1;
              const benchmarkData = benchmarks.find(b => 
                b.benchmark_type === 'gallup_q12' && 
                b.sector === selectedSector && 
                b.metric_name === `q${qNum}`
              );
              
              const yourValue = q.average || null;
              const benchmarkAvg = benchmarkData?.average_value || 3.5;
              const benchmarkTop = benchmarkData?.top_quartile || null;
              
              let status: 'above' | 'average' | 'below' = 'average';
              if (yourValue !== null) {
                if (benchmarkTop && yourValue >= benchmarkTop) status = 'above';
                else if (yourValue < benchmarkAvg - 0.2) status = 'below';
              }
              
              return {
                questionNumber: qNum,
                label: benchmarkData?.metric_label || q.questionText.substring(0, 50),
                yourValue,
                benchmarkAvg,
                benchmarkTop,
                status,
              };
            });
          }
        }
      }
      setGallupHistory(gallupItems);
      setCurrentGallupAvg(gallupItems.length > 0 ? gallupItems[gallupItems.length - 1].value : null);
      setQuestionComparisons(latestQuestionStats);
      
    } catch (error) {
      console.error('Error loading survey data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [account?.id, surveys, getQuestionStats, benchmarks, selectedSector]);

  useEffect(() => {
    if (benchmarks.length > 0 && surveys.length > 0) {
      loadSurveyData();
    } else if (surveys.length === 0) {
      setIsLoading(false);
    }
  }, [benchmarks, surveys, loadSurveyData]);

  // Get benchmark for current view
  const getEnpsBenchmark = () => benchmarks.find(b => 
    b.benchmark_type === 'enps' && b.sector === selectedSector && b.metric_name === 'overall'
  );
  
  const getGallupBenchmark = () => benchmarks.find(b => 
    b.benchmark_type === 'gallup_q12' && b.sector === selectedSector && b.metric_name === 'overall'
  );

  // Calculate status and trend
  const getStatus = (value: number | null, benchmark: Benchmark | undefined) => {
    if (value === null || !benchmark) return 'neutral';
    if (benchmark.top_quartile && value >= benchmark.top_quartile) return 'excellent';
    if (value >= benchmark.average_value) return 'above';
    if (benchmark.bottom_quartile && value <= benchmark.bottom_quartile) return 'below';
    return 'average';
  };

  const getTrend = (history: SurveyHistoryItem[]) => {
    if (history.length < 2) return null;
    const current = history[history.length - 1].value;
    const previous = history[history.length - 2].value;
    return current - previous;
  };

  const enpsBenchmark = getEnpsBenchmark();
  const gallupBenchmark = getGallupBenchmark();
  const enpsTrend = getTrend(enpsHistory);
  const gallupTrend = getTrend(gallupHistory);

  const StatusBadge = ({ status }: { status: string }) => {
    const config = {
      excellent: { label: 'Excelente', className: 'bg-green-500/10 text-green-600 border-green-500/20' },
      above: { label: 'Acima da Média', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
      average: { label: 'Na Média', className: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
      below: { label: 'Abaixo', className: 'bg-red-500/10 text-red-600 border-red-500/20' },
      neutral: { label: 'Sem dados', className: 'bg-muted text-muted-foreground' },
    };
    const c = config[status as keyof typeof config] || config.neutral;
    return <Badge variant="outline" className={c.className}>{c.label}</Badge>;
  };

  const TrendIndicator = ({ trend }: { trend: number | null }) => {
    if (trend === null) return null;
    const Icon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
    const color = trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-muted-foreground';
    return (
      <div className={`flex items-center gap-1 ${color}`}>
        <Icon className="h-4 w-4" />
        <span className="text-sm font-medium">{trend > 0 ? '+' : ''}{trend.toFixed(1)}</span>
      </div>
    );
  };

  const sectors = [
    { value: 'all', label: 'Todos os setores' },
    { value: 'technology', label: 'Tecnologia' },
    { value: 'retail', label: 'Varejo' },
    { value: 'finance', label: 'Finanças' },
    { value: 'healthcare', label: 'Saúde' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">Dashboard de Benchmark</h1>
            <p className="text-muted-foreground">Compare seus resultados com referências de mercado</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={selectedSector} onValueChange={setSelectedSector}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sectors.map(s => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="icon" onClick={loadSurveyData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="enps">E-NPS</TabsTrigger>
          <TabsTrigger value="clima">Clima Organizacional (Q12)</TabsTrigger>
        </TabsList>

        {/* E-NPS Tab */}
        <TabsContent value="enps" className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Seu E-NPS</span>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-3xl font-bold">
                  {currentEnps !== null ? (currentEnps > 0 ? '+' : '') + currentEnps : '—'}
                </div>
                <StatusBadge status={getStatus(currentEnps, enpsBenchmark)} />
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Média do Mercado</span>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-3xl font-bold">
                  {enpsBenchmark ? (enpsBenchmark.average_value > 0 ? '+' : '') + enpsBenchmark.average_value : '—'}
                </div>
                <span className="text-xs text-muted-foreground">{enpsBenchmark?.source}</span>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Top 25%</span>
                  <Award className="h-4 w-4 text-amber-500" />
                </div>
                <div className="text-3xl font-bold">
                  {enpsBenchmark?.top_quartile ? (enpsBenchmark.top_quartile > 0 ? '+' : '') + enpsBenchmark.top_quartile : '—'}
                </div>
                <span className="text-xs text-muted-foreground">Zona de excelência</span>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Tendência</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <TrendIndicator trend={enpsTrend} />
                </div>
                <span className="text-xs text-muted-foreground">vs última pesquisa</span>
              </CardContent>
            </Card>
          </div>

          {/* Evolution Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Evolução do E-NPS</CardTitle>
              <CardDescription>Comparativo com benchmarks de mercado ao longo do tempo</CardDescription>
            </CardHeader>
            <CardContent>
              {enpsHistory.length > 0 ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={enpsHistory.map(h => ({
                      date: formatBRT(new Date(h.date), 'MMM/yy'),
                      value: h.value,
                      benchmark: enpsBenchmark?.average_value || 14,
                      top: enpsBenchmark?.top_quartile || 50,
                    }))}>
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis domain={[-100, 100]} className="text-xs" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <ReferenceLine y={enpsBenchmark?.average_value || 14} stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" label={{ value: 'Média', position: 'right', className: 'text-xs fill-muted-foreground' }} />
                      <ReferenceLine y={enpsBenchmark?.top_quartile || 50} stroke="hsl(142 76% 36%)" strokeDasharray="5 5" label={{ value: 'Top 25%', position: 'right', className: 'text-xs fill-green-600' }} />
                      <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fill="url(#colorValue)" strokeWidth={2} name="Seu E-NPS" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-80 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma pesquisa de E-NPS concluída ainda</p>
                    <p className="text-sm">Crie uma pesquisa de Satisfação do Time com pergunta NPS</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Clima Organizacional (Gallup Q12) Tab */}
        <TabsContent value="clima" className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Sua Média Q12</span>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-3xl font-bold">
                  {currentGallupAvg !== null ? currentGallupAvg.toFixed(2) : '—'}
                </div>
                <StatusBadge status={getStatus(currentGallupAvg, gallupBenchmark)} />
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Média do Mercado</span>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-3xl font-bold">
                  {gallupBenchmark?.average_value.toFixed(1) || '—'}
                </div>
                <span className="text-xs text-muted-foreground">{gallupBenchmark?.source}</span>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Top 25%</span>
                  <Award className="h-4 w-4 text-amber-500" />
                </div>
                <div className="text-3xl font-bold">
                  {gallupBenchmark?.top_quartile?.toFixed(1) || '—'}
                </div>
                <span className="text-xs text-muted-foreground">Zona de excelência</span>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Tendência</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <TrendIndicator trend={gallupTrend} />
                </div>
                <span className="text-xs text-muted-foreground">vs última pesquisa</span>
              </CardContent>
            </Card>
          </div>

          {/* Evolution Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Evolução do Clima Organizacional</CardTitle>
              <CardDescription>Média geral das 12 perguntas Gallup ao longo do tempo</CardDescription>
            </CardHeader>
            <CardContent>
              {gallupHistory.length > 0 ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={gallupHistory.map(h => ({
                      date: formatBRT(new Date(h.date), 'MMM/yy'),
                      value: h.value,
                    }))}>
                      <defs>
                        <linearGradient id="colorGallup" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis domain={[1, 5]} className="text-xs" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                        formatter={(value: number) => value.toFixed(2)}
                      />
                      <ReferenceLine y={gallupBenchmark?.average_value || 3.5} stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" label={{ value: 'Média', position: 'right', className: 'text-xs fill-muted-foreground' }} />
                      <ReferenceLine y={gallupBenchmark?.top_quartile || 4.0} stroke="hsl(142 76% 36%)" strokeDasharray="5 5" label={{ value: 'Top 25%', position: 'right', className: 'text-xs fill-green-600' }} />
                      <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fill="url(#colorGallup)" strokeWidth={2} name="Média Q12" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-80 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma pesquisa de clima concluída ainda</p>
                    <p className="text-sm">Crie uma pesquisa de Clima Organizacional com as 12 perguntas Gallup</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Question-by-Question Comparison */}
          {questionComparisons.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Comparativo por Pergunta (Q12)</CardTitle>
                <CardDescription>Sua pontuação em cada pergunta vs benchmark de mercado</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {questionComparisons.map((q) => {
                    const percentage = q.yourValue !== null ? (q.yourValue / 5) * 100 : 0;
                    const benchmarkPercentage = (q.benchmarkAvg / 5) * 100;
                    
                    return (
                      <div key={q.questionNumber} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">Q{q.questionNumber}: {q.label}</span>
                          <div className="flex items-center gap-3">
                            <span className={`font-semibold ${
                              q.status === 'above' ? 'text-green-600' : 
                              q.status === 'below' ? 'text-red-600' : 'text-foreground'
                            }`}>
                              {q.yourValue?.toFixed(1) || '—'}
                            </span>
                            <span className="text-muted-foreground text-xs">
                              (Benchmark: {q.benchmarkAvg.toFixed(1)})
                            </span>
                          </div>
                        </div>
                        <div className="relative h-3 bg-muted rounded-full overflow-hidden">
                          {/* Benchmark marker */}
                          <div 
                            className="absolute top-0 bottom-0 w-0.5 bg-muted-foreground z-10"
                            style={{ left: `${benchmarkPercentage}%` }}
                          />
                          {/* Your value bar */}
                          <div 
                            className={`h-full rounded-full transition-all ${
                              q.status === 'above' ? 'bg-green-500' : 
                              q.status === 'below' ? 'bg-red-500' : 'bg-primary'
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
