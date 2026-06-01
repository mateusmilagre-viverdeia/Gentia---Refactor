import { useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Check, X, Pencil, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ProjectSuggestion, StrategicProject, PerspectiveId } from '@/types/projects.types';

interface ProjectPerspectiveCardProps {
  perspectiveId: PerspectiveId;
  title: string;
  icon: string;
  color: string;
  suggestions: ProjectSuggestion[];
  selectedProjects: StrategicProject[];
  onToggleProject: (name: string, isCustom: boolean) => void;
  onAddCustomProject: (name: string) => void;
  onUpdateProject: (id: string, name: string) => void;
  onDeleteProject: (id: string) => void;
}

export function ProjectPerspectiveCard({
  perspectiveId,
  title,
  icon,
  color,
  suggestions,
  selectedProjects,
  onToggleProject,
  onAddCustomProject,
  onUpdateProject,
  onDeleteProject,
}: ProjectPerspectiveCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [customProjectName, setCustomProjectName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const selectedCount = selectedProjects.length;
  const selectedNames = selectedProjects.map(p => p.project_name);

  const handleAddCustom = () => {
    if (customProjectName.trim()) {
      onAddCustomProject(customProjectName.trim());
      setCustomProjectName('');
    }
  };

  const handleStartEdit = (project: StrategicProject) => {
    setEditingId(project.id);
    setEditingName(project.project_name);
  };

  const handleSaveEdit = () => {
    if (editingId && editingName.trim()) {
      onUpdateProject(editingId, editingName.trim());
      setEditingId(null);
      setEditingName('');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader
        className={cn(
          'cursor-pointer transition-colors hover:bg-muted/50',
          color
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{icon}</span>
            <div>
              <h3 className="font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground">
                {selectedCount} projeto{selectedCount !== 1 ? 's' : ''} selecionado{selectedCount !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {selectedCount > 0 && (
              <Badge variant="secondary">{selectedCount}</Badge>
            )}
            {isExpanded ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-4 space-y-4">
          {/* Suggestions */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              Sugestões de projetos (clique para selecionar)
            </p>
            <div className="space-y-1">
              {suggestions.map((suggestion) => {
                const isSelected = selectedNames.includes(suggestion.name);
                return (
                  <button
                    key={suggestion.id}
                    onClick={() => onToggleProject(suggestion.name, false)}
                    className={cn(
                      'w-full text-left px-3 py-2 rounded-md text-sm transition-colors',
                      isSelected
                        ? 'bg-primary/10 text-primary border border-primary/20'
                        : 'hover:bg-muted border border-transparent'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        'w-4 h-4 rounded-full border-2 flex items-center justify-center',
                        isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/30'
                      )}>
                        {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                      </div>
                      {suggestion.name}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected custom projects */}
          {selectedProjects.filter(p => p.is_custom).length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Projetos customizados
              </p>
              <div className="space-y-1">
                {selectedProjects
                  .filter(p => p.is_custom)
                  .map((project) => (
                    <div
                      key={project.id}
                      className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-md"
                    >
                      {editingId === project.id ? (
                        <>
                          <Input
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="flex-1 h-8"
                            autoFocus
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={handleSaveEdit}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={handleCancelEdit}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <span className="text-sm flex-1">
                            ✨ {project.project_name}
                          </span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => handleStartEdit(project)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive"
                            onClick={() => onDeleteProject(project.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Add custom project */}
          <div className="flex gap-2 pt-2 border-t">
            <Input
              placeholder="Criar projeto customizado..."
              value={customProjectName}
              onChange={(e) => setCustomProjectName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCustom()}
              className="flex-1"
            />
            <Button
              variant="outline"
              onClick={handleAddCustom}
              disabled={!customProjectName.trim()}
            >
              <Plus className="h-4 w-4 mr-1" />
              Adicionar
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
