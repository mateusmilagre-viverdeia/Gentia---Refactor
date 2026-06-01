import { useState } from "react";
import { StepActionTemplate } from "./StepActionTemplate";
import { useRecruitmentSetupStatus } from "@/hooks/useRecruitmentSetupStatus";

interface Props {
  onComplete: () => void | Promise<void>;
  onSkip: () => Promise<void>;
}

export function Step4Careers({ onComplete, onSkip }: Props) {
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
      title="Página de Carreira"
      description="Personalize sua página pública onde os candidatos vão ver e se aplicar às vagas. Inclua logo, cores, descrição da empresa e benefícios."
      configurePath="/atracao-contratacao/recrutamento/configuracoes?tab=carreiras"
      configureLabel="Configurar página"
      alreadyDone={!!status?.careers}
      saving={saving}
      onMarkDone={handleDone}
      onSkip={onSkip}
    >
      <div className="rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground">
        Sua página de carreira é o link público que você compartilha em redes sociais, e-mail e divulgação. Ter ela bem configurada aumenta a conversão de candidatos.
      </div>
    </StepActionTemplate>
  );
}
