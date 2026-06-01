import { useProjects } from "@/contexts/ProjectsContext";
import { StrategicProjectsPage } from "./StrategicProjectsPage";
import { ProjectsPrioritization } from "./ProjectsPrioritization";
import { ProjectsValidation } from "./ProjectsValidation";
import { ProjectDetailsPage } from "./ProjectDetailsPage";
import { ProjectsSummary } from "./ProjectsSummary";
import { Skeleton } from "@/components/ui/skeleton";

export function ProjectsWizard() {
  const { stage, loading } = useProjects();

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div key={`projects-stage-${stage}`}>
      {stage === 1 && <StrategicProjectsPage />}
      {stage === 2 && <ProjectsPrioritization />}
      {stage === 3 && <ProjectsValidation />}
      {stage === 4 && <ProjectDetailsPage />}
      {stage === 5 && <ProjectsSummary />}
    </div>
  );
}
