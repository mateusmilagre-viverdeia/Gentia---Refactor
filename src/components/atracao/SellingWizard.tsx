import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, Sparkles, Loader2 } from "lucide-react";
import { SellingWizardStepper } from "./SellingWizardStepper";
import { SellingQuestionCard } from "./SellingQuestionCard";
import type { WizardResponses, CultureContext, CompanyContext } from "@/types/selling-company.types";

interface SellingWizardProps {
  currentStep: number;
  responses: WizardResponses;
  cultureContext: CultureContext;
  companyContext: CompanyContext | null;
  companyHistory: string;
  hasCompanyHistory: boolean;
  generating: boolean;
  onUpdateResponses: (responses: WizardResponses) => void;
  onNextStep: () => void;
  onPrevStep: () => void;
  onGenerate: () => void;
  onGoToStep?: (step: number) => void;
}

export function SellingWizard({
  currentStep,
  responses,
  cultureContext,
  companyContext,
  companyHistory,
  hasCompanyHistory,
  generating,
  onUpdateResponses,
  onNextStep,
  onPrevStep,
  onGenerate,
  onGoToStep,
}: SellingWizardProps) {
  const [localResponses, setLocalResponses] = useState<WizardResponses>(responses);

  const updateField = (field: keyof WizardResponses, value: string) => {
    const updated = { ...localResponses, [field]: value };
    setLocalResponses(updated);
    onUpdateResponses(updated);
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return hasCompanyHistory || !!localResponses.companyStory?.trim();
      case 2:
        return true; // Optional fields
      case 3:
        return true; // Optional fields
      case 4:
        return true; // Optional fields
      case 5:
        return true; // Review step
      default:
        return true;
    }
  };

  // Format values "Como Vivemos" for display
  const formatDos = () => {
    if (!cultureContext.values?.length) return '';
    return cultureContext.values
      .filter(v => v.dos?.length)
      .map(v => `• ${v.label}:\n  ${v.dos.join('\n  ')}`)
      .join('\n\n');
  };

  // Format values "Como NÃO Vivemos" for display
  const formatDonts = () => {
    if (!cultureContext.values?.length) return '';
    return cultureContext.values
      .filter(v => v.donts?.length)
      .map(v => `• ${v.label}:\n  ${v.donts.join('\n  ')}`)
      .join('\n\n');
  };

  const renderStep1 = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Contexto da Empresa</h3>
      <p className="text-muted-foreground text-sm">
        Vamos começar entendendo a história e propósito da sua empresa.
      </p>

      {!hasCompanyHistory && (
        <SellingQuestionCard
          title="Me conta um breve filme da empresa..."
          description="A jornada desde o começo até hoje. Principais marcos, desafios superados e conquistas."
          placeholder="Ex: Começamos em 2015 em uma garagem..."
          value={localResponses.companyStory || ''}
          onChange={(v) => updateField('companyStory', v)}
          required
          minRows={5}
        />
      )}

      {hasCompanyHistory && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              História carregada do Culture Code
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {companyHistory.substring(0, 300)}...
            </p>
          </CardContent>
        </Card>
      )}

      <SellingQuestionCard
        title="Qual é o sonho grande da empresa?"
        description="Onde vocês querem chegar? O que querem construir?"
        placeholder="Ex: Ser referência nacional em..."
        value={localResponses.dreamBig || ''}
        onChange={(v) => updateField('dreamBig', v)}
        autoFilled={!!cultureContext.vision}
        autoFilledValue={cultureContext.vision}
        onReload={() => updateField('dreamBig', '')}
      />

      <SellingQuestionCard
        title="Qual é o propósito/missão?"
        description="Por que a empresa existe além do lucro?"
        placeholder="Ex: Transformar a forma como..."
        value={localResponses.purpose || ''}
        onChange={(v) => updateField('purpose', v)}
        autoFilled={!!cultureContext.mission}
        autoFilledValue={cultureContext.mission}
        onReload={() => updateField('purpose', '')}
      />
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Números e Marcos</h3>
      <p className="text-muted-foreground text-sm">
        Mostre a grandeza e as conquistas da empresa.
      </p>

      <SellingQuestionCard
        title="Grandes números da empresa"
        description="Faturamento, clientes atendidos, colaboradores, presença geográfica..."
        placeholder="Ex: +1.500 clientes atendidos, R$ 50M de faturamento, 120 colaboradores..."
        value={localResponses.bigNumbers || ''}
        onChange={(v) => updateField('bigNumbers', v)}
        autoFilled={!!companyContext}
        autoFilledValue={companyContext ? 
          `${companyContext.employees_count || 0} colaboradores` + 
          (companyContext.revenue_last_12_months ? `, R$ ${(companyContext.revenue_last_12_months / 1000000).toFixed(1)}M de faturamento` : '')
          : ''
        }
        onReload={() => updateField('bigNumbers', '')}
      />

      <SellingQuestionCard
        title="Marcos e conquistas importantes"
        description="Prêmios, certificações, expansões, parcerias relevantes..."
        placeholder="Ex: Premiados 3x como melhor empresa do setor, certificação ISO..."
        value={localResponses.milestones || ''}
        onChange={(v) => updateField('milestones', v)}
        minRows={3}
      />

      <SellingQuestionCard
        title="Momento atual da empresa"
        description="O que está acontecendo agora? Crescimento? Novos produtos? Expansão?"
        placeholder="Ex: Estamos em fase de expansão para o sudeste, lançando nova linha de..."
        value={localResponses.currentMoment || ''}
        onChange={(v) => updateField('currentMoment', v)}
        minRows={3}
      />
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Benefícios e Desenvolvimento</h3>
      <p className="text-muted-foreground text-sm">
        O que a pessoa ganha ao fazer parte do time?
      </p>

      <SellingQuestionCard
        title="Benefícios tangíveis"
        description="Salário, benefícios, perks, escritório, equipamentos..."
        placeholder="Ex: Vale refeição, plano de saúde, gympass, day off de aniversário..."
        value={localResponses.tangibleBenefits || ''}
        onChange={(v) => updateField('tangibleBenefits', v)}
        minRows={4}
      />

      <SellingQuestionCard
        title="Oportunidades de desenvolvimento"
        description="Crescimento, aprendizado, mentoria, cursos..."
        placeholder="Ex: PDI individual, acesso a cursos, mentoria com líderes seniores..."
        value={localResponses.developmentOpportunities || ''}
        onChange={(v) => updateField('developmentOpportunities', v)}
        minRows={3}
      />

      <SellingQuestionCard
        title="Estilo de trabalho"
        description="Remoto, híbrido, presencial? Horário flexível? Autonomia?"
        placeholder="Ex: Modelo híbrido (3x presencial), horário flexível, autonomia total..."
        value={localResponses.workStyle || ''}
        onChange={(v) => updateField('workStyle', v)}
        minRows={3}
      />
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Malefícios</h3>
      <p className="text-muted-foreground text-sm">
        Seja honesto sobre como é trabalhar na empresa. Isso atrai as pessoas certas.
      </p>

      <SellingQuestionCard
        title="O que SOMOS de verdade?"
        description="Os pontos fortes, o que as pessoas amam aqui, a cultura positiva..."
        placeholder="Ex: Somos uma empresa que valoriza resultado, transparência é regra..."
        value={localResponses.whatWeAre || ''}
        onChange={(v) => updateField('whatWeAre', v)}
        autoFilled={!!cultureContext.values?.some(v => v.dos?.length)}
        autoFilledValue={formatDos()}
        onReload={() => updateField('whatWeAre', '')}
        minRows={4}
      />

      <SellingQuestionCard
        title="O que NÃO somos e não toleramos"
        description="Seja claro sobre o que não funciona aqui. Afaste quem não tem fit."
        placeholder="Ex: Não toleramos vitimismo, fofoca, falta de comprometimento..."
        value={localResponses.whatWeAreNot || ''}
        onChange={(v) => updateField('whatWeAreNot', v)}
        autoFilled={!!cultureContext.values?.some(v => v.donts?.length)}
        autoFilledValue={formatDonts()}
        onReload={() => updateField('whatWeAreNot', '')}
        minRows={4}
      />

      <SellingQuestionCard
        title="Desafios reais de trabalhar aqui"
        description="Seja honesto. Quais são as dificuldades? O que pode assustar?"
        placeholder="Ex: Crescemos rápido, mudanças acontecem o tempo todo, cobramos resultado..."
        value={localResponses.challenges || ''}
        onChange={(v) => updateField('challenges', v)}
        minRows={3}
      />
    </div>
  );

  const renderStep5 = () => {
    const ReviewSection = ({ 
      title, 
      step, 
      children 
    }: { 
      title: string; 
      step: number; 
      children: React.ReactNode;
    }) => (
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onGoToStep?.(step)}
            className="h-7 text-xs"
          >
            Editar
          </Button>
        </CardHeader>
        <CardContent className="text-sm space-y-3">
          {children}
        </CardContent>
      </Card>
    );

    const FieldDisplay = ({ 
      label, 
      value, 
      autoFilled 
    }: { 
      label: string; 
      value?: string; 
      autoFilled?: boolean;
    }) => (
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-foreground">{label}</span>
          {autoFilled && (
            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">
              Auto-preenchido
            </span>
          )}
        </div>
        <p className="text-muted-foreground whitespace-pre-wrap text-xs leading-relaxed">
          {value || <span className="italic text-muted-foreground/60">Não informado</span>}
        </p>
      </div>
    );

    return (
      <div className="space-y-6">
        <div className="text-center mb-6">
          <h3 className="text-lg font-semibold">Revisão Final</h3>
          <p className="text-muted-foreground text-sm">
            Revise todas as informações antes de gerar o texto com IA
          </p>
        </div>

        <div className="grid gap-4">
          {/* Etapa 1: Contexto */}
          <ReviewSection title="1. Contexto da Empresa" step={1}>
            <FieldDisplay 
              label="História da empresa" 
              value={hasCompanyHistory 
                ? `${companyHistory.substring(0, 200)}...` 
                : localResponses.companyStory
              }
              autoFilled={hasCompanyHistory}
            />
            <FieldDisplay 
              label="Sonho grande / Visão" 
              value={localResponses.dreamBig || cultureContext.vision}
              autoFilled={!!cultureContext.vision && !localResponses.dreamBig}
            />
            <FieldDisplay 
              label="Propósito / Missão" 
              value={localResponses.purpose || cultureContext.mission}
              autoFilled={!!cultureContext.mission && !localResponses.purpose}
            />
          </ReviewSection>

          {/* Etapa 2: Números */}
          <ReviewSection title="2. Números e Marcos" step={2}>
            <FieldDisplay 
              label="Grandes números" 
              value={localResponses.bigNumbers || (companyContext 
                ? `${companyContext.employees_count || 0} colaboradores` + 
                  (companyContext.revenue_last_12_months 
                    ? `, R$ ${(companyContext.revenue_last_12_months / 1000000).toFixed(1)}M de faturamento` 
                    : '')
                : undefined
              )}
              autoFilled={!!companyContext && !localResponses.bigNumbers}
            />
            <FieldDisplay label="Marcos e conquistas" value={localResponses.milestones} />
            <FieldDisplay label="Momento atual" value={localResponses.currentMoment} />
          </ReviewSection>

          {/* Etapa 3: Benefícios */}
          <ReviewSection title="3. Benefícios e Desenvolvimento" step={3}>
            <FieldDisplay label="Benefícios tangíveis" value={localResponses.tangibleBenefits} />
            <FieldDisplay label="Oportunidades de desenvolvimento" value={localResponses.developmentOpportunities} />
            <FieldDisplay label="Estilo de trabalho" value={localResponses.workStyle} />
          </ReviewSection>

          {/* Etapa 4: Malefícios */}
          <ReviewSection title="4. Malefícios" step={4}>
            <FieldDisplay 
              label="O que somos (Como Vivemos)" 
              value={localResponses.whatWeAre || formatDos()}
              autoFilled={!!cultureContext.values?.some(v => v.dos?.length) && !localResponses.whatWeAre}
            />
            <FieldDisplay 
              label="O que NÃO somos (Como NÃO Vivemos)" 
              value={localResponses.whatWeAreNot || formatDonts()}
              autoFilled={!!cultureContext.values?.some(v => v.donts?.length) && !localResponses.whatWeAreNot}
            />
            <FieldDisplay label="Desafios reais" value={localResponses.challenges} />
          </ReviewSection>
        </div>

        <div className="bg-muted/50 p-4 rounded-lg">
          <p className="text-sm">
            <strong>💡 Dica:</strong> Quanto mais informações você fornecer, mais personalizado e autêntico será o texto gerado. 
            Clique em "Editar" para modificar qualquer seção.
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <SellingWizardStepper currentStep={currentStep} />

      <div className="min-h-[400px]">
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
        {currentStep === 5 && renderStep5()}
      </div>

      <div className="flex items-center justify-between pt-4 border-t">
        <Button
          variant="outline"
          onClick={onPrevStep}
          disabled={currentStep === 1}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>

        {currentStep < 5 ? (
          <Button onClick={onNextStep} disabled={!canProceed()}>
            Próximo
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={onGenerate} disabled={generating}>
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Gerar com IA
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
