export type DocumentCategory = 
  | 'contract' 
  | 'proposal' 
  | 'report' 
  | 'deliverable' 
  | 'methodology' 
  | 'training' 
  | 'presentation' 
  | 'general';

export interface ProjectDocument {
  id: string;
  account_id: string;
  category: DocumentCategory;
  name: string;
  description: string | null;
  file_path: string;
  file_name: string;
  file_size: number | null;
  file_type: string | null;
  version: number;
  parent_document_id: string | null;
  uploaded_by: string | null;
  uploaded_at: string | null;
  is_active: boolean;
  is_shared_with_client: boolean;
  created_at: string;
  updated_at: string;
}

export interface DocumentCategoryConfig {
  label: string;
  icon: string;
  color: string;
}

export const DOCUMENT_CATEGORY_CONFIG: Record<DocumentCategory, DocumentCategoryConfig> = {
  contract: { label: 'Contrato', icon: 'file-text', color: 'hsl(217, 91%, 60%)' },
  proposal: { label: 'Proposta', icon: 'file-plus', color: 'hsl(262, 83%, 58%)' },
  report: { label: 'Relatório', icon: 'bar-chart-2', color: 'hsl(160, 84%, 39%)' },
  deliverable: { label: 'Entrega', icon: 'package', color: 'hsl(38, 92%, 50%)' },
  methodology: { label: 'Metodologia', icon: 'book-open', color: 'hsl(330, 81%, 60%)' },
  training: { label: 'Treinamento', icon: 'graduation-cap', color: 'hsl(187, 85%, 43%)' },
  presentation: { label: 'Apresentação', icon: 'presentation', color: 'hsl(239, 84%, 67%)' },
  general: { label: 'Geral', icon: 'file', color: 'hsl(220, 9%, 46%)' },
} as const;

export const DOCUMENT_CATEGORIES: DocumentCategory[] = [
  'contract',
  'proposal',
  'report',
  'deliverable',
  'methodology',
  'training',
  'presentation',
  'general',
];

export interface UploadDocumentParams {
  file: File;
  accountId: string;
  name: string;
  category: DocumentCategory;
  description?: string;
  isSharedWithClient?: boolean;
  parentDocumentId?: string;
}

export interface UpdateDocumentParams {
  name?: string;
  description?: string | null;
  category?: DocumentCategory;
  is_shared_with_client?: boolean;
  is_active?: boolean;
}

// File type helpers
export const getFileTypeIcon = (fileType: string | null): string => {
  if (!fileType) return 'file';
  
  if (fileType.includes('pdf')) return 'file-text';
  if (fileType.includes('word') || fileType.includes('document')) return 'file-text';
  if (fileType.includes('excel') || fileType.includes('spreadsheet')) return 'file-spreadsheet';
  if (fileType.includes('powerpoint') || fileType.includes('presentation')) return 'presentation';
  if (fileType.includes('image')) return 'image';
  
  return 'file';
};

export const formatFileSize = (bytes: number | null): string => {
  if (bytes === null || bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};
