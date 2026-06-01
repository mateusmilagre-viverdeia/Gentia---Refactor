
-- Add source/origin columns to interview sessions (additive only)
ALTER TABLE public.culture_interview_sessions
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'live',
  ADD COLUMN IF NOT EXISTS recorded_at timestamptz,
  ADD COLUMN IF NOT EXISTS imported_by uuid,
  ADD COLUMN IF NOT EXISTS import_notes text;

ALTER TABLE public.technical_interview_sessions
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'live',
  ADD COLUMN IF NOT EXISTS recorded_at timestamptz,
  ADD COLUMN IF NOT EXISTS imported_by uuid,
  ADD COLUMN IF NOT EXISTS import_notes text;

-- Tracking table for offline interview uploads
CREATE TABLE IF NOT EXISTS public.offline_interview_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL,
  job_id uuid NOT NULL,
  candidate_id uuid,
  external_candidate_name text,
  external_candidate_email text,
  evaluation_types text[] NOT NULL DEFAULT '{}',
  audio_path text NOT NULL,
  language text NOT NULL DEFAULT 'pt',
  status text NOT NULL DEFAULT 'uploaded',
  error_message text,
  transcription_text text,
  culture_session_id uuid,
  technical_session_id uuid,
  recorded_at timestamptz,
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.offline_interview_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Account members can view offline uploads"
  ON public.offline_interview_uploads FOR SELECT
  USING (public.is_account_member(auth.uid(), account_id));

CREATE POLICY "Account members can insert offline uploads"
  ON public.offline_interview_uploads FOR INSERT
  WITH CHECK (public.is_account_member(auth.uid(), account_id) AND created_by = auth.uid());

CREATE POLICY "Account members can update offline uploads"
  ON public.offline_interview_uploads FOR UPDATE
  USING (public.is_account_member(auth.uid(), account_id));

CREATE TRIGGER trg_offline_interview_uploads_updated_at
  BEFORE UPDATE ON public.offline_interview_uploads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_offline_interview_uploads_account ON public.offline_interview_uploads(account_id);
CREATE INDEX IF NOT EXISTS idx_offline_interview_uploads_job ON public.offline_interview_uploads(job_id);
CREATE INDEX IF NOT EXISTS idx_offline_interview_uploads_candidate ON public.offline_interview_uploads(candidate_id);

-- Private bucket for offline interview audio
INSERT INTO storage.buckets (id, name, public)
VALUES ('offline-interviews', 'offline-interviews', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: paths are <account_id>/<filename>
CREATE POLICY "Account members read offline interviews"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'offline-interviews'
    AND public.is_account_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "Account members upload offline interviews"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'offline-interviews'
    AND public.is_account_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "Account members update offline interviews"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'offline-interviews'
    AND public.is_account_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "Account members delete offline interviews"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'offline-interviews'
    AND public.is_account_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );
