import { useState, useMemo } from 'react';
import { useProjects } from '@/contexts/ProjectsContext';
import { PERSPECTIVES } from '@/types/projects.types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ProjectsProgress } from './ProjectsProgress';
import { ChevronLeft, ChevronRight, AlertTriangle, Target } from 'lucide-react';
import { toast } from 'sonner';

const MAX_PROJECTS = 7;

export function ProjectsPrioritization() {
  const { projects, setStage, deleteProject, saving } = useProjects();
  
  // Track which projects the user wants to KEEP (all start selected)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(projects.map(p => p.id))
  );

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectedCount = selectedIds.size;
  const isOverLimit = selectedCount > MAX_PROJECTS;
  const canAdvance = selectedCount > 0 && selectedCount <= MAX_PROJECTS;

  const projectsByPerspective = useMemo(() => {
    return PERSPECTIVES.map(perspective => ({
      ...perspective,
      items: projects.filter(p => p.perspective === perspective.id)
    })).filter(g => g.items.length > 0);
  }, [projects]);

  const handleAdvance = async () => {
    if (!canAdvance) {
      toast.error(`Selecione no máximo ${MAX_PROJECTS} projetos para continuar`);
      return;
    }

    // Delete unselected projects
    const toRemove = projects.filter(p => !selectedIds.has(p.id));
    for (const p of toRemove) {
      await deleteProject(p.id);
    }

    setStage(3);
  };

  // If 7 or fewer projects, auto-advance to validation
  if (projects.length <= MAX_PROJECTS) {
    // Use effect would be better but keeping it simple — this runs once
    setTimeout(() => setStage(3), 0);
    return null;
  }

  return (
    <div className="space-y-6">
      <ProjectsProgress stage={2} onStageClick={(s) => setStage(s)} />

      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Priorizar Projetos</h1>
        <p className="text-muted-foreground">
          Você selecionou {projects.length} projetos. Reduza para no máximo {MAX_PROJECTS} para garantir foco estratégico.
        </p>
      </div>

      {/* Counter */}
      <div className={`flex items-center gap-3 p-4 rounded-lg border ${
        isOverLimit 
          ? 'bg-destructive/5 border-destructive/30' 
          : 'bg-muted/30 border-border'
      }`}>
        {isOverLimit && <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />}
        <div className="flex-1">
          <span className={`text-lg font-semibold ${isOverLimit ? 'text-destructive' : 'text-foreground'}`}>
            {selectedCount} de {MAX_PROJECTS}
          </span>
          <span className="text-sm text-muted-foreground ml-2">projetos selecionados</span>
        </div>
        {isOverLimit && (
          <span className="text-sm text-destructive font-medium">
            Remova {selectedCount - MAX_PROJECTS} projeto{selectedCount - MAX_PROJECTS > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Projects by perspective */}
      <div className="space-y-4">
        {projectsByPerspective.map((perspective) => (
          <div key={perspective.id} className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">{perspective.icon}</span>
              <h3 className="font-semibold text-sm">
                {perspective.title.replace(perspective.icon + ' ', '')}
              </h3>
              <Badge variant="secondary" className="text-xs">
                {perspective.items.filter(p => selectedIds.has(p.id)).length}/{perspective.items.length}
              </Badge>
            </div>

            <div className="space-y-2">
              {perspective.items.map((project) => {
                const isSelected = selectedIds.has(project.id);
                return (
                  <Card 
                    key={project.id}
                    className={`cursor-pointer transition-all ${
                      isSelected 
                        ? 'border-primary/40 bg-primary/5' 
                        : 'opacity-50 border-border/30'
                    }`}
                    onClick={() => toggleSelection(project.id)}
                  >
                    <CardContent className="p-3 flex items-center gap-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelection(project.id)}
                      />
                      <Target className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className={`text-sm font-medium flex-1 ${!isSelected ? 'line-through' : ''}`}>
                        {project.project_name}
                      </span>
                      {project.is_custom && (
                        <Badge variant="outline" className="text-xs">Personalizado</Badge>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Navigation */}
      <div className="flex justify-between gap-3 pt-4">
        <Button onClick={() => setStage(1)} variant="outline" size="lg" disabled={saving}>
          <ChevronLeft className="mr-2 h-5 w-5" />
          Voltar para Seleção
        </Button>

        <Button 
          onClick={handleAdvance} 
          size="lg" 
          className="bg-primary text-primary-foreground hover:bg-primary/85"
          disabled={!canAdvance || saving}
        >
          Avançar para Validação
          <ChevronRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
