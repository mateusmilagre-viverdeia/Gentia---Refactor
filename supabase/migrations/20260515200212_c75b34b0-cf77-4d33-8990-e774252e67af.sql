
ALTER TABLE public.culture_interview_sessions
  ADD COLUMN IF NOT EXISTS questions_total integer,
  ADD COLUMN IF NOT EXISTS questions_covered integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS coverage_log jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS last_premature_end_blocked_at timestamptz;

UPDATE public.culture_interview_sessions
SET questions_total = COALESCE(jsonb_array_length(questions), 0)
WHERE questions_total IS NULL;
