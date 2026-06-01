-- Create table to track profile views in the marketplace
CREATE TABLE public.talent_pool_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  talent_pool_id UUID NOT NULL REFERENCES public.shared_talent_pool(id) ON DELETE CASCADE,
  viewer_account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  viewer_user_id UUID,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  session_id TEXT
);

-- Indexes for efficient querying
CREATE INDEX idx_talent_pool_views_pool_id ON public.talent_pool_views(talent_pool_id);
CREATE INDEX idx_talent_pool_views_viewer ON public.talent_pool_views(viewer_account_id);
CREATE INDEX idx_talent_pool_views_date ON public.talent_pool_views(viewed_at);
CREATE INDEX idx_talent_pool_views_session ON public.talent_pool_views(session_id) WHERE session_id IS NOT NULL;

-- Enable RLS
ALTER TABLE public.talent_pool_views ENABLE ROW LEVEL SECURITY;

-- Policies: Organizations can see views of their pool entries or views they made
CREATE POLICY "Organizations can view their own pool views"
ON public.talent_pool_views
FOR SELECT
USING (
  viewer_account_id IN (
    SELECT account_id FROM public.account_members 
    WHERE user_id = auth.uid() AND is_active = true
  )
  OR
  talent_pool_id IN (
    SELECT id FROM public.shared_talent_pool 
    WHERE source_account_id IN (
      SELECT account_id FROM public.account_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
  )
);

-- Service role can insert views (from edge function)
CREATE POLICY "Service role can insert views"
ON public.talent_pool_views
FOR INSERT
WITH CHECK (true);

-- Add analytics summary columns to shared_talent_pool for quick access
ALTER TABLE public.shared_talent_pool 
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMPTZ;

-- Function to update view count on shared_talent_pool
CREATE OR REPLACE FUNCTION public.update_talent_pool_view_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.shared_talent_pool
  SET 
    view_count = view_count + 1,
    last_viewed_at = NEW.viewed_at
  WHERE id = NEW.talent_pool_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to auto-update view count
CREATE TRIGGER trigger_update_talent_pool_view_count
AFTER INSERT ON public.talent_pool_views
FOR EACH ROW
EXECUTE FUNCTION public.update_talent_pool_view_count();