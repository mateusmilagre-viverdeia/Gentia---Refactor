-- ===========================================
-- Fase 6: Project Documents Management
-- ===========================================

-- Create project_documents table
CREATE TABLE public.project_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'general',
  name TEXT NOT NULL,
  description TEXT,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  version INTEGER DEFAULT 1,
  parent_document_id UUID REFERENCES public.project_documents(id) ON DELETE SET NULL,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  is_shared_with_client BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_project_documents_account ON project_documents(account_id);
CREATE INDEX idx_project_documents_category ON project_documents(category);
CREATE INDEX idx_project_documents_parent ON project_documents(parent_document_id);
CREATE INDEX idx_project_documents_active ON project_documents(account_id, is_active);

-- Add comment
COMMENT ON TABLE public.project_documents IS 'Documents uploaded by consultants for client projects';

-- Create updated_at trigger
CREATE TRIGGER update_project_documents_updated_at
  BEFORE UPDATE ON public.project_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Enable RLS
ALTER TABLE public.project_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Super admins and Head CS can see all documents
CREATE POLICY "Super admins can manage all project documents"
  ON public.project_documents FOR ALL
  USING (
    is_super_admin(auth.uid()) OR is_head_cs(auth.uid())
  );

-- RLS Policy: EP Consultants can manage documents for assigned clients
CREATE POLICY "EP consultants can manage assigned client documents"
  ON public.project_documents FOR ALL
  USING (
    is_consultant_for_account(auth.uid(), account_id)
  );

-- RLS Policy: Account members can view shared documents
CREATE POLICY "Account members can view shared documents"
  ON public.project_documents FOR SELECT
  USING (
    is_shared_with_client = true 
    AND is_account_member(auth.uid(), account_id)
  );

-- ===========================================
-- Storage Bucket for Project Documents
-- ===========================================

-- Create storage bucket (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-documents', 
  'project-documents', 
  false,
  52428800, -- 50MB limit
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'image/jpeg', 'image/png', 'image/gif', 'image/webp']
);

-- Storage RLS: Super admins and Head CS can upload
CREATE POLICY "Super admins can upload project documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'project-documents'
    AND (is_super_admin(auth.uid()) OR is_head_cs(auth.uid()))
  );

-- Storage RLS: EP Consultants can upload to assigned client folders
CREATE POLICY "EP consultants can upload to assigned client folders"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'project-documents'
    AND is_consultant_for_account(auth.uid(), (string_to_array(name, '/'))[1]::uuid)
  );

-- Storage RLS: Super admins and Head CS can read all
CREATE POLICY "Super admins can read all project documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'project-documents'
    AND (is_super_admin(auth.uid()) OR is_head_cs(auth.uid()))
  );

-- Storage RLS: EP Consultants can read assigned client documents
CREATE POLICY "EP consultants can read assigned client documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'project-documents'
    AND is_consultant_for_account(auth.uid(), (string_to_array(name, '/'))[1]::uuid)
  );

-- Storage RLS: Account members can read shared documents
CREATE POLICY "Account members can read shared project documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'project-documents'
    AND is_account_member(auth.uid(), (string_to_array(name, '/'))[1]::uuid)
    AND EXISTS (
      SELECT 1 FROM public.project_documents pd
      WHERE pd.file_path = name
      AND pd.is_shared_with_client = true
      AND pd.is_active = true
    )
  );

-- Storage RLS: Super admins and Head CS can delete
CREATE POLICY "Super admins can delete project documents"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'project-documents'
    AND (is_super_admin(auth.uid()) OR is_head_cs(auth.uid()))
  );

-- Storage RLS: EP Consultants can delete from assigned client folders
CREATE POLICY "EP consultants can delete assigned client documents"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'project-documents'
    AND is_consultant_for_account(auth.uid(), (string_to_array(name, '/'))[1]::uuid)
  );