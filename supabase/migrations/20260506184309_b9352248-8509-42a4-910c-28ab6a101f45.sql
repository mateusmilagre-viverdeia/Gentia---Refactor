ALTER TABLE public.careers_page_settings
  ADD COLUMN IF NOT EXISTS careers_video_position text NOT NULL DEFAULT 'after_selling';