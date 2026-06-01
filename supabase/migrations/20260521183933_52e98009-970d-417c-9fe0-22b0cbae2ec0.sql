CREATE OR REPLACE VIEW public.v_voice_interview_health_24h AS
SELECT
  s.id AS session_id,
  s.account_id,
  s.status,
  s.abandoned_reason,
  s.started_at,
  s.completed_at,
  s.last_activity_at,
  COALESCE(s.questions_total, 0) AS questions_total,
  COALESCE(s.questions_covered, 0) AS questions_covered,
  (SELECT COUNT(*) FROM public.culture_interview_responses r WHERE r.session_id = s.id) AS responses_total,
  (SELECT COUNT(DISTINCT r.created_at) FROM public.culture_interview_responses r WHERE r.session_id = s.id) AS responses_distinct_timestamps,
  (SELECT COUNT(*) FROM public.voice_interview_events e WHERE e.session_id = s.id AND e.event_type = 'response_saved') AS events_response_saved,
  (SELECT COUNT(*) FROM public.voice_interview_events e WHERE e.session_id = s.id AND e.event_type = 'transcription_received') AS events_transcription_received,
  (SELECT COUNT(*) FROM public.voice_interview_events e WHERE e.session_id = s.id AND e.event_type IN ('transcription_pipeline_silent','pipeline_silent_detected','fallback_save_from_item_created')) AS events_pipeline_warnings,
  CASE
    WHEN COALESCE(s.questions_total, 0) = 0 THEN NULL
    ELSE ROUND((COALESCE(s.questions_covered, 0)::numeric / s.questions_total::numeric) * 100, 1)
  END AS coverage_pct,
  CASE
    WHEN (SELECT COUNT(*) FROM public.voice_interview_events e WHERE e.session_id = s.id AND e.event_type IN ('transcription_pipeline_silent','pipeline_silent_detected')) > 0 THEN 'pipeline_silent'
    WHEN (SELECT COUNT(*) FROM public.voice_interview_events e WHERE e.session_id = s.id AND e.event_type = 'response_saved') = 0
         AND (SELECT COUNT(*) FROM public.culture_interview_responses r WHERE r.session_id = s.id) > 0 THEN 'live_save_missed'
    WHEN s.abandoned_reason IN ('watchdog_stale_partial','watchdog_no_content') THEN 'watchdog_closed'
    WHEN s.status = 'completed' THEN 'ok'
    ELSE 'in_progress'
  END AS health_label
FROM public.culture_interview_sessions s
WHERE COALESCE(s.is_test, false) = false
  AND s.started_at >= NOW() - INTERVAL '24 hours';

COMMENT ON VIEW public.v_voice_interview_health_24h IS
  'Saúde das entrevistas de voz cultural nas últimas 24h: cobertura real, saves live, eventos de pipeline. Usado pelo card admin de monitoramento (P0 Marina).';