import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Bot, Heart, BarChart3, Code, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import type { AutomatedStepMetrics } from "@/hooks/useAutomatedStepsAnalytics";

interface AutomatedStepsConversionCardsProps {
  steps: AutomatedStepMetrics[];
  overallConversion: number;
  bottleneck: string | null;
  isLoading?: boolean;
}

const stepIcons: Record<string, React.ElementType> = {
  cultural: Heart,
  disc: BarChart3,
  technical: Code,
};

const stepColors: Record<string, string> = {
  cultural: "text-pink-500",
  disc: "text-blue-500",
  technical: "text-amber-500",
};

export function AutomatedStepsConversionCards({
  steps,
  overallConversion,
  bottleneck,
  isLoading,
}: AutomatedStepsConversionCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {steps.map((step) => {
        const Icon = stepIcons[step.stepType] || Bot;
        const colorClass = stepColors[step.stepType] || "text-primary";
        const isBottleneck = step.label === bottleneck;
        const isHighConversion = step.conversionRate >= 70;
        const isLowConversion = step.conversionRate < 50;

        return (
          <Card key={step.stepType} className={isBottleneck ? "border-amber-500/50 bg-amber-500/5" : ""}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className={`h-5 w-5 ${colorClass}`} />
                  <span className="font-medium">{step.label}</span>
                </div>
                {isBottleneck && (
                  <Badge variant="outline" className="text-amber-600 border-amber-500/50 bg-amber-500/10 text-xs">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Gargalo
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Sessões</p>
                  <p className="font-semibold text-lg">{step.totalSessions}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Aprovados</p>
                  <p className="font-semibold text-lg text-green-600">{step.approved}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex items-center gap-1">
                  {isHighConversion ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : isLowConversion ? (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  ) : null}
                  <span
                    className={`font-bold ${
                      isHighConversion ? "text-green-600" : isLowConversion ? "text-red-600" : "text-foreground"
                    }`}
                  >
                    {step.conversionRate.toFixed(0)}%
                  </span>
                  <span className="text-muted-foreground text-xs">taxa</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium">{step.avgScore.toFixed(0)}</span>
                  <span className="text-muted-foreground text-xs"> score</span>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Overall Conversion Card */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <span className="font-medium">Conversão Geral IA</span>
          </div>

          <div className="text-center py-2">
            <p className="text-3xl font-bold text-primary">{overallConversion.toFixed(1)}%</p>
            <p className="text-sm text-muted-foreground">Cultural → Técnico</p>
          </div>

          {bottleneck && (
            <div className="flex items-center gap-1 text-xs text-amber-600 bg-amber-500/10 rounded-md p-2">
              <AlertTriangle className="h-3 w-3" />
              <span>Gargalo identificado: {bottleneck}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
