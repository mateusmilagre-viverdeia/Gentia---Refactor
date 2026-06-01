import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FolderKanban, DollarSign, Users, Settings, Lightbulb, User, Calendar, Link2, UsersRound } from 'lucide-react';
import { ProjectsDetail } from '@/hooks/useAdminDashboard';

const PERSPECTIVES: Record<string, { label: string; icon: any; color: string }> = {
  financeira: { label: 'Financeira', icon: DollarSign, color: 'bg-blue-100 text-blue-700' },
  clientes: { label: 'Clientes', icon: Users, color: 'bg-purple-100 text-purple-700' },
  processos: { label: 'Processos Internos', icon: Settings, color: 'bg-green-100 text-green-700' },
  aprendizado: { label: 'Aprendizado e Crescimento', icon: Lightbulb, color: 'bg-orange-100 text-orange-700' },
};

const QUARTERS: Record<string, string> = {
  q1: '1º Trimestre',
  q2: '2º Trimestre',
  q3: '3º Trimestre',
  q4: '4º Trimestre',
};

interface AdminProjectsViewProps {
  projects: ProjectsDetail[] | null;
}

export function AdminProjectsView({ projects }: AdminProjectsViewProps) {
  if (!projects || projects.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Projetos estratégicos ainda não foram definidos.</p>
        </CardContent>
      </Card>
    );
  }

  // Group by perspective
  const grouped = projects.reduce((acc, project) => {
    const key = project.perspective || 'outros';
    if (!acc[key]) acc[key] = [];
    acc[key].push(project);
    return acc;
  }, {} as Record<string, ProjectsDetail[]>);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card className="border-2 border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderKanban className="h-5 w-5" />
            Projetos Estratégicos ({projects.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {Object.entries(grouped).map(([key, items]) => {
              const perspective = PERSPECTIVES[key];
              return (
                <Badge key={key} variant="secondary" className="px-3 py-1">
                  {perspective?.label || key}: {items.length}
                </Badge>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Projects by Perspective */}
      {Object.entries(grouped).map(([perspectiveKey, perspectiveProjects]) => {
        const perspective = PERSPECTIVES[perspectiveKey] || { label: perspectiveKey, icon: FolderKanban, color: 'bg-gray-100 text-gray-700' };
        const Icon = perspective.icon;

        return (
          <Card key={perspectiveKey}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className={`p-2 rounded-lg ${perspective.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                {perspective.label}
                <Badge variant="outline" className="ml-auto">
                  {perspectiveProjects.length} projetos
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {perspectiveProjects.map((project, index) => (
                  <div key={project.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <h4 className="font-medium">
                        {index + 1}. {project.project_name}
                        {project.is_custom && (
                          <Badge variant="secondary" className="ml-2 text-xs">✨ Personalizado</Badge>
                        )}
                      </h4>
                    </div>

                    {project.description && (
                      <p className="text-sm text-muted-foreground">{project.description}</p>
                    )}

                    <div className="flex flex-wrap gap-4 text-sm">
                      {project.responsible && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span>{project.responsible}</span>
                        </div>
                      )}
                      
                      {project.start_quarter && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{QUARTERS[project.start_quarter] || project.start_quarter}</span>
                        </div>
                      )}
                      
                      {project.linked_indicator && Array.isArray(project.linked_indicator) && project.linked_indicator.length > 0 && (
                        <div className="flex items-start gap-1 text-muted-foreground">
                          <Link2 className="h-3 w-3 mt-0.5" />
                          <div className="flex flex-wrap gap-1">
                            {project.linked_indicator.map((ind: string, idx: number) => (
                              <Badge key={idx} variant="secondary" className="text-xs">{ind}</Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {project.involved_members && Array.isArray(project.involved_members) && project.involved_members.length > 0 && (
                        <div className="flex items-start gap-1 text-muted-foreground">
                          <UsersRound className="h-3 w-3 mt-0.5" />
                          <span className="text-xs">{project.involved_members.length} envolvido(s)</span>
                        </div>
                      )}
                    </div>

                    {project.importance && (
                      <div className="text-sm">
                        <span className="font-medium">Importância: </span>
                        <span className="text-muted-foreground">{project.importance}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
