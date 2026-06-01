// Types for Onboarding Competency Assessment

export type OnboardingCompetencyType = 'technical_required' | 'technical_desired' | 'behavioral';

export interface OnboardingCompetencyAssessment {
  id: string;
  competency_name: string;
  competency_type: OnboardingCompetencyType;
  has_competency: boolean;
  create_onboarding_task: boolean;
  add_to_evolution: boolean;
  notes?: string;
}

export interface JobDescriptionCompetency {
  name: string;
  type: OnboardingCompetencyType;
}

export interface JobDescriptionForOnboarding {
  id: string;
  title: string;
  area?: string | null;
  required_skills?: string[] | null;
  desired_skills?: string[] | null;
  behavioral_competencies?: string[] | null;
}

// Helper to get label for competency type
export function getCompetencyTypeLabel(type: OnboardingCompetencyType): string {
  const labels: Record<OnboardingCompetencyType, string> = {
    technical_required: 'Técnica Obrigatória',
    technical_desired: 'Técnica Desejável',
    behavioral: 'Comportamental',
  };
  return labels[type];
}

// Helper to get color for competency type
export function getCompetencyTypeColor(type: OnboardingCompetencyType): string {
  const colors: Record<OnboardingCompetencyType, string> = {
    technical_required: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
    technical_desired: 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400',
    behavioral: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
  };
  return colors[type];
}

// Extract all competencies from a Job Description
export function extractCompetenciesFromJD(jd: JobDescriptionForOnboarding): JobDescriptionCompetency[] {
  const competencies: JobDescriptionCompetency[] = [];

  // Technical Required
  if (jd.required_skills?.length) {
    jd.required_skills.forEach(skill => {
      competencies.push({ name: skill, type: 'technical_required' });
    });
  }

  // Technical Desired
  if (jd.desired_skills?.length) {
    jd.desired_skills.forEach(skill => {
      competencies.push({ name: skill, type: 'technical_desired' });
    });
  }

  // Behavioral
  if (jd.behavioral_competencies?.length) {
    jd.behavioral_competencies.forEach(comp => {
      competencies.push({ name: comp, type: 'behavioral' });
    });
  }

  return competencies;
}
