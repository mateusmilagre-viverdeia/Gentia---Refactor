import { useState } from 'react';
import { MoreVertical, Pencil, StickyNote, Trash2, Plus, User, Tag, Users, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { NotesPanel } from './NotesPanel';
import { TagsPanel, type NodeTag } from './TagsPanel';
import type { OrgChartNodeWithChildren, NodePerson } from '@/types/org-chart.types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface OrgChartNodeComponentProps {
  node: OrgChartNodeWithChildren;
  onEdit: (node: OrgChartNodeWithChildren) => void;
  onAddChild: (parentId: string) => void;
  onDelete: (nodeId: string) => void;
  onUpdateNotes: (nodeId: string, notes: string) => void;
  onUpdateTags: (nodeId: string, tags: NodeTag[]) => void;
  selectedNodeId?: string | null;
  onSelect?: (nodeId: string) => void;
  onMoveNode?: (nodeId: string, newParentId: string | null) => Promise<void>;
  isRoot?: boolean;
}

// Get people from node, handling migration from old single person
function getPeople(node: OrgChartNodeWithChildren): NodePerson[] {
  if (node.people && node.people.length > 0) {
    return node.people;
  }
  if (node.person_name) {
    return [{ name: node.person_name, avatar: node.person_avatar }];
  }
  return [];
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export function OrgChartNodeComponent({
  node,
  onEdit,
  onAddChild,
  onDelete,
  onUpdateNotes,
  onUpdateTags,
  selectedNodeId,
  onSelect,
  onMoveNode,
  isRoot = false,
}: OrgChartNodeComponentProps) {
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isTagsOpen, setIsTagsOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  
  const people = getPeople(node);
  const peopleCount = people.length;
  const hasChildren = node.children.length > 0;
  const isVacant = node.vacancy_status === 'vacant';
  const isSelected = selectedNodeId === node.id;

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', node.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const draggedId = e.dataTransfer.types.includes('text/plain');
    if (draggedId) {
      e.dataTransfer.dropEffect = 'move';
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const draggedId = e.dataTransfer.getData('text/plain');
    if (!draggedId || draggedId === node.id || !onMoveNode) return;
    await onMoveNode(draggedId, node.id);
    toast.success('Cargo movido com sucesso!');
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger selection if clicking on interactive elements
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('[role="menuitem"]')) {
      return;
    }
    onSelect?.(node.id);
  };

  // Render people section based on count
  const renderPeopleSection = () => {
    if (peopleCount === 0) {
      // No one assigned - vacancy
      return (
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border">
            <AvatarFallback className="bg-muted text-muted-foreground">
              <User className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">Vaga em aberto</p>
            <p className="text-xs text-muted-foreground">Seat Holder</p>
          </div>
        </div>
      );
    }

    if (peopleCount === 1) {
      // Single person - large avatar + name
      const person = people[0];
      const initials = getInitials(person.name);
      return (
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border">
            {person.avatar ? <AvatarImage src={person.avatar} /> : null}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{person.name}</p>
          </div>
        </div>
      );
    }

    // Multiple people - stacked avatars + names
    const displayedAvatars = people.slice(0, 4);
    const remainingCount = peopleCount - 4;
    const displayedNames = people.slice(0, 2).map(p => p.name.split(' ')[0]);
    const remainingNames = peopleCount - 2;

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          {/* Stacked avatars */}
          <div className="flex -space-x-2">
            {displayedAvatars.map((person, idx) => (
              <Avatar key={idx} className="h-8 w-8 border-2 border-background">
                {person.avatar ? <AvatarImage src={person.avatar} /> : null}
                <AvatarFallback className="text-xs">{getInitials(person.name)}</AvatarFallback>
              </Avatar>
            ))}
            {remainingCount > 0 && (
              <div className="h-8 w-8 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                <span className="text-xs font-medium text-muted-foreground">+{remainingCount}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span className="text-sm font-medium">{peopleCount} pessoas</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {displayedNames.join(', ')}{remainingNames > 0 ? ` +${remainingNames} mais` : ''}
        </p>
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center">
      {/* Node Card */}
      <Card 
        data-node-id={node.id}
        draggable
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "w-64 relative group hover:shadow-md transition-all cursor-pointer",
          isVacant && "border-red-300 bg-red-50 dark:bg-red-950/20 dark:border-red-800",
          isSelected && "ring-2 ring-primary ring-offset-2 shadow-lg",
          isDragOver && "ring-2 ring-blue-400 ring-offset-2 bg-blue-50 dark:bg-blue-950/30 scale-105"
        )}
        onClick={handleCardClick}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect?.(node.id);
          }
        }}
      >
        <CardHeader className="p-3 pb-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={cn(
                "text-xs font-bold uppercase tracking-wide",
                isVacant ? "text-red-600 dark:text-red-400" : "text-muted-foreground"
              )}>
                {node.title}
              </span>
              {isVacant && (
                <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 rounded">
                  Pendente
                </span>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-primary hover:text-primary"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(node)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsNotesOpen(true)}>
                  <StickyNote className="h-4 w-4 mr-2" />
                  Anotações
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsTagsOpen(true)}>
                  <Tag className="h-4 w-4 mr-2" />
                  Tags
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => setIsDeleteOpen(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="p-3 pt-2">
          {renderPeopleSection()}
          
          {/* Tags */}
          {node.tags && node.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {node.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 text-xs font-medium rounded-full text-white"
                  style={{ backgroundColor: tag.color }}
                >
                  {tag.text}
                </span>
              ))}
            </div>
          )}
          {node.roles && node.roles.length > 0 && (
            <div className="mt-3 pt-3 border-t">
              <p className="text-xs font-medium text-muted-foreground mb-1">RESPONSABILIDADES</p>
              <ul className="space-y-0.5">
                {node.roles.slice(0, 5).map((role, idx) => (
                  <li key={idx} className="text-xs flex items-start gap-1.5">
                    <span className="text-muted-foreground mt-0.5">•</span>
                    <span className="line-clamp-1">{role}</span>
                  </li>
                ))}
                {node.roles.length > 5 && (
                  <li className="text-xs text-muted-foreground">
                    +{node.roles.length - 5} mais
                  </li>
                )}
              </ul>
            </div>
          )}
        </CardContent>

        {/* Add Child Button */}
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <Button
            variant="outline"
            size="icon"
            className="h-6 w-6 rounded-full bg-background shadow-sm"
            onClick={(e) => {
              e.stopPropagation();
              onAddChild(node.id);
            }}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </Card>

      {/* Connector Line Down */}
      {hasChildren && (
        <div className="w-px h-6 bg-border" />
      )}

      {/* Children */}
      {hasChildren && (
        <div className="relative">
          {/* Horizontal Line */}
          {node.children.length > 1 && (
            <div 
              className="absolute top-0 h-px bg-border"
              style={{
                left: `calc(50% - ${(node.children.length - 1) * 140}px)`,
                width: `${(node.children.length - 1) * 280}px`,
              }}
            />
          )}
          
          {/* Children Nodes */}
          <div className="flex gap-4">
            {node.children.map((child) => (
              <div key={child.id} className="flex flex-col items-center">
                {/* Vertical line from horizontal to child */}
                <div className="w-px h-6 bg-border" />
                <OrgChartNodeComponent
                  node={child}
                  onEdit={onEdit}
                  onAddChild={onAddChild}
                  onDelete={onDelete}
                  onUpdateNotes={onUpdateNotes}
                  onUpdateTags={onUpdateTags}
                  selectedNodeId={selectedNodeId}
                  onSelect={onSelect}
                  onMoveNode={onMoveNode}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir "{node.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              {hasChildren
                ? 'Este cargo possui subordinados. Todos serão excluídos junto com ele.'
                : 'Esta ação não pode ser desfeita.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onDelete(node.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Notes Panel */}
      <NotesPanel
        open={isNotesOpen}
        onOpenChange={setIsNotesOpen}
        nodeTitle={node.title}
        notes={node.notes || ''}
        onSave={(notes) => onUpdateNotes(node.id, notes)}
      />

      {/* Tags Panel */}
      <TagsPanel
        open={isTagsOpen}
        onOpenChange={setIsTagsOpen}
        nodeTitle={node.title}
        tags={node.tags || []}
        onSave={(tags) => onUpdateTags(node.id, tags)}
      />
    </div>
  );
}
