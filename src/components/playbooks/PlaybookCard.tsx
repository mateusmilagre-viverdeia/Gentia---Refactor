import { ProjectPlaybook, getCategoryLabel, getCategoryColor, formatDuration } from '@/types/playbook.types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Copy, Trash2, ToggleLeft, ToggleRight, Clock, Star, Settings } from 'lucide-react';

interface PlaybookCardProps {
  playbook: ProjectPlaybook;
  onEdit: (playbook: ProjectPlaybook) => void;
  onEditMetadata?: (playbook: ProjectPlaybook) => void;
  onDuplicate: (playbook: ProjectPlaybook) => void;
  onToggleActive: (playbook: ProjectPlaybook) => void;
  onDelete: (playbook: ProjectPlaybook) => void;
}

export function PlaybookCard({ playbook, onEdit, onEditMetadata, onDuplicate, onToggleActive, onDelete }: PlaybookCardProps) {
  const categoryColor = getCategoryColor(playbook.category);
  const categoryLabel = getCategoryLabel(playbook.category);

  return (
    <Card className={`relative transition-all hover:shadow-md ${!playbook.is_active ? 'opacity-60' : ''}`}>
      {playbook.is_default && (
        <div className="absolute top-2 right-2">
          <Badge variant="secondary" className="text-xs flex items-center gap-1">
            <Star className="h-3 w-3" />
            Padrão
          </Badge>
        </div>
      )}
      
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 pr-8">
            <CardTitle className="text-base font-semibold line-clamp-1">
              {playbook.name}
            </CardTitle>
            <CardDescription className="mt-1 line-clamp-2">
              {playbook.description || 'Sem descrição'}
            </CardDescription>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(playbook)}>
                <Edit className="h-4 w-4 mr-2" />
                Editar Playbook
              </DropdownMenuItem>
              {onEditMetadata && (
                <DropdownMenuItem onClick={() => onEditMetadata(playbook)}>
                  <Settings className="h-4 w-4 mr-2" />
                  Editar Metadados
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => onDuplicate(playbook)}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onToggleActive(playbook)}>
                {playbook.is_active ? (
                  <>
                    <ToggleLeft className="h-4 w-4 mr-2" />
                    Desativar
                  </>
                ) : (
                  <>
                    <ToggleRight className="h-4 w-4 mr-2" />
                    Ativar
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-destructive"
                onClick={() => onDelete(playbook)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <Badge 
            variant="outline"
            style={{
              backgroundColor: `${categoryColor}15`,
              borderColor: categoryColor,
              color: categoryColor
            }}
          >
            {categoryLabel}
          </Badge>
          
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{formatDuration(playbook.estimated_duration_weeks)}</span>
          </div>
        </div>
        
        {!playbook.is_active && (
          <div className="mt-3 flex items-center gap-1 text-sm text-muted-foreground">
            <ToggleLeft className="h-4 w-4" />
            <span>Inativo</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
