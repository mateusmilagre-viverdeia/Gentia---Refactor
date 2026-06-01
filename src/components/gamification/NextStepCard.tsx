import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowRight, Sparkles } from "lucide-react";
import type { JourneyStep } from "@/types/gamification.types";

interface NextStepCardProps {
  step: JourneyStep | null;
  journeyTitle: string;
  journeyIcon: string;
  onContinue: () => void;
}

export function NextStepCard({
  step,
  journeyTitle,
  journeyIcon,
  onContinue,
}: NextStepCardProps) {
  if (!step) {
    return (
      <Card className="border-l-[3px] border-l-emerald-500/60 bg-card">
        <CardContent className="p-6 text-center">
          <Sparkles className="h-8 w-8 mx-auto mb-3 text-emerald-600/70 dark:text-emerald-400/70" strokeWidth={1.5} />
          <h3 className="text-base font-semibold mb-1">Parabéns!</h3>
          <p className="text-sm text-muted-foreground">
            Você completou todas as etapas disponíveis.
          </p>
        </CardContent>
      </Card>
    );
  }

  const isInProgress = step.status === "in_progress";

  return (
    <Card className="border-l-[3px] border-l-primary/50 bg-card overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <span>{journeyIcon}</span>
              <span>{journeyTitle}</span>
            </div>
            
            <h3 className="text-lg font-semibold tracking-tight mb-1">
              {step.title}
            </h3>
            
            <p className="text-sm text-muted-foreground mb-4">
              {step.description}
            </p>

            {isInProgress && step.progress_percentage > 0 && (
              <div className="mb-4">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-muted-foreground">Progresso</span>
                  <span className="font-medium">{step.progress_percentage}%</span>
                </div>
                <Progress value={step.progress_percentage} className="h-1.5" />
              </div>
            )}

            <div className="flex items-center gap-4">
              <Button onClick={onContinue} size="sm" className="gap-2">
                {isInProgress ? "Continuar" : "Começar"}
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs text-muted-foreground">
                +{step.points} pontos
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
