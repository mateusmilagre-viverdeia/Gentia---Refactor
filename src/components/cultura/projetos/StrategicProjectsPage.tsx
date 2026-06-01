import { useMemo } from 'react';
import { useProjects } from '@/contexts/ProjectsContext';
import { PERSPECTIVES, PerspectiveId, Segment } from '@/types/projects.types';
import { SegmentSelector } from './SegmentSelector';
import { ProjectPerspectiveCard } from './ProjectPerspectiveCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RotateCcw, ChevronRight } from 'lucide-react';
import projectsData from '@/data/projetos-estrategicos.json';
import { ProjectsProgress } from './ProjectsProgress';
import { toast } from 'sonner';

type ProjectsDataType = Record<Segment, Record<PerspectiveId, { id: string; name: string }[]>>;
const typedProjectsData = projectsData as ProjectsDataType;

export function StrategicProjectsPage() {
  const { 
    projects, 
    segment, 
    loading, 
    setSegment, 
    setStage,
    toggleProject, 
    addProject,
    updateProject,
    deleteProject,
    clearAllProjects
  } = useProjects();

  const suggestions = useMemo(() => {
    if (!segment) return {};
    return typedProjectsData[segment] || {};
  }, [segment]);

  const projectsByPerspective = useMemo(() => {
    return PERSPECTIVES.reduce((acc, perspective) => {
      acc[perspective.id] = projects.filter((p) => p.perspective === perspective.id);
      return acc;
    }, {} as Record<PerspectiveId, typeof projects>);
  }, [projects]);

  const totalProjects = projects.length;

  const handleAdvance = () => {
    if (totalProjects === 0) {
      toast.error('Selecione pelo menos um projeto para continuar');
      return;
    }
    setStage(2);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-[200px] w-full" />
        {PERSPECTIVES.map((p) => (
          <Skeleton key={p.id} className="h-[80px] w-full" />
        ))}
      </div>
    );
  }

  // Show segment selector if no segment selected
  if (!segment) {
    return (
      <div className="space-y-6">
        <ProjectsProgress stage={1} onStageClick={(s) => setStage(s)} />
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Projetos Estratégicos</h1>
          <p className="text-muted-foreground">
            Selecione projetos estratégicos para cada perspectiva do BSC
          </p>
        </div>
        <SegmentSelector 
          selectedSegment={segment} 
          onSelect={setSegment} 
        />
      </div>
    );
  }

  const currentSegment = { industria: '🏭 Indústria', servicos: '💼 Serviços', produto: '🛒 Produto / Varejo' }[segment];

  return (
    <div className="space-y-6">
      <ProjectsProgress stage={1} onStageClick={(s) => setStage(s)} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Projetos Estratégicos</h1>
          <p className="text-muted-foreground">
            Selecione projetos estratégicos para cada perspectiva do BSC
          </p>
        </div>
        <div className="flex items-center gap-2">
          {totalProjects > 0 && (
            <Badge variant="outline" className="text-sm">
              {totalProjects} projeto{totalProjects !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </div>

      {/* Segment info */}
      <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Segmento:</span>
          <span className="font-medium">{currentSegment}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              clearAllProjects();
            }}
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Mudar Segmento
          </Button>
        </div>
      </div>

      {/* Perspective cards */}
      <div className="space-y-4">
        {PERSPECTIVES.map((perspective) => (
          <ProjectPerspectiveCard
            key={perspective.id}
            perspectiveId={perspective.id}
            title={perspective.title}
            icon={perspective.icon}
            color={perspective.color}
            suggestions={suggestions[perspective.id] || []}
            selectedProjects={projectsByPerspective[perspective.id] || []}
            onToggleProject={(name, isCustom) => toggleProject(name, perspective.id, isCustom)}
            onAddCustomProject={(name) => addProject(name, perspective.id, true)}
            onUpdateProject={(id, name) => updateProject(id, { project_name: name })}
            onDeleteProject={deleteProject}
          />
        ))}
      </div>

      {/* Navigation */}
      <div className="flex justify-end pt-4">
        <Button 
          onClick={handleAdvance} 
          size="lg" 
          className="bg-primary text-primary-foreground hover:bg-primary/85"
          disabled={totalProjects === 0}
        >
          Avançar para Detalhamento
          <ChevronRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
