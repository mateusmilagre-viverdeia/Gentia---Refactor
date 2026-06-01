export interface DecisionSession {
  id: string;
  user_id: string;
  stage: number;
  created_at: string;
  updated_at: string;
}

export interface DecisionAnswer {
  id: string;
  session_id: string;
  question_number: number;
  answer_text: string;
  is_suggestion: boolean;
  created_at: string;
}

export interface DecisionQuestion {
  number: number;
  question: string;
  shortTitle: string;
  suggestions: string[];
}

export const DECISION_QUESTIONS: DecisionQuestion[] = [
  {
    number: 1,
    question: "O que não pode aqui? O que sua empresa considera como intolerável?",
    shortTitle: "Intolerável",
    suggestions: [
      "Decisão desalinhada à nossa cultura",
      "Decisão desalinhada à nossa visão, metas e direção",
      "Decisão que infringem nossos valores",
      "Tomar decisão quando ela é irreversível, ou seja, se der errado, não podemos voltar atrás e corrigir"
    ]
  },
  {
    number: 2,
    question: "Quais são as principais regras da empresa? O que pode e se espera dos colaboradores da empresa?",
    shortTitle: "Regras",
    suggestions: [
      "Decisões alinhado com nossa cultura",
      "Decisões alinhado com nossa visão",
      "Se comportar e tomar decisões alinhado com nossos valores",
      "Tomar decisões quando ela é reversível, ou seja, se der errado, podemos voltar atrás"
    ]
  },
  {
    number: 3,
    question: "O que devemos levar em consideração no momento de tomar decisões?",
    shortTitle: "Considerações",
    suggestions: [
      "Se os valores e visão estão sendo respeitados",
      "Se a decisão é reversível, ou seja, se der errado, podemos voltar atrás"
    ]
  },
  {
    number: 4,
    question: "Como sabemos quem contratar?",
    shortTitle: "Contratar",
    suggestions: [
      "Com bases nos valores"
    ]
  },
  {
    number: 5,
    question: "Como sabemos quem demitir?",
    shortTitle: "Demitir",
    suggestions: [
      "Quem infringe nossos valores",
      "Quem não está entregando resultado"
    ]
  },
  {
    number: 6,
    question: "Como sabemos quem promover ou não?",
    shortTitle: "Promover",
    suggestions: [
      "Quem está alinhado com nossos valores",
      "Quem entrega resultado"
    ]
  },
  {
    number: 7,
    question: "Como tomamos decisões no nosso negócio?",
    shortTitle: "Decisões",
    suggestions: [
      "Alinhado com nossa cultura",
      "Alinhado com nossa visão",
      "Alinhado com nossos valores",
      "Se a decisão for reversível, ou seja, se der errado, podemos voltar atrás"
    ]
  }
];
