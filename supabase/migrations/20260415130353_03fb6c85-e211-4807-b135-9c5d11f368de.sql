UPDATE public.org_billing 
SET status = 'active', trial_end = NULL, updated_at = now()
WHERE org_id = 'e68cc82f-125e-4fe4-a175-77378ac9dc2c';