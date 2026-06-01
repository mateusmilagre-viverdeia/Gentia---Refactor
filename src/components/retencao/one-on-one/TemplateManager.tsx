import { useState } from 'react';
import { Plus, Trash2, GripVertical, FileText, Pencil, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
} from '@/components/ui/alert-dialog';
import { MeetingItemType, MeetingTemplate } from '@/hooks/useOneOnOneMeetings';
import { cn } from '@/lib/utils';

interface TemplateItem {
  type: MeetingItemType;
  content: string;
}

interface TemplateManagerProps {
  templates: MeetingTemplate[];
  onCreateTemplate: (data: { name: string; description: string; items: TemplateItem[] }) => Promise<MeetingTemplate | void>;
  onUpdateTemplate: (id: string, data: { name: string; description: string; items: TemplateItem[] }) => Promise<void>;
  onDeleteTemplate: (id: string) => Promise<void>;
  isLoading?: boolean;
}

const ITEM_TYPE_LABELS: Record<MeetingItemType, string> = {
  topic: 'Tópico',
  action: 'Ação',
  feedback: 'Feedback',
  blocker: 'Bloqueio',
};

const ITEM_TYPE_COLORS: Record<MeetingItemType, string> = {
  topic: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  action: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  feedback: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  blocker: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

function TemplateEditor({
  initialData,
  onSave,
  onCancel,
  isLoading,
}: {
  initialData?: { name: string; description: string; items: TemplateItem[] };
  onSave: (data: { name: string; description: string; items: TemplateItem[] }) => void;
  onCancel: () => void;
  isLoading?: boolean;
}) {
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [items, setItems] = useState<TemplateItem[]>(initialData?.items || []);
  const [newItemType, setNewItemType] = useState<MeetingItemType>('topic');
  const [newItemContent, setNewItemContent] = useState('');

  const addItem = () => {
    if (!newItemContent.trim()) return;
    setItems([...items, { type: newItemType, content: newItemContent.trim() }]);
    setNewItemContent('');
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!name.trim() || items.length === 0) return;
    onSave({ name: name.trim(), description: description.trim(), items });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="template-name">Nome do Modelo</Label>
        <Input
          id="template-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Check-in Mensal"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="template-description">Descrição (opcional)</Label>
        <Textarea
          id="template-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descreva quando usar este modelo..."
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label>Itens da Pauta</Label>
        
        {items.length > 0 && (
          <div className="space-y-2 mb-4">
            {items.map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-2 p-2 rounded-md border bg-muted/30"
              >
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <Badge className={cn('text-xs', ITEM_TYPE_COLORS[item.type])}>
                  {ITEM_TYPE_LABELS[item.type]}
                </Badge>
                <span className="flex-1 text-sm">{item.content}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => removeItem(index)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <Select value={newItemType} onValueChange={(v) => setNewItemType(v as MeetingItemType)}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="topic">Tópico</SelectItem>
              <SelectItem value="action">Ação</SelectItem>
              <SelectItem value="feedback">Feedback</SelectItem>
              <SelectItem value="blocker">Bloqueio</SelectItem>
            </SelectContent>
          </Select>
          <Input
            value={newItemContent}
            onChange={(e) => setNewItemContent(e.target.value)}
            placeholder="Conteúdo do item..."
            className="flex-1"
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addItem())}
          />
          <Button type="button" variant="secondary" size="icon" onClick={addItem}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button 
          onClick={handleSave} 
          disabled={!name.trim() || items.length === 0 || isLoading}
        >
          <Save className="h-4 w-4 mr-2" />
          Salvar Modelo
        </Button>
      </div>
    </div>
  );
}

export function TemplateManager({
  templates,
  onCreateTemplate,
  onUpdateTemplate,
  onDeleteTemplate,
  isLoading,
}: TemplateManagerProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MeetingTemplate | null>(null);

  const customTemplates = templates.filter((t) => t.account_id !== null);
  const globalTemplates = templates.filter((t) => t.account_id === null);

  const handleCreate = async (data: { name: string; description: string; items: TemplateItem[] }) => {
    await onCreateTemplate(data);
    setIsCreateOpen(false);
  };

  const handleUpdate = async (data: { name: string; description: string; items: TemplateItem[] }) => {
    if (!editingTemplate) return;
    await onUpdateTemplate(editingTemplate.id, data);
    setEditingTemplate(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Modelos de Pauta</h3>
          <p className="text-sm text-muted-foreground">
            Crie e gerencie modelos para suas reuniões 1:1
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Modelo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Criar Novo Modelo</DialogTitle>
              <DialogDescription>
                Defina os itens padrão que serão incluídos na pauta
              </DialogDescription>
            </DialogHeader>
            <TemplateEditor
              onSave={handleCreate}
              onCancel={() => setIsCreateOpen(false)}
              isLoading={isLoading}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Custom Templates */}
      {customTemplates.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Seus Modelos</h4>
          <div className="grid gap-3 md:grid-cols-2">
            {customTemplates.map((template) => (
              <Card key={template.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <CardTitle className="text-base">{template.name}</CardTitle>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setEditingTemplate(template)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir modelo?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação não pode ser desfeita. O modelo "{template.name}" será excluído permanentemente.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => onDeleteTemplate(template.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                  {template.description && (
                    <CardDescription className="text-xs">
                      {template.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1">
                    {template.items?.slice(0, 4).map((item, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs font-normal">
                        {item.content.length > 25 ? item.content.substring(0, 25) + '...' : item.content}
                      </Badge>
                    ))}
                    {template.items && template.items.length > 4 && (
                      <Badge variant="outline" className="text-xs font-normal">
                        +{template.items.length - 4}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Global Templates */}
      {globalTemplates.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Modelos Padrão</h4>
          <div className="grid gap-3 md:grid-cols-2">
            {globalTemplates.map((template) => (
              <Card key={template.id} className="bg-muted/30">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-base">{template.name}</CardTitle>
                    {template.is_default && (
                      <Badge variant="secondary" className="text-xs">Padrão</Badge>
                    )}
                  </div>
                  {template.description && (
                    <CardDescription className="text-xs">
                      {template.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1">
                    {template.items?.slice(0, 4).map((item, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs font-normal">
                        {item.content.length > 25 ? item.content.substring(0, 25) + '...' : item.content}
                      </Badge>
                    ))}
                    {template.items && template.items.length > 4 && (
                      <Badge variant="outline" className="text-xs font-normal">
                        +{template.items.length - 4}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingTemplate} onOpenChange={(open) => !open && setEditingTemplate(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Modelo</DialogTitle>
            <DialogDescription>
              Modifique os itens da pauta deste modelo
            </DialogDescription>
          </DialogHeader>
          {editingTemplate && (
            <TemplateEditor
              initialData={{
                name: editingTemplate.name,
                description: editingTemplate.description || '',
                items: editingTemplate.items || [],
              }}
              onSave={handleUpdate}
              onCancel={() => setEditingTemplate(null)}
              isLoading={isLoading}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
