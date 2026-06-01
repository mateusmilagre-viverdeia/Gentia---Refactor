import { Rocket, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useOnboardingProgress } from "@/hooks/useOnboardingProgress";
import { useAgencyOnboarding } from "./AgencyOnboardingWizardContext";
import { toast } from "sonner";

export function OnboardingProgressBar() {
  const { shouldShow, completedSteps, totalSteps, dismiss } = useOnboardingProgress();
  const { isOpen, openWizard } = useAgencyOnboarding();

  if (!shouldShow || isOpen) return null;

  const pct = Math.round((completedSteps / totalSteps) * 100);

  const indicatorClass =
    completedSteps <= 1
      ? "bg-destructive"
      : completedSteps <= 3
        ? "bg-warning"
        : "bg-success";

  const handleDismiss = async () => {
    try {
      await dismiss(24);
      toast.message("Lembraremos você em 24h");
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="mb-4 flex items-center gap-4 rounded-lg border bg-card px-4 py-3 shadow-sm">
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          <Rocket className="h-4 w-4 text-primary" />
        </div>
        <span className="text-sm font-medium whitespace-nowrap">
          {completedSteps} de {totalSteps} passos concluídos
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <Progress
          value={pct}
          className="h-2"
          indicatorClassName={cn(indicatorClass)}
        />
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Button size="sm" onClick={openWizard}>
          Continuar configuração
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleDismiss}
          className="text-muted-foreground"
        >
          Fazer depois
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
