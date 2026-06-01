-- Corrigir by_driver: dividir avg por 2 (estava na escala 0-200, agora será 0-100)
UPDATE pulse_metrics_daily
SET by_driver = (
  SELECT jsonb_object_agg(
    key,
    value || jsonb_build_object('avg', ROUND((value->>'avg')::numeric / 2))
  )
  FROM jsonb_each(by_driver)
)
WHERE by_driver IS NOT NULL AND by_driver != '{}'::jsonb;

-- Corrigir by_team: dividir avg por 2  
UPDATE pulse_metrics_daily
SET by_team = (
  SELECT jsonb_object_agg(
    key,
    value || jsonb_build_object('avg', ROUND((value->>'avg')::numeric / 2))
  )
  FROM jsonb_each(by_team)
)
WHERE by_team IS NOT NULL AND by_team != '{}'::jsonb;