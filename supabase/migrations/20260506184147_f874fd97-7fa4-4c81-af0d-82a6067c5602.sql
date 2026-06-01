ALTER TABLE public.careers_page_settings
  ADD COLUMN IF NOT EXISTS careers_video_url text,
  ADD COLUMN IF NOT EXISTS careers_video_type text,
  ADD COLUMN IF NOT EXISTS careers_video_title text,
  ADD COLUMN IF NOT EXISTS show_careers_video_section boolean NOT NULL DEFAULT false;