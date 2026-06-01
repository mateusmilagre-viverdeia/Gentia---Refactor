// Default prompts for AI evaluation - can be overridden per agent in the database

export const DEFAULT_SYSTEM_PROMPT = `Você é um especialista sênior em RH, cultura organizacional e fit cultural. 

Sua análise deve ser:
- Profunda e detalhada
- Baseada em evidências das respostas do candidato
- Comparativa com a cultura declarada da empresa
- Imparcial e objetiva

Você avalia candidatos com precisão cirúrgica, identificando sinais de alinhamento e desalinhamento cultural.`;

export const DEFAULT_EVALUATION_PROMPT = `# TAREFA
Analise a entrevista cultural do candidato e avalie seu alinhamento com a cultura da empresa.

## CONTEXTO DA EMPRESA

### Missão
{{mission}}

### Visão
{{vision}}

### Valores
{{values}}

### EVP (Employee Value Proposition)
{{evp}}

## REQUISITOS DA VAGA
{{job_requirements}}

## CRITÉRIOS DE AVALIAÇÃO DO AGENTE
{{criteria}}

## TRANSCRIÇÃO DA ENTREVISTA
{{transcript}}

---

# INSTRUÇÕES DE AVALIAÇÃO

Para cada CRITÉRIO listado acima, você deve:

1. **Identificar Evidências**: Extraia trechos específicos das respostas que demonstrem alinhamento ou desalinhamento
2. **Avaliar Profundidade**: Considere se as respostas são superficiais ou demonstram compreensão genuína
3. **Detectar Inconsistências**: Note contradições entre diferentes respostas
4. **Atribuir Nota (0-10)**: Baseada nas evidências encontradas

## CRITÉRIOS DE NOTAS

| Nota | Significado |
|------|-------------|
| 0-2 | Forte desalinhamento, evidências contrárias à cultura |
| 3-4 | Desalinhamento parcial, poucas evidências positivas |
| 5-6 | Neutro ou insuficiente para avaliar |
| 7-8 | Bom alinhamento, evidências consistentes |
| 9-10 | Excelente alinhamento, múltiplas evidências fortes |

## FORMATO DE RESPOSTA (JSON)

Responda APENAS com um JSON válido no seguinte formato:

{
  "pillarEvaluations": [
    {
      "pillar": "<nome do critério>",
      "score": <número 0-10>,
      "alignment": "<ALINHADO|PARCIALMENTE_ALINHADO|DESALINHADO>",
      "evidence": "<citação direta da resposta do candidato>",
      "analysis": "<análise de 2-3 frases explicando a nota>"
    }
  ],
  "analysis": "<parecer completo de 5-8 parágrafos sobre o candidato>",
  "alignedResponses": [
    {
      "question": "<pergunta>",
      "response": "<resposta resumida>",
      "justification": "<por que demonstra alinhamento>"
    }
  ],
  "misalignedResponses": [
    {
      "question": "<pergunta>",
      "response": "<resposta resumida>",
      "justification": "<por que demonstra desalinhamento>"
    }
  ],
  "radarData": [
    { "criteria": "<nome>", "score": <0-10> }
  ]
}

IMPORTANTE: 
- Inclua no máximo 5 respostas alinhadas e 5 desalinhadas
- Se não houver respostas desalinhadas, retorne array vazio
- O "analysis" deve ser um parecer profundo e detalhado`;

export const DEFAULT_SCORING_PROMPT = `# TAREFA
Com base na avaliação detalhada abaixo, calcule o score final de matching cultural.

## DADOS DA AVALIAÇÃO REALIZADA

### Avaliações por Critério
{{pillar_evaluations}}

### Critérios do Agente com Pesos
{{criteria_with_weights}}

### Resumo da Análise
{{analysis_summary}}

---

# INSTRUÇÕES DE CÁLCULO DO SCORE

## Fórmula Base
\`\`\`
Score = (Σ nota_criterio × peso_criterio) / (Σ pesos) × 10
\`\`\`

## Pesos por Importância
| Importância | Multiplicador |
|-------------|---------------|
| minor | 1x |
| moderate | 2x |
| important | 3x |
| very_important | 4x |
| critical | 5x |

## Penalidades
- Critério CRÍTICO abaixo da nota mínima: -15 pontos
- Critério MUITO IMPORTANTE abaixo da nota mínima: -10 pontos
- Critério IMPORTANTE abaixo da nota mínima: -5 pontos

## Score Final
- Mínimo: 0
- Máximo: 100
- Arredondar para número inteiro

## Regras de Recomendação

| Recomendação | Condições |
|--------------|-----------|
| RECOMENDADO | Score >= 75 E todos os critérios críticos >= nota mínima |
| RECOMENDADO_COM_RESSALVAS | Score 50-74 OU algum critério importante abaixo |
| NAO_RECOMENDADO | Score < 50 OU critério crítico abaixo da nota mínima |

---

# FORMATO DE RESPOSTA (JSON)

Responda APENAS com um JSON válido:

{
  "score": <número 0-100>,
  "recommendation": "<RECOMENDADO|RECOMENDADO_COM_RESSALVAS|NAO_RECOMENDADO>",
  "scoreJustification": "<explicação de 2-3 frases do cálculo e da recomendação>"
}`;

export const PROMPT_TYPES = {
  system: {
    name: 'Sistema',
    description: 'Define a personalidade e estilo da IA avaliadora',
    icon: 'Bot',
  },
  evaluation: {
    name: 'Avaliação',
    description: 'Prompt para análise detalhada das respostas do candidato',
    icon: 'FileSearch',
  },
  scoring: {
    name: 'Scoring',
    description: 'Prompt para cálculo do score final e recomendação',
    icon: 'Calculator',
  },
} as const;

export const AVAILABLE_VARIABLES = {
  evaluation: [
    { 
      key: '{{mission}}', 
      label: 'Missão',
      description: 'Declaração de missão da empresa, definindo seu propósito e razão de existir',
      example: '"Transformar a gestão de pessoas através de tecnologia e cultura."'
    },
    { 
      key: '{{vision}}', 
      label: 'Visão',
      description: 'Visão de futuro da empresa, o que ela aspira se tornar',
      example: '"Ser referência em soluções de RH na América Latina até 2030."'
    },
    { 
      key: '{{values}}', 
      label: 'Valores',
      description: 'Valores culturais com comportamentos esperados (DOs e DONTs)',
      example: 'Inovação: Fazemos → experimentamos ideias novas; Não fazemos → repetir sem questionar'
    },
    { 
      key: '{{evp}}', 
      label: 'EVP',
      description: 'Employee Value Proposition - proposta de valor ao colaborador, benefícios e diferenciais',
      example: 'Conteúdo da seção "Vendendo a Empresa" com benefícios, cultura e oportunidades'
    },
    { 
      key: '{{job_requirements}}', 
      label: 'Requisitos da Vaga',
      description: 'Requisitos técnicos e comportamentais da vaga: responsabilidades, competências e habilidades',
      example: 'Cargo, missão, responsabilidades, skills técnicas e comportamentais'
    },
    { 
      key: '{{criteria}}', 
      label: 'Critérios do Agente',
      description: 'Critérios de avaliação configurados no agente com descrições, notas mínimas e pesos',
      example: 'Comunicação (Crítico, nota mínima 7, peso 5x): clareza e objetividade...'
    },
    { 
      key: '{{transcript}}', 
      label: 'Transcrição',
      description: 'Transcrição completa da entrevista com perguntas e respostas do candidato',
      example: 'Pergunta 1: "Conte sobre você" → Resposta: "Sou formado em..."'
    },
  ],
  scoring: [
    { 
      key: '{{pillar_evaluations}}', 
      label: 'Avaliações por Critério',
      description: 'Resultado da Etapa 1: notas (0-10), nível de alinhamento e justificativas para cada critério',
      example: 'Comunicação: 8/10, Forte alinhamento, "Candidato demonstrou clareza..."'
    },
    { 
      key: '{{criteria_with_weights}}', 
      label: 'Critérios com Pesos',
      description: 'Lista de critérios do agente com suas importâncias (1x-5x) e notas mínimas de corte',
      example: 'Comunicação: Crítico (5x), nota mínima 7 | Proatividade: Importante (3x), nota mínima 6'
    },
    { 
      key: '{{analysis_summary}}', 
      label: 'Resumo da Análise',
      description: 'Síntese qualitativa da avaliação: pontos fortes, alertas e observações gerais',
      example: 'Candidato demonstrou forte alinhamento em comunicação, mas precisa desenvolver...'
    },
  ],
  system: [],
};
