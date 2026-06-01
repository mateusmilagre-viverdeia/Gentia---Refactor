-- Templates de proposta/oferta
CREATE TABLE public.recruitment_proposal_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'offer_letter' CHECK (type IN ('offer_letter', 'contract', 'counter_offer', 'rejection_polite')),
  description TEXT,
  content TEXT NOT NULL, -- Template com variáveis {{candidateName}}, {{salary}}, etc.
  variables JSONB DEFAULT '[]', -- Lista de variáveis disponíveis
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  language TEXT DEFAULT 'pt-BR',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Propostas geradas
CREATE TABLE public.recruitment_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  application_id UUID NOT NULL REFERENCES public.recruitment_applications(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.recruitment_proposal_templates(id) ON DELETE SET NULL,
  
  -- Dados da proposta
  salary_offered NUMERIC,
  currency TEXT DEFAULT 'BRL',
  start_date DATE,
  benefits JSONB DEFAULT '[]', -- [{name, value, description}]
  custom_clauses TEXT[], -- Cláusulas personalizadas
  additional_notes TEXT,
  
  -- Conteúdo gerado
  generated_content TEXT, -- Gerado pela IA
  final_content TEXT, -- Após edições manuais
  
  -- Status da proposta
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'sent', 'viewed', 'accepted', 'rejected', 'negotiating', 'expired', 'withdrawn')),
  
  -- Timeline
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  sent_via TEXT, -- 'email', 'whatsapp', 'manual'
  viewed_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  response_type TEXT, -- 'accepted', 'rejected', 'counter_offer'
  response_notes TEXT,
  
  -- Validade
  valid_until DATE,
  
  -- Metadata
  generated_by UUID,
  version INTEGER DEFAULT 1,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX recruitment_proposal_templates_account_id_idx ON public.recruitment_proposal_templates(account_id);
CREATE INDEX recruitment_proposal_templates_type_idx ON public.recruitment_proposal_templates(type);
CREATE INDEX recruitment_proposals_account_id_idx ON public.recruitment_proposals(account_id);
CREATE INDEX recruitment_proposals_application_id_idx ON public.recruitment_proposals(application_id);
CREATE INDEX recruitment_proposals_status_idx ON public.recruitment_proposals(status);

-- Enable RLS
ALTER TABLE public.recruitment_proposal_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruitment_proposals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for templates
CREATE POLICY "Users can view proposal templates from their organization"
ON public.recruitment_proposal_templates FOR SELECT
USING (
  account_id IN (
    SELECT account_id FROM public.account_members 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Users can insert proposal templates for their organization"
ON public.recruitment_proposal_templates FOR INSERT
WITH CHECK (
  account_id IN (
    SELECT account_id FROM public.account_members 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Users can update proposal templates in their organization"
ON public.recruitment_proposal_templates FOR UPDATE
USING (
  account_id IN (
    SELECT account_id FROM public.account_members 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Users can delete proposal templates from their organization"
ON public.recruitment_proposal_templates FOR DELETE
USING (
  account_id IN (
    SELECT account_id FROM public.account_members 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- RLS Policies for proposals
CREATE POLICY "Users can view proposals from their organization"
ON public.recruitment_proposals FOR SELECT
USING (
  account_id IN (
    SELECT account_id FROM public.account_members 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Users can insert proposals for their organization"
ON public.recruitment_proposals FOR INSERT
WITH CHECK (
  account_id IN (
    SELECT account_id FROM public.account_members 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Users can update proposals in their organization"
ON public.recruitment_proposals FOR UPDATE
USING (
  account_id IN (
    SELECT account_id FROM public.account_members 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Users can delete proposals from their organization"
ON public.recruitment_proposals FOR DELETE
USING (
  account_id IN (
    SELECT account_id FROM public.account_members 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- Trigger para updated_at
CREATE TRIGGER update_recruitment_proposal_templates_updated_at
  BEFORE UPDATE ON public.recruitment_proposal_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_recruitment_proposals_updated_at
  BEFORE UPDATE ON public.recruitment_proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir template padrão de oferta
INSERT INTO public.recruitment_proposal_templates (
  account_id,
  name,
  type,
  description,
  content,
  variables,
  is_default
) 
SELECT 
  c.id as account_id,
  'Carta de Oferta Padrão' as name,
  'offer_letter' as type,
  'Template padrão para cartas de oferta de emprego' as description,
  E'Prezado(a) {{candidateName}},

É com grande satisfação que formalizamos nossa proposta de trabalho para a posição de **{{jobTitle}}** na {{companyName}}.

## Detalhes da Proposta

**Cargo:** {{jobTitle}}
**Departamento:** {{department}}
**Localização:** {{location}}
**Tipo de Contrato:** {{employmentType}}

**Remuneração:** {{salary}} {{currency}}/mês
**Data de Início Prevista:** {{startDate}}

## Benefícios

{{benefits}}

## Próximos Passos

Caso aceite nossa proposta, solicitamos que nos retorne até **{{validUntil}}** para darmos continuidade ao processo de admissão.

Estamos muito entusiasmados com a possibilidade de tê-lo(a) em nossa equipe e contribuindo para {{companyMission}}.

Atenciosamente,

**{{hiringManagerName}}**
{{companyName}}' as content,
  '[
    {"name": "candidateName", "label": "Nome do Candidato", "required": true},
    {"name": "candidateFirstName", "label": "Primeiro Nome", "required": false},
    {"name": "jobTitle", "label": "Título da Vaga", "required": true},
    {"name": "department", "label": "Departamento", "required": false},
    {"name": "location", "label": "Localização", "required": false},
    {"name": "employmentType", "label": "Tipo de Contrato", "required": false},
    {"name": "salary", "label": "Salário", "required": true},
    {"name": "currency", "label": "Moeda", "required": false},
    {"name": "startDate", "label": "Data de Início", "required": true},
    {"name": "benefits", "label": "Benefícios", "required": false},
    {"name": "validUntil", "label": "Válido Até", "required": false},
    {"name": "companyName", "label": "Nome da Empresa", "required": true},
    {"name": "companyMission", "label": "Missão da Empresa", "required": false},
    {"name": "hiringManagerName", "label": "Nome do Gestor", "required": false}
  ]'::jsonb as variables,
  true as is_default
FROM public.companies c
WHERE EXISTS (
  SELECT 1 FROM public.account_members am 
  WHERE am.account_id = c.id AND am.is_active = true
)
LIMIT 100;