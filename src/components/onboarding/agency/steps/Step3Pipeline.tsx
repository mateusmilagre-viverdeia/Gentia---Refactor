import { useState } from "react";
import { StepActionTemplate } from "./StepActionTemplate";
import { useRecruitmentSetupStatus } from "@/hooks/useRecruitmentSetupStatus";

interface Props {
  onComplete: () => void | Promise<void>;
  onSkip: () => Promise<void>;
}

export function Step3Pipeline({ onComplete, onSkip }: Props) {
  const { data: status } = useRecruitmentSetupStatus();
  const [saving, setSaving] = useState(false);

  const handleDone = async () => {
    setSaving(true);
    try {
      await onComplete();
    } finally {
      setSaving(false);
    }
  };

  return (
    <StepActionTemplate
      title="Configure seu pipeline"
      description="Defina os estágios do seu funil de recrutamento (ex: Triagem → Entrevista → Proposta → Contratado). Cada vaga pode usar um funil diferente."
      configurePath="/atracao-contratacao/recrutamento/configuracoes?tab=pipeline"
      configureLabel="Configurar pipeline"
      alreadyDone={!!status?.pipeline}
      saving={saving}
      onMarkDone={handleDone}
      onSkip={onSkip}
    >
      <div className="rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground">
        Já criamos um funil padrão para você. Personalize os estágios conforme o seu processo.
      </div>
    </StepActionTemplate>
  );
}
