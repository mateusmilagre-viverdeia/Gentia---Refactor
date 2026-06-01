export interface DemoBlock {
  id: number;
  title: string;
  /** Frase curta exibida na barra inferior, narrando o que o vendedor deve mostrar agora. */
  narrative: string;
  /** Rota interna a navegar quando este bloco se torna ativo (auto). */
  route?: string;
  /** Rota a abrir em nova aba (ex.: portal do cliente). */
  externalRoute?: string;
  /** Label do botão de abrir tela manualmente, caso necessário. */
  routeLabel?: string;
  /** Chave do elemento na tela com data-demo-anchor="<anchor>" para a seta apontar. */
  anchor?: string;
  /** auto = botão Próximo libera direto. manual_click = aguarda interação real. */
  advanceMode: "auto" | "manual_click";
  /** Texto exibido quando advanceMode = manual_click ("Clique aqui em…"). */
  manualHint?: string;
  /** Destaque opcional acima da narrativa (ex.: "Bloco mais importante"). */
  highlight?: string;
}

/**
 * Blocos do onboarding guiado de vendas.
 * Bloco 0 (pré-demo) foi removido — vendedor inicia direto no Dashboard.
 * Dor/nome do prospect são preenchidos no modal de fechamento.
 */
export const BLOCKS: DemoBlock[] = [
  {
    id: 1,
    title: "Dashboard principal",
    narrative:
      "Aponte para a frase central (agentes trabalhando), as três métricas e o card da shortlist pendente.",
    route: "/atracao-contratacao/recrutamento",
    routeLabel: "Abrir dashboard",
    anchor: "dashboard-metrics",
    advanceMode: "auto",
  },
  {
    id: 2,
    title: "Vaga em andamento",
    narrative:
      "Mostre o funil 47→23→12→8→5→3, o card do Autopilot ativo e a barra de SLA dentro do prazo.",
    route: "/atracao-contratacao/recrutamento/jobs",
    routeLabel: "Abrir vaga demo",
    anchor: "job-funnel",
    advanceMode: "auto",
  },
  {
    id: 3,
    title: "Entrevista por voz com IA",
    highlight: "Bloco mais importante — não apresse",
    narrative:
      "Abra um candidato, role a transcrição, mostre o score por critério e toque 30s do áudio.",
    route: "/atracao-contratacao/recrutamento/interviews",
    routeLabel: "Abrir entrevistas",
    anchor: "interview-list",
    advanceMode: "auto",
  },
  {
    id: 4,
    title: "Shortlist com score unificado",
    narrative:
      "Mostre os 3 cards qualificados, o score composto e o breakdown cultural / DISC / técnico.",
    route: "/atracao-contratacao/recrutamento/jobs",
    routeLabel: "Abrir shortlist",
    anchor: "shortlist-cards",
    advanceMode: "auto",
  },
  {
    id: 5,
    title: "Portal do cliente",
    narrative:
      "Compartilhe a nova aba. Mostre o funil em tempo real, os cards e o botão Quero entrevistar.",
    externalRoute: "/portal",
    routeLabel: "Abrir portal em nova aba",
    anchor: "portal-shortlist",
    advanceMode: "auto",
  },
  {
    id: 6,
    title: "Fechamento",
    narrative:
      "Pare de compartilhar a tela. Apresente o modelo de créditos, o valor de entrada e proponha o próximo passo.",
    advanceMode: "auto",
  },
];

export const FIRST_BLOCK_ID = BLOCKS[0].id;
export const LAST_BLOCK_ID = BLOCKS[BLOCKS.length - 1].id;

export type PainKey =
  | "hunting_manual"
  | "triagem_demorada"
  | "entrevistas_custosas"
  | "shortlist_sem_qualidade"
  | "gestao_cliente"
  | "escalar_sem_contratar";

export const PAIN_OPTIONS: { key: PainKey; label: string }[] = [
  { key: "hunting_manual", label: "Hunting manual" },
  { key: "triagem_demorada", label: "Triagem demorada" },
  { key: "entrevistas_custosas", label: "Entrevistas custosas" },
  { key: "shortlist_sem_qualidade", label: "Shortlist sem qualidade" },
  { key: "gestao_cliente", label: "Gestão do cliente" },
  { key: "escalar_sem_contratar", label: "Escalar sem contratar" },
];

export const OBJECTIONS: { key: string; label: string; answer: string }[] = [
  {
    key: "ia_nao_entende",
    label: "IA não entende fit",
    answer:
      "A IA não substitui critério humano — ela aplica o seu Code Cultural com consistência e escala. Score cultural + DISC + técnico = decisão mais defensável que qualquer triagem manual.",
  },
  {
    key: "cliente_nao_aceita",
    label: "Cliente não aceita IA",
    answer:
      "O cliente não vê IA. Vê uma shortlist mais rápida, com score, áudio e justificativa. Quem fala com IA é o candidato — quem se beneficia é a sua agência e o cliente.",
  },
  {
    key: "substitui_meu_time",
    label: "Substitui meu time",
    answer:
      "Não substitui — libera. Seu time para de gastar 70% do dia em triagem e foca em relacionamento, fechamento e gestão de cliente. É produtividade, não corte.",
  },
  {
    key: "ja_uso_sales_navigator",
    label: "Já uso Sales Navigator",
    answer:
      "Ótimo — o GENTIA usa o Sales Navigator como fonte. A diferença é o que vem depois: enriquecimento, score, entrevista por voz e shortlist pronta. SN gera lead, GENTIA gera contratação.",
  },
  {
    key: "e_caro",
    label: "É caro",
    answer:
      "Compare com o custo de uma vaga aberta por 60 dias e uma contratação errada. Modelo é por créditos — você paga pelo uso real, não por assento. ROI positivo já no primeiro fechamento.",
  },
];

export const NEXT_STEP_OPTIONS = [
  { value: "demo_extra", label: "Demo extra" },
  { value: "proposta", label: "Proposta" },
  { value: "trial_490", label: "Trial R$490" },
  { value: "sem_interesse", label: "Sem interesse" },
  { value: "follow_up", label: "Follow-up" },
];
