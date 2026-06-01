import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle, AlertTriangle, XCircle, HelpCircle, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { 
  HealthStatus, 
  getHealthStatusLabel,
  getHealthStatusColor 
} from "@/types/project-health.types";
import { cn } from "@/lib/utils";

interface ProjectHealthBadgeProps {
  score: number;
  status: HealthStatus;
  showScore?: boolean;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  trend?: 'up' | 'down' | 'stable';
  className?: string;
}

export function ProjectHealthBadge({
  score,
  status,
  showScore = true,
  showLabel = false,
  size = 'md',
  trend,
  className,
}: ProjectHealthBadgeProps) {
  const statusColor = getHealthStatusColor(status);
  const statusLabel = getHealthStatusLabel(status);

  const IconComponent = {
    healthy: CheckCircle,
    at_risk: AlertTriangle,
    critical: XCircle,
    unknown: HelpCircle,
  }[status];

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  }[size];

  const iconSize = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  }[size];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline"
            className={cn(
              "flex items-center gap-1.5 font-medium border transition-colors",
              statusColor,
              sizeClasses,
              className
            )}
          >
            <IconComponent className={iconSize} />
            {showScore && (
              <span className="font-semibold">{score}</span>
            )}
            {showLabel && (
              <span>{statusLabel}</span>
            )}
            {trend && trend !== 'stable' && (
              <TrendIcon className={cn(
                iconSize,
                trend === 'up' ? 'text-green-500' : 'text-red-500'
              )} />
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-sm">
            <p className="font-medium">Health Score: {score}/100</p>
            <p className="text-muted-foreground">{statusLabel}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
