-- Remover constraints antigas de unicidade por user_id (usando ALTER TABLE)
ALTER TABLE public.mission_sessions DROP CONSTRAINT IF EXISTS mission_sessions_user_id_unique;
ALTER TABLE public.vision_sessions DROP CONSTRAINT IF EXISTS vision_sessions_user_id_unique;

-- Criar novas constraints compostas (user_id + account_id)
CREATE UNIQUE INDEX IF NOT EXISTS mission_sessions_user_account_unique 
  ON public.mission_sessions (user_id, account_id) 
  WHERE account_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS vision_sessions_user_account_unique 
  ON public.vision_sessions (user_id, account_id) 
  WHERE account_id IS NOT NULL;