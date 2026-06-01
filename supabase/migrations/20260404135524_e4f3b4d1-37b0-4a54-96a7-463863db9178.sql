
-- Add pipeline tracking columns to hunting results
ALTER TABLE public.recruitment_hunting_results 
ADD COLUMN IF NOT EXISTS pipeline_stage TEXT DEFAULT 'found',
ADD COLUMN IF NOT EXISTS stage_changed_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS ai_insights JSONB;

-- Create hunting_notifications table
CREATE TABLE public.hunting_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  reference_id UUID,
  reference_type TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.hunting_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their org notifications"
ON public.hunting_notifications FOR SELECT
TO authenticated
USING (public.is_account_member(auth.uid(), account_id));

CREATE POLICY "Members can update their org notifications"
ON public.hunting_notifications FOR UPDATE
TO authenticated
USING (public.is_account_member(auth.uid(), account_id));

CREATE POLICY "Members can insert notifications"
ON public.hunting_notifications FOR INSERT
TO authenticated
WITH CHECK (public.is_account_member(auth.uid(), account_id));

CREATE POLICY "Members can delete their org notifications"
ON public.hunting_notifications FOR DELETE
TO authenticated
USING (public.is_account_member(auth.uid(), account_id));

CREATE INDEX idx_hunting_notifications_account ON public.hunting_notifications(account_id);
CREATE INDEX idx_hunting_notifications_read ON public.hunting_notifications(account_id, read);

-- Create hunting_talent_pool table
CREATE TABLE public.hunting_talent_pool (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  candidate_name TEXT NOT NULL,
  source_url TEXT,
  extracted_data JSONB,
  skills TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  last_contacted_at TIMESTAMPTZ,
  source_result_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.hunting_talent_pool ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their org talent pool"
ON public.hunting_talent_pool FOR SELECT
TO authenticated
USING (public.is_account_member(auth.uid(), account_id));

CREATE POLICY "Members can insert into talent pool"
ON public.hunting_talent_pool FOR INSERT
TO authenticated
WITH CHECK (public.is_account_member(auth.uid(), account_id));

CREATE POLICY "Members can update talent pool"
ON public.hunting_talent_pool FOR UPDATE
TO authenticated
USING (public.is_account_member(auth.uid(), account_id));

CREATE POLICY "Members can delete from talent pool"
ON public.hunting_talent_pool FOR DELETE
TO authenticated
USING (public.is_account_member(auth.uid(), account_id));

CREATE INDEX idx_hunting_talent_pool_account ON public.hunting_talent_pool(account_id);
CREATE INDEX idx_hunting_talent_pool_skills ON public.hunting_talent_pool USING GIN(skills);
CREATE INDEX idx_hunting_talent_pool_tags ON public.hunting_talent_pool USING GIN(tags);

-- Trigger to update updated_at on talent pool
CREATE TRIGGER update_hunting_talent_pool_updated_at
BEFORE UPDATE ON public.hunting_talent_pool
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- DB trigger: auto-notify on high-score hunting results
CREATE OR REPLACE FUNCTION public.notify_high_score_hunting_result()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.hunting_score >= 80 THEN
    INSERT INTO public.hunting_notifications (account_id, type, title, message, reference_id, reference_type)
    VALUES (
      NEW.account_id,
      'high_score',
      'Candidato de alto score encontrado',
      'Score ' || NEW.hunting_score || ' - ' || COALESCE(NEW.candidate_name, 'Candidato'),
      NEW.id,
      'hunting_result'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_notify_high_score_hunting
AFTER INSERT ON public.recruitment_hunting_results
FOR EACH ROW
EXECUTE FUNCTION public.notify_high_score_hunting_result();

-- Index for pipeline stage queries
CREATE INDEX idx_hunting_results_pipeline ON public.recruitment_hunting_results(search_id, pipeline_stage);
