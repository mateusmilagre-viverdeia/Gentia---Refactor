import { ReactNode } from "react";
import { RecruitmentSidebar } from "@/components/recruitment/RecruitmentSidebar";
import { CommunicationAlertsBanner } from "@/components/recruitment/CommunicationAlertsBanner";
import { AgencyOnboardingProvider } from "@/components/onboarding/agency/AgencyOnboardingWizardContext";
import { AgencyOnboardingWizard } from "@/components/onboarding/agency/AgencyOnboardingWizard";
import { OnboardingProgressBar } from "@/components/onboarding/agency/OnboardingProgressBar";
import { CopilotButton } from "@/components/recruitment/copilot";

interface RecruitmentLayoutProps {
  children: ReactNode;
}

export const RecruitmentLayout = ({ children }: RecruitmentLayoutProps) => {
  return (
    <AgencyOnboardingProvider>
      <div className="flex min-h-screen bg-background">
        <RecruitmentSidebar />
        <div className="flex-1 flex flex-col">
          <main className="flex-1 overflow-auto p-6">
            <OnboardingProgressBar />
            <CommunicationAlertsBanner />
            {children}
          </main>
        </div>
        <AgencyOnboardingWizard />
        <div className="fixed bottom-6 right-6 z-40 shadow-lg rounded-md">
          <CopilotButton scope="global" variant="default" label="Copilot IA" />
        </div>
      </div>
    </AgencyOnboardingProvider>
  );
};
