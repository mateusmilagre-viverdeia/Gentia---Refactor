
UPDATE public.recruitment_metric_thresholds
SET last_alert_at = now()
WHERE account_id = '67f66f7a-d9a8-455e-8820-ee836cfe7401';

UPDATE public.recruitment_metric_alerts
SET is_resolved = true,
    resolved_at = now()
WHERE account_id = '67f66f7a-d9a8-455e-8820-ee836cfe7401'
  AND is_resolved = false
  AND created_at > now() - interval '24 hours';
