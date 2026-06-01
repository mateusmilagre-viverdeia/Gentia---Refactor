-- =====================================================
-- TALENT MARKETPLACE: Shared Talent Pool (Cross-Tenant)
-- =====================================================

-- 1. Tabela principal: candidatos anonimizados disponíveis para match
CREATE TABLE shared_talent_pool (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Referências (não expostas diretamente)
  candidate_id UUID REFERENCES recruitment_candidates(id) ON DELETE CASCADE,
  candidate_profile_id UUID REFERENCES candidate_profiles(id),
  source_account_id UUID REFERENCES companies(id) NOT NULL,
  
  -- Dados de Cultural Fit (copiados para não depender de RLS)
  cultural_score INTEGER,
  cultural_radar_data JSONB,
  
  -- DISC Profile
  disc_primary TEXT,
  disc_secondary TEXT,
  disc_scores JSONB,
  
  -- Dados anonimizados
  skills TEXT[] DEFAULT '{}',
  experience_years INTEGER,
  seniority_level TEXT,
  salary_range TEXT,
  location_city TEXT,
  location_state TEXT,
  remote_preference TEXT,
  
  -- Embedding para match semântico cross-company
  embedding vector(768),
  
  -- Consent e lifecycle
  opted_out BOOLEAN DEFAULT false,
  opted_out_at TIMESTAMPTZ,
  available_until TIMESTAMPTZ DEFAULT (now() + interval '6 months'),
  unlock_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Unique constraint
  UNIQUE(candidate_id)
);

-- Índices para busca rápida
CREATE INDEX idx_shared_talent_pool_embedding ON shared_talent_pool 
  USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_shared_talent_pool_cultural_score ON shared_talent_pool(cultural_score DESC);
CREATE INDEX idx_shared_talent_pool_skills ON shared_talent_pool USING gin(skills);
CREATE INDEX idx_shared_talent_pool_available ON shared_talent_pool(opted_out, available_until);
CREATE INDEX idx_shared_talent_pool_disc ON shared_talent_pool(disc_primary, disc_secondary);
CREATE INDEX idx_shared_talent_pool_location ON shared_talent_pool(location_city, location_state);

-- 2. Tabela de desbloqueios pagos
CREATE TABLE talent_pool_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Quem desbloqueou
  buyer_account_id UUID REFERENCES companies(id) NOT NULL,
  buyer_user_id UUID NOT NULL,
  
  -- O que foi desbloqueado
  talent_pool_id UUID REFERENCES shared_talent_pool(id) NOT NULL,
  
  -- Pagamento
  credits_charged INTEGER NOT NULL DEFAULT 8,
  
  -- Dados revelados (snapshot no momento do unlock)
  revealed_data JSONB NOT NULL DEFAULT '{}',
  
  -- Tracking de conversão
  contact_initiated BOOLEAN DEFAULT false,
  contacted_at TIMESTAMPTZ,
  interview_scheduled BOOLEAN DEFAULT false,
  hired BOOLEAN DEFAULT false,
  hired_at TIMESTAMPTZ,
  
  -- Notas e status
  status TEXT DEFAULT 'unlocked',
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Evitar desbloqueio duplicado
  UNIQUE(buyer_account_id, talent_pool_id)
);

CREATE INDEX idx_talent_pool_unlocks_buyer ON talent_pool_unlocks(buyer_account_id);
CREATE INDEX idx_talent_pool_unlocks_status ON talent_pool_unlocks(status);

-- 3. RLS Policies

-- shared_talent_pool: Acesso restrito via Edge Functions
ALTER TABLE shared_talent_pool ENABLE ROW LEVEL SECURITY;

-- Ninguém pode SELECT diretamente (forçar uso da edge function)
CREATE POLICY "No direct select on shared talent pool"
ON shared_talent_pool FOR SELECT USING (false);

-- Source account pode gerenciar seus próprios candidatos no pool
CREATE POLICY "Source account can update their pool entries"
ON shared_talent_pool FOR UPDATE
USING (
  source_account_id IN (
    SELECT account_id FROM account_members WHERE user_id = auth.uid() AND is_active = true
  )
);

-- talent_pool_unlocks: Empresa só vê seus desbloqueios
ALTER TABLE talent_pool_unlocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own unlocks"
ON talent_pool_unlocks FOR SELECT
USING (
  buyer_account_id IN (
    SELECT account_id FROM account_members WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Insert own unlocks"
ON talent_pool_unlocks FOR INSERT
WITH CHECK (
  buyer_account_id IN (
    SELECT account_id FROM account_members WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Update own unlocks"
ON talent_pool_unlocks FOR UPDATE
USING (
  buyer_account_id IN (
    SELECT account_id FROM account_members WHERE user_id = auth.uid() AND is_active = true
  )
);

-- 4. Função auxiliar: extrair skills do candidato
CREATE OR REPLACE FUNCTION extract_candidate_skills(p_candidate_id UUID)
RETURNS TEXT[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tags TEXT[];
BEGIN
  SELECT tags INTO v_tags
  FROM recruitment_candidates
  WHERE id = p_candidate_id;
  
  RETURN COALESCE(v_tags, ARRAY[]::TEXT[]);
END;
$$;

-- 5. Trigger function: adicionar ao pool após desqualificação
CREATE OR REPLACE FUNCTION add_to_shared_talent_pool()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cultural_session RECORD;
  v_disc_result RECORD;
  v_profile RECORD;
  v_embedding vector(768);
BEGIN
  -- Só processar se stage mudou para 'rejected' ou 'disqualified'
  IF NEW.stage NOT IN ('rejected', 'disqualified') THEN
    RETURN NEW;
  END IF;
  
  -- Verificar se já existe no pool
  IF EXISTS (SELECT 1 FROM shared_talent_pool WHERE candidate_id = NEW.id) THEN
    RETURN NEW;
  END IF;
  
  -- Buscar última sessão cultural com score
  SELECT 
    cis.matching_score,
    cis.candidate_radar_data,
    cis.candidate_profile_id
  INTO v_cultural_session
  FROM culture_interview_sessions cis
  WHERE cis.candidate_id = NEW.id
    AND cis.status = 'completed'
    AND cis.matching_score IS NOT NULL
  ORDER BY cis.completed_at DESC NULLS LAST
  LIMIT 1;
  
  -- Só adicionar se tiver passado por entrevista cultural
  IF v_cultural_session.matching_score IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Buscar resultado DISC mais recente
  SELECT 
    cdr.primary_profile,
    cdr.secondary_profile,
    jsonb_build_object(
      'd', cdr.d_normalized,
      'i', cdr.i_normalized,
      's', cdr.s_normalized,
      'c', cdr.c_normalized
    ) as scores
  INTO v_disc_result
  FROM candidate_disc_results cdr
  JOIN candidate_disc_sessions cds ON cds.id = cdr.session_id
  WHERE cds.candidate_id = NEW.id
  ORDER BY cdr.created_at DESC
  LIMIT 1;
  
  -- Buscar embedding existente
  SELECT embedding INTO v_embedding
  FROM candidate_embeddings
  WHERE candidate_id = NEW.id
    AND embedding IS NOT NULL
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Buscar profile se existir
  IF v_cultural_session.candidate_profile_id IS NOT NULL THEN
    SELECT * INTO v_profile
    FROM candidate_profiles
    WHERE id = v_cultural_session.candidate_profile_id;
  END IF;
  
  -- Inserir no pool
  INSERT INTO shared_talent_pool (
    candidate_id,
    candidate_profile_id,
    source_account_id,
    cultural_score,
    cultural_radar_data,
    disc_primary,
    disc_secondary,
    disc_scores,
    skills,
    location_city,
    embedding
  ) VALUES (
    NEW.id,
    v_cultural_session.candidate_profile_id,
    NEW.account_id,
    v_cultural_session.matching_score,
    v_cultural_session.candidate_radar_data,
    v_disc_result.primary_profile,
    v_disc_result.secondary_profile,
    v_disc_result.scores,
    extract_candidate_skills(NEW.id),
    v_profile.city,
    v_embedding
  );
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the original update
  RAISE WARNING 'Error adding candidate % to shared talent pool: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- 6. Trigger
CREATE TRIGGER trg_add_to_shared_talent_pool
AFTER UPDATE OF stage ON recruitment_candidates
FOR EACH ROW
WHEN (OLD.stage IS DISTINCT FROM NEW.stage)
EXECUTE FUNCTION add_to_shared_talent_pool();

-- 7. Trigger para atualizar updated_at
CREATE TRIGGER update_shared_talent_pool_updated_at
BEFORE UPDATE ON shared_talent_pool
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_talent_pool_unlocks_updated_at
BEFORE UPDATE ON talent_pool_unlocks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();