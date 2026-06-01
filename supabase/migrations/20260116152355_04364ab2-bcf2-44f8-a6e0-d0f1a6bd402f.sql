-- Add new fields to careers_page_settings for job details page customization
ALTER TABLE public.careers_page_settings
ADD COLUMN IF NOT EXISTS job_show_company_section boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS job_show_mission boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS job_show_responsibilities boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS job_show_indicators boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS job_show_required_skills boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS job_show_desired_skills boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS job_show_competencies boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS job_show_benefits boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS job_show_development boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS job_show_related_jobs boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS job_show_share_buttons boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS job_show_gentia_branding boolean DEFAULT true;

-- Add comment to document these fields
COMMENT ON COLUMN public.careers_page_settings.job_show_company_section IS 'Show "About the Company" section on job details page';
COMMENT ON COLUMN public.careers_page_settings.job_show_mission IS 'Show job mission section';
COMMENT ON COLUMN public.careers_page_settings.job_show_responsibilities IS 'Show responsibilities section';
COMMENT ON COLUMN public.careers_page_settings.job_show_indicators IS 'Show success indicators section';
COMMENT ON COLUMN public.careers_page_settings.job_show_required_skills IS 'Show required skills section';
COMMENT ON COLUMN public.careers_page_settings.job_show_desired_skills IS 'Show desired skills section';
COMMENT ON COLUMN public.careers_page_settings.job_show_competencies IS 'Show behavioral competencies section';
COMMENT ON COLUMN public.careers_page_settings.job_show_benefits IS 'Show benefits section';
COMMENT ON COLUMN public.careers_page_settings.job_show_development IS 'Show development opportunities section';
COMMENT ON COLUMN public.careers_page_settings.job_show_related_jobs IS 'Show related jobs section';
COMMENT ON COLUMN public.careers_page_settings.job_show_share_buttons IS 'Show social sharing buttons';
COMMENT ON COLUMN public.careers_page_settings.job_show_gentia_branding IS 'Show Powered by GENTIA footer';