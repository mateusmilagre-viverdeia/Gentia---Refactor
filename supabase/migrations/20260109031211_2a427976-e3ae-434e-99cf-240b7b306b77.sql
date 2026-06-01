-- Add new fields to recruitment_jobs table
ALTER TABLE public.recruitment_jobs 
ADD COLUMN IF NOT EXISTS work_regime text,
ADD COLUMN IF NOT EXISTS work_modality text,
ADD COLUMN IF NOT EXISTS hide_salary boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS additional_info text;

-- Add comments for documentation
COMMENT ON COLUMN public.recruitment_jobs.work_regime IS 'Regime de trabalho: CLT, PJ, Temporário, Estágio, Trainee';
COMMENT ON COLUMN public.recruitment_jobs.work_modality IS 'Modalidade de trabalho: Remoto, Presencial, Híbrido';
COMMENT ON COLUMN public.recruitment_jobs.hide_salary IS 'Se deve ocultar a remuneração na vaga pública';
COMMENT ON COLUMN public.recruitment_jobs.additional_info IS 'Informações adicionais sobre a vaga';