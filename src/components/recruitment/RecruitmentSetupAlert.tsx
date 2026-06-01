import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { useOnboardingProgress } from "@/hooks/useOnboardingProgress";
import { useRecruitmentSetupStatus } from "@/hooks/useRecruitmentSetupStatus";

/**
 * Alerta exibido em páginas críticas (vagas, criação) quando itens essenciais
 * para recrutar ainda não foram configurados (Pipeline ou Créditos).
 * Não bloqueia ações — apenas orienta.
 */
export function RecruitmentSetupAlert() {
  const { progress, mode } = useOnboardingProgress();
  const { data: status } = useRecruitmentSetupStatus();

  if (mode !== "self" || !progress) return null;

  const pipelineDone = status?.pipeline || progress.step_pipeline_done;
  const creditsDone = status?.credits || progress.step_credits_done;

  const missing: { label: string; href: string }[] = [];
  if (!pipelineDone) {
    missing.push({
      label: "Pipeline de contratação",
      href: "/atracao-contratacao/recrutamento/configuracoes?tab=pipeline",
    });
  }
  if (!creditsDone) {
    missing.push({
      label: "Créditos para recrutar",
      href: "/atracao-contratacao/recrutamento/configuracoes?tab=creditos",
    });
  }

  if (missing.length === 0) return null;

  return (
    <Alert variant="default" className="border-amber-300 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20">
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <AlertTitle className="text-amber-900 dark:text-amber-200">
        Configurações pendentes para recrutar
      </AlertTitle>
      <AlertDescription className="text-amber-800 dark:text-amber-300/90">
        <p className="mb-2">
          Para garantir o melhor funcionamento, configure estes itens essenciais:
        </p>
        <ul className="space-y-1">
          {missing.map((m) => (
            <li key={m.href}>
              <Link
                to={m.href}
                className="inline-flex items-center gap-1 underline hover:no-underline font-medium"
              >
                {m.label}
                <ExternalLink className="h-3 w-3" />
              </Link>
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}
