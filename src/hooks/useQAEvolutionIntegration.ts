import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { QAResult, QADimension } from '@/types/qa.types';
import { EvolutionActionType } from '@/types/evolution.types';

interface QACompetencyMapping {
  dimension: QADimension;
  competency_name: string;
  strategic_justification: string;
  expected_impact: string;
  success_indicators: string[];
  actions: {
    action_type: EvolutionActionType;
    description: string;
  }[];
}

const QA_COMPETENCY_MAPPINGS: QACompetencyMapping[] = [
  {
    dimension: 'C',
    competency_name: 'Gestão de Influência e Controle',
    strategic_justification: 'Desenvolver a percepção de controle sobre situações adversas, focando nos aspectos que podem ser influenciados.',
    expected_impact: 'Maior proatividade na resolução de problemas e redução da sensação de impotência.',
    success_indicators: [
      'Identificar aspectos controláveis em situações adversas',
      'Demonstrar iniciativa em vez de reatividade',
      'Reduzir comportamentos de vitimização'
    ],
    actions: [
      { action_type: 'practical', description: 'Manter um diário de "Círculo de Influência": anotar 3 aspectos controláveis em cada situação adversa' },
      { action_type: 'learning', description: 'Participar de workshop ou curso sobre mindset de crescimento e locus de controle interno' },
      { action_type: 'support', description: 'Realizar 1:1 semanal com líder para feedback sobre progresso em situações práticas' }
    ]
  },
  {
    dimension: 'R',
    competency_name: 'Responsabilidade Proativa',
    strategic_justification: 'Fortalecer a capacidade de assumir ownership sobre problemas e suas soluções, independente da origem.',
    expected_impact: 'Maior engajamento na resolução de problemas e cultura de accountability.',
    success_indicators: [
      'Assumir responsabilidade por ações e resultados',
      'Propor soluções ao identificar problemas',
      'Evitar transferência de culpa'
    ],
    actions: [
      { action_type: 'practical', description: 'Criar documento de ownership em cada projeto, definindo claramente suas responsabilidades' },
      { action_type: 'learning', description: 'Estudar metodologias de problem-solving (5 Whys, PDCA, A3)' },
      { action_type: 'support', description: 'Participar de mentoria com colega sênior para desenvolver postura de ownership' }
    ]
  },
  {
    dimension: 'A',
    competency_name: 'Gestão de Impacto e Foco',
    strategic_justification: 'Desenvolver a habilidade de limitar o impacto de adversidades, evitando que problemas em uma área contaminem outras.',
    expected_impact: 'Maior equilíbrio entre vida pessoal e profissional, redução de estresse generalizado.',
    success_indicators: [
      'Manter problemas de trabalho no trabalho',
      'Preservar relacionamentos pessoais durante crises profissionais',
      'Demonstrar capacidade de compartimentalização saudável'
    ],
    actions: [
      { action_type: 'practical', description: 'Praticar técnica de compartimentalização: definir "rituais de transição" entre trabalho e vida pessoal' },
      { action_type: 'learning', description: 'Curso de gestão de estresse e inteligência emocional no ambiente de trabalho' },
      { action_type: 'support', description: 'Check-ins regulares com líder para avaliar equilíbrio e sinais de contaminação' }
    ]
  },
  {
    dimension: 'D',
    competency_name: 'Perspectiva Temporal Positiva',
    strategic_justification: 'Desenvolver a crença de que adversidades são temporárias e que a situação vai melhorar.',
    expected_impact: 'Maior resiliência e persistência frente a desafios de longo prazo.',
    success_indicators: [
      'Manter otimismo realista durante adversidades',
      'Identificar sinais de progresso em situações difíceis',
      'Reduzir pensamentos catastróficos sobre o futuro'
    ],
    actions: [
      { action_type: 'practical', description: 'Manter journaling de superação: registrar adversidades passadas e como foram superadas' },
      { action_type: 'learning', description: 'Estudar técnicas de reframe cognitivo e reestruturação de pensamentos' },
      { action_type: 'support', description: 'Participar de grupo de apoio ou mentoria para compartilhar experiências de superação' }
    ]
  }
];

const DIMENSION_THRESHOLD = 15; // Score abaixo disso indica área de desenvolvimento

export function useQAEvolutionIntegration() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Identifica quais competências criar baseado no resultado QA
  const getCompetenciesToCreate = (qaResult: QAResult) => {
    const competencies: QACompetencyMapping[] = [];
    
    // Mapa de dimensão para score
    const dimensionScores: Record<QADimension, number> = {
      C: qaResult.c_score,
      R: qaResult.r_score,
      A: qaResult.a_score,
      D: qaResult.d_score
    };
    
    // Verifica cada dimensão
    const dimensions: QADimension[] = ['C', 'R', 'A', 'D'];
    dimensions.forEach(dim => {
      const score = dimensionScores[dim];
      if (score < DIMENSION_THRESHOLD) {
        const mapping = QA_COMPETENCY_MAPPINGS.find(m => m.dimension === dim);
        if (mapping) {
          competencies.push(mapping);
        }
      }
    });

    // Se perfil é Desistente, adiciona todas as competências não incluídas
    if (qaResult.profile === 'desistente') {
      QA_COMPETENCY_MAPPINGS.forEach(mapping => {
        if (!competencies.find(c => c.dimension === mapping.dimension)) {
          competencies.push(mapping);
        }
      });
    }

    return competencies;
  };

  // Busca ciclo ativo do colaborador
  const findActiveEvolutionCycle = async (collaboratorId: string) => {
    const { data, error } = await supabase
      .from('evolution_cycles')
      .select('*')
      .eq('collaborator_id', collaboratorId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  };

  // Mutation para criar competências no ciclo
  const createQACompetencies = useMutation({
    mutationFn: async ({ 
      cycleId, 
      qaResult, 
      qaSessionId 
    }: { 
      cycleId: string; 
      qaResult: QAResult;
      qaSessionId: string;
    }) => {
      const competenciesToCreate = getCompetenciesToCreate(qaResult);
      
      if (competenciesToCreate.length === 0) {
        throw new Error('Nenhuma competência para criar. O colaborador tem bons scores em todas as dimensões.');
      }

      // 1. Criar competências
      const competenciesData = competenciesToCreate.map((comp, index) => ({
        cycle_id: cycleId,
        competency_name: comp.competency_name,
        competency_type: 'behavioral' as const,
        strategic_justification: comp.strategic_justification,
        expected_impact: comp.expected_impact,
        source: 'qa_assessment' as const,
        source_reference_id: qaSessionId,
        is_priority: index < 2, // Primeiras 2 são prioritárias
        has_competency: false,
        success_indicators: comp.success_indicators
      }));

      const { data: createdCompetencies, error: compError } = await supabase
        .from('evolution_competencies')
        .insert(competenciesData)
        .select();

      if (compError) throw compError;

      // 2. Criar objetivos para cada competência
      const objectivesData = createdCompetencies.map((comp, index) => {
        const mapping = competenciesToCreate[index];
        return {
          cycle_id: cycleId,
          competency_id: comp.id,
          objective_text: `Desenvolver ${mapping.competency_name}`,
          key_behaviors: mapping.success_indicators,
          progress_indicators: mapping.success_indicators,
          status: 'pending' as const,
          order_index: index
        };
      });

      const { data: createdObjectives, error: objError } = await supabase
        .from('evolution_objectives')
        .insert(objectivesData)
        .select();

      if (objError) throw objError;

      // 3. Criar ações para cada objetivo
      const actionsData = createdObjectives.flatMap((obj, objIndex) => {
        const mapping = competenciesToCreate[objIndex];
        return mapping.actions.map((action, actionIndex) => ({
          objective_id: obj.id,
          action_type: action.action_type,
          description: action.description,
          status: 'pending' as const,
          order_index: actionIndex
        }));
      });

      const { error: actionsError } = await supabase
        .from('evolution_actions')
        .insert(actionsData);

      if (actionsError) throw actionsError;

      return {
        competencies: createdCompetencies,
        objectives: createdObjectives,
        actionsCount: actionsData.length
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['evolution-cycles'] });
      toast({
        title: 'PDI atualizado com sucesso!',
        description: `${data.competencies.length} competências e ${data.actionsCount} ações foram adicionadas.`
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar PDI',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  return {
    getCompetenciesToCreate,
    findActiveEvolutionCycle,
    createQACompetencies,
    DIMENSION_THRESHOLD
  };
}
