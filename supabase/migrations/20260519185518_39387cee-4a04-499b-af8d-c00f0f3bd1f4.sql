-- Backfill duration_seconds in completed interview sessions where it's NULL.
-- Priority: last_activity_at − started_at (active window) → completed_at − started_at.
-- Filtered to plausible range (30s..4h) to skip migration artifacts and zombie sessions.

UPDATE public.culture_interview_sessions s
SET duration_seconds = sub.duration
FROM (
  SELECT
    id,
    LEAST(
      14400,
      GREATEST(
        1,
        EXTRACT(EPOCH FROM (COALESCE(last_activity_at, completed_at) - started_at))::int
      )
    ) AS duration
  FROM public.culture_interview_sessions
  WHERE status = 'completed'
    AND duration_seconds IS NULL
    AND started_at IS NOT NULL
    AND COALESCE(last_activity_at, completed_at) IS NOT NULL
    AND EXTRACT(EPOCH FROM (COALESCE(last_activity_at, completed_at) - started_at)) BETWEEN 30 AND 14400
) sub
WHERE s.id = sub.id;

UPDATE public.technical_interview_sessions s
SET duration_seconds = sub.duration
FROM (
  SELECT
    id,
    LEAST(
      14400,
      GREATEST(
        1,
        EXTRACT(EPOCH FROM (COALESCE(last_activity_at, completed_at) - started_at))::int
      )
    ) AS duration
  FROM public.technical_interview_sessions
  WHERE status = 'completed'
    AND duration_seconds IS NULL
    AND started_at IS NOT NULL
    AND COALESCE(last_activity_at, completed_at) IS NOT NULL
    AND EXTRACT(EPOCH FROM (COALESCE(last_activity_at, completed_at) - started_at)) BETWEEN 30 AND 14400
) sub
WHERE s.id = sub.id;