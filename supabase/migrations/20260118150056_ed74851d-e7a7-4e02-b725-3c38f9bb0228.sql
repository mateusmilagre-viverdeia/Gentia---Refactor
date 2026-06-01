-- Add culture configuration fields to pulse_schedule_rules
ALTER TABLE pulse_schedule_rules 
ADD COLUMN IF NOT EXISTS culture_questions_count integer DEFAULT 2,
ADD COLUMN IF NOT EXISTS weekdays_only boolean DEFAULT true;

COMMENT ON COLUMN pulse_schedule_rules.culture_questions_count IS 'Número de perguntas de cultura por dia (0-3)';
COMMENT ON COLUMN pulse_schedule_rules.weekdays_only IS 'Se true, envia pulse apenas em dias úteis (seg-sex)';