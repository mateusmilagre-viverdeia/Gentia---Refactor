import { AppLayout } from "@/components/layout/AppLayout";
import { FileText } from "lucide-react";
import { JobDescriptionTab } from "@/components/atracao/job-description";
import { PageGamificationBanner } from "@/components/gamification";

export default function JobDescription() {
  return (
    <AppLayout 
      title="Job Description" 
      breadcrumb={[
        { label: "Home", href: "/" }, 
        { label: "Atração e Contratação", href: "/atracao-contratacao" }, 
        { label: "Contratação", href: "/atracao-contratacao/contratacao" },
        { label: "Job Description" }
      ]}
    >
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <PageGamificationBanner journeyId="contratacao" stepId="job_description" />
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <FileText className="h-8 w-8" />
            <h1 className="text-3xl font-semibold tracking-tight">Job Description</h1>
          </div>
          <p className="text-muted-foreground">
            Crie descrições de vagas alinhadas com sua cultura organizacional, valores e competências.
          </p>
        </div>

        <JobDescriptionTab />
      </div>
    </AppLayout>
  );
}
