import { useState } from "react";
import { StepActionTemplate } from "./StepActionTemplate";
import { useRecruitmentSetupStatus } from "@/hooks/useRecruitmentSetupStatus";

interface Props {
  onComplete: () => void | Promise<void>;
  onSkip: () => Promise<void>;
}

export function Step2Team({ onComplete, onSkip }: Props) {
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
      title="Convide seu time"
      description="Adicione recrutadores, gestores de vaga ou aprovadores. Eles poderão comentar candidatos, dar feedback e mover etapas no funil."
      configurePath="/atracao-contratacao/recrutamento/configuracoes?tab=portal-cliente"
      configureLabel="Convidar membros"
      alreadyDone={!!status?.team}
      saving={saving}
      onMarkDone={handleDone}
      onSkip={onSkip}
    >
      <div className="rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground">
        Dica: você pode trabalhar sozinho no início e convidar o time mais tarde — basta marcar como concluído por enquanto.
      </div>
    </StepActionTemplate>
  );
}
