-- Adicionar colunas token e expires_at na culture_interview_sessions
ALTER TABLE public.culture_interview_sessions 
ADD COLUMN IF NOT EXISTS token TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Criar índice para busca por token
CREATE INDEX IF NOT EXISTS idx_culture_interview_sessions_token 
ON public.culture_interview_sessions(token);

-- Comentários
COMMENT ON COLUMN public.culture_interview_sessions.token IS 'Token único para acesso público à entrevista';
COMMENT ON COLUMN public.culture_interview_sessions.expires_at IS 'Data de expiração do convite';