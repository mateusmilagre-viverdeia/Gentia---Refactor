import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';
import { 
  ProjectDocument, 
  DocumentCategory, 
  DOCUMENT_CATEGORY_CONFIG, 
  DOCUMENT_CATEGORIES,
  UpdateDocumentParams 
} from '@/types/project-documents.types';

interface DocumentEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: ProjectDocument | null;
  onSave: (id: string, updates: UpdateDocumentParams) => Promise<boolean>;
}

export function DocumentEditDialog({
  open,
  onOpenChange,
  document,
  onSave,
}: DocumentEditDialogProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<DocumentCategory>('general');
  const [description, setDescription] = useState('');
  const [isSharedWithClient, setIsSharedWithClient] = useState(false);
  const [saving, setSaving] = useState(false);

  // Initialize form when document changes
  useState(() => {
    if (document) {
      setName(document.name);
      setCategory(document.category);
      setDescription(document.description || '');
      setIsSharedWithClient(document.is_shared_with_client);
    }
  });

  // Reset form when dialog opens with new document
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && document) {
      setName(document.name);
      setCategory(document.category);
      setDescription(document.description || '');
      setIsSharedWithClient(document.is_shared_with_client);
    }
    onOpenChange(isOpen);
  };

  const handleSubmit = async () => {
    if (!document || !name.trim()) return;

    setSaving(true);
    const success = await onSave(document.id, {
      name: name.trim(),
      category,
      description: description.trim() || null,
      is_shared_with_client: isSharedWithClient,
    });
    setSaving(false);

    if (success) {
      onOpenChange(false);
    }
  };

  if (!document) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Documento</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="edit-doc-name">Nome do documento *</Label>
            <Input
              id="edit-doc-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Contrato de Prestação de Serviços"
              disabled={saving}
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="edit-doc-category">Categoria</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as DocumentCategory)} disabled={saving}>
              <SelectTrigger id="edit-doc-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {DOCUMENT_CATEGORY_CONFIG[cat].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="edit-doc-description">Descrição</Label>
            <Textarea
              id="edit-doc-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Breve descrição do documento..."
              rows={2}
              disabled={saving}
            />
          </div>

          {/* Share with client */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="text-sm font-medium">Compartilhar com cliente</p>
              <p className="text-xs text-muted-foreground">
                O cliente poderá visualizar e baixar este documento
              </p>
            </div>
            <Switch
              checked={isSharedWithClient}
              onCheckedChange={setIsSharedWithClient}
              disabled={saving}
            />
          </div>

          {/* File info (read-only) */}
          <div className="p-3 bg-muted/30 rounded-lg">
            <p className="text-xs text-muted-foreground">Arquivo original</p>
            <p className="text-sm font-medium truncate">{document.file_name}</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
