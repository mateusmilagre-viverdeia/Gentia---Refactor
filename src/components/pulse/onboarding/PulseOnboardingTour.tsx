import Joyride, { CallBackProps, STATUS, EVENTS, ACTIONS } from "react-joyride";
import { getTourSteps, TourRole } from "./tourSteps";

interface PulseOnboardingTourProps {
  isRunning: boolean;
  stepIndex: number;
  role: TourRole;
  onTourEnd: () => void;
  onStepChange: (index: number) => void;
}

export const PulseOnboardingTour = ({
  isRunning,
  stepIndex,
  role,
  onTourEnd,
  onStepChange,
}: PulseOnboardingTourProps) => {
  const steps = getTourSteps(role);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, action, index, type } = data;

    // Handle tour completion
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      onTourEnd();
      return;
    }

    // Handle step navigation
    if (type === EVENTS.STEP_AFTER) {
      if (action === ACTIONS.NEXT) {
        onStepChange(index + 1);
      } else if (action === ACTIONS.PREV) {
        onStepChange(index - 1);
      }
    }

    // Handle close button
    if (action === ACTIONS.CLOSE) {
      onTourEnd();
    }
  };

  return (
    <Joyride
      steps={steps}
      run={isRunning}
      stepIndex={stepIndex}
      continuous
      showProgress
      showSkipButton
      scrollToFirstStep
      disableOverlayClose
      callback={handleJoyrideCallback}
      locale={{
        back: "Voltar",
        close: "Fechar",
        last: "Concluir",
        next: "Próximo",
        skip: "Pular tour",
      }}
      styles={{
        options: {
          arrowColor: "hsl(var(--card))",
          backgroundColor: "hsl(var(--card))",
          overlayColor: "rgba(0, 0, 0, 0.6)",
          primaryColor: "hsl(var(--primary))",
          textColor: "hsl(var(--foreground))",
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: "12px",
          padding: "20px",
          boxShadow: "0 20px 40px -10px rgba(0, 0, 0, 0.2)",
        },
        tooltipContainer: {
          textAlign: "left",
        },
        tooltipTitle: {
          fontSize: "18px",
          fontWeight: 600,
          marginBottom: "8px",
        },
        tooltipContent: {
          fontSize: "14px",
          lineHeight: 1.6,
          color: "hsl(var(--muted-foreground))",
        },
        buttonNext: {
          backgroundColor: "hsl(var(--primary))",
          borderRadius: "8px",
          fontSize: "14px",
          fontWeight: 500,
          padding: "8px 16px",
        },
        buttonBack: {
          color: "hsl(var(--muted-foreground))",
          fontSize: "14px",
          marginRight: "8px",
        },
        buttonSkip: {
          color: "hsl(var(--muted-foreground))",
          fontSize: "13px",
        },
        spotlight: {
          borderRadius: "12px",
        },
        beaconInner: {
          backgroundColor: "hsl(var(--primary))",
        },
        beaconOuter: {
          backgroundColor: "hsl(var(--primary) / 0.2)",
          borderColor: "hsl(var(--primary))",
        },
      }}
      floaterProps={{
        styles: {
          arrow: {
            length: 8,
            spread: 16,
          },
        },
      }}
    />
  );
};
