export interface CultureCodeInput {
  companyName: string;
  mission: string;
  vision: string;
  values: Array<{
    label: string;
    dos: string[];
    donts: string[];
  }>;
  indicatorsByPerspective: Record<string, string[]>;
  projects: Array<{
    name: string;
    perspective: string;
    responsible?: string;
  }>;
  energyRituals: string[];
  developmentRituals: string[];
  decisionAnswers: Record<number, string[]>;
}

export interface StructureSection {
  id: string;
  name: string;
  description: string;
  estimatedSlides: number;
}

export interface CultureCodeStructure {
  sections: StructureSection[];
  totalSlides: number;
  notes: string;
}

export interface CultureCodeSlide {
  id: string;
  sectionId: string;
  slideNumber: number;
  title: string;
  body: string[];
  type: 'regular' | 'value' | 'pillar';
  valueData?: {
    mantra?: string;
    dos?: string[];
    donts?: string[];
  };
  isCustom?: boolean;
}

export type CultureCodeStage = 'history' | 'structure' | 'slides';

export interface CultureCodeSession {
  id: string;
  account_id: string;
  company_history: string | null;
  structure: CultureCodeStructure | null;
  slides: CultureCodeSlide[];
  stage: CultureCodeStage;
  created_at: string;
  updated_at: string;
}
