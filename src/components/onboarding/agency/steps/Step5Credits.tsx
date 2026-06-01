import { useState } from "react";
import { StepActionTemplate } from "./StepActionTemplate";
import { useRecruitmentSetupStatus } from "@/hooks/useRecruitmentSetupStatus";

interface Props {
  onComplete: () => void | Promise<void>;
  onSkip: () => Promise<void>;
  onFinish: () => void;
}

export function Step5Credits({ onComplete, onSkip, onFinish }: Props) {
  const { data: status } = useRecruitmentSetupStatus();
  const [saving, setSaving] = useState(false);

  const handleDone = async () => {
    setSaving(true);
    try {
      await onComplete();
      onFinish();
    } finally {
      setSaving(false);
    }
  };

  return (
    <StepActionTemplate
      title="Créditos para recrutar"
      description="Cada entrevista por IA, triagem cultural e teste comportamental consome créditos. Garanta saldo suficiente ou ative uma assinatura recorrente."
      configurePath="/atracao-contratacao/recrutamento/configuracoes?tab=creditos"
      configureLabel="Adicionar créditos"
      alreadyDone={!!status?.credits}
      saving={saving}
      onMarkDone={handleDone}
      onSkip={onSkip}
    >
      <div className="rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground">
        Sua conta começa com créditos de teste. Para uso contínuo, escolha um pacote ou assinatura mensal.
      </div>
    </StepActionTemplate>
  );
}
