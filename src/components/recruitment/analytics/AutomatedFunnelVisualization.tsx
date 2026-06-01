import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Bot, ArrowDown, Heart, BarChart3, Code, CheckCircle2 } from "lucide-react";
import type { AutomatedStepMetrics } from "@/hooks/useAutomatedStepsAnalytics";

interface AutomatedFunnelVisualizationProps {
  steps: AutomatedStepMetrics[];
  isLoading?: boolean;
}

const stepConfig: Record<string, { icon: React.ElementType; color: string; bgColor: string }> = {
  cultural: { icon: Heart, color: "text-pink-500", bgColor: "bg-pink-500" },
  disc: { icon: BarChart3, color: "text-blue-500", bgColor: "bg-blue-500" },
  technical: { icon: Code, color: "text-amber-500", bgColor: "bg-amber-500" },
};

export function AutomatedFunnelVisualization({ steps, isLoading }: AutomatedFunnelVisualizationProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const maxTotal = Math.max(...steps.map((s) => s.totalSessions), 1);
  const finalApproved = steps[steps.length - 1]?.approved || 0;

  // Calculate conversion between steps
  const getConversionToNext = (currentStep: AutomatedStepMetrics, nextStep?: AutomatedStepMetrics) => {
    if (!nextStep) return null;
    if (currentStep.approved === 0) return 0;
    return ((nextStep.totalSessions / currentStep.approved) * 100).toFixed(0);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          Funil Automatizado
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {steps.map((step, index) => {
          const config = stepConfig[step.stepType];
          const Icon = config?.icon || Bot;
          const widthPercent = (step.totalSessions / maxTotal) * 100;
          const nextStep = steps[index + 1];
          const conversionToNext = getConversionToNext(step, nextStep);

          return (
            <div key={step.stepType}>
              {/* Step Bar */}
              <div className="flex items-center gap-3">
                <div className="w-28 flex items-center gap-2 shrink-0">
                  <Icon className={`h-4 w-4 ${config?.color || "text-primary"}`} />
                  <span className="text-sm font-medium truncate">{step.label}</span>
                </div>

                <div className="flex-1 relative">
                  <div className="h-10 bg-muted rounded-lg overflow-hidden">
                    <div
                      className={`h-full ${config?.bgColor || "bg-primary"} transition-all duration-500 flex items-center px-3`}
                      style={{ width: `${Math.max(widthPercent, 10)}%`, opacity: 0.8 }}
                    >
                      <span className="text-white font-semibold text-sm">{step.totalSessions}</span>
                    </div>
                  </div>
                </div>

                <div className="w-24 text-right shrink-0">
                  <span className="text-sm">
                    <span className="text-green-600 font-semibold">{step.approved}</span>
                    <span className="text-muted-foreground"> / {step.completed}</span>
                  </span>
                  <p className="text-xs text-muted-foreground">{step.conversionRate.toFixed(0)}% aprovados</p>
                </div>
              </div>

              {/* Conversion Arrow */}
              {nextStep && (
                <div className="flex items-center justify-center py-1">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <ArrowDown className="h-4 w-4" />
                    <span className="text-xs">
                      {conversionToNext !== null ? `${conversionToNext}% seguem` : "—"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Final Result */}
        <div className="pt-4 border-t mt-4">
          <div className="flex items-center gap-3">
            <div className="w-28 flex items-center gap-2 shrink-0">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Aprovados IA</span>
            </div>

            <div className="flex-1 relative">
              <div className="h-10 bg-muted rounded-lg overflow-hidden">
                <div
                  className="h-full bg-green-500 transition-all duration-500 flex items-center px-3"
                  style={{ width: `${Math.max((finalApproved / maxTotal) * 100, 10)}%`, opacity: 0.9 }}
                >
                  <span className="text-white font-semibold text-sm">{finalApproved}</span>
                </div>
              </div>
            </div>

            <div className="w-24 text-right shrink-0">
              <span className="text-green-600 font-bold text-lg">{finalApproved}</span>
              <p className="text-xs text-muted-foreground">candidatos</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
