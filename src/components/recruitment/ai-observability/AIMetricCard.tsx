import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface AIMetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  trend?: number;
  trendLabel?: string;
  invertTrend?: boolean; // For metrics where lower is better (e.g., response time)
  color?: "default" | "success" | "warning" | "error";
}

export function AIMetricCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendLabel,
  invertTrend = false,
  color = "default",
}: AIMetricCardProps) {
  const colorClasses = {
    default: "text-primary",
    success: "text-green-600 dark:text-green-400",
    warning: "text-yellow-600 dark:text-yellow-400",
    error: "text-red-600 dark:text-red-400",
  };

  const getTrendIcon = () => {
    if (trend === undefined || trend === 0) {
      return <Minus className="h-3 w-3" />;
    }
    const isPositive = invertTrend ? trend < 0 : trend > 0;
    return isPositive ? (
      <TrendingUp className="h-3 w-3" />
    ) : (
      <TrendingDown className="h-3 w-3" />
    );
  };

  const getTrendColor = () => {
    if (trend === undefined || trend === 0) return "text-muted-foreground";
    const isPositive = invertTrend ? trend < 0 : trend > 0;
    return isPositive ? "text-green-600" : "text-red-600";
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className={cn("text-2xl font-bold", colorClasses[color])}>
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className={cn("p-2 rounded-lg bg-muted", colorClasses[color])}>
            {icon}
          </div>
        </div>

        {trend !== undefined && (
          <div className={cn("flex items-center gap-1 mt-3 text-xs", getTrendColor())}>
            {getTrendIcon()}
            <span>
              {trend > 0 ? "+" : ""}
              {trend.toFixed(1)}%
            </span>
            {trendLabel && (
              <span className="text-muted-foreground ml-1">{trendLabel}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
