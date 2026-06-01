-- Ensure a single active seat grant row per org for simple upserts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'uniq_org_seat_grants_org_id'
  ) THEN
    CREATE UNIQUE INDEX uniq_org_seat_grants_org_id ON public.org_seat_grants(org_id);
  END IF;
END $$;
