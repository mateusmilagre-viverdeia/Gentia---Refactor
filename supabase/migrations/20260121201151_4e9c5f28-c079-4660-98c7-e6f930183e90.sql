-- Security hardening (linter): fix SECURITY DEFINER view + tighten permissive INSERT policies

-- 1) Ensure aggregated view runs with invoker privileges
ALTER VIEW public.pulse_responses_aggregated SET (security_invoker = on);

-- 2) Tighten overly-permissive INSERT policies

-- billing_notifications: only backend system (service role) should insert
DROP POLICY IF EXISTS "Service role can insert billing notifications" ON public.billing_notifications;
CREATE POLICY "Service role can insert billing notifications"
ON public.billing_notifications
FOR INSERT
TO public
WITH CHECK (current_setting('request.jwt.claim.role', true) = 'service_role');

-- notifications: only backend system (service role) should insert
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "Service role can insert notifications"
ON public.notifications
FOR INSERT
TO public
WITH CHECK (current_setting('request.jwt.claim.role', true) = 'service_role');

-- notification_recipients: only backend system (service role) should insert
DROP POLICY IF EXISTS "System can insert notification recipients" ON public.notification_recipients;
CREATE POLICY "Service role can insert notification recipients"
ON public.notification_recipients
FOR INSERT
TO public
WITH CHECK (current_setting('request.jwt.claim.role', true) = 'service_role');

-- culture_interview_responses: only members of the session's account can insert
DROP POLICY IF EXISTS "Allow insert for anyone" ON public.culture_interview_responses;
CREATE POLICY "Account members can insert interview responses"
ON public.culture_interview_responses
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.culture_interview_sessions cis
    WHERE cis.id = culture_interview_responses.session_id
      AND public.is_account_member(auth.uid(), cis.account_id)
  )
);

-- job_alert_subscriptions: keep public insert, but require minimally valid payload
DROP POLICY IF EXISTS "Public can subscribe to job alerts" ON public.job_alert_subscriptions;
CREATE POLICY "Public can subscribe to job alerts"
ON public.job_alert_subscriptions
FOR INSERT
TO public
WITH CHECK (
  account_id IS NOT NULL
  AND email IS NOT NULL
  AND length(trim(email)) > 3
  AND email ~* '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$'
);

-- offboarding_survey_responses: allow insert but require case_id + responded_at
DROP POLICY IF EXISTS "Anyone can submit survey response" ON public.offboarding_survey_responses;
CREATE POLICY "Anyone can submit survey response"
ON public.offboarding_survey_responses
FOR INSERT
TO anon, authenticated
WITH CHECK (
  case_id IS NOT NULL
  AND responded_at IS NOT NULL
);

-- recruitment_applications: keep public insert, but require job/account
DROP POLICY IF EXISTS "Public can create applications" ON public.recruitment_applications;
CREATE POLICY "Public can create applications"
ON public.recruitment_applications
FOR INSERT
TO anon
WITH CHECK (
  job_id IS NOT NULL
  AND account_id IS NOT NULL
);

-- talent_pool: keep public insert, but require basic identity fields
DROP POLICY IF EXISTS "Public can submit to talent pool" ON public.talent_pool;
CREATE POLICY "Public can submit to talent pool"
ON public.talent_pool
FOR INSERT
TO public
WITH CHECK (
  account_id IS NOT NULL
  AND name IS NOT NULL
  AND length(trim(name)) > 1
  AND email IS NOT NULL
  AND length(trim(email)) > 3
  AND email ~* '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$'
);
