ALTER TABLE public.hunting_provider_settings
  ALTER COLUMN enable_mailboxlayer SET DEFAULT true,
  ALTER COLUMN enable_hunter SET DEFAULT true,
  ALTER COLUMN enable_snov SET DEFAULT true,
  ALTER COLUMN enable_neverbounce SET DEFAULT true,
  ALTER COLUMN enable_twilio SET DEFAULT true;

UPDATE public.hunting_provider_settings
SET enable_mailboxlayer = true,
    enable_hunter = true,
    enable_snov = true,
    enable_neverbounce = true,
    enable_twilio = true,
    mode = CASE WHEN mode = 'free_only' THEN 'aggressive' ELSE mode END;