import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, X, SkipForward } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useOnboardingProgress,
  type OnboardingStep,
} from "@/hooks/useOnboardingProgress";
import { useAgencyOnboarding } from "./AgencyOnboardingWizardContext";
import { Step1Profile } from "./steps/Step1Profile";
import { Step2Client } from "./steps/Step2Client";
import { Step3Job } from "./steps/Step3Job";
import { Step4Agent } from "./steps/Step4Agent";
import { Step5Candidate } from "./steps/Step5Candidate";
import { Step2Team } from "./steps/Step2Team";
import { Step3Pipeline } from "./steps/Step3Pipeline";
import { Step4Careers } from "./steps/Step4Careers";
import { Step5Credits } from "./steps/Step5Credits";
import { toast } from "sonner";
import logoGentia from "@/assets/logo-gentia.png";

const STEP_LABELS: Record<OnboardingStep, string> = {
  profile: "Perfil",
  client: "Cliente",
  job: "Vaga",
  agent: "Agente",
  candidate: "Candidato",
  team: "Equipe",
  pipeline: "Pipeline",
  careers: "Carreira",
  credits: "Créditos",
  comms: "Comunicação",
  culture: "Cultura & DISC",
  distribution: "Distribuição",
};

export function AgencyOnboardingWizard() {
  const navigate = useNavigate();
  const { progress, currentStep, shouldShow, markStep, dismiss, addSkippedStep, mode, steps } =
    useOnboardingProgress();
  const { isOpen, openWizard, closeWizard, reset } = useAgencyOnboarding();
  const [activeStep, setActiveStep] = useState<OnboardingStep>("profile");

  const isAgency = mode === "agency";
  const totalSteps = steps.length;

  // Auto-open if shouldShow and never manually dismissed in this session
  useEffect(() => {
    if (shouldShow && !isOpen) {
      const k = `agency-onboarding-auto-${progress?.account_id}`;
      if (!sessionStorage.getItem(k)) {
        sessionStorage.setItem(k, "1");
        openWizard();
      }
    }
  }, [shouldShow, isOpen, openWizard, progress?.account_id]);

  // Sync activeStep when opening
  useEffect(() => {
    if (isOpen) setActiveStep(currentStep);
  }, [isOpen, currentStep]);

  const handleClose = async () => {
    closeWizard();
  };

  const handleDismiss = async () => {
    try {
      await dismiss(24);
      toast.message("Lembraremos você em 24h");
    } catch (e) {
      console.error(e);
    }
    closeWizard();
  };

  const goNext = (after: OnboardingStep) => {
    const idx = steps.indexOf(after);
    const next = steps[idx + 1];
    if (next) setActiveStep(next);
  };

  const handleStepComplete = async (step: OnboardingStep) => {
    try {
      await markStep(step);
      goNext(step);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao salvar progresso");
    }
  };

  const handleSkip = async (step: OnboardingStep) => {
    try {
      await addSkippedStep(step);
      goNext(step);
    } catch (e) {
      console.error(e);
    }
  };

  const handleFinish = () => {
    closeWizard();
    reset();
    navigate("/atracao-contratacao/recrutamento");
  };

  const isStepDone = (step: OnboardingStep): boolean => {
    if (!progress) return false;
    const map: Record<OnboardingStep, boolean> = {
      profile: progress.step_profile_done,
      client: progress.step_client_done,
      job: progress.step_job_done,
      agent: progress.step_agent_done,
      candidate: progress.step_candidate_done,
      team: progress.step_team_done,
      pipeline: progress.step_pipeline_done,
      careers: progress.step_careers_done,
      credits: progress.step_credits_done,
      comms: progress.step_comms_done,
      culture: progress.step_culture_done,
      distribution: progress.step_distribution_done,
    };
    return map[step];
  };

  const isStepSkipped = (step: OnboardingStep): boolean => {
    return progress?.skipped_steps?.includes(step) ?? false;
  };

  const headerSubtitle = isAgency
    ? `Configure sua consultoria em ${totalSteps} passos`
    : `Configure seu recrutamento em ${totalSteps} passos`;

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent
        className="max-w-2xl gap-0 p-0 overflow-hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Header */}
        <div className="border-b bg-gradient-to-br from-primary/5 to-transparent px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={logoGentia} alt="GENTIA" className="h-8 w-auto" />
              <div>
                <h2 className="text-base font-semibold">Configuração inicial</h2>
                <p className="text-xs text-muted-foreground">{headerSubtitle}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="text-xs text-muted-foreground"
            >
              Fazer depois
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Stepper */}
          <div className="mt-4 flex items-center gap-1.5">
            {steps.map((step, i) => {
              const done = isStepDone(step);
              const skipped = !done && isStepSkipped(step);
              const active = step === activeStep;
              return (
                <div key={step} className="flex flex-1 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => (done || skipped) && setActiveStep(step)}
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-all",
                      done && "border-success bg-success text-success-foreground",
                      !done && skipped && "border-dashed border-amber-400 bg-amber-50 text-amber-600",
                      !done && !skipped && active && "border-primary bg-primary text-primary-foreground",
                      !done && !skipped && !active && "border-border bg-muted text-muted-foreground"
                    )}
                  >
                    {done ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : skipped ? (
                      <SkipForward className="h-3.5 w-3.5" />
                    ) : (
                      i + 1
                    )}
                  </button>
                  <span
                    className={cn(
                      "hidden text-xs sm:inline",
                      active ? "font-medium text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {STEP_LABELS[step]}
                  </span>
                  {i < steps.length - 1 && (
                    <div
                      className={cn(
                        "h-px flex-1 bg-border",
                        done && "bg-success"
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Body */}
        <div className="max-h-[60vh] overflow-y-auto px-6 py-5">
          {activeStep === "profile" && (
            <Step1Profile mode={mode} onComplete={() => handleStepComplete("profile")} />
          )}
          {activeStep === "client" && isAgency && (
            <Step2Client
              onComplete={() => handleStepComplete("client")}
              onSkip={() => handleSkip("client")}
            />
          )}
          {activeStep === "job" && isAgency && (
            <Step3Job
              mode={mode}
              onComplete={() => handleStepComplete("job")}
              onSkip={() => handleSkip("job")}
            />
          )}
          {activeStep === "agent" && isAgency && (
            <Step4Agent
              onComplete={() => handleStepComplete("agent")}
              onSkip={() => handleSkip("agent")}
            />
          )}
          {activeStep === "candidate" && isAgency && (
            <Step5Candidate
              mode={mode}
              onComplete={() => handleStepComplete("candidate")}
              onSkip={() => handleSkip("candidate")}
              onFinish={handleFinish}
            />
          )}

          {/* Modo Próprio (self) — fluxo novo */}
          {activeStep === "team" && !isAgency && (
            <Step2Team
              onComplete={() => handleStepComplete("team")}
              onSkip={() => handleSkip("team")}
            />
          )}
          {activeStep === "pipeline" && !isAgency && (
            <Step3Pipeline
              onComplete={() => handleStepComplete("pipeline")}
              onSkip={() => handleSkip("pipeline")}
            />
          )}
          {activeStep === "careers" && !isAgency && (
            <Step4Careers
              onComplete={() => handleStepComplete("careers")}
              onSkip={() => handleSkip("careers")}
            />
          )}
          {activeStep === "credits" && !isAgency && (
            <Step5Credits
              onComplete={() => handleStepComplete("credits")}
              onSkip={() => handleSkip("credits")}
              onFinish={handleFinish}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
