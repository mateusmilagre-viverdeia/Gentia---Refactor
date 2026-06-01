
ALTER TABLE public.recruitment_job_workflow_config
  DROP COLUMN IF EXISTS notification_delay_minutes,
  DROP COLUMN IF EXISTS send_email,
  DROP COLUMN IF EXISTS send_whatsapp,
  DROP COLUMN IF EXISTS advance_email_template_id,
  DROP COLUMN IF EXISTS advance_whatsapp_template_id,
  DROP COLUMN IF EXISTS complete_email_template_id,
  DROP COLUMN IF EXISTS complete_whatsapp_template_id,
  DROP COLUMN IF EXISTS reject_email_template_id,
  DROP COLUMN IF EXISTS reject_whatsapp_template_id;
