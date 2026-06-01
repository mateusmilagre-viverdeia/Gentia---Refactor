-- Add advanced DISC profile configuration fields to recruitment_disc_profiles
ALTER TABLE public.recruitment_disc_profiles
ADD COLUMN IF NOT EXISTS target_d integer DEFAULT 50 CHECK (target_d >= 0 AND target_d <= 100),
ADD COLUMN IF NOT EXISTS target_i integer DEFAULT 50 CHECK (target_i >= 0 AND target_i <= 100),
ADD COLUMN IF NOT EXISTS target_s integer DEFAULT 50 CHECK (target_s >= 0 AND target_s <= 100),
ADD COLUMN IF NOT EXISTS target_c integer DEFAULT 50 CHECK (target_c >= 0 AND target_c <= 100),
ADD COLUMN IF NOT EXISTS tolerance integer DEFAULT 15 CHECK (tolerance >= 0 AND tolerance <= 50),
ADD COLUMN IF NOT EXISTS eliminator_d integer CHECK (eliminator_d IS NULL OR (eliminator_d >= 0 AND eliminator_d <= 100)),
ADD COLUMN IF NOT EXISTS eliminator_i integer CHECK (eliminator_i IS NULL OR (eliminator_i >= 0 AND eliminator_i <= 100)),
ADD COLUMN IF NOT EXISTS eliminator_s integer CHECK (eliminator_s IS NULL OR (eliminator_s >= 0 AND eliminator_s <= 100)),
ADD COLUMN IF NOT EXISTS eliminator_c integer CHECK (eliminator_c IS NULL OR (eliminator_c >= 0 AND eliminator_c <= 100)),
ADD COLUMN IF NOT EXISTS use_advanced_mode boolean DEFAULT false;

-- Add comment explaining the fields
COMMENT ON COLUMN public.recruitment_disc_profiles.target_d IS 'Ideal score (0-100) for Dominance dimension';
COMMENT ON COLUMN public.recruitment_disc_profiles.target_i IS 'Ideal score (0-100) for Influence dimension';
COMMENT ON COLUMN public.recruitment_disc_profiles.target_s IS 'Ideal score (0-100) for Steadiness dimension';
COMMENT ON COLUMN public.recruitment_disc_profiles.target_c IS 'Ideal score (0-100) for Conscientiousness dimension';
COMMENT ON COLUMN public.recruitment_disc_profiles.tolerance IS 'Acceptable margin in points (default 15)';
COMMENT ON COLUMN public.recruitment_disc_profiles.eliminator_d IS 'Minimum absolute threshold for D (null = no elimination)';
COMMENT ON COLUMN public.recruitment_disc_profiles.eliminator_i IS 'Minimum absolute threshold for I (null = no elimination)';
COMMENT ON COLUMN public.recruitment_disc_profiles.eliminator_s IS 'Minimum absolute threshold for S (null = no elimination)';
COMMENT ON COLUMN public.recruitment_disc_profiles.eliminator_c IS 'Minimum absolute threshold for C (null = no elimination)';
COMMENT ON COLUMN public.recruitment_disc_profiles.use_advanced_mode IS 'Whether to use advanced mode with individual targets';