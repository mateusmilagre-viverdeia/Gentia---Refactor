import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
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
import { Upload, FileArchive, Filter } from 'lucide-react';
import { useProjectDocuments } from '@/hooks/useProjectDocuments';
import { DocumentCard } from './DocumentCard';
import { DocumentUploadDialog } from './DocumentUploadDialog';
import { DocumentPreviewDialog } from './DocumentPreviewDialog';
import { DocumentEditDialog } from './DocumentEditDialog';
import { 
  ProjectDocument, 
  DocumentCategory, 
  DOCUMENT_CATEGORIES, 
  DOCUMENT_CATEGORY_CONFIG 
} from '@/types/project-documents.types';

interface DocumentsTabProps {
  accountId: string;
  readOnly?: boolean;
}

export function DocumentsTab({ accountId, readOnly = false }: DocumentsTabProps) {
  const [categoryFilter, setCategoryFilter] = useState<DocumentCategory | 'all'>('all');
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<ProjectDocument | null>(null);
  const [editDocument, setEditDocument] = useState<ProjectDocument | null>(null);
  const [deleteDocument, setDeleteDocument] = useState<ProjectDocument | null>(null);

  const {
    documents,
    loading,
    uploading,
    uploadDocument,
    updateDocument,
    deleteDocument: performDelete,
    toggleShareWithClient,
    downloadDocument,
  } = useProjectDocuments({
    accountId,
    category: categoryFilter === 'all' ? undefined : categoryFilter,
    sharedOnly: readOnly,
  });

  const handleUpload = async (data: {
    file: File;
    name: string;
    category: DocumentCategory;
    description?: string;
    isSharedWithClient: boolean;
  }) => {
    await uploadDocument({
      file: data.file,
      accountId,
      name: data.name,
      category: data.category,
      description: data.description,
      isSharedWithClient: data.isSharedWithClient,
    });
    setShowUploadDialog(false);
  };

  const handleDelete = async () => {
    if (!deleteDocument) return;
    await performDelete(deleteDocument.id, deleteDocument.file_path);
    setDeleteDocument(null);
  };

  const filteredDocuments = documents;

  // Group documents by category for display
  const groupedDocuments = DOCUMENT_CATEGORIES.reduce((acc, cat) => {
    const docs = filteredDocuments.filter(d => d.category === cat);
    if (docs.length > 0) {
      acc[cat] = docs;
    }
    return acc;
  }, {} as Record<DocumentCategory, ProjectDocument[]>);

  const hasDocuments = filteredDocuments.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileArchive className="h-5 w-5" />
                Documentos do Projeto
              </CardTitle>
              <CardDescription>
                {readOnly 
                  ? 'Documentos compartilhados pela equipe de consultoria' 
                  : 'Gerencie contratos, propostas, relatórios e outros documentos'}
              </CardDescription>
            </div>
            {!readOnly && (
              <Button onClick={() => setShowUploadDialog(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Enviar Documento
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select 
              value={categoryFilter} 
              onValueChange={(v) => setCategoryFilter(v as DocumentCategory | 'all')}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {DOCUMENT_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {DOCUMENT_CATEGORY_CONFIG[cat].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground ml-auto">
              {filteredDocuments.length} documento{filteredDocuments.length !== 1 ? 's' : ''}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Document List */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : !hasDocuments ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileArchive className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-medium text-lg mb-1">Nenhum documento</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {readOnly 
                ? 'Nenhum documento foi compartilhado ainda.'
                : 'Comece enviando o primeiro documento do projeto.'}
            </p>
            {!readOnly && (
              <Button onClick={() => setShowUploadDialog(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Enviar Documento
              </Button>
            )}
          </CardContent>
        </Card>
      ) : categoryFilter === 'all' ? (
        // Grouped view
        <div className="space-y-6">
          {Object.entries(groupedDocuments).map(([category, docs]) => (
            <div key={category}>
              <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <span 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: DOCUMENT_CATEGORY_CONFIG[category as DocumentCategory].color }}
                />
                {DOCUMENT_CATEGORY_CONFIG[category as DocumentCategory].label}
                <span className="text-xs">({docs.length})</span>
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                {docs.map((doc) => (
                  <DocumentCard
                    key={doc.id}
                    document={doc}
                    onDownload={downloadDocument}
                    onPreview={setPreviewDocument}
                    onEdit={setEditDocument}
                    onDelete={setDeleteDocument}
                    onToggleShare={toggleShareWithClient}
                    readOnly={readOnly}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Flat view for filtered category
        <div className="grid gap-4 md:grid-cols-2">
          {filteredDocuments.map((doc) => (
            <DocumentCard
              key={doc.id}
              document={doc}
              onDownload={downloadDocument}
              onPreview={setPreviewDocument}
              onEdit={setEditDocument}
              onDelete={setDeleteDocument}
              onToggleShare={toggleShareWithClient}
              readOnly={readOnly}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      <DocumentUploadDialog
        open={showUploadDialog}
        onOpenChange={setShowUploadDialog}
        onUpload={handleUpload}
        uploading={uploading}
      />

      <DocumentPreviewDialog
        open={!!previewDocument}
        onOpenChange={(open) => !open && setPreviewDocument(null)}
        document={previewDocument}
        onDownload={downloadDocument}
      />

      <DocumentEditDialog
        open={!!editDocument}
        onOpenChange={(open) => !open && setEditDocument(null)}
        document={editDocument}
        onSave={updateDocument}
      />

      <AlertDialog open={!!deleteDocument} onOpenChange={(open) => !open && setDeleteDocument(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir documento?</AlertDialogTitle>
            <AlertDialogDescription>
              O documento "{deleteDocument?.name}" será removido. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
