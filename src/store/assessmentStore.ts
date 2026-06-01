import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Question {
  id: number;
  text: string;
  pilar: 'Cultura Organizacional' | 'Atração' | 'Retenção' | 'Resultados';
}

export interface Answer {
  questionId: number;
  value: number; // 1-5
}

export interface PillarScore {
  name: string;
  score: number;
  benchmark: number;
  gap: number;
}

export interface CompanyInfo {
  name: string;
  sector: string;
  size: string;
  revenue: string;
  respondentRole: string;
}

export interface AIAnalysisData {
  pilares: any[];
  analise_geral?: string;
  recomendacoes?: any[];
  classificacaoGeral: string;
  pilarPrioritario: string;
  tresPassosMelhoria?: string[];
  metodoSugerido?: string;
  ferramentasSugeridas?: string[];
  tempoImplementacao?: string;
}

export interface AssessmentState {
  // State
  currentStep: number;
  answers: Answer[];
  companyInfo: CompanyInfo | null;
  pillarScores: PillarScore[];
  overallScore: number;
  aiAnalysis: AIAnalysisData | null;
  roipAssessmentId: string | null;
  analysisData: AIAnalysisData | null;
  analysisError: string | null;
  estadoAnalise: 'idle' | 'loading' | 'success' | 'error';
  mensagemStatus: string;
  
  // Actions
  setCurrentStep: (step: number) => void;
  setAnswer: (questionId: number, value: number) => void;
  calculateScores: () => void;
  setAIAnalysis: (analysis: AIAnalysisData) => void;
  setRoipAssessmentId: (id: string) => void;
  sendWebhookAnalysis: () => Promise<void>;
  retryAnalysis: () => Promise<void>;
  reset: () => void;
}

export const QUESTIONS: Question[] = [
  // Cultura Organizacional (5 perguntas) - Propósito, valores e cultura
  { id: 1, text: 'A empresa possui propósito e valores claramente definidos e compartilhados?', pilar: 'Cultura Organizacional' },
  { id: 2, text: 'A cultura organizacional é vivenciada e praticada no dia a dia?', pilar: 'Cultura Organizacional' },
  { id: 3, text: 'Existe um ambiente de confiança e segurança psicológica na empresa?', pilar: 'Cultura Organizacional' },
  { id: 4, text: 'A liderança demonstra coerência entre discurso e prática dos valores?', pilar: 'Cultura Organizacional' },
  { id: 5, text: 'As pessoas se sentem conectadas ao propósito da organização?', pilar: 'Cultura Organizacional' },
  
  // Atração (5 perguntas) - Capacidade de atrair talentos
  { id: 6, text: 'A empresa possui uma marca empregadora (employer branding) atrativa?', pilar: 'Atração' },
  { id: 7, text: 'Os processos de recrutamento e seleção são estruturados e eficientes?', pilar: 'Atração' },
  { id: 8, text: 'A empresa consegue atrair candidatos qualificados para as vagas abertas?', pilar: 'Atração' },
  { id: 9, text: 'Existe clareza sobre o perfil ideal de talentos para cada posição?', pilar: 'Atração' },
  { id: 10, text: 'O processo de onboarding é estruturado e eficaz?', pilar: 'Atração' },
  
  // Retenção (5 perguntas) - Engajamento e desenvolvimento
  { id: 11, text: 'A empresa oferece oportunidades claras de desenvolvimento profissional?', pilar: 'Retenção' },
  { id: 12, text: 'Existe um sistema de reconhecimento e recompensas efetivo?', pilar: 'Retenção' },
  { id: 13, text: 'As pessoas demonstram engajamento e satisfação com o trabalho?', pilar: 'Retenção' },
  { id: 14, text: 'A taxa de turnover de talentos críticos é controlada?', pilar: 'Retenção' },
  { id: 15, text: 'Há planos de carreira e sucessão estruturados?', pilar: 'Retenção' },
  
  // Resultados (5 perguntas) - Conexão pessoas-estratégia-performance
  { id: 16, text: 'As pessoas conhecem e compreendem os objetivos estratégicos da empresa?', pilar: 'Resultados' },
  { id: 17, text: 'Existe alinhamento entre metas individuais e resultados organizacionais?', pilar: 'Resultados' },
  { id: 18, text: 'A gestão de desempenho é estruturada e gera resultados concretos?', pilar: 'Resultados' },
  { id: 19, text: 'Há indicadores claros para medir a contribuição das pessoas nos resultados?', pilar: 'Resultados' },
  { id: 20, text: 'A empresa consegue conectar gestão de pessoas com performance do negócio?', pilar: 'Resultados' },
];

// Benchmarks médios por pilar (baseado em pesquisas de mercado)
const PILLAR_BENCHMARKS: Record<string, number> = {
  'Cultura Organizacional': 72,
  'Atração': 68,
  'Retenção': 70,
  'Resultados': 65,
};

const initialState = {
  currentStep: 0,
  answers: [],
  companyInfo: null,
  pillarScores: [],
  overallScore: 0,
  aiAnalysis: null,
  roipAssessmentId: null,
  analysisData: null,
  analysisError: null,
  estadoAnalise: 'idle' as const,
  mensagemStatus: '',
};

export const useAssessmentStore = create<AssessmentState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setCurrentStep: (step) => set({ currentStep: step }),
      
      setAnswer: (questionId, value) => {
        const { answers } = get();
        const existingIndex = answers.findIndex(a => a.questionId === questionId);
        
        if (existingIndex >= 0) {
          const newAnswers = [...answers];
          newAnswers[existingIndex] = { questionId, value };
          set({ answers: newAnswers });
        } else {
          set({ answers: [...answers, { questionId, value }] });
        }
      },

      calculateScores: () => {
        const { answers } = get();
        
        // Calcular score por pilar
        const pillarScoresMap: Record<string, number[]> = {
          'Cultura Organizacional': [],
          'Atração': [],
          'Retenção': [],
          'Resultados': [],
        };

        answers.forEach(answer => {
          const question = QUESTIONS.find(q => q.id === answer.questionId);
          if (question) {
            pillarScoresMap[question.pilar].push(answer.value);
          }
        });

        const pillarScores: PillarScore[] = Object.entries(pillarScoresMap).map(([pilar, values]) => {
          const avgScore = values.length > 0 
            ? (values.reduce((sum, val) => sum + val, 0) / values.length) * 20 
            : 0;
          const benchmark = PILLAR_BENCHMARKS[pilar];
          
          return {
            name: pilar,
            score: Math.round(avgScore),
            benchmark,
            gap: Math.round(avgScore - benchmark),
          };
        });

        const overallScore = Math.round(
          pillarScores.reduce((sum, p) => sum + p.score, 0) / pillarScores.length
        );

        set({ pillarScores, overallScore });
      },

      setAIAnalysis: (analysis) => set({ 
        aiAnalysis: analysis, 
        analysisData: analysis,
        estadoAnalise: 'success' 
      }),

      setRoipAssessmentId: (id) => set({ roipAssessmentId: id }),

      sendWebhookAnalysis: async () => {
        set({ estadoAnalise: 'loading', mensagemStatus: 'Enviando dados para análise...' });
        // Placeholder - implement webhook call
        return Promise.resolve();
      },

      retryAnalysis: async () => {
        const { sendWebhookAnalysis } = get();
        await sendWebhookAnalysis();
      },

      reset: () => {
        // First, remove from localStorage to prevent re-hydration
        localStorage.removeItem('assessment-storage');
        
        // Then reset state
        set(initialState);
        
        // Double-check localStorage is clear
        setTimeout(() => {
          localStorage.removeItem('assessment-storage');
        }, 10);
      },
    }),
    {
      name: 'assessment-storage',
    }
  )
);
