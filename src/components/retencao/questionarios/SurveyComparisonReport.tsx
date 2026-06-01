import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, Minus, BarChart3 } from "lucide-react";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
} from "recharts";
import type { Survey, SurveyStats, QuestionStats } from "@/types/survey.types";
import { formatBRT } from "@/lib/datetime";

export interface SurveyInstanceData {
  survey: Survey;
  stats: SurveyStats;
  questionStats: QuestionStats[];
}

interface SurveyComparisonReportProps {
  instances: SurveyInstanceData[];
  isLoading?: boolean;
}

export function SurveyComparisonReport({ instances, isLoading }: SurveyComparisonReportProps) {
  if (isLoading) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50 animate-pulse" />
        <p>Carregando dados comparativos...</p>
      </div>
    );
  }

  if (instances.length < 2) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="font-medium">Dados insuficientes para comparação</p>
          <p className="text-sm mt-1">
            São necessárias pelo menos 2 execuções do questionário para gerar relatórios comparativos.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Prepare data for charts
  const responseRateData = instances.map((inst) => ({
    name: formatBRT(new Date(inst.survey.start_date), "MMM/yy"),
    fullDate: formatBRT(new Date(inst.survey.start_date), "dd/MM/yyyy"),
    taxaResposta: inst.stats.responseRate,
    respondidos: inst.stats.totalResponded,
    enviados: inst.stats.totalInvited,
  }));

  // Calculate trends
  const latestRate = instances[instances.length - 1]?.stats.responseRate || 0;
  const previousRate = instances[instances.length - 2]?.stats.responseRate || 0;
  const rateTrend = latestRate - previousRate;

  // Get NPS data if available
  const npsData = instances
    .map((inst) => {
      const npsQuestion = inst.questionStats.find((q) => q.questionType === 'nps' && q.nps);
      if (npsQuestion?.nps) {
        return {
          name: formatBRT(new Date(inst.survey.start_date), "MMM/yy"),
          fullDate: formatBRT(new Date(inst.survey.start_date), "dd/MM/yyyy"),
          nps: npsQuestion.nps.score,
          promotores: npsQuestion.nps.promoters,
          neutros: npsQuestion.nps.passives,
          detratores: npsQuestion.nps.detractors,
        };
      }
      return null;
    })
    .filter(Boolean);

  // Get scale averages data
  const scaleQuestions = instances[0]?.questionStats.filter((q) => q.questionType === 'scale') || [];
  const scaleData = scaleQuestions.map((question) => ({
    questionId: question.questionId,
    questionText: question.questionText,
    data: instances.map((inst) => {
      const q = inst.questionStats.find((qs) => qs.questionId === question.questionId);
      return {
        name: formatBRT(new Date(inst.survey.start_date), "MMM/yy"),
        media: q?.average?.toFixed(2) || 0,
      };
    }),
  }));

  const TrendIcon = ({ value }: { value: number }) => {
    if (value > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (value < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Execuções</p>
                <p className="text-3xl font-bold">{instances.length}</p>
              </div>
              <Badge variant="outline">{instances[0]?.survey.recurrence_pattern || 'recorrente'}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Taxa de Resposta Atual</p>
                <p className="text-3xl font-bold">{latestRate}%</p>
              </div>
              <div className="flex items-center gap-1">
                <TrendIcon value={rateTrend} />
                <span
                  className={`text-sm font-medium ${
                    rateTrend > 0 ? 'text-green-500' : rateTrend < 0 ? 'text-red-500' : ''
                  }`}
                >
                  {rateTrend > 0 ? '+' : ''}
                  {rateTrend}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-muted-foreground">Total de Respostas</p>
              <p className="text-3xl font-bold">
                {instances.reduce((acc, inst) => acc + inst.stats.totalResponded, 0)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Response Rate Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Evolução da Taxa de Resposta</CardTitle>
          <CardDescription>Comparativo entre as execuções do questionário</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={responseRateData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number, name: string) => [
                    `${value}%`,
                    name === 'taxaResposta' ? 'Taxa de Resposta' : name,
                  ]}
                  labelFormatter={(label, payload) => {
                    const item = payload?.[0]?.payload;
                    return item?.fullDate || label;
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="taxaResposta"
                  name="Taxa de Resposta"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Participation Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Participação por Período</CardTitle>
          <CardDescription>Número de respostas vs convites enviados</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={responseRateData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  labelFormatter={(label, payload) => {
                    const item = payload?.[0]?.payload;
                    return item?.fullDate || label;
                  }}
                />
                <Legend />
                <Bar dataKey="enviados" name="Enviados" fill="hsl(var(--muted-foreground))" />
                <Bar dataKey="respondidos" name="Respondidos" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* NPS Evolution */}
      {npsData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Evolução do NPS</CardTitle>
            <CardDescription>Score NPS ao longo das execuções</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={npsData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" domain={[-100, 100]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    labelFormatter={(label, payload) => {
                      const item = payload?.[0]?.payload;
                      return item?.fullDate || label;
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="nps"
                    name="NPS Score"
                    stroke="hsl(142, 76%, 36%)"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(142, 76%, 36%)' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scale Questions Evolution */}
      {scaleData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Evolução de Perguntas de Escala</CardTitle>
            <CardDescription>Média das respostas ao longo do tempo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {scaleData.map((sq) => (
              <div key={sq.questionId}>
                <p className="text-sm font-medium mb-2 truncate">{sq.questionText}</p>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={sq.data}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="name" className="text-xs" />
                      <YAxis className="text-xs" domain={[0, 5]} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="media"
                        name="Média"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--primary))' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
