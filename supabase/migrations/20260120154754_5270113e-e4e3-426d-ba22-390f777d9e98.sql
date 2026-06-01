-- Adicionar coluna culture_question_id para respostas de cultura
ALTER TABLE pulse_responses 
ADD COLUMN culture_question_id UUID REFERENCES pulse_culture_questions(id) ON DELETE CASCADE;

-- Tornar question_id nullable (para permitir respostas de cultura)
ALTER TABLE pulse_responses 
ALTER COLUMN question_id DROP NOT NULL;

-- Adicionar constraint para garantir que pelo menos um está preenchido
ALTER TABLE pulse_responses 
ADD CONSTRAINT chk_question_or_culture 
CHECK (question_id IS NOT NULL OR culture_question_id IS NOT NULL);

-- Criar índice para buscas por culture_question_id
CREATE INDEX idx_pulse_responses_culture_question_id ON pulse_responses(culture_question_id);