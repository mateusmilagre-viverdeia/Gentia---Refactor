import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Upload, File, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  DocumentCategory, 
  DOCUMENT_CATEGORY_CONFIG, 
  DOCUMENT_CATEGORIES,
  formatFileSize 
} from '@/types/project-documents.types';

interface DocumentUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (data: {
    file: File;
    name: string;
    category: DocumentCategory;
    description?: string;
    isSharedWithClient: boolean;
  }) => Promise<void>;
  uploading?: boolean;
}

const ACCEPTED_FILE_TYPES = {
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-powerpoint': ['.ppt'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
};

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export function DocumentUploadDialog({
  open,
  onOpenChange,
  onUpload,
  uploading = false,
}: DocumentUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<DocumentCategory>('general');
  const [description, setDescription] = useState('');
  const [isSharedWithClient, setIsSharedWithClient] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0];
      setFile(selectedFile);
      // Auto-fill name from filename if empty
      if (!name) {
        const nameWithoutExtension = selectedFile.name.replace(/\.[^/.]+$/, '');
        setName(nameWithoutExtension);
      }
    }
  }, [name]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES,
    maxSize: MAX_FILE_SIZE,
    maxFiles: 1,
    disabled: uploading,
  });

  const handleSubmit = async () => {
    if (!file || !name.trim()) return;

    await onUpload({
      file,
      name: name.trim(),
      category,
      description: description.trim() || undefined,
      isSharedWithClient,
    });

    // Reset form
    setFile(null);
    setName('');
    setCategory('general');
    setDescription('');
    setIsSharedWithClient(false);
  };

  const handleClose = () => {
    if (!uploading) {
      setFile(null);
      setName('');
      setCategory('general');
      setDescription('');
      setIsSharedWithClient(false);
      onOpenChange(false);
    }
  };

  const removeFile = () => {
    setFile(null);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Enviar Documento</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Dropzone */}
          {!file ? (
            <div
              {...getRootProps()}
              className={cn(
                'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
                isDragActive && !isDragReject && 'border-primary bg-primary/5',
                isDragReject && 'border-destructive bg-destructive/5',
                !isDragActive && 'border-muted-foreground/25 hover:border-primary/50'
              )}
            >
              <input {...getInputProps()} />
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              {isDragReject ? (
                <p className="text-sm text-destructive">Tipo de arquivo não suportado</p>
              ) : isDragActive ? (
                <p className="text-sm text-primary">Solte o arquivo aqui...</p>
              ) : (
                <>
                  <p className="text-sm font-medium">Arraste um arquivo ou clique para selecionar</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PDF, Word, Excel, PowerPoint ou imagens (máx. 50MB)
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
              <File className="h-8 w-8 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={removeFile}
                disabled={uploading}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="doc-name">Nome do documento *</Label>
            <Input
              id="doc-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Contrato de Prestação de Serviços"
              disabled={uploading}
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="doc-category">Categoria</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as DocumentCategory)} disabled={uploading}>
              <SelectTrigger id="doc-category">
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
            <Label htmlFor="doc-description">Descrição</Label>
            <Textarea
              id="doc-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Breve descrição do documento..."
              rows={2}
              disabled={uploading}
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
              disabled={uploading}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={uploading}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!file || !name.trim() || uploading}
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Enviar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
