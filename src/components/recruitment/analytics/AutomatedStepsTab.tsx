import { useAutomatedStepsAnalytics } from "@/hooks/useAutomatedStepsAnalytics";
import type { DashboardPeriod } from "@/hooks/useRecruitmentDashboard";
import { AutomatedStepsConversionCards } from "./AutomatedStepsConversionCards";
import { AutomatedFunnelVisualization } from "./AutomatedFunnelVisualization";
import { ScoreVsThresholdChart } from "./ScoreVsThresholdChart";
import { StepConversionDetails } from "./StepConversionDetails";
import { AutomatedStepsTrendChart } from "./AutomatedStepsTrendChart";
import { Card, CardContent } from "@/components/ui/card";
import { Bot, Lightbulb } from "lucide-react";

interface AutomatedStepsTabProps {
  period: DashboardPeriod;
}

export function AutomatedStepsTab({ period }: AutomatedStepsTabProps) {
  const { data, isLoading } = useAutomatedStepsAnalytics(period);

  const hasData = data && data.steps.some((s) => s.totalSessions > 0);

  // Generate insights based on data
  const insights: string[] = [];
  if (data) {
    data.steps.forEach((step) => {
      if (step.conversionRate < 50 && step.completed > 5) {
        insights.push(
          `${step.label} tem taxa de ${step.conversionRate.toFixed(0)}% - considere revisar critérios ou questões.`
        );
      }
      if (step.avgScore < step.avgThreshold - 10 && step.completed > 5) {
        insights.push(
          `Score médio em ${step.label} (${step.avgScore.toFixed(0)}) está abaixo do threshold (${step.avgThreshold.toFixed(0)}).`
        );
      }
      if (step.pending > step.completed && step.totalSessions > 5) {
        insights.push(`${step.label} tem ${step.pending} sessões pendentes - verifique candidatos sem resposta.`);
      }
    });

    if (data.overallConversion > 0 && data.overallConversion < 30) {
      insights.push(
        `Conversão geral de ${data.overallConversion.toFixed(0)}% está baixa - revise o funil de automação.`
      );
    }
  }

  if (!hasData && !isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center text-center gap-4">
            <Bot className="h-12 w-12 text-muted-foreground" />
            <div>
              <h3 className="font-semibold text-lg">Sem dados de etapas automatizadas</h3>
              <p className="text-muted-foreground text-sm max-w-md mt-1">
                Configure workflows com etapas IA (Cultural, DISC, Técnico) nas suas vagas para ver métricas de
                conversão aqui.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <AutomatedStepsConversionCards
        steps={data?.steps || []}
        overallConversion={data?.overallConversion || 0}
        bottleneck={data?.bottleneck || null}
        isLoading={isLoading}
      />

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AutomatedFunnelVisualization steps={data?.steps || []} isLoading={isLoading} />
        <ScoreVsThresholdChart steps={data?.steps || []} isLoading={isLoading} />
      </div>

      {/* Trend Chart */}
      <AutomatedStepsTrendChart trendData={data?.trendData || []} isLoading={isLoading} />

      {/* Details Table */}
      <StepConversionDetails steps={data?.steps || []} isLoading={isLoading} />

      {/* Insights */}
      {insights.length > 0 && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <Lightbulb className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
              <div className="space-y-2">
                <p className="font-medium">Insights Automáticos</p>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {insights.map((insight, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-amber-500">•</span>
                      {insight}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
