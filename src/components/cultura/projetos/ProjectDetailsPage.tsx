import { useState, useEffect } from "react";
import { useProjects } from "@/contexts/ProjectsContext";
import { useIndicatorsSession } from "@/hooks/useIndicatorsSession";
import { useAccountMembers } from "@/hooks/useAccountMembers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ChevronLeft, ChevronRight, Trash2, Target, Lightbulb, User, Users, Calendar, Link2, Save } from "lucide-react";
import { PERSPECTIVES, QUARTERS } from "@/types/projects.types";
import { ProjectsProgress } from "./ProjectsProgress";
import { UserSelect } from "@/components/shared/UserSelect";
import { toast } from "sonner";

export function ProjectDetailsPage() {
  const { 
    projects, 
    currentProjectIndex, 
    setCurrentProjectIndex, 
    setStage, 
    updateProject,
    updateProjectDetails,
    deleteProject,
    saving 
  } = useProjects();
  
  const { getAllSelectedIndicators } = useIndicatorsSession();
  const indicators = getAllSelectedIndicators();
  const { members } = useAccountMembers();

  const project = projects[currentProjectIndex];

  // Form state
  const [projectName, setProjectName] = useState("");
  const [importance, setImportance] = useState("");
  const [linkedIndicators, setLinkedIndicators] = useState<string[]>([]);
  const [responsible, setResponsible] = useState("");
  const [involvedMembers, setInvolvedMembers] = useState<string[]>([]);
  const [startQuarter, setStartQuarter] = useState("");

  // Load project data when currentProjectIndex changes
  useEffect(() => {
    if (project) {
      setProjectName(project.project_name || "");
      setImportance(project.importance || "");
      setLinkedIndicators(project.linked_indicator || []);
      setResponsible(project.responsible || "");
      setInvolvedMembers(project.involved_members || []);
      setStartQuarter(project.start_quarter || "");
    }
  }, [project, currentProjectIndex]);

  const toggleIndicator = (indicator: string) => {
    setLinkedIndicators(prev => 
      prev.includes(indicator) 
        ? prev.filter(i => i !== indicator) 
        : [...prev, indicator]
    );
  };

  const toggleMember = (userId: string) => {
    setInvolvedMembers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const saveCurrentProject = async () => {
    if (!project) return;

    // Save name if changed
    if (projectName.trim() !== project.project_name) {
      await updateProject(project.id, { project_name: projectName.trim() });
    }

    await updateProjectDetails(project.id, {
      importance: importance.trim(),
      linked_indicator: linkedIndicators,
      responsible: responsible.trim(),
      involved_members: involvedMembers,
      start_quarter: startQuarter
    });
  };

  const handlePrevious = async () => {
    await saveCurrentProject();
    if (currentProjectIndex > 0) {
      setCurrentProjectIndex(currentProjectIndex - 1);
    } else {
      setStage(3);
    }
  };

  const handleNext = async () => {
    await saveCurrentProject();
    if (currentProjectIndex < projects.length - 1) {
      setCurrentProjectIndex(currentProjectIndex + 1);
    } else {
      toast.success("Detalhamento concluído!");
      setStage(5);
    }
  };

  const handleSkipToSummary = async () => {
    await saveCurrentProject();
    setStage(5);
  };

  const handleDeleteProject = async () => {
    if (!project) return;

    await deleteProject(project.id);

    if (projects.length === 1) {
      setStage(3);
    } else if (currentProjectIndex >= projects.length - 1) {
      setCurrentProjectIndex(Math.max(0, currentProjectIndex - 1));
    }
  };

  if (!project) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Nenhum projeto encontrado.</p>
        <Button variant="outline" onClick={() => setStage(1)} className="mt-4">
          ← Voltar para Validação
        </Button>
      </div>
    );
  }

  const perspectiveInfo = PERSPECTIVES.find(p => p.id === project.perspective);

  const getMemberName = (userId: string) => {
    const member = members.find(m => m.user_id === userId);
    return member?.name || userId;
  };

  return (
    <div className="space-y-6">
      <ProjectsProgress stage={4} onStageClick={(s) => setStage(s)} />

      {/* Header with progress */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-sm">
            Projeto {currentProjectIndex + 1} de {projects.length}
          </Badge>
          <Badge className={perspectiveInfo?.color || "bg-muted"}>
            {perspectiveInfo?.icon} {perspectiveInfo?.title.replace(perspectiveInfo?.icon + ' ', '')}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4 mr-1" />
                Excluir
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir projeto?</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir o projeto "{project.project_name}"? Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteProject} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button variant="ghost" size="sm" onClick={handleSkipToSummary}>
            Pular para Resumo →
          </Button>
        </div>
      </div>

      {/* Project Form */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-xl flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            {project.project_name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 1. Project Name */}
          <div className="space-y-2">
            <Label htmlFor="projectName" className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">1.</span>
              Dê um nome para este projeto
            </Label>
            <Input
              id="projectName"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Ex: Implementação do Sistema de CRM"
            />
          </div>

          {/* 2. Importance */}
          <div className="space-y-2">
            <Label htmlFor="importance" className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-yellow-500" />
              <span className="text-muted-foreground text-sm">2.</span>
              Por que este projeto é importante?
            </Label>
            <Textarea
              id="importance"
              value={importance}
              onChange={(e) => setImportance(e.target.value)}
              placeholder="Descreva a importância estratégica deste projeto..."
              rows={3}
            />
          </div>

          {/* 3. Linked Indicators (multi-select) */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-blue-500" />
              <span className="text-muted-foreground text-sm">3.</span>
              Quais indicadores estratégicos este projeto está vinculado?
            </Label>
            {indicators.length > 0 ? (
              <div className="space-y-2 border rounded-lg p-3">
                {indicators.map((indicator, idx) => (
                  <div key={idx} className="flex items-center space-x-2">
                    <Checkbox
                      id={`indicator-${idx}`}
                      checked={linkedIndicators.includes(indicator)}
                      onCheckedChange={() => toggleIndicator(indicator)}
                    />
                    <Label htmlFor={`indicator-${idx}`} className="text-sm font-normal cursor-pointer flex-1">
                      {indicator}
                    </Label>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Nenhum indicador selecionado na aba Indicadores. Complete a aba Indicadores primeiro para vincular projetos.
              </p>
            )}
            {linkedIndicators.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {linkedIndicators.map((ind, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {ind}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* 4. Responsible (single) */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <User className="h-4 w-4 text-green-500" />
              <span className="text-muted-foreground text-sm">4.</span>
              Defina um responsável por este projeto
            </Label>
            <UserSelect
              value={responsible}
              onChange={(userId, userName) => setResponsible(userName)}
              placeholder="Selecione o responsável"
            />
          </div>

          {/* 5. Involved Members (multi-select) */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Users className="h-4 w-4 text-violet-500" />
              <span className="text-muted-foreground text-sm">5.</span>
              Quem são os envolvidos neste projeto?
            </Label>
            {members.length > 0 ? (
              <div className="space-y-2 border rounded-lg p-3 max-h-48 overflow-y-auto">
                {members.map((member) => (
                  <div key={member.user_id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`member-${member.user_id}`}
                      checked={involvedMembers.includes(member.user_id)}
                      onCheckedChange={() => toggleMember(member.user_id)}
                    />
                    <Label htmlFor={`member-${member.user_id}`} className="text-sm font-normal cursor-pointer flex-1">
                      <span>{member.name}</span>
                      {member.email && (
                        <span className="text-xs text-muted-foreground ml-2">{member.email}</span>
                      )}
                    </Label>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Nenhum membro cadastrado na organização.
              </p>
            )}
            {involvedMembers.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {involvedMembers.map((userId) => (
                  <Badge key={userId} variant="outline" className="text-xs">
                    {getMemberName(userId)}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* 6. Start Quarter */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-orange-500" />
              <span className="text-muted-foreground text-sm">6.</span>
              Defina uma data de início para este projeto
            </Label>
            <RadioGroup
              value={startQuarter}
              onValueChange={setStartQuarter}
              className="grid grid-cols-2 md:grid-cols-4 gap-3"
            >
              {QUARTERS.map((q) => (
                <div key={q.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={q.value} id={q.value} />
                  <Label htmlFor={q.value} className="cursor-pointer text-sm font-normal">
                    {q.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-center">
        <Button onClick={saveCurrentProject} disabled={saving} variant="outline">
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Salvando..." : "Salvar Alterações"}
        </Button>
      </div>

      {/* Navigation */}
      <div className="flex justify-between gap-3 pt-4">
        <Button onClick={handlePrevious} variant="outline" size="lg" disabled={saving}>
          <ChevronLeft className="mr-2 h-5 w-5" />
          {currentProjectIndex > 0 ? "Anterior" : "Voltar para Validação"}
        </Button>

        <Button onClick={handleNext} size="lg" disabled={saving} className="bg-primary text-primary-foreground hover:bg-primary/85">
          {currentProjectIndex < projects.length - 1 ? (
            <>
              Próximo
              <ChevronRight className="ml-2 h-5 w-5" />
            </>
          ) : (
            <>
              Ver Resumo
              <ChevronRight className="ml-2 h-5 w-5" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}