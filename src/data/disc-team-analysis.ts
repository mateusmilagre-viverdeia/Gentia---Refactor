import { DISCDimension, DISCTeamAggregation, DISCTeamAnalysis, DISC_DIMENSIONS } from '@/types/disc.types';

/**
 * Thresholds for profile distribution analysis
 */
const DISTRIBUTION_THRESHOLDS = {
  underrepresented: 0.15, // Less than 15% of team
  overrepresented: 0.40,  // More than 40% of team
  balanced: { min: 0.20, max: 0.35 } // Between 20-35%
};

/**
 * Strengths associated with each DISC dimension
 */
const DIMENSION_STRENGTHS: Record<DISCDimension, string[]> = {
  D: [
    'Alto poder de decisão e assertividade',
    'Capacidade de assumir riscos calculados',
    'Orientação forte para resultados',
    'Agilidade na tomada de decisão'
  ],
  I: [
    'Excelente comunicação e networking',
    'Capacidade de motivar e engajar o time',
    'Habilidade para resolver conflitos',
    'Criatividade e inovação'
  ],
  S: [
    'Estabilidade e confiabilidade operacional',
    'Lealdade e comprometimento com a equipe',
    'Paciência para processos complexos',
    'Escuta ativa e empatia'
  ],
  C: [
    'Rigor analítico e atenção aos detalhes',
    'Qualidade e precisão nas entregas',
    'Planejamento sistemático',
    'Documentação e gestão de processos'
  ]
};

/**
 * Risks associated with dimension concentration
 */
const DIMENSION_RISKS: Record<DISCDimension, string[]> = {
  D: [
    'Conflitos por controle e poder',
    'Decisões precipitadas sem análise suficiente',
    'Atropelo de processos e pessoas',
    'Comunicação agressiva ou impaciente'
  ],
  I: [
    'Falta de foco em detalhes e execução',
    'Dificuldade em manter consistência',
    'Excesso de otimismo sem base em dados',
    'Priorização de relacionamentos sobre resultados'
  ],
  S: [
    'Resistência a mudanças necessárias',
    'Lentidão na tomada de decisão',
    'Evitar conflitos mesmo quando necessários',
    'Dificuldade em se adaptar a urgências'
  ],
  C: [
    'Paralisia por análise excessiva',
    'Perfeccionismo que atrasa entregas',
    'Dificuldade com ambiguidade',
    'Comunicação fria ou distante'
  ]
};

/**
 * Recommendations for gaps in specific profiles
 */
const GAP_RECOMMENDATIONS: Record<DISCDimension, string[]> = {
  D: [
    'Considere contratar alguém com perfil decisivo para liderar iniciativas',
    'Designe um membro para assumir decisões rápidas em situações críticas',
    'Treine o time em assertividade e tomada de decisão'
  ],
  I: [
    'Considere adicionar alguém comunicativo para integração do time',
    'Invista em atividades de team building e comunicação',
    'Designe responsáveis por apresentações e networking'
  ],
  S: [
    'Considere contratar alguém estável para operações contínuas',
    'Crie processos claros para garantir consistência',
    'Designe guardiões de conhecimento e mentores'
  ],
  C: [
    'Considere contratar alguém analítico para controle de qualidade',
    'Implemente revisões técnicas antes de entregas importantes',
    'Crie checklists e documentação de processos críticos'
  ]
};

/**
 * Analyze team DISC composition and generate insights
 */
export function analyzeTeamDISC(aggregation: DISCTeamAggregation): DISCTeamAnalysis {
  const { avgScores, profileDistribution, memberCount } = aggregation;
  
  const strengths: string[] = [];
  const risks: string[] = [];
  const gaps: DISCDimension[] = [];
  const recommendations: string[] = [];
  
  if (memberCount === 0) {
    return { strengths, risks, gaps, recommendations };
  }
  
  const dimensions: DISCDimension[] = ['D', 'I', 'S', 'C'];
  
  // Calculate percentages
  const percentages = dimensions.reduce((acc, dim) => {
    acc[dim] = memberCount > 0 ? profileDistribution[dim] / memberCount : 0;
    return acc;
  }, {} as Record<DISCDimension, number>);
  
  // Find dominant and underrepresented profiles
  dimensions.forEach((dim) => {
    const pct = percentages[dim];
    const count = profileDistribution[dim];
    
    // Identify strengths from well-represented profiles
    if (count >= 2 || pct >= DISTRIBUTION_THRESHOLDS.balanced.min) {
      strengths.push(DIMENSION_STRENGTHS[dim][0]);
      if (pct >= DISTRIBUTION_THRESHOLDS.balanced.max) {
        strengths.push(DIMENSION_STRENGTHS[dim][1]);
      }
    }
    
    // Identify risks from overrepresented profiles
    if (pct >= DISTRIBUTION_THRESHOLDS.overrepresented) {
      risks.push(`Muitos perfis ${dim} (${Math.round(pct * 100)}%): ${DIMENSION_RISKS[dim][0]}`);
      risks.push(DIMENSION_RISKS[dim][1]);
    }
    
    // Identify gaps from underrepresented profiles
    if (pct < DISTRIBUTION_THRESHOLDS.underrepresented && memberCount >= 4) {
      gaps.push(dim);
    }
  });
  
  // Generate recommendations based on gaps and composition
  gaps.forEach((dim) => {
    recommendations.push(GAP_RECOMMENDATIONS[dim][0]);
    recommendations.push(GAP_RECOMMENDATIONS[dim][2]);
  });
  
  // Add general recommendations based on team dynamics
  const dominantDim = dimensions.reduce((a, b) => 
    avgScores[a] > avgScores[b] ? a : b
  );
  const secondaryDim = dimensions.reduce((a, b) => {
    if (a === dominantDim) return b;
    if (b === dominantDim) return a;
    return avgScores[a] > avgScores[b] ? a : b;
  });
  
  // Team dynamic recommendations
  if (dominantDim === 'D' && percentages['S'] < 0.20) {
    recommendations.push('Balance a velocidade do time com processos de validação');
  }
  if (dominantDim === 'I' && percentages['C'] < 0.20) {
    recommendations.push('Implemente revisões de qualidade para balancear o entusiasmo com precisão');
  }
  if (dominantDim === 'S' && percentages['D'] < 0.20) {
    recommendations.push('Defina claramente quem assume decisões em momentos de urgência');
  }
  if (dominantDim === 'C' && percentages['I'] < 0.20) {
    recommendations.push('Promova momentos de integração e comunicação informal no time');
  }
  
  // Add complementary strengths
  if (percentages['D'] >= 0.15 && percentages['C'] >= 0.15) {
    strengths.push('Equilíbrio entre velocidade de decisão (D) e rigor analítico (C)');
  }
  if (percentages['I'] >= 0.15 && percentages['S'] >= 0.15) {
    strengths.push('Boa dinâmica relacional: comunicação (I) e estabilidade (S)');
  }
  
  // Remove duplicates and limit items
  return {
    strengths: [...new Set(strengths)].slice(0, 6),
    risks: [...new Set(risks)].slice(0, 5),
    gaps,
    recommendations: [...new Set(recommendations)].slice(0, 6)
  };
}

/**
 * Get color classes for a DISC dimension
 */
export function getDimensionColorClasses(dimension: DISCDimension): {
  bg: string;
  text: string;
  border: string;
  fill: string;
} {
  const colors: Record<DISCDimension, { bg: string; text: string; border: string; fill: string }> = {
    D: { bg: 'bg-red-500', text: 'text-red-600', border: 'border-red-500', fill: 'fill-red-500' },
    I: { bg: 'bg-yellow-500', text: 'text-yellow-600', border: 'border-yellow-500', fill: 'fill-yellow-500' },
    S: { bg: 'bg-green-500', text: 'text-green-600', border: 'border-green-500', fill: 'fill-green-500' },
    C: { bg: 'bg-blue-500', text: 'text-blue-600', border: 'border-blue-500', fill: 'fill-blue-500' }
  };
  return colors[dimension];
}

/**
 * Get dimension hex color for charts
 */
export function getDimensionHexColor(dimension: DISCDimension): string {
  const colors: Record<DISCDimension, string> = {
    D: '#ef4444', // red-500
    I: '#eab308', // yellow-500
    S: '#22c55e', // green-500
    C: '#3b82f6'  // blue-500
  };
  return colors[dimension];
}
