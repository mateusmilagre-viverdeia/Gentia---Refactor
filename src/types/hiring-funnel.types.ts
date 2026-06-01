export interface HiringFunnel {
  id: string;
  account_id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface HiringFunnelStage {
  id: string;
  funnel_id: string;
  name: string;
  description: string | null;
  position: number;
  icon: string | null;
  color: string | null;
  is_required: boolean;
  step_type: string | null; // 'screening' | 'cultural' | 'disc' | 'technical' or null for manual
  created_at: string;
}

export type AutomationStepType = 'screening' | 'cultural' | 'disc' | 'technical';

export const AUTOMATION_STEP_LABELS: Record<AutomationStepType, string> = {
  screening: 'Triagem Inicial',
  cultural: 'Fit Cultural (IA)',
  disc: 'Fit Comportamental (DISC)',
  technical: 'Fit Técnico (IA)',
};

export const DEFAULT_STAGES: Omit<HiringFunnelStage, 'id' | 'funnel_id' | 'created_at'>[] = [
  { name: 'Triagem Inicial', position: 0, description: 'Perguntas eliminatórias antes da avaliação', icon: 'Shield', color: 'orange', is_required: false, step_type: 'screening' },
  { name: 'Fit Cultural', position: 1, description: 'Entrevista de cultura via IA', icon: 'Heart', color: 'purple', is_required: false, step_type: 'cultural' },
  { name: 'Fit Comportamental (DISC)', position: 2, description: 'Avaliação de perfil comportamental', icon: 'Brain', color: 'indigo', is_required: false, step_type: 'disc' },
  { name: 'Fit Técnico', position: 3, description: 'Avaliação técnica via IA', icon: 'Code', color: 'cyan', is_required: false, step_type: 'technical' },
  { name: 'Avaliação Final', position: 4, description: 'Entrevista com o RH ou gestor', icon: 'ClipboardCheck', color: 'amber', is_required: false, step_type: null },
  { name: 'Referências', position: 5, description: 'Pesquisa de referências profissionais', icon: 'Users', color: 'teal', is_required: false, step_type: null },
  { name: 'Proposta', position: 6, description: 'Envio e negociação da proposta', icon: 'FileCheck', color: 'emerald', is_required: false, step_type: null },
];
