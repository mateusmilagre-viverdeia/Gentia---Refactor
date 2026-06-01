import { AlertTriangle, TrendingDown, TrendingUp, CheckCircle, Info, Lightbulb } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Insight {
  type: 'warning' | 'success' | 'info' | 'action';
  title: string;
  description: string;
  metric?: string;
}

interface OffboardingInsightsProps {
  insights: Insight[];
  isLoading?: boolean;
}

export function OffboardingInsights({ insights, isLoading }: OffboardingInsightsProps) {
  const getInsightIcon = (type: Insight['type']) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />;
      case 'action':
        return <Lightbulb className="h-5 w-5 text-purple-500" />;
    }
  };

  const getInsightBadge = (type: Insight['type']) => {
    switch (type) {
      case 'warning':
        return <Badge variant="outline" className="border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950">Atenção</Badge>;
      case 'success':
        return <Badge variant="outline" className="border-green-500 text-green-600 bg-green-50 dark:bg-green-950">Positivo</Badge>;
      case 'info':
        return <Badge variant="outline" className="border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-950">Info</Badge>;
      case 'action':
        return <Badge variant="outline" className="border-purple-500 text-purple-600 bg-purple-50 dark:bg-purple-950">Ação</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Insights Acionáveis
          </CardTitle>
          <CardDescription>Carregando análises...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (insights.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Insights Acionáveis
          </CardTitle>
          <CardDescription>Recomendações baseadas nos dados</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Info className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Aguardando mais dados para gerar insights.</p>
            <p className="text-sm mt-1">São necessários pelo menos 5 casos para análise.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5" />
          Insights Acionáveis
        </CardTitle>
        <CardDescription>Recomendações baseadas nos dados de offboarding</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {insights.map((insight, index) => (
            <div
              key={index}
              className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
            >
              <div className="shrink-0 mt-0.5">{getInsightIcon(insight.type)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{insight.title}</span>
                  {getInsightBadge(insight.type)}
                </div>
                <p className="text-sm text-muted-foreground">{insight.description}</p>
                {insight.metric && (
                  <p className="text-xs text-muted-foreground mt-1 font-mono">
                    {insight.metric}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Helper function to generate insights from metrics
export function generateInsights(metrics: {
  totalCases: number;
  completedCases: number;
  overdueTasksCount: number;
  checklistCompletionRate: number;
  hasEnoughSamples: boolean;
  avgAvoidability: number | null;
  avgLeadership: number | null;
  avgGrowth: number | null;
  avgWorkload: number | null;
  avgCompensation: number | null;
  enpsScore: number | null;
  topExitReasons: Array<{ reason: string; count: number; percentage: number }>;
  voluntaryPercentage?: number;
  surveyResponseRate?: number;
}): Insight[] {
  const insights: Insight[] = [];

  // Check overdue tasks
  if (metrics.overdueTasksCount > 0) {
    insights.push({
      type: 'warning',
      title: 'Tarefas atrasadas',
      description: `Existem ${metrics.overdueTasksCount} tarefa${metrics.overdueTasksCount > 1 ? 's' : ''} pendente${metrics.overdueTasksCount > 1 ? 's' : ''} atrasada${metrics.overdueTasksCount > 1 ? 's' : ''}. Priorize a conclusão para manter o processo em dia.`,
    });
  }

  // Check checklist completion
  if (metrics.checklistCompletionRate < 70) {
    insights.push({
      type: 'warning',
      title: 'Taxa de conclusão baixa',
      description: 'A taxa de conclusão dos checklists está abaixo de 70%. Revise os processos para garantir que todas as etapas sejam cumpridas.',
      metric: `Taxa atual: ${metrics.checklistCompletionRate}%`,
    });
  } else if (metrics.checklistCompletionRate >= 90) {
    insights.push({
      type: 'success',
      title: 'Excelente taxa de conclusão',
      description: 'Os checklists estão sendo concluídos de forma consistente. Continue assim!',
      metric: `Taxa atual: ${metrics.checklistCompletionRate}%`,
    });
  }

  // Only show survey insights if we have enough data
  if (metrics.hasEnoughSamples) {
    // Check leadership rating
    if (metrics.avgLeadership !== null && metrics.avgLeadership < 3) {
      insights.push({
        type: 'action',
        title: 'Liderança precisa de atenção',
        description: 'A avaliação média de liderança está baixa. Considere implementar programas de desenvolvimento de líderes.',
        metric: `Média: ${metrics.avgLeadership.toFixed(1)}/5`,
      });
    }

    // Check growth opportunities
    if (metrics.avgGrowth !== null && metrics.avgGrowth < 3) {
      insights.push({
        type: 'action',
        title: 'Oportunidades de crescimento',
        description: 'Colaboradores avaliam mal as oportunidades de crescimento. Revise planos de carreira e desenvolvimento.',
        metric: `Média: ${metrics.avgGrowth.toFixed(1)}/5`,
      });
    }

    // Check compensation
    if (metrics.avgCompensation !== null && metrics.avgCompensation < 2.5) {
      insights.push({
        type: 'warning',
        title: 'Compensação abaixo da expectativa',
        description: 'A remuneração é um fator crítico nas saídas. Avalie a competitividade dos salários e benefícios.',
        metric: `Média: ${metrics.avgCompensation.toFixed(1)}/5`,
      });
    }

    // Check avoidability
    if (metrics.avgAvoidability !== null && metrics.avgAvoidability >= 7) {
      insights.push({
        type: 'warning',
        title: 'Muitos desligamentos evitáveis',
        description: 'A maioria dos desligamentos poderia ter sido evitada. Invista em ações preventivas de retenção.',
        metric: `Evitabilidade média: ${metrics.avgAvoidability.toFixed(1)}/10`,
      });
    }

    // eNPS insight
    if (metrics.enpsScore !== null) {
      if (metrics.enpsScore < 0) {
        insights.push({
          type: 'warning',
          title: 'eNPS de saída negativo',
          description: 'Colaboradores saindo não recomendariam a empresa. Isso pode afetar a marca empregadora.',
          metric: `eNPS: ${metrics.enpsScore}`,
        });
      } else if (metrics.enpsScore >= 50) {
        insights.push({
          type: 'success',
          title: 'eNPS de saída positivo',
          description: 'Mesmo ao sair, colaboradores recomendariam a empresa. Bom indicador de clima.',
          metric: `eNPS: ${metrics.enpsScore}`,
        });
      }
    }

    // Top exit reason insight
    if (metrics.topExitReasons.length > 0) {
      const topReason = metrics.topExitReasons[0];
      if (topReason.percentage >= 30) {
        insights.push({
          type: 'info',
          title: `Principal motivo: ${topReason.reason}`,
          description: `Este motivo representa ${topReason.percentage}% das saídas. Foque ações de retenção nesta área.`,
          metric: `${topReason.count} ocorrências`,
        });
      }
    }
  }

  // Survey response rate
  if (metrics.surveyResponseRate !== undefined && metrics.surveyResponseRate < 50) {
    insights.push({
      type: 'info',
      title: 'Baixa taxa de resposta nas pesquisas',
      description: 'Menos da metade dos colaboradores respondem a pesquisa de saída. Considere simplificar ou incentivar.',
      metric: `Taxa: ${metrics.surveyResponseRate.toFixed(0)}%`,
    });
  }

  return insights;
}
