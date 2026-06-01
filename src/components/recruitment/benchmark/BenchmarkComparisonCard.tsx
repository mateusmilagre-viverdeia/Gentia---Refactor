import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { BenchmarkComparison } from "@/hooks/useRecruitmentBenchmark";

interface BenchmarkComparisonCardProps {
  comparison: BenchmarkComparison;
}

export function BenchmarkComparisonCard({ comparison }: BenchmarkComparisonCardProps) {
  const {
    metricLabel,
    companyValue,
    marketValue,
    percentageDiff,
    status,
    isPositiveBetter,
    unit,
  } = comparison;

  // Determine if the current status is good, bad, or neutral
  const isGood = isPositiveBetter
    ? status === "above"
    : status === "below";
  
  const isBad = isPositiveBetter
    ? status === "below"
    : status === "above";

  const getStatusColor = () => {
    if (status === "at") return "text-muted-foreground";
    if (isGood) return "text-emerald-600";
    return "text-red-500";
  };

  const getStatusBg = () => {
    if (status === "at") return "bg-muted/50";
    if (isGood) return "bg-emerald-50 dark:bg-emerald-950/20";
    return "bg-red-50 dark:bg-red-950/20";
  };

  const getStatusIcon = () => {
    if (status === "at") return <Minus className="h-4 w-4" />;
    if (status === "above") return <TrendingUp className="h-4 w-4" />;
    return <TrendingDown className="h-4 w-4" />;
  };

  const getStatusText = () => {
    if (status === "at") return "Na média do mercado";
    
    const direction = isPositiveBetter
      ? (status === "above" ? "melhor" : "abaixo")
      : (status === "below" ? "melhor" : "acima");
    
    return `${Math.abs(percentageDiff).toFixed(0)}% ${direction} que o mercado`;
  };

  // Calculate progress for visual bar
  const maxValue = Math.max(companyValue, marketValue) * 1.2;
  const companyProgress = (companyValue / maxValue) * 100;
  const marketProgress = (marketValue / maxValue) * 100;

  return (
    <Card className={cn("transition-colors", getStatusBg())}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{metricLabel}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Values comparison */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-2xl font-bold">
              {companyValue}
              <span className="text-sm font-normal text-muted-foreground ml-1">
                {unit}
              </span>
            </p>
            <p className="text-xs text-muted-foreground">Sua empresa</p>
          </div>
          <div className="text-right">
            <p className="text-lg text-muted-foreground">
              {marketValue}
              <span className="text-sm ml-1">{unit}</span>
            </p>
            <p className="text-xs text-muted-foreground">Mercado</p>
          </div>
        </div>

        {/* Visual progress bars */}
        <div className="space-y-2">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span>Você</span>
              <span className="text-muted-foreground">{companyValue}{unit}</span>
            </div>
            <Progress 
              value={companyProgress} 
              className={cn(
                "h-2",
                isGood ? "[&>div]:bg-emerald-500" : isBad ? "[&>div]:bg-red-500" : ""
              )}
            />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span>Mercado</span>
              <span className="text-muted-foreground">{marketValue}{unit}</span>
            </div>
            <Progress 
              value={marketProgress} 
              className="h-2 [&>div]:bg-muted-foreground/40"
            />
          </div>
        </div>

        {/* Status indicator */}
        <div className={cn(
          "flex items-center gap-2 text-sm font-medium",
          getStatusColor()
        )}>
          {getStatusIcon()}
          <span>{getStatusText()}</span>
        </div>
      </CardContent>
    </Card>
  );
}
