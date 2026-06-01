import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { toast } from "sonner";

const SEED_JOB_DESCRIPTIONS = [
  {
    title: "Desenvolvedor Full Stack Sênior",
    area: "Tecnologia",
    status: "approved",
    mission: "Desenvolver e manter soluções tecnológicas de alta qualidade que impulsionem o crescimento do negócio, garantindo escalabilidade, performance e segurança.",
    indicators: ["Cobertura de testes", "Tempo de deploy", "Bugs em produção"],
    responsibilities: [
      "Desenvolver features end-to-end utilizando React e Node.js",
      "Participar de code reviews e garantir qualidade do código",
      "Mentorear desenvolvedores júnior e pleno",
      "Colaborar com product managers na definição técnica de features",
      "Documentar arquitetura e decisões técnicas"
    ],
    required_skills: [
      "React/TypeScript avançado",
      "Node.js/Express ou NestJS",
      "PostgreSQL ou MongoDB"
    ],
    desired_skills: [
      "Experiência com AWS ou GCP",
      "Conhecimento em Kubernetes",
      "Experiência com GraphQL"
    ],
    behavioral_competencies: [
      "Proatividade",
      "Comunicação clara",
      "Trabalho em equipe",
      "Resolução de problemas"
    ],
    development: [
      "Liderança técnica",
      "Arquitetura de sistemas",
      "Gestão de projetos"
    ],
    benefits: [
      "🏠 Home office flexível",
      "💻 Equipamento de alta qualidade",
      "📚 Budget para cursos e certificações",
      "🏥 Plano de saúde premium",
      "🎯 Participação nos lucros"
    ],
    wizard_step: 10
  },
  {
    title: "Head de Marketing",
    area: "Marketing",
    status: "approved",
    mission: "Liderar a estratégia de marketing da empresa, construindo uma marca forte e gerando demanda qualificada para impulsionar o crescimento sustentável do negócio.",
    indicators: ["CAC", "LTV", "Brand awareness", "MQLs gerados"],
    responsibilities: [
      "Definir e executar a estratégia de marketing",
      "Gerenciar equipe multidisciplinar de marketing",
      "Desenvolver campanhas de aquisição e retenção",
      "Gerenciar budget de marketing e otimizar ROI",
      "Reportar resultados para a diretoria"
    ],
    required_skills: [
      "Gestão de equipes de marketing",
      "Marketing digital avançado",
      "Análise de dados e métricas"
    ],
    desired_skills: [
      "Experiência em B2B SaaS",
      "Conhecimento em ABM",
      "Experiência com inbound marketing"
    ],
    behavioral_competencies: [
      "Liderança",
      "Pensamento estratégico",
      "Criatividade",
      "Orientação a resultados"
    ],
    development: [
      "Gestão de P&L",
      "Negociação com stakeholders C-level",
      "Gestão de crises"
    ],
    benefits: [
      "💰 Salário competitivo + bônus",
      "🚗 Carro corporativo",
      "📱 Celular corporativo",
      "🏥 Plano de saúde e odonto",
      "🎓 MBA custeado pela empresa"
    ],
    wizard_step: 10
  },
  {
    title: "Analista de Customer Success",
    area: "Customer Success",
    status: "approved",
    mission: "Garantir o sucesso dos clientes através de acompanhamento proativo, maximizando retenção e expansão de receita.",
    indicators: ["NPS", "Churn rate", "Expansion revenue", "Health score"],
    responsibilities: [
      "Gerenciar carteira de clientes estratégicos",
      "Conduzir onboarding de novos clientes",
      "Identificar oportunidades de upsell e cross-sell",
      "Monitorar health score e agir preventivamente",
      "Coletar feedback e encaminhar para produto"
    ],
    required_skills: [
      "Experiência em Customer Success",
      "Conhecimento em ferramentas de CS",
      "Habilidade em análise de dados"
    ],
    desired_skills: [
      "Experiência em SaaS B2B",
      "Conhecimento em CRM",
      "Experiência com Gainsight ou similar"
    ],
    behavioral_competencies: [
      "Empatia",
      "Comunicação",
      "Proatividade",
      "Resiliência"
    ],
    development: [
      "Gestão de conflitos",
      "Negociação avançada",
      "Análise de churn"
    ],
    benefits: [
      "🏠 Trabalho híbrido",
      "💳 Vale-refeição",
      "🏋️ Gympass",
      "🏥 Plano de saúde",
      "📈 Plano de carreira estruturado"
    ],
    wizard_step: 10
  }
];

export function useJobDescriptionSeeder() {
  const { currentAccount } = useOrganization();
  const queryClient = useQueryClient();

  const seedJobDescriptions = useMutation({
    mutationFn: async () => {
      if (!currentAccount?.id) throw new Error("Conta não encontrada");

      const jobDescriptionsToInsert = SEED_JOB_DESCRIPTIONS.map(jd => ({
        ...jd,
        account_id: currentAccount.id,
      }));

      const { data, error } = await supabase
        .from("job_descriptions")
        .insert(jobDescriptionsToInsert)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["job-descriptions"] });
      queryClient.invalidateQueries({ queryKey: ["job-descriptions-approved"] });
      toast.success(`${data.length} Job Descriptions criados com sucesso!`);
    },
    onError: (error) => {
      console.error("Error seeding job descriptions:", error);
      toast.error("Erro ao criar Job Descriptions de exemplo");
    },
  });

  return { seedJobDescriptions };
}
