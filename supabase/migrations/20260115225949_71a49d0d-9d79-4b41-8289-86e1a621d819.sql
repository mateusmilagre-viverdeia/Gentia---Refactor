-- Add new columns to careers_page_settings for selling content integration
ALTER TABLE careers_page_settings 
  ADD COLUMN IF NOT EXISTS use_selling_content boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_about_section boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_moment_section boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_benefits_section boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_challenges_section boolean DEFAULT false;