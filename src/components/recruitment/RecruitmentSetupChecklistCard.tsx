import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  Rocket,
  Sparkles,
  X,
  ExternalLink,
} from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  useOnboardingProgress,
  type OnboardingStep,
  SELF_ONBOARDING_STEPS,
  EXTRA_RECOMMENDED_STEPS,
} from "@/hooks/useOnboardingProgress";
import { useRecruitmentSetupStatus } from "@/hooks/useRecruitmentSetupStatus";
import { useAgencyOnboarding } from "@/components/onboarding/agency/AgencyOnboardingWizardContext";

interface ItemMeta {
  id: OnboardingStep;
  label: string;
  description: string;
  configurePath: string;
}

const ITEMS: Record<OnboardingStep, ItemMeta> = {
  profile: {
    id: "profile",
    label: "Perfil da empresa",
    description: "Logo, contato e identidade",
    configurePath: "/atracao-contratacao/recrutamento/configuracoes?tab=intake",
  },
  team: {
    id: "team",
    label: "Equipe",
    description: "Convide recrutadores e gestores",
    configurePath: "/atracao-contratacao/recrutamento/configuracoes?tab=portal-cliente",
  },
  pipeline: {
    id: "pipeline",
    label: "Pipeline",
    description: "Estágios do funil de contratação",
    configurePath: "/atracao-contratacao/recrutamento/configuracoes?tab=pipeline",
  },
  careers: {
    id: "careers",
    label: "Página de Carreira",
    description: "Página pública para candidatos",
    configurePath: "/atracao-contratacao/recrutamento/configuracoes?tab=carreiras",
  },
  credits: {
    id: "credits",
    label: "Créditos",
    description: "Saldo para entrevistas e testes",
    configurePath: "/atracao-contratacao/recrutamento/configuracoes?tab=creditos",
  },
  agent: {
    id: "agent",
    label: "Agentes de IA",
    description: "Atribua agentes para entrevistas",
    configurePath: "/atracao-contratacao/recrutamento/configuracoes?tab=agentes",
  },
  comms: {
    id: "comms",
    label: "Canais de Comunicação",
    description: "WhatsApp e e-mail",
    configurePath: "/atracao-contratacao/recrutamento/configuracoes?tab=email-templates",
  },
  culture: {
    id: "culture",
    label: "Cultura & DISC",
    description: "Culture Code e perfil DISC alvo",
    configurePath: "/cultura",
  },
  distribution: {
    id: "distribution",
    label: "Distribuição de vagas",
    description: "LinkedIn, Indeed e outros canais",
    configurePath: "/atracao-contratacao/recrutamento/configuracoes?tab=distribuicao",
  },
  // Legacy — não usados aqui mas obrigatórios pelo Record
  client: {
    id: "client",
    label: "Cliente",
    description: "",
    configurePath: "",
  },
  job: { id: "job", label: "Vaga", description: "", configurePath: "" },
  candidate: {
    id: "candidate",
    label: "Candidato",
    description: "",
    configurePath: "",
  },
};

interface ChecklistRowProps {
  meta: ItemMeta;
  done: boolean;
  recommended?: boolean;
}

function ChecklistRow({ meta, done, recommended }: ChecklistRowProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors",
        done ? "border-success/30 bg-success/5" : "border-border bg-card hover:bg-muted/30"
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        {done ? (
          <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
        ) : (
          <Circle className="h-5 w-5 shrink-0 text-muted-foreground/40" />
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={cn("text-sm font-medium truncate", done && "text-muted-foreground line-through")}>
              {meta.label}
            </p>
            {recommended && !done && (
              <Badge variant="secondary" className="text-[10px] py-0 h-4">
                <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                Precisão do matching
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">{meta.description}</p>
        </div>
      </div>
      {!done && (
        <Button variant="outline" size="sm" asChild className="shrink-0">
          <Link to={meta.configurePath}>
            Configurar
            <ExternalLink className="h-3 w-3 ml-1" />
          </Link>
        </Button>
      )}
    </div>
  );
}

export function RecruitmentSetupChecklistCard() {
  const { progress, mode, dismiss } = useOnboardingProgress();
  const { data: status } = useRecruitmentSetupStatus();
  const { openWizard } = useAgencyOnboarding();
  const [showRecommended, setShowRecommended] = useState(true);
  const [showEssential, setShowEssential] = useState(true);

  const isSelf = mode === "self";

  const essentialItems = useMemo(
    () => SELF_ONBOARDING_STEPS.map((s) => ITEMS[s]),
    []
  );
  const recommendedItems = useMemo(
    () => EXTRA_RECOMMENDED_STEPS.map((s) => ITEMS[s]),
    []
  );

  // Não mostra para agência ou se nada configurado ainda
  if (!isSelf || !progress) return null;

  // Combina detecção automática + flags do banco
  const isDone = (step: OnboardingStep): boolean => {
    if (status?.[step]) return true;
    const map: Record<OnboardingStep, boolean> = {
      profile: progress.step_profile_done,
      client: progress.step_client_done,
      job: progress.step_job_done,
      agent: progress.step_agent_done,
      candidate: progress.step_candidate_done,
      team: progress.step_team_done,
      pipeline: progress.step_pipeline_done,
      careers: progress.step_careers_done,
      credits: progress.step_credits_done,
      comms: progress.step_comms_done,
      culture: progress.step_culture_done,
      distribution: progress.step_distribution_done,
    };
    return map[step];
  };

  const essentialDone = essentialItems.filter((i) => isDone(i.id)).length;
  const recommendedDone = recommendedItems.filter((i) => isDone(i.id)).length;
  const totalDone = essentialDone + recommendedDone;
  const total = essentialItems.length + recommendedItems.length;
  const pct = Math.round((totalDone / total) * 100);

  // Se 100% e completed_at marcado, não mostra
  if (totalDone === total && progress.completed_at) return null;

  // Banner verde quando tudo concluído
  if (totalDone === total) {
    return (
      <Card className="border-success/40 bg-success/5">
        <CardContent className="flex items-center justify-between gap-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/10">
              <Rocket className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="font-semibold">Plataforma pronta para recrutar 🚀</p>
              <p className="text-sm text-muted-foreground">
                Você concluiu toda a configuração inicial.
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => dismiss(24 * 365)}>
            <X className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base flex items-center gap-2">
              <Rocket className="h-4 w-4 text-primary" />
              Configuração inicial do recrutamento
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Complete os itens abaixo para deixar sua plataforma pronta para recrutar.
            </p>
          </div>
          <Button variant="default" size="sm" onClick={openWizard}>
            Continuar configuração
          </Button>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium">
              {totalDone} de {total} itens prontos
            </span>
            <span className="text-muted-foreground">{pct}%</span>
          </div>
          <Progress value={pct} className="h-2" />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Essencial */}
        <div>
          <button
            type="button"
            onClick={() => setShowEssential((p) => !p)}
            className="flex items-center justify-between w-full text-left mb-2"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">Essencial</span>
              <Badge variant="outline" className="text-[10px] py-0 h-4">
                {essentialDone}/{essentialItems.length}
              </Badge>
            </div>
            {showEssential ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {showEssential && (
            <div className="space-y-2">
              {essentialItems.map((item) => (
                <ChecklistRow key={item.id} meta={item} done={isDone(item.id)} />
              ))}
            </div>
          )}
        </div>

        {/* Recomendado */}
        <div>
          <button
            type="button"
            onClick={() => setShowRecommended((p) => !p)}
            className="flex items-center justify-between w-full text-left mb-2"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">Recomendado</span>
              <Badge variant="outline" className="text-[10px] py-0 h-4">
                {recommendedDone}/{recommendedItems.length}
              </Badge>
              <Badge variant="secondary" className="text-[10px] py-0 h-4">
                <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                Aumenta precisão do matching
              </Badge>
            </div>
            {showRecommended ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {showRecommended && (
            <div className="space-y-2">
              {recommendedItems.map((item) => (
                <ChecklistRow key={item.id} meta={item} done={isDone(item.id)} recommended />
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
