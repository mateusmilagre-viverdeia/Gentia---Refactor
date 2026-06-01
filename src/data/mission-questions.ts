import { MissionQuestionV2 } from "@/types/mission.types";

// V1 - 8 perguntas (manter para sessões antigas)
export const MISSION_QUESTIONS_V1 = [
  "Qual é o segmento de negócio em que sua empresa está inserida?",
  "Quem é o público-alvo da sua empresa?",
  "Que problemas você resolve para seus clientes?",
  "Por que resolver esse problema é importante e relevante para você?",
  "Qual é o principal impacto que você deseja causar no mundo com sua empresa?",
  "Como sua organização melhora a vida das pessoas e por que ela existe?",
  "O que sua empresa faz de concreto e o que mudaria no mercado se ela não existisse?",
  "Das respostas acima, quais são as palavras-chave que você mais se identifica? Quais se repetem? Quais têm um forte significado para você?",
];

// V2 - 9 perguntas Golden Circle
export const MISSION_QUESTIONS_V2: MissionQuestionV2[] = [
  // CAMADA 1: A CRENÇA QUE FUNDAMENTA A EMPRESA (Q1-Q3)
  {
    number: 1,
    layer: 1,
    layerTitle: "A Crença que Fundamenta a Empresa",
    question: "Por que ESTA EMPRESA existe no mundo? Não 'para vender X' - mas qual CRENÇA sobre como o mundo deveria ser levou à criação desta organização?",
    observation: "Toda empresa nasce de uma convicção. Pense: qual crença sobre como o mundo DEVERIA ser motivou a criação desta empresa?",
    examples: [
      "Acreditamos que empreender não deveria ser privilégio de poucos",
      "Acreditamos que sustentabilidade e crescimento podem coexistir",
      "Acreditamos que educação de qualidade transforma gerações inteiras"
    ]
  },
  {
    number: 2,
    layer: 1,
    layerTitle: "A Crença que Fundamenta a Empresa",
    question: "Que INJUSTIÇA no mundo ou POSSIBILIDADE ignorada esta empresa se propõe a enfrentar? Complete: 'Esta organização existe porque não aceitamos que...' OU 'Porque acreditamos que é possível...'",
    observation: "Empresas com missão clara são fundadas para CORRIGIR algo que está errado ou PROVAR que algo é possível. Qual é a sua causa?",
    examples: [
      "Não aceitamos que talento seja desperdiçado por falta de acesso",
      "Acreditamos que é possível crescer sem destruir o meio ambiente",
      "Não aceitamos que trabalho seja apenas sobrevivência, sem propósito"
    ]
  },
  {
    number: 3,
    layer: 1,
    layerTitle: "A Crença que Fundamenta a Empresa",
    question: "Se esta empresa fosse um MOVIMENTO ou CAUSA (não um negócio) - qual seria? 'Movimento pela...', 'Luta por...', 'Causa da...'",
    observation: "Sua empresa é um veículo para uma causa maior. Apple = 'Desafiar o status quo', Patagonia = 'Salvar o planeta'... Qual é o movimento que vocês lideram?",
    examples: [
      "Movimento pela democratização do acesso ao conhecimento",
      "Luta por um futuro sustentável para as próximas gerações",
      "Causa da transformação social através do trabalho digno"
    ]
  },
  // CAMADA 2: DO CLIENTE DIRETO AO IMPACTO SISTÊMICO (Q4-Q6)
  {
    number: 4,
    layer: 2,
    layerTitle: "Do Cliente Direto ao Impacto Sistêmico",
    question: "", // Será preenchido pelo segmento selecionado
    observation: "",
    requiresSegment: true,
    segmentVersions: {
      industry: {
        question: "Sua empresa produz para OUTRAS EMPRESAS. PROIBIDO falar desses clientes diretos. Pense: o que essas empresas fazem com o que você produz? Quem elas impactam? Siga a corrente até chegar no USUÁRIO FINAL que nunca saberá que sua empresa existe. Como a vida DESSA PESSOA melhora porque sua indústria existe?",
        observation: "Você precisa atravessar várias camadas B2B até chegar no humano final. Quem é impactado no fim da cadeia? Como a vida dessa pessoa melhora?",
        examples: [
          "Metalúrgica: Peças → montadoras → carros → famílias com mobilidade e liberdade",
          "Têxtil: Tecidos → confecções → lojas → pessoas → autoestima e confiança",
          "Embalagens: Embalagens → marcas → consumidores → produtos preservados, menos desperdício"
        ]
      },
      services: {
        question: "Seus clientes contratam seu serviço para impactar QUEM? Se B2B: quem essa empresa serve? Se B2C: quem mais é impactado além do cliente direto? Siga a corrente até o impacto humano final.",
        observation: "Serviços podem ter impacto B2B ou B2C. Mas sempre há um humano no final. Quem é essa pessoa? Como a vida dela melhora?",
        examples: [
          "Consultoria: Empresas → funcionários → famílias → comunidade mais próspera",
          "Escola: Alunos → famílias → futuros empregos → sociedade mais educada",
          "Hospital: Pacientes → famílias → comunidade com mais saúde e bem-estar"
        ]
      },
      product: {
        question: "Seus clientes compram de você e usam seu produto para QUEM ou com QUEM? Como isso impacta outras pessoas ao redor? Quando alguém usa seu produto, que EFEITO CASCATA isso gera?",
        observation: "Mesmo em B2C, há impacto cascata. Quem mais é afetado quando alguém usa seu produto?",
        examples: [
          "Livraria: Comprador → leitor → conhecimento → sociedade mais crítica e informada",
          "Restaurante: Clientes → momentos compartilhados → vínculos fortalecidos",
          "Farmácia: Cliente → saúde → família tranquila → produtividade no trabalho"
        ]
      }
    }
  },
  {
    number: 5,
    layer: 2,
    layerTitle: "Do Cliente Direto ao Impacto Sistêmico",
    question: "Se sua empresa existir e cumprir sua missão por 30 anos - o que terá MUDADO NA SOCIEDADE ou no mundo por causa dela? O que será DIFERENTE no mundo?",
    observation: "Pense grande e a longo prazo. Não sobre receita ou tamanho da empresa, mas sobre a MARCA que vocês deixarão no mundo.",
    examples: [
      "Teremos uma geração de empreendedores que antes não teriam oportunidade",
      "Empresas terão provado que lucro e sustentabilidade caminham juntos",
      "Milhares de famílias terão escapado do ciclo de pobreza através da educação"
    ]
  },
  {
    number: 6,
    layer: 2,
    layerTitle: "Do Cliente Direto ao Impacto Sistêmico",
    question: "Por que é VITAL que empresas como a sua existam no mundo? Que vazio existiria se empresas com esse propósito não existissem?",
    observation: "Imagine um mundo onde empresas como a sua não existem. O que estaria faltando? Que problema continuaria sem solução?",
    examples: [
      "Sem empresas assim, talentos continuariam sendo desperdiçados",
      "Sem empresas assim, o planeta continuaria sendo explorado sem consciência",
      "Sem empresas assim, inovação seria privilégio de poucos países ricos"
    ]
  },
  // CAMADA 3: FORMALIZAÇÃO DA MISSÃO (Q7-Q10)
  {
    number: 7,
    layer: 3,
    layerTitle: "Formalização da Missão",
    question: "Complete esta frase de forma GRANDIOSA: 'Esta empresa existe para que o mundo tenha mais...' ou 'Para que menos pessoas sofram com...'",
    observation: "Foque no que você está ADICIONANDO ao mundo ou no que você está REMOVENDO de negativo. Use palavras grandes e inspiradoras.",
    examples: [
      "Para que o mundo tenha mais oportunidades distribuídas com justiça",
      "Para que menos pessoas sofram com a falta de acesso à saúde de qualidade",
      "Para que o mundo tenha mais consciência sobre o impacto de suas escolhas"
    ]
  },
  {
    number: 8,
    layer: 3,
    layerTitle: "Formalização da Missão",
    question: "Se você tivesse que escolher apenas 2-3 PALAVRAS que capturam a ESSÊNCIA do propósito desta empresa (não o que ela faz, mas POR QUE ela existe) - quais seriam?",
    observation: "Essas palavras devem ser profundas e significativas. Não 'vender', 'lucrar' ou 'crescer' - mas palavras que capturam o PROPÓSITO.",
    examples: [
      "Transformação, Acesso, Dignidade",
      "Liberdade, Sustentabilidade, Futuro",
      "Conexão, Propósito, Impacto"
    ]
  },
  {
    number: 9,
    layer: 3,
    layerTitle: "Formalização da Missão",
    question: "De TODAS as suas respostas anteriores, quais são as PALAVRAS-CHAVE que mais se repetem ou que têm o significado mais forte para você? Liste-as separadas por vírgula.",
    observation: "A IA vai usar essas palavras para criar sua missão final. Quanto mais precisas e significativas, melhor será o resultado.",
    examples: [
      "transformar, propósito, impacto, acesso, dignidade",
      "sustentabilidade, futuro, consciência, escolhas",
      "conexão, oportunidades, talentos, crescimento"
    ]
  }
];

export const LAYER_TITLES = {
  1: "A Crença que Fundamenta a Empresa",
  2: "Do Cliente Direto ao Impacto Sistêmico", 
  3: "Formalização da Missão"
};

export const LAYER_DESCRIPTIONS = {
  1: "Perguntas sobre o propósito fundamental e a causa que motivou a criação da empresa",
  2: "Perguntas sobre o impacto real que a empresa gera além do cliente direto",
  3: "Perguntas para formalizar e estruturar a declaração de missão final"
};
