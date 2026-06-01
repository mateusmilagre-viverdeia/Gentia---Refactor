-- Adicionar onboarding_process_id nas tabelas de sessão DISC e QA
ALTER TABLE disc_sessions 
ADD COLUMN IF NOT EXISTS onboarding_process_id uuid REFERENCES onboarding_processes(id) ON DELETE SET NULL;

ALTER TABLE qa_sessions 
ADD COLUMN IF NOT EXISTS onboarding_process_id uuid REFERENCES onboarding_processes(id) ON DELETE SET NULL;

-- Adicionar campos de tipo de tarefa nas onboarding_tasks
ALTER TABLE onboarding_tasks 
ADD COLUMN IF NOT EXISTS task_type text DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS linked_assessment_type text,
ADD COLUMN IF NOT EXISTS linked_assessment_id uuid;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_disc_sessions_onboarding ON disc_sessions(onboarding_process_id);
CREATE INDEX IF NOT EXISTS idx_qa_sessions_onboarding ON qa_sessions(onboarding_process_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_tasks_type ON onboarding_tasks(task_type);
CREATE INDEX IF NOT EXISTS idx_onboarding_tasks_assessment ON onboarding_tasks(linked_assessment_type, linked_assessment_id);

-- Adicionar constraint para validar tipo de assessment
ALTER TABLE onboarding_tasks
ADD CONSTRAINT chk_linked_assessment_type 
CHECK (linked_assessment_type IS NULL OR linked_assessment_type IN ('disc', 'qa'));