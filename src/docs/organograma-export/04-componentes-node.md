# Fase 4: Componentes Node

## 📋 O que contém
- `NodeForm` - Formulário para criar/editar cargos (com VacancyStatus)
- `OrgChartNode` - Componente visual do nó (com destaque vermelho para vagas)

---

## 1. NodeForm

**Arquivo: `src/components/organograma/NodeForm.tsx`**

```typescript
import { useState, useEffect, useRef } from 'react';
import { Plus, X, Upload, User, Users, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { OrgChartNode, NodePerson, VacancyStatus } from '@/types/org-chart.types';

interface NodeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (title: string, personName?: string, roles?: string[], personAvatar?: string, people?: NodePerson[], vacancyStatus?: VacancyStatus) => void;
  onUpdate?: (updates: Partial<Pick<OrgChartNode, 'title' | 'person_name' | 'roles' | 'person_avatar' | 'people' | 'vacancy_status'>>) => void;
  editingNode?: OrgChartNode | null;
  mode?: 'create' | 'edit';
}

export function NodeForm({
  open,
  onOpenChange,
  onSubmit,
  onUpdate,
  editingNode,
  mode = 'create',
}: NodeFormProps) {
  const [title, setTitle] = useState('');
  const [people, setPeople] = useState<NodePerson[]>([{ name: '', avatar: null }]);
  const [roles, setRoles] = useState<string[]>([]);
  const [newRole, setNewRole] = useState('');
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [vacancyStatus, setVacancyStatus] = useState<VacancyStatus>('active');
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (editingNode && mode === 'edit') {
      setTitle(editingNode.title);
      setRoles(editingNode.roles || []);
      setVacancyStatus(editingNode.vacancy_status || 'active');
      // Migrate from old single person to people array
      if (editingNode.people && editingNode.people.length > 0) {
        setPeople(editingNode.people);
      } else if (editingNode.person_name) {
        setPeople([{ name: editingNode.person_name, avatar: editingNode.person_avatar }]);
      } else {
        setPeople([{ name: '', avatar: null }]);
      }
    } else {
      setTitle('');
      setPeople([{ name: '', avatar: null }]);
      setRoles([]);
      setVacancyStatus('active');
    }
    setNewRole('');
  }, [editingNode, open, mode]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 2MB');
      return;
    }

    setUploadingIndex(index);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `org-chart/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setPeople(prev => prev.map((p, i) => i === index ? { ...p, avatar: publicUrl } : p));
      toast.success('Foto enviada com sucesso');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Erro ao enviar foto');
    } finally {
      setUploadingIndex(null);
    }
  };

  const handleAddPerson = () => {
    if (people.length < 20) {
      setPeople(prev => [...prev, { name: '', avatar: null }]);
    }
  };

  const handleRemovePerson = (index: number) => {
    if (people.length > 1) {
      setPeople(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handlePersonNameChange = (index: number, name: string) => {
    setPeople(prev => prev.map((p, i) => i === index ? { ...p, name } : p));
  };

  const handleRemoveAvatar = (index: number) => {
    setPeople(prev => prev.map((p, i) => i === index ? { ...p, avatar: null } : p));
  };

  const handleAddRole = () => {
    if (newRole.trim() && !roles.includes(newRole.trim())) {
      setRoles(prev => [...prev, newRole.trim()]);
      setNewRole('');
    }
  };

  const handleRemoveRole = (role: string) => {
    setRoles(prev => prev.filter(r => r !== role));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const validPeople = people.filter(p => p.name.trim());
    const firstPerson = validPeople[0];

    if (mode === 'edit' && onUpdate) {
      onUpdate({
        title,
        person_name: firstPerson?.name || null,
        person_avatar: firstPerson?.avatar || null,
        roles,
        people: validPeople.length > 0 ? validPeople : null,
        vacancy_status: vacancyStatus,
      });
    } else {
      onSubmit(
        title, 
        firstPerson?.name, 
        roles.length > 0 ? roles : undefined, 
        firstPerson?.avatar || undefined,
        validPeople.length > 0 ? validPeople : undefined,
        vacancyStatus
      );
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'edit' ? 'Editar Cargo' : 'Novo Cargo'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título do Cargo</Label>
            <Input
              id="title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ex: CEO, Head de Vendas, SDR"
              required
            />
          </div>

          {/* Vacancy Status */}
          <div className="space-y-3">
            <Label>Status da Vaga</Label>
            <RadioGroup
              value={vacancyStatus}
              onValueChange={(value) => setVacancyStatus(value as VacancyStatus)}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="active" id="status-active" />
                <Label 
                  htmlFor="status-active" 
                  className="flex items-center gap-2 cursor-pointer font-normal"
                >
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Ativa
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="vacant" id="status-vacant" />
                <Label 
                  htmlFor="status-vacant" 
                  className="flex items-center gap-2 cursor-pointer font-normal"
                >
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  Faltando
                </Label>
              </div>
            </RadioGroup>
            <p className="text-xs text-muted-foreground">
              {vacancyStatus === 'vacant' 
                ? 'A vaga será destacada em vermelho no organograma'
                : 'Cargo preenchido ou não prioritário'
              }
            </p>
          </div>

          {/* Multiple People Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Pessoas neste cargo
              </Label>
              <span className="text-xs text-muted-foreground">{people.length} pessoa(s)</span>
            </div>
            
            <div className="space-y-3">
              {people.map((person, index) => (
                <div key={index} className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
                  <Avatar className="h-12 w-12 border shrink-0">
                    {person.avatar ? (
                      <AvatarImage src={person.avatar} />
                    ) : null}
                    <AvatarFallback className="bg-muted">
                      <User className="h-5 w-5 text-muted-foreground" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-2">
                    <Input
                      value={person.name}
                      onChange={e => handlePersonNameChange(index, e.target.value)}
                      placeholder={`Nome da pessoa ${index + 1}`}
                      className="h-8"
                    />
                    <div className="flex gap-2">
                      <input
                        type="file"
                        ref={el => fileInputRefs.current[index] = el}
                        onChange={e => handleAvatarUpload(e, index)}
                        accept="image/*"
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => fileInputRefs.current[index]?.click()}
                        disabled={uploadingIndex === index}
                      >
                        <Upload className="h-3 w-3 mr-1" />
                        {uploadingIndex === index ? 'Enviando...' : 'Foto'}
                      </Button>
                      {person.avatar && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-destructive"
                          onClick={() => handleRemoveAvatar(index)}
                        >
                          Remover foto
                        </Button>
                      )}
                    </div>
                  </div>
                  {people.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                      onClick={() => handleRemovePerson(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {people.length < 20 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddPerson}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar pessoa
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <Label>Responsabilidades</Label>
            <div className="flex gap-2">
              <Input
                value={newRole}
                onChange={e => setNewRole(e.target.value)}
                placeholder="Adicionar responsabilidade"
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddRole())}
              />
              <Button type="button" variant="outline" size="icon" onClick={handleAddRole}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {roles.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {roles.map((role, index) => (
                  <Badge key={index} variant="secondary" className="gap-1">
                    {role}
                    <button
                      type="button"
                      onClick={() => handleRemoveRole(role)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              {mode === 'edit' ? 'Salvar' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

---

## 2. OrgChartNode

**Arquivo: `src/components/organograma/OrgChartNode.tsx`**

```typescript
import { useState } from 'react';
import { MoreVertical, Pencil, StickyNote, Trash2, Plus, User, Tag, Users } from 'lucide-react';
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

interface OrgChartNodeComponentProps {
  node: OrgChartNodeWithChildren;
  onEdit: (node: OrgChartNodeWithChildren) => void;
  onAddChild: (parentId: string) => void;
  onDelete: (nodeId: string) => void;
  onUpdateNotes: (nodeId: string, notes: string) => void;
  onUpdateTags: (nodeId: string, tags: NodeTag[]) => void;
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
  isRoot = false,
}: OrgChartNodeComponentProps) {
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isTagsOpen, setIsTagsOpen] = useState(false);
  
  const people = getPeople(node);
  const peopleCount = people.length;
  const hasChildren = node.children.length > 0;
  const isVacant = node.vacancy_status === 'vacant';

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
      <Card className={cn(
        "w-64 relative group hover:shadow-md transition-shadow",
        isVacant && "border-red-300 bg-red-50 dark:bg-red-950/20 dark:border-red-800"
      )}>
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
            onClick={() => onAddChild(node.id)}
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
```

---

## ✅ Checklist da Fase 4

- [ ] Criar `NodeForm.tsx`
- [ ] Criar `OrgChartNode.tsx`
- [ ] Verificar bucket `avatars` criado no Supabase Storage

---

## 📦 Componentes Shadcn Adicionais

```bash
npx shadcn@latest add avatar
npx shadcn@latest add badge
npx shadcn@latest add radio-group
npx shadcn@latest add dropdown-menu
npx shadcn@latest add alert-dialog
npx shadcn@latest add card
```

---

## 🔜 Próxima Fase
Fase 5: Painéis (`05-paineis.md`)
