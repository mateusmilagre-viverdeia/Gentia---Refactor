import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DISCResult, DISCDimension } from '@/types/disc.types';
import { EvolutionActionType } from '@/types/evolution.types';
import { toast } from 'sonner';

// Thresholds for identifying development areas vs potential excesses
const DISC_LOW_THRESHOLD = 40;  // Below this = development area
const DISC_HIGH_THRESHOLD = 80; // Above this = potential excess

interface DISCCompetencyMapping {
  dimension: DISCDimension;
  condition: 'low' | 'high';
  competency_name: string;
  competency_type: 'behavioral' | 'technical' | 'leadership';
  strategic_justification: string;
  expected_impact: string;
  success_indicators: string[];
  actions: {
    action_type: EvolutionActionType;
    description: string;
  }[];
}

export const DISC_COMPETENCY_MAPPINGS: DISCCompetencyMapping[] = [
  // LOW SCORE MAPPINGS (Development Areas)
  {
    dimension: 'D',
    condition: 'low',
    competency_name: 'Assertividade e Tomada de Decisão',
    competency_type: 'behavioral',
    strategic_justification: 'Perfil DISC indica baixa dominância, sugerindo oportunidade de desenvolvimento em assertividade e tomada de decisões rápidas.',
    expected_impact: 'Maior agilidade na tomada de decisões e capacidade de liderar situações desafiadoras.',
    success_indicators: [
      'Toma decisões de forma mais rápida e confiante',
      'Expressa opiniões de forma clara e direta',
      'Assume responsabilidade em situações de pressão',
    ],
    actions: [
      { action_type: 'learning', description: 'Curso de comunicação assertiva e tomada de decisão' },
      { action_type: 'support', description: 'Mentoria com líder de perfil D alto para modelagem comportamental' },
      { action_type: 'practical', description: 'Liderar uma iniciativa ou projeto com decisões autônomas' },
    ],
  },
  {
    dimension: 'I',
    condition: 'low',
    competency_name: 'Comunicação e Influência Positiva',
    competency_type: 'behavioral',
    strategic_justification: 'Perfil DISC indica baixa influência, sugerindo oportunidade de desenvolvimento em comunicação interpessoal e networking.',
    expected_impact: 'Melhoria na capacidade de engajar e influenciar stakeholders.',
    success_indicators: [
      'Comunica ideias de forma mais envolvente',
      'Desenvolve relacionamentos profissionais mais amplos',
      'Demonstra maior entusiasmo em apresentações',
    ],
    actions: [
      { action_type: 'learning', description: 'Workshop de storytelling e apresentação de alto impacto' },
      { action_type: 'practical', description: 'Conduzir reuniões e apresentações para grupos diversos' },
      { action_type: 'support', description: 'Acompanhamento com profissional de comunicação' },
    ],
  },
  {
    dimension: 'S',
    condition: 'low',
    competency_name: 'Gestão de Mudanças e Flexibilidade',
    competency_type: 'behavioral',
    strategic_justification: 'Perfil DISC indica baixa estabilidade, sugerindo oportunidade de desenvolvimento em paciência e consistência.',
    expected_impact: 'Maior estabilidade em processos de longo prazo e trabalho em equipe.',
    success_indicators: [
      'Mantém projetos de longo prazo com consistência',
      'Demonstra maior paciência em situações de conflito',
      'Colabora de forma mais efetiva em equipe',
    ],
    actions: [
      { action_type: 'learning', description: 'Treinamento em inteligência emocional e gestão de conflitos' },
      { action_type: 'practical', description: 'Participar de projeto de longa duração com entregas graduais' },
      { action_type: 'support', description: 'Sessões de coaching focadas em mindfulness e autocontrole' },
    ],
  },
  {
    dimension: 'C',
    condition: 'low',
    competency_name: 'Atenção a Detalhes e Qualidade',
    competency_type: 'behavioral',
    strategic_justification: 'Perfil DISC indica baixa conformidade, sugerindo oportunidade de desenvolvimento em análise e precisão.',
    expected_impact: 'Maior qualidade nas entregas e redução de erros.',
    success_indicators: [
      'Entregas com menos revisões necessárias',
      'Análise mais criteriosa antes de decisões',
      'Melhor organização e documentação',
    ],
    actions: [
      { action_type: 'learning', description: 'Curso de análise de dados e pensamento crítico' },
      { action_type: 'practical', description: 'Responsabilidade por projeto que exija alta precisão' },
      { action_type: 'support', description: 'Mentoria com profissional de perfil C alto' },
    ],
  },
  // HIGH SCORE MAPPINGS (Potential Excesses)
  {
    dimension: 'D',
    condition: 'high',
    competency_name: 'Gestão de Conflitos e Colaboração',
    competency_type: 'behavioral',
    strategic_justification: 'Perfil DISC indica alta dominância, que pode gerar desafios em colaboração e gestão de relacionamentos.',
    expected_impact: 'Melhor clima de equipe e relacionamentos mais sustentáveis.',
    success_indicators: [
      'Escuta mais ativamente antes de agir',
      'Considera perspectivas diferentes nas decisões',
      'Reduz conflitos interpessoais',
    ],
    actions: [
      { action_type: 'support', description: 'Coaching focado em escuta ativa e empatia' },
      { action_type: 'practical', description: 'Facilitar sessões de colaboração com times diversos' },
      { action_type: 'learning', description: 'Leitura: "Como fazer amigos e influenciar pessoas" - Dale Carnegie' },
    ],
  },
  {
    dimension: 'I',
    condition: 'high',
    competency_name: 'Foco e Disciplina',
    competency_type: 'behavioral',
    strategic_justification: 'Perfil DISC indica alta influência, que pode gerar desafios em foco e finalização de tarefas.',
    expected_impact: 'Maior consistência na entrega de resultados.',
    success_indicators: [
      'Conclui projetos dentro do prazo',
      'Mantém foco em tarefas longas',
      'Reduz dispersão em reuniões',
    ],
    actions: [
      { action_type: 'learning', description: 'Workshop de gestão do tempo e produtividade' },
      { action_type: 'practical', description: 'Projeto com entregas semanais e acompanhamento rigoroso' },
      { action_type: 'support', description: 'Coaching para desenvolvimento de disciplina e foco' },
    ],
  },
  {
    dimension: 'S',
    condition: 'high',
    competency_name: 'Iniciativa e Proatividade',
    competency_type: 'behavioral',
    strategic_justification: 'Perfil DISC indica alta estabilidade, que pode gerar resistência a mudanças e falta de iniciativa.',
    expected_impact: 'Maior adaptabilidade e capacidade de inovação.',
    success_indicators: [
      'Propõe mudanças e melhorias',
      'Adapta-se rapidamente a novas situações',
      'Toma iniciativa sem esperar direcionamento',
    ],
    actions: [
      { action_type: 'learning', description: 'Treinamento em mentalidade de crescimento e inovação' },
      { action_type: 'practical', description: 'Liderar implementação de uma mudança ou melhoria' },
      { action_type: 'support', description: 'Mentoria com intraempreendedor da organização' },
    ],
  },
  {
    dimension: 'C',
    condition: 'high',
    competency_name: 'Flexibilidade e Adaptação',
    competency_type: 'behavioral',
    strategic_justification: 'Perfil DISC indica alta conformidade, que pode gerar excesso de análise e dificuldade em lidar com ambiguidade.',
    expected_impact: 'Maior agilidade e capacidade de lidar com incertezas.',
    success_indicators: [
      'Toma decisões com informações incompletas',
      'Aceita soluções "bom o suficiente"',
      'Adapta-se a mudanças de prioridade',
    ],
    actions: [
      { action_type: 'support', description: 'Coaching para lidar com ambiguidade e imperfeição' },
      { action_type: 'practical', description: 'Projeto ágil com mudanças frequentes de escopo' },
      { action_type: 'learning', description: 'Leitura: "Antifrágil" - Nassim Taleb' },
    ],
  },
];

export interface DISCCompetencyToCreate {
  mapping: DISCCompetencyMapping;
  score: number;
  condition: 'low' | 'high';
}

export function useDISCEvolutionIntegration() {
  const [isCreating, setIsCreating] = useState(false);

  /**
   * Identifies competencies to create based on DISC result scores
   */
  function getCompetenciesToCreate(result: DISCResult): DISCCompetencyToCreate[] {
    const scores: { dimension: DISCDimension; normalized: number }[] = [
      { dimension: 'D', normalized: result.d_normalized },
      { dimension: 'I', normalized: result.i_normalized },
      { dimension: 'S', normalized: result.s_normalized },
      { dimension: 'C', normalized: result.c_normalized },
    ];

    const competencies: DISCCompetencyToCreate[] = [];

    for (const { dimension, normalized } of scores) {
      // Check for low score (development area)
      if (normalized < DISC_LOW_THRESHOLD) {
        const mapping = DISC_COMPETENCY_MAPPINGS.find(
          m => m.dimension === dimension && m.condition === 'low'
        );
        if (mapping) {
          competencies.push({ mapping, score: normalized, condition: 'low' });
        }
      }
      // Check for high score (potential excess)
      else if (normalized > DISC_HIGH_THRESHOLD) {
        const mapping = DISC_COMPETENCY_MAPPINGS.find(
          m => m.dimension === dimension && m.condition === 'high'
        );
        if (mapping) {
          competencies.push({ mapping, score: normalized, condition: 'high' });
        }
      }
    }

    return competencies;
  }

  /**
   * Finds an active evolution cycle for the collaborator
   */
  async function findActiveEvolutionCycle(collaboratorId: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('evolution_cycles')
      .select('id')
      .eq('collaborator_id', collaboratorId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error finding evolution cycle:', error);
      return null;
    }

    return data?.id || null;
  }

  /**
   * Creates DISC-based competencies in an evolution cycle
   */
  async function createDISCCompetencies(
    cycleId: string,
    discResult: DISCResult,
    discSessionId: string
  ): Promise<boolean> {
    setIsCreating(true);

    try {
      const competenciesToCreate = getCompetenciesToCreate(discResult);

      if (competenciesToCreate.length === 0) {
        toast.info('Nenhuma competência identificada para desenvolvimento');
        return false;
      }

      // Create competencies
      for (const { mapping, score, condition } of competenciesToCreate) {
        // Insert competency
        const { data: competency, error: compError } = await supabase
          .from('evolution_competencies')
          .insert({
            cycle_id: cycleId,
            competency_name: mapping.competency_name,
            competency_type: mapping.competency_type,
            strategic_justification: `${mapping.strategic_justification} (Score ${mapping.dimension}: ${score.toFixed(1)}%)`,
            expected_impact: mapping.expected_impact,
            success_indicators: mapping.success_indicators,
            is_priority: condition === 'low', // Low scores are priority development areas
            source: 'disc_assessment',
            source_reference_id: discSessionId,
          })
          .select('id')
          .single();

        if (compError) {
          console.error('Error creating competency:', compError);
          continue;
        }

        // Create objective for the competency
        const { data: objective, error: objError } = await supabase
          .from('evolution_objectives')
          .insert({
            cycle_id: cycleId,
            competency_id: competency.id,
            objective_text: `Desenvolver ${mapping.competency_name}`,
            key_behaviors: mapping.success_indicators,
            status: 'not_started',
          })
          .select('id')
          .single();

        if (objError) {
          console.error('Error creating objective:', objError);
          continue;
        }

        // Create actions for the objective
        for (let i = 0; i < mapping.actions.length; i++) {
          const action = mapping.actions[i];
          await supabase.from('evolution_actions').insert({
            objective_id: objective.id,
            action_type: action.action_type,
            description: action.description,
            status: 'pending',
            order_index: i,
          });
        }
      }

      toast.success(`${competenciesToCreate.length} competência(s) criada(s) no PDI`);
      return true;
    } catch (error) {
      console.error('Error creating DISC competencies:', error);
      toast.error('Erro ao criar competências no PDI');
      return false;
    } finally {
      setIsCreating(false);
    }
  }

  return {
    getCompetenciesToCreate,
    findActiveEvolutionCycle,
    createDISCCompetencies,
    isCreating,
  };
}
