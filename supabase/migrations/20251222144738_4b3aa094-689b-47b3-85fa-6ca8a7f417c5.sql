-- Add custom_recurrence_dates column to surveys table
ALTER TABLE surveys 
ADD COLUMN IF NOT EXISTS custom_recurrence_dates jsonb DEFAULT NULL;

-- This column stores an array of date ranges for custom recurrence:
-- [
--   { "start": "2026-01-22", "end": "2026-02-05" },
--   { "start": "2026-03-15", "end": "2026-03-29" }
-- ]

COMMENT ON COLUMN surveys.custom_recurrence_dates IS 'Array of custom date ranges for personalized recurrence patterns';