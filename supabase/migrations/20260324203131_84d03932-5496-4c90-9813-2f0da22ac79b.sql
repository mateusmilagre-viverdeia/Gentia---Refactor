
-- Add candidate_profile_id to candidate_disc_sessions for logged-in candidate flow
ALTER TABLE public.candidate_disc_sessions
ADD COLUMN IF NOT EXISTS candidate_profile_id uuid REFERENCES public.candidate_profiles(id);

-- Create index for lookups
CREATE INDEX IF NOT EXISTS idx_disc_sessions_candidate_profile_id 
ON public.candidate_disc_sessions(candidate_profile_id);

-- Backfill existing sessions where we can match via candidate email
UPDATE public.candidate_disc_sessions cds
SET candidate_profile_id = cp.id
FROM public.recruitment_candidates rc
JOIN public.candidate_profiles cp ON cp.user_id = (
  SELECT p.id FROM public.profiles p WHERE p.email = rc.email LIMIT 1
)
WHERE cds.candidate_id = rc.id
  AND cds.candidate_profile_id IS NULL;
