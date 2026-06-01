export interface UniqueAbilityAnalysis {
  id: string;
  account_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface UniqueAbilityActivity {
  id: string;
  analysis_id: string;
  name: string;
  skill_score: number | null;
  value_score: number | null;
  position: number;
  created_at: string;
}

export interface UniqueAbilityVersionHistory {
  id: string;
  analysis_id: string;
  snapshot: {
    activities: UniqueAbilityActivity[];
  };
  variant: string | null;
  created_at: string;
}

// AI Analysis result
export interface UniqueAbilityAIAnalysis {
  summary: string;
  timeVillains: {
    activity: string;
    recommendation: string;
    urgency: 'alta' | 'média' | 'baixa';
  }[];
  focusAreas: {
    activity: string;
    reason: string;
  }[];
  statistics: {
    totalActivities: number;
    redCount: number;
    yellowCount: number;
    greenCount: number;
    redPercentage: number;
    yellowPercentage: number;
    greenPercentage: number;
    estimatedTimeFreed: string;
  };
  actionPlan: {
    immediate: string[];
    shortTerm: string[];
    delegation: string[];
  };
  insights: string[];
}

// Skill scoring labels (1-4)
export const SKILL_LABELS: Record<number, string> = {
  1: "Incompetente",
  2: "Competente",
  3: "Excelente",
  4: "Habilidade Única"
};

// Value scoring labels (1-4)
export const VALUE_LABELS: Record<number, string> = {
  1: "Sem retorno",
  2: "Baixo retorno financeiro",
  3: "Alto retorno financeiro",
  4: "Alto valor agregado"
};

// Traffic light colors
export type TrafficLightColor = 'red' | 'yellow' | 'green';

export function getTrafficLight(total: number): TrafficLightColor {
  if (total <= 4) return 'red';
  if (total <= 6) return 'yellow';
  return 'green';
}

export const TRAFFIC_LIGHT_CONFIG: Record<TrafficLightColor, {
  title: string;
  description: string;
  bgColor: string;
  textColor: string;
}> = {
  red: {
    title: "PARE!",
    description: "É uma atividade que você não é muito bom fazendo e ainda não te retorna um ALTO valor financeiro ou agregado. Logo, pare de fazer essas atividades urgente e delegue, elimine, terceirize… Você é muito caro para fazer atividades como essas.",
    bgColor: "bg-red-500",
    textColor: "text-red-500"
  },
  yellow: {
    title: "Passe RÁPIDO OU PARE!",
    description: "É isso que significa no trânsito. Aqui é a mesma coisa, ou faça a atividade logo ou pare de fazer e delegue para alguém.",
    bgColor: "bg-yellow-500",
    textColor: "text-yellow-500"
  },
  green: {
    title: "SIGA EM FRENTE!",
    description: "Essas são as atividades que você tem que focar. São elas que você é excelente fazendo e são elas que vão gerar alto retorno financeiro e agregado para o seu negócio. Você vai notar que vão ser mais ou menos 20% só das atividades que você listou na tabela, o que é excelente - Sinal que, ao focar só nessas, vai ter muito mais tempo livre para o que realmente importa no seu negócio.",
    bgColor: "bg-green-500",
    textColor: "text-green-500"
  }
};
