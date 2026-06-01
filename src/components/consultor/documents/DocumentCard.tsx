import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  MoreHorizontal, 
  Download, 
  Edit, 
  Trash2, 
  Share2, 
  Eye,
  FileText,
  FileSpreadsheet,
  Presentation,
  Image,
  File,
  History
} from 'lucide-react';
import { ProjectDocument, DOCUMENT_CATEGORY_CONFIG, formatFileSize } from '@/types/project-documents.types';

interface DocumentCardProps {
  document: ProjectDocument;
  onDownload: (doc: ProjectDocument) => void;
  onPreview: (doc: ProjectDocument) => void;
  onEdit: (doc: ProjectDocument) => void;
  onDelete: (doc: ProjectDocument) => void;
  onToggleShare: (doc: ProjectDocument) => void;
  onViewHistory?: (doc: ProjectDocument) => void;
  readOnly?: boolean;
}

const getFileIcon = (fileType: string | null) => {
  if (!fileType) return File;
  if (fileType.includes('pdf')) return FileText;
  if (fileType.includes('word') || fileType.includes('document')) return FileText;
  if (fileType.includes('excel') || fileType.includes('spreadsheet')) return FileSpreadsheet;
  if (fileType.includes('powerpoint') || fileType.includes('presentation')) return Presentation;
  if (fileType.includes('image')) return Image;
  return File;
};

export function DocumentCard({
  document,
  onDownload,
  onPreview,
  onEdit,
  onDelete,
  onToggleShare,
  onViewHistory,
  readOnly = false,
}: DocumentCardProps) {
  const categoryConfig = DOCUMENT_CATEGORY_CONFIG[document.category];
  const FileIcon = getFileIcon(document.file_type);
  
  const uploadDate = document.uploaded_at 
    ? new Date(document.uploaded_at).toLocaleDateString('pt-BR')
    : 'Data desconhecida';

  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* File Icon */}
          <div 
            className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${categoryConfig.color}20` }}
          >
            <FileIcon 
              className="h-5 w-5" 
              style={{ color: categoryConfig.color }} 
            />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h4 className="font-medium text-sm truncate">{document.name}</h4>
                <p className="text-xs text-muted-foreground truncate">
                  {document.file_name}
                </p>
              </div>

              {/* Actions */}
              {!readOnly ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onPreview(document)}>
                      <Eye className="h-4 w-4 mr-2" />
                      Visualizar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDownload(document)}>
                      <Download className="h-4 w-4 mr-2" />
                      Baixar
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onEdit(document)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onToggleShare(document)}>
                      <Share2 className="h-4 w-4 mr-2" />
                      {document.is_shared_with_client ? 'Remover compartilhamento' : 'Compartilhar com cliente'}
                    </DropdownMenuItem>
                    {onViewHistory && document.parent_document_id && (
                      <DropdownMenuItem onClick={() => onViewHistory(document)}>
                        <History className="h-4 w-4 mr-2" />
                        Ver versões
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => onDelete(document)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={() => onDownload(document)}
                >
                  <Download className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Description */}
            {document.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {document.description}
              </p>
            )}

            {/* Metadata */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge 
                variant="secondary" 
                className="text-xs"
                style={{ 
                  backgroundColor: `${categoryConfig.color}20`,
                  color: categoryConfig.color,
                }}
              >
                {categoryConfig.label}
              </Badge>
              
              <span className="text-xs text-muted-foreground">
                {formatFileSize(document.file_size)}
              </span>
              
              <span className="text-xs text-muted-foreground">
                {uploadDate}
              </span>

              {document.version > 1 && (
                <Badge variant="outline" className="text-xs">
                  v{document.version}
                </Badge>
              )}

              {document.is_shared_with_client && (
                <Badge variant="default" className="text-xs bg-green-500/10 text-green-600 border-green-200">
                  <Share2 className="h-3 w-3 mr-1" />
                  Compartilhado
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
