import { cn } from "@/lib/utils";
import { Check, Lock, ChevronRight } from "lucide-react";
import { JourneyStep } from "@/types/gamification.types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressRing } from "./ProgressRing";
import { useNavigate } from "react-router-dom";
import * as Icons from "lucide-react";
import { LucideIcon } from "lucide-react";

interface StepCardProps {
  step: JourneyStep;
  stepNumber: number;
  isLast?: boolean;
}

export function StepCard({ step, stepNumber, isLast = false }: StepCardProps) {
  const navigate = useNavigate();
  
  const IconComponent = (Icons[step.icon as keyof typeof Icons] as LucideIcon) || Icons.Circle;

  const isClickable = step.status === 'available' || step.status === 'in_progress';
  const isCompleted = step.status === 'completed';
  const isLocked = step.status === 'locked';

  const handleClick = () => {
    if (isClickable) {
      // Add tab query param for direct navigation to specific tabs
      const url = step.route.includes('?') 
        ? `${step.route}&tab=${step.id}` 
        : `${step.route}?tab=${step.id}`;
      navigate(url);
    }
  };

  return (
    <div className="relative">
      {/* Connector line */}
      {!isLast && (
        <div 
          className={cn(
            "absolute left-6 top-16 w-0.5 h-8 -ml-px",
            isCompleted ? "bg-primary" : "bg-muted"
          )}
        />
      )}
      
      <Card 
        className={cn(
          "transition-all duration-200",
          isClickable && "cursor-pointer hover:shadow-md hover:border-primary/50",
          isLocked && "opacity-60",
          isCompleted && "border-primary/30 bg-primary/5"
        )}
        onClick={handleClick}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            {/* Step indicator */}
            <div 
              className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center shrink-0 border-2",
                isCompleted && "bg-primary border-primary text-primary-foreground",
                step.status === 'in_progress' && "border-primary bg-primary/10",
                step.status === 'available' && "border-muted-foreground/30 bg-muted/50",
                isLocked && "border-muted bg-muted/30"
              )}
            >
              {isCompleted ? (
                <Check className="w-5 h-5" />
              ) : isLocked ? (
                <Lock className="w-4 h-4 text-muted-foreground" />
              ) : (
                <IconComponent className="w-5 h-5" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-muted-foreground">
                  Passo {stepNumber}
                </span>
                {step.status === 'in_progress' && (
                  <Badge variant="secondary" className="text-xs">
                    Em andamento
                  </Badge>
                )}
                {isCompleted && (
                  <Badge className="text-xs bg-primary/20 text-primary border-0">
                    Concluído
                  </Badge>
                )}
              </div>
              <h4 className={cn(
                "font-medium truncate",
                isLocked && "text-muted-foreground"
              )}>
                {step.title}
              </h4>
              <p className="text-sm text-muted-foreground line-clamp-1">
                {step.description}
              </p>
            </div>

            {/* Points and progress */}
            <div className="flex items-center gap-3 shrink-0">
              {step.status === 'in_progress' && step.progress_percentage > 0 && (
                <ProgressRing 
                  progress={step.progress_percentage} 
                  size={40} 
                  strokeWidth={4}
                  showPercentage={false}
                >
                  <span className="text-xs font-medium">
                    {step.progress_percentage}%
                  </span>
                </ProgressRing>
              )}
              
              <div className="text-right">
                <span className={cn(
                  "text-sm font-semibold",
                  isCompleted ? "text-primary" : "text-muted-foreground"
                )}>
                  +{step.points}
                </span>
                <span className="text-xs text-muted-foreground block">pts</span>
              </div>

              {isClickable && (
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
