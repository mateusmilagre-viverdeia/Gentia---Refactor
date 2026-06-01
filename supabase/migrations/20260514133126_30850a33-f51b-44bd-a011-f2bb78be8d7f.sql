-- Dedupe legacy duplicates: keep the oldest row per (session_id, question_index)
DELETE FROM public.culture_interview_responses a
USING public.culture_interview_responses b
WHERE a.session_id = b.session_id
  AND a.question_index = b.question_index
  AND a.created_at > b.created_at;

-- Unique index to prevent future races
CREATE UNIQUE INDEX IF NOT EXISTS culture_interview_responses_session_qidx_uniq
  ON public.culture_interview_responses (session_id, question_index);