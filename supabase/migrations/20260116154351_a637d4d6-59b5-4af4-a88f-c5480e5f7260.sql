-- Add video URL and job-specific color settings to careers_page_settings
ALTER TABLE public.careers_page_settings
ADD COLUMN IF NOT EXISTS job_video_url text DEFAULT null,
ADD COLUMN IF NOT EXISTS job_use_custom_color boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS job_primary_color text DEFAULT '#000000';

-- Add comments to document these fields
COMMENT ON COLUMN public.careers_page_settings.job_video_url IS 'Video URL for presentation (YouTube or Vimeo embed URL) to show on job details page';
COMMENT ON COLUMN public.careers_page_settings.job_use_custom_color IS 'Use a custom primary color for job details page instead of company primary color';
COMMENT ON COLUMN public.careers_page_settings.job_primary_color IS 'Custom primary color for job details page (used when job_use_custom_color is true)';