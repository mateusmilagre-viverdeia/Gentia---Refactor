import { cn } from "@/lib/utils";
import { Journey } from "@/types/gamification.types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressRing } from "./ProgressRing";
import { StepCard } from "./StepCard";
import { ChevronDown, ChevronUp, Trophy } from "lucide-react";
import { useState } from "react";
import * as Icons from "lucide-react";
import { LucideIcon } from "lucide-react";

interface JourneyCardProps {
  journey: Journey;
  defaultExpanded?: boolean;
}

export function JourneyCard({ journey, defaultExpanded = false }: JourneyCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  
  const IconComponent = (Icons[journey.icon as keyof typeof Icons] as LucideIcon) || Icons.Map;
  
  const progressPercentage = journey.totalSteps > 0 
    ? (journey.completedSteps / journey.totalSteps) * 100 
    : 0;
  
  const isComplete = journey.completedSteps === journey.totalSteps && journey.totalSteps > 0;

  return (
    <Card className={cn(
      "overflow-hidden transition-all duration-300",
      isComplete && "border-l-[3px] border-l-emerald-500/60"
    )}>
      <CardHeader 
        className="cursor-pointer hover:bg-muted/30 transition-colors py-4"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-4">
          {/* Journey icon */}
          <div 
            className={cn(
              "w-11 h-11 rounded-lg flex items-center justify-center shrink-0",
              journey.color || "bg-muted"
            )}
          >
            {isComplete ? (
              <Trophy className="w-5 h-5 text-emerald-600/80 dark:text-emerald-400/80" strokeWidth={1.75} />
            ) : (
              <IconComponent className="w-5 h-5 text-foreground/60" strokeWidth={1.75} />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="font-semibold text-base tracking-tight">{journey.title}</h3>
              {isComplete && (
                <Badge variant="success">
                  Completa
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground line-clamp-1">
              {journey.description}
            </p>
            <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
              <span>{journey.completedSteps}/{journey.totalSteps} passos</span>
              <span className="text-foreground/70 font-medium">
                {journey.earnedPoints}/{journey.totalPoints} pts
              </span>
            </div>
          </div>

          {/* Progress ring */}
          <div className="flex items-center gap-3 shrink-0">
            <ProgressRing 
              progress={progressPercentage} 
              size={56} 
              strokeWidth={5}
              color={isComplete ? 'success' : 'primary'}
            />
            
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
        </div>
      </CardHeader>

      {/* Expandable steps section */}
      <div className={cn(
        "grid transition-all duration-300",
        isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
      )}>
        <div className="overflow-hidden">
          <CardContent className="pt-0 pb-4">
            <div className="border-t pt-4 space-y-2">
              {journey.steps.map((step, index) => (
                <StepCard
                  key={step.id}
                  step={step}
                  stepNumber={index + 1}
                  isLast={index === journey.steps.length - 1}
                />
              ))}
            </div>
          </CardContent>
        </div>
      </div>
    </Card>
  );
}
