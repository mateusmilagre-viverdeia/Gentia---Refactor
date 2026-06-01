import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Download, ExternalLink, FileText, Image as ImageIcon } from 'lucide-react';
import { ProjectDocument, formatFileSize, DOCUMENT_CATEGORY_CONFIG } from '@/types/project-documents.types';
import { supabase } from '@/integrations/supabase/client';

interface DocumentPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: ProjectDocument | null;
  onDownload: (doc: ProjectDocument) => void;
}

export function DocumentPreviewDialog({
  open,
  onOpenChange,
  document,
  onDownload,
}: DocumentPreviewDialogProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && document) {
      loadPreview();
    } else {
      setPreviewUrl(null);
      setError(null);
    }
  }, [open, document]);

  const loadPreview = async () => {
    if (!document) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: urlError } = await supabase.storage
        .from('project-documents')
        .createSignedUrl(document.file_path, 3600);

      if (urlError) throw urlError;
      setPreviewUrl(data.signedUrl);
    } catch (err: any) {
      console.error('Error loading preview:', err);
      setError('Não foi possível carregar a pré-visualização.');
    } finally {
      setLoading(false);
    }
  };

  const isPdf = document?.file_type?.includes('pdf');
  const isImage = document?.file_type?.includes('image');
  const canPreview = isPdf || isImage;

  if (!document) return null;

  const categoryConfig = DOCUMENT_CATEGORY_CONFIG[document.category];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isPdf && <FileText className="h-5 w-5" style={{ color: categoryConfig.color }} />}
            {isImage && <ImageIcon className="h-5 w-5" style={{ color: categoryConfig.color }} />}
            {!canPreview && <FileText className="h-5 w-5" style={{ color: categoryConfig.color }} />}
            {document.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* File metadata */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{document.file_name}</span>
            <span>•</span>
            <span>{formatFileSize(document.file_size)}</span>
            {document.version > 1 && (
              <>
                <span>•</span>
                <span>Versão {document.version}</span>
              </>
            )}
          </div>

          {/* Preview area */}
          <div className="relative min-h-[400px] max-h-[60vh] border rounded-lg overflow-hidden bg-muted/30">
            {loading ? (
              <div className="flex items-center justify-center h-[400px]">
                <Skeleton className="w-full h-full" />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
                <FileText className="h-16 w-16 mb-4 opacity-50" />
                <p>{error}</p>
              </div>
            ) : previewUrl ? (
              <>
                {isPdf && (
                  <iframe
                    src={`${previewUrl}#toolbar=0`}
                    className="w-full h-[60vh]"
                    title={document.name}
                  />
                )}
                {isImage && (
                  <div className="flex items-center justify-center h-[60vh] p-4">
                    <img
                      src={previewUrl}
                      alt={document.name}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                )}
                {!canPreview && (
                  <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
                    <FileText className="h-16 w-16 mb-4 opacity-50" />
                    <p className="mb-4">Pré-visualização não disponível para este tipo de arquivo.</p>
                    <Button onClick={() => onDownload(document)}>
                      <Download className="h-4 w-4 mr-2" />
                      Baixar arquivo
                    </Button>
                  </div>
                )}
              </>
            ) : null}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            {previewUrl && canPreview && (
              <Button variant="outline" asChild>
                <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Abrir em nova aba
                </a>
              </Button>
            )}
            <Button onClick={() => onDownload(document)}>
              <Download className="h-4 w-4 mr-2" />
              Baixar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
