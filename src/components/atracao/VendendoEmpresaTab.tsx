import { useNavigate } from "react-router-dom";
import { useSellingCompany } from "@/hooks/useSellingCompany";
import { SellingWizard } from "./SellingWizard";
import { SellingChatRefine } from "./SellingChatRefine";
import { SellingSummary } from "./SellingSummary";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Play } from "lucide-react";
import { useEffect } from "react";

export function VendendoEmpresaTab() {
  const navigate = useNavigate();
  const {
    session,
    versions,
    loading,
    generating,
    cultureContext,
    companyContext,
    companyHistory,
    hasCompanyHistory,
    hasCultureData,
    approvedVersion,
    createSession,
    updateSession,
    updateResponses,
    nextStep,
    prevStep,
    generateContent,
    refineBlock,
    editBlock,
    approveVersion,
  } = useSellingCompany();

  // Auto-create session if needed
  useEffect(() => {
    if (!loading && !session && hasCultureData) {
      createSession();
    }
  }, [loading, session, hasCultureData]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // No culture data - show warning
  if (!hasCultureData) {
    return (
      <Card>
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100">
            <AlertTriangle className="h-8 w-8 text-yellow-600" />
          </div>
          <CardTitle>Complete sua Cultura primeiro</CardTitle>
          <CardDescription className="max-w-md mx-auto">
            Para gerar um texto de "Vendendo a Empresa" autêntico e personalizado,
            você precisa primeiro definir sua Missão, Visão ou Valores na seção Criação de Cultura.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Button variant="outline" onClick={() => navigate('/cultura/criacao-de-cultura')}>
            Ir para Criação de Cultura
          </Button>
        </CardContent>
      </Card>
    );
  }

  // No session yet - creating
  if (!session) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <Skeleton className="h-8 w-48 mx-auto" />
          <p className="text-muted-foreground">Preparando sua sessão...</p>
        </div>
      </div>
    );
  }

  // Determine which stage to show
  const stage = session.stage || 'wizard';
  const status = session.status || 'draft';

  // If approved and has approved version, show summary
  if (status === 'approved' && approvedVersion) {
    return (
      <SellingSummary
        approvedVersion={approvedVersion}
        companyName={companyContext?.name || 'Empresa'}
        onBack={() => updateSession({ stage: 'chat', status: 'draft' })}
        onEdit={() => updateSession({ stage: 'chat', status: 'draft' })}
      />
    );
  }

  // Handler for approval with order/hidden info
  const handleApprove = (versionId: string, orderedBlockIds: string[], hiddenBlockIds: string[]) => {
    approveVersion(versionId, orderedBlockIds, hiddenBlockIds);
  };

  // Show based on stage
  if (stage === 'chat' && versions.length > 0) {
    return (
      <SellingChatRefine
        versions={versions}
        generating={generating}
        onRefineBlock={refineBlock}
        onEditBlock={editBlock}
        onApprove={handleApprove}
        onBack={() => updateSession({ stage: 'wizard' })}
        onGenerateNew={generateContent}
      />
    );
  }

  // Handler to navigate to specific step
  const handleGoToStep = (step: number) => {
    updateSession({ wizard_step: step });
  };

  // Default to wizard
  return (
    <SellingWizard
      currentStep={session.wizard_step || 1}
      responses={session.responses || {}}
      cultureContext={cultureContext}
      companyContext={companyContext}
      companyHistory={companyHistory}
      hasCompanyHistory={hasCompanyHistory}
      generating={generating}
      onUpdateResponses={updateResponses}
      onNextStep={nextStep}
      onPrevStep={prevStep}
      onGenerate={generateContent}
      onGoToStep={handleGoToStep}
    />
  );
}
