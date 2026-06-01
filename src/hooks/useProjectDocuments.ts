import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import type { 
  ProjectDocument, 
  DocumentCategory, 
  UploadDocumentParams, 
  UpdateDocumentParams 
} from '@/types/project-documents.types';

interface UseProjectDocumentsOptions {
  accountId: string;
  category?: DocumentCategory;
  includeInactive?: boolean;
  sharedOnly?: boolean;
}

export function useProjectDocuments(options: UseProjectDocumentsOptions) {
  const { accountId, category, includeInactive = false, sharedOnly = false } = options;
  const { user } = useAuth();
  
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const fetchDocuments = useCallback(async () => {
    if (!accountId) {
      setDocuments([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      let query = supabase
        .from('project_documents')
        .select('*')
        .eq('account_id', accountId)
        .order('created_at', { ascending: false });

      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      if (category) {
        query = query.eq('category', category);
      }

      if (sharedOnly) {
        query = query.eq('is_shared_with_client', true);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      setDocuments((data || []) as ProjectDocument[]);
    } catch (error: any) {
      console.error('Error fetching documents:', error);
      toast({
        title: 'Erro ao carregar documentos',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [accountId, category, includeInactive, sharedOnly]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const uploadDocument = async (params: UploadDocumentParams): Promise<ProjectDocument | null> => {
    const { file, accountId, name, category, description, isSharedWithClient, parentDocumentId } = params;

    if (!user) {
      toast({
        title: 'Erro',
        description: 'Você precisa estar logado para enviar documentos.',
        variant: 'destructive',
      });
      return null;
    }

    try {
      setUploading(true);

      // Generate unique file path: accountId/timestamp-filename
      const timestamp = Date.now();
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `${accountId}/${timestamp}-${sanitizedFileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('project-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Calculate version if this is a new version
      let version = 1;
      if (parentDocumentId) {
        const { data: parentDoc } = await supabase
          .from('project_documents')
          .select('version')
          .eq('id', parentDocumentId)
          .single();
        
        if (parentDoc) {
          version = (parentDoc.version || 1) + 1;
        }
      }

      // Insert metadata into database
      const { data, error: insertError } = await supabase
        .from('project_documents')
        .insert({
          account_id: accountId,
          category,
          name,
          description: description || null,
          file_path: filePath,
          file_name: file.name,
          file_size: file.size,
          file_type: file.type,
          version,
          parent_document_id: parentDocumentId || null,
          uploaded_by: user.id,
          is_shared_with_client: isSharedWithClient || false,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      toast({
        title: 'Documento enviado',
        description: `${name} foi enviado com sucesso.`,
      });

      await fetchDocuments();
      return data as ProjectDocument;
    } catch (error: any) {
      console.error('Error uploading document:', error);
      toast({
        title: 'Erro ao enviar documento',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const updateDocument = async (documentId: string, updates: UpdateDocumentParams): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('project_documents')
        .update(updates)
        .eq('id', documentId);

      if (error) throw error;

      toast({
        title: 'Documento atualizado',
        description: 'As alterações foram salvas.',
      });

      await fetchDocuments();
      return true;
    } catch (error: any) {
      console.error('Error updating document:', error);
      toast({
        title: 'Erro ao atualizar documento',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  const deleteDocument = async (documentId: string, filePath: string): Promise<boolean> => {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('project-documents')
        .remove([filePath]);

      if (storageError) {
        console.warn('Storage delete warning:', storageError);
        // Continue even if storage delete fails
      }

      // Delete from database (or soft delete)
      const { error: dbError } = await supabase
        .from('project_documents')
        .update({ is_active: false })
        .eq('id', documentId);

      if (dbError) throw dbError;

      toast({
        title: 'Documento excluído',
        description: 'O documento foi removido.',
      });

      await fetchDocuments();
      return true;
    } catch (error: any) {
      console.error('Error deleting document:', error);
      toast({
        title: 'Erro ao excluir documento',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  const toggleShareWithClient = async (document: ProjectDocument): Promise<boolean> => {
    return updateDocument(document.id, {
      is_shared_with_client: !document.is_shared_with_client,
    });
  };

  const getDownloadUrl = async (filePath: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.storage
        .from('project-documents')
        .createSignedUrl(filePath, 3600); // 1 hour expiry

      if (error) throw error;
      return data.signedUrl;
    } catch (error: any) {
      console.error('Error getting download URL:', error);
      toast({
        title: 'Erro ao gerar link de download',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    }
  };

  const downloadDocument = async (document: ProjectDocument): Promise<void> => {
    const url = await getDownloadUrl(document.file_path);
    if (url) {
      const a = window.document.createElement('a');
      a.href = url;
      a.download = document.file_name;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
    }
  };

  const getVersionHistory = async (parentDocumentId: string): Promise<ProjectDocument[]> => {
    try {
      const { data, error } = await supabase
        .from('project_documents')
        .select('*')
        .or(`id.eq.${parentDocumentId},parent_document_id.eq.${parentDocumentId}`)
        .order('version', { ascending: false });

      if (error) throw error;
      return (data || []) as ProjectDocument[];
    } catch (error: any) {
      console.error('Error fetching version history:', error);
      return [];
    }
  };

  return {
    documents,
    loading,
    uploading,
    fetchDocuments,
    uploadDocument,
    updateDocument,
    deleteDocument,
    toggleShareWithClient,
    getDownloadUrl,
    downloadDocument,
    getVersionHistory,
  };
}
