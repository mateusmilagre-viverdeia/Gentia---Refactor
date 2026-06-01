export interface SellingCompanySession {
  id: string;
  account_id: string;
  user_id: string;
  stage: 'wizard' | 'chat' | 'summary';
  wizard_step: number;
  responses: WizardResponses;
  status: 'draft' | 'generating' | 'approved';
  created_at: string;
  updated_at: string;
}

export interface ContentBlock {
  id: string;
  title: string;
  content: string;
  emoji: string;
  number: number;
}

export interface SellingCompanyVersion {
  id: string;
  session_id: string;
  content: string;
  prompt_used?: string;
  model_used: string;
  approved: boolean;
  created_at: string;
}

export interface WizardResponses {
  // Step 1: Contexto
  companyStory?: string; // Only if culture_code.history is empty
  dreamBig?: string;
  purpose?: string;
  
  // Step 2: Números e Marcos
  bigNumbers?: string;
  milestones?: string;
  currentMoment?: string;
  
  // Step 3: Benefícios
  tangibleBenefits?: string;
  developmentOpportunities?: string;
  workStyle?: string;
  
  // Step 4: Estilo e Transparência
  whatWeAre?: string;
  whatWeAreNot?: string;
  challenges?: string;
  
  // Step 5: Revisão (read-only, no new fields)
}

export interface CultureContext {
  mission?: string;
  vision?: string;
  values?: Array<{
    label: string;
    dos?: string[];
    donts?: string[];
  }>;
}

export interface CompanyContext {
  name: string;
  sector?: string;
  employees_count?: number;
  revenue_last_12_months?: number;
  website?: string;
  instagram?: string;
}

export const WIZARD_STEPS = [
  { id: 1, title: 'Contexto', description: 'História e propósito' },
  { id: 2, title: 'Números', description: 'Marcos e conquistas' },
  { id: 3, title: 'Benefícios', description: 'O que oferecemos' },
  { id: 4, title: 'Estilo', description: 'Malefícios' },
  { id: 5, title: 'Revisão', description: 'Confirmar e gerar' },
] as const;
