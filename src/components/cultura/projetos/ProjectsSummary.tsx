import { useEffect, useRef } from "react";
import { useProjects } from "@/contexts/ProjectsContext";
import { useAccountMembers } from "@/hooks/useAccountMembers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Check, Target, User, Users, Calendar, Link2, Lightbulb } from "lucide-react";
import { toast } from "sonner";
import { PERSPECTIVES, QUARTERS } from "@/types/projects.types";
import { ProjectsProgress } from "./ProjectsProgress";
import { VersionHistoryCard } from "../shared/VersionHistoryCard";
import { useJourneyProgress } from "@/hooks/useJourneyProgress";
import { useAchievementChecker } from "@/hooks/useAchievementChecker";
import { useCulturePulseAutoSync } from '@/hooks/useCulturePulseAutoSync';

export function ProjectsSummary() {
  const { projects, setStage, setCurrentProjectIndex, versionHistory, saveVersionSnapshot, restoreVersion } = useProjects();
  const { members } = useAccountMembers();
  const { refetch } = useJourneyProgress();
  const { checkStepCompletion } = useAchievementChecker();
  const { triggerSync } = useCulturePulseAutoSync('Projetos');
  const hasSavedInitial = useRef(false);
  const hasCheckedAchievements = useRef(false);

  // Refetch journey progress and check achievements when summary mounts
  useEffect(() => {
    refetch();
    if (!hasCheckedAchievements.current) {
      hasCheckedAchievements.current = true;
      checkStepCompletion('projetos');
      triggerSync();
    }
  }, [refetch, checkStepCompletion, triggerSync]);

  // Auto-save version on first load
  useEffect(() => {
    if (projects.length > 0 && !hasSavedInitial.current && versionHistory.length === 0) {
      hasSavedInitial.current = true;
      saveVersionSnapshot('initial');
    }
  }, [projects, versionHistory]);

  // Group projects by perspective
  const projectsByPerspective = PERSPECTIVES.map(perspective => ({
    ...perspective,
    projects: projects.filter(p => p.perspective === perspective.id)
  })).filter(p => p.projects.length > 0);

  const handleEditDetails = (index: number) => {
    setCurrentProjectIndex(index);
    setStage(4);
  };

  const handleConcluir = async () => {
    await saveVersionSnapshot('final');
    toast.success('Projetos estratégicos finalizados com sucesso!');
  };

  const getMemberName = (userId: string) => {
    const member = members.find(m => m.user_id === userId);
    return member?.name || userId;
  };

  const getQuarterLabel = (value: string) => {
    return QUARTERS.find(q => q.value === value)?.label || value;
  };

  return (
    <div className="space-y-6">
      <ProjectsProgress stage={5} onStageClick={(s) => setStage(s)} />

      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold">Seus Projetos Estratégicos</h2>
        <p className="text-muted-foreground">
          {projects.length} projeto{projects.length !== 1 ? 's' : ''} selecionado{projects.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Projects by Perspective */}
      <div className="space-y-6">
        {projectsByPerspective.map((perspective) => (
          <div key={perspective.id} className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">{perspective.icon}</span>
              <h3 className="font-semibold">{perspective.title.replace(perspective.icon + ' ', '')}</h3>
              <Badge variant="secondary">{perspective.projects.length}</Badge>
            </div>
            
            <div className="grid gap-3">
              {perspective.projects.map((project) => {
                const projectIndex = projects.findIndex(p => p.id === project.id);
                
                return (
                  <Card key={project.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          {/* Project Name */}
                          <div className="flex items-center gap-2">
                            <Target className="h-4 w-4 text-primary" />
                            <h4 className="font-medium">{project.project_name}</h4>
                            {project.is_custom && (
                              <Badge variant="outline" className="text-xs">Personalizado</Badge>
                            )}
                          </div>

                          {/* Details Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                            {project.importance && (
                              <div className="flex items-start gap-2">
                                <Lightbulb className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
                                <span className="text-muted-foreground">{project.importance}</span>
                              </div>
                            )}
                            
                            {project.linked_indicator && project.linked_indicator.length > 0 && (
                              <div className="flex items-start gap-2">
                                <Link2 className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                                <div className="flex flex-wrap gap-1">
                                  {project.linked_indicator.map((ind, idx) => (
                                    <Badge key={idx} variant="secondary" className="text-xs">{ind}</Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {project.responsible && (
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-green-500 shrink-0" />
                                <span className="text-muted-foreground">{project.responsible}</span>
                              </div>
                            )}

                            {project.involved_members && project.involved_members.length > 0 && (
                              <div className="flex items-start gap-2">
                                <Users className="h-4 w-4 text-violet-500 shrink-0 mt-0.5" />
                                <div className="flex flex-wrap gap-1">
                                  {project.involved_members.map((userId) => (
                                    <Badge key={userId} variant="outline" className="text-xs">{getMemberName(userId)}</Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {project.start_quarter && (
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-orange-500 shrink-0" />
                                <span className="text-muted-foreground">{getQuarterLabel(project.start_quarter)}</span>
                              </div>
                            )}
                          </div>

                          {/* Empty state for details */}
                          {!project.importance && !project.linked_indicator && !project.responsible && !project.start_quarter && (
                            <p className="text-xs text-muted-foreground italic">
                              Nenhum detalhe preenchido
                            </p>
                          )}
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditDetails(projectIndex)}
                        >
                          Editar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {projects.length === 0 && (
        <Card className="py-8">
          <CardContent className="text-center text-muted-foreground">
            <p>Nenhum projeto selecionado.</p>
            <Button variant="outline" onClick={() => setStage(1)} className="mt-4">
              Selecionar Projetos
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Version History */}
      <VersionHistoryCard
        history={versionHistory}
        renderPreview={(snapshot) => {
          const data = snapshot as { projects?: { project_name: string }[] };
          return <span className="text-xs text-muted-foreground">{data.projects?.length || 0} projetos estratégicos</span>;
        }}
        renderDetailedPreview={(snapshot) => {
          const data = snapshot as { projects?: { project_name: string; perspective: string; importance?: string }[] };
          if (!data.projects || data.projects.length === 0) return <span className="text-xs text-muted-foreground">Nenhum projeto</span>;
          return (
            <div className="space-y-1">
              {data.projects.map((p, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                  <span className="text-foreground">{p.project_name}</span>
                  {p.importance && <span className="text-muted-foreground truncate max-w-[200px]">— {p.importance}</span>}
                </div>
              ))}
            </div>
          );
        }}
        onRestore={restoreVersion}
      />

      {/* Navigation */}
      <div className="flex justify-between gap-3 pt-4">
        <Button onClick={() => setStage(4)} variant="outline" size="lg">
          <ChevronLeft className="mr-2 h-5 w-5" />
          Editar Detalhes
        </Button>

        <div className="flex gap-2">
          <Button onClick={() => setStage(1)} variant="outline" size="lg">
            Editar Seleção
          </Button>
          <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/85" onClick={handleConcluir}>
            <Check className="mr-2 h-5 w-5" />
            Concluir
          </Button>
        </div>
      </div>
    </div>
  );
}
