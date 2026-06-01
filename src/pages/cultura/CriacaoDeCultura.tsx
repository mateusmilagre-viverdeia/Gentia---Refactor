import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { RequireCompany } from "@/components/layout/RequireCompany";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PillarForm } from "@/components/cultura/PillarForm";
import { useNavigate, useSearchParams } from "react-router-dom";
import { VisionWizard, VisionReview, VisionProcessing, VisionSummary } from "@/components/cultura/visao";
import { MissionWizard, MissionReview, MissionProcessing, MissionSummary } from "@/components/cultura/missao";
import { MissionProvider, useMission } from "@/contexts/MissionContext";
import { VisionProvider, useVision } from "@/contexts/VisionContext";
import { 
  ValuesSelect20, 
  ValuesSelect10, 
  ValuesSelect5, 
  ValuesOpenQuestions, 
  ValuesRatings, 
  ValuesFinalCheck, 
  ValuesApproval, 
  ValuesBehaviors, 
  ValuesSummary,
  ValuesProgress,
  ValuesImportExport
} from "@/components/cultura/valores";
import { ValuesProvider, useValues } from "@/contexts/ValuesContext";
import { IndicatorsWizard } from "@/components/cultura/indicadores";
import { DevelopmentWizard } from "@/components/cultura/desenvolvimento";
import { DevelopmentProvider } from "@/contexts/DevelopmentContext";
import { EnergyWizard } from "@/components/cultura/energia";
import { EnergyProvider } from "@/contexts/EnergyContext";
import { ProjectsWizard } from "@/components/cultura/projetos";
import { ProjectsProvider } from "@/contexts/ProjectsContext";
import { DecisionWizard, DecisionReview, DecisionSummary } from "@/components/cultura/decisao";
import { DecisionProvider, useDecision } from "@/contexts/DecisionContext";
import { ExecutiveSummary } from "@/components/cultura/resumo";
import { PageGamificationBanner } from "@/components/gamification";
import { CultureCodeImporter } from "@/components/cultura/CultureCodeImporter";
import { CultureCodeLibraryImporter } from "@/components/cultura/CultureCodeLibraryImporter";
import { useEPRole } from "@/hooks/useEPRole";
import { VersionHistoryButton } from "@/components/shared/VersionHistoryButton";
import { captureSnapshot, restoreSnapshot } from "@/lib/versionSnapshot";

const pillars = [
  {
    id: "missao",
    name: "Missão",
    description: "Defina o propósito e a razão de existir da sua organização. A missão responde 'por que existimos?'",
  },
  {
    id: "visao",
    name: "Visão",
    description: "Estabeleça onde sua empresa quer chegar. A visão responde 'onde queremos estar no futuro?'",
  },
  {
    id: "valores",
    name: "Valores",
    description: "Identifique os princípios que guiam as decisões e comportamentos da organização.",
  },
  {
    id: "indicadores",
    name: "Indicadores",
    description: "Defina como sua empresa mede sucesso e acompanha o progresso dos objetivos.",
  },
  {
    id: "projetos",
    name: "Projetos",
    description: "Liste as iniciativas prioritárias que impulsionarão a cultura e os resultados.",
  },
  {
    id: "energia",
    name: "Energia",
    description: "Determine como manter o time motivado, engajado e com alta performance.",
  },
  {
    id: "desenvolvimento",
    name: "Desenvolvimento",
    description: "Estabeleça como a organização e as pessoas crescem e evoluem continuamente.",
  },
  {
    id: "tomada-decisao",
    name: "Decisão",
    description: "Defina os processos e critérios para tomada de decisões estratégicas e operacionais.",
  },
  {
    id: "resumo",
    name: "Resumo",
    description: "Visualize o código de cultura completo da sua empresa.",
  },
];

function ValuesContent() {
  const { session: valuesSession, loading: valuesLoading, updateStage: valuesUpdateStage } = useValues();

  if (valuesLoading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  const cfg = valuesSession ? {
    sessionTable: "values_sessions",
    sessionId: valuesSession.id,
    childTables: [
      { table: "values_selections", fkColumn: "session_id" },
      { table: "values_behaviors_selections", fkColumn: "session_id" },
    ],
    sessionSkipColumns: ["account_id", "user_id", "created_at", "updated_at"],
  } : null;

  return (
    <div key={`values-stage-${valuesSession?.stage}`}>
      {cfg && (
        <div className="flex justify-end items-center gap-2 mb-3">
          <ValuesImportExport />
          <VersionHistoryButton
            moduleKey="cultura.valores"
            entityId={valuesSession!.id}
            serialize={() => captureSnapshot(cfg)}
            apply={async (snap) => {
              await restoreSnapshot(cfg, snap);
              window.location.reload();
            }}
            buildSummary={(snap) => ({
              counts: {
                selecoes: snap.children?.values_selections?.length ?? 0,
                comportamentos: snap.children?.values_behaviors_selections?.length ?? 0,
              },
              description: `Etapa ${snap.session?.stage ?? 0}`,
            })}
          />
        </div>
      )}
      <div className="mb-4">
        <ValuesProgress stage={valuesSession?.stage || 1} onStageClick={(s) => valuesUpdateStage(s)} />
      </div>
      {valuesSession?.stage === 1 && <ValuesSelect20 />}
      {valuesSession?.stage === 2 && <ValuesSelect10 />}
      {valuesSession?.stage === 3 && <ValuesSelect5 />}
      {valuesSession?.stage === 4 && <ValuesOpenQuestions />}
      {valuesSession?.stage === 5 && <ValuesRatings />}
      {valuesSession?.stage === 6 && <ValuesFinalCheck />}
      {valuesSession?.stage === 7 && <ValuesApproval />}
      {valuesSession?.stage === 8 && <ValuesBehaviors />}
      {valuesSession?.stage === 9 && <ValuesSummary />}
    </div>
  );
}

function DecisionContent() {
  const { session, loading } = useDecision();

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <div key={`decision-stage-${session?.stage}`}>
      {session?.stage && session.stage >= 1 && session.stage <= 7 && <DecisionWizard />}
      {session?.stage === 8 && <DecisionReview />}
      {session?.stage === 9 && <DecisionSummary />}
    </div>
  );
}

function MissionContent() {
  const { session, isLoading } = useMission();

  if (isLoading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  // V2 tem 9 perguntas, V1 tem 8
  const totalQuestions = session.questionnaireVersion === 2 ? 9 : 8;

  return (
    <div key={`mission-stage-${session.stage}`}>
      {session.stage >= 1 && session.stage <= totalQuestions && <MissionWizard />}
      {session.stage === 14 && <MissionReview />}
      {session.stage === 15 && <MissionProcessing />}
      {session.stage === 16 && <MissionSummary />}
    </div>
  );
}

function VisionContent() {
  const { session, isLoading } = useVision();

  if (isLoading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <div key={`vision-stage-${session.stage}`}>
      {session.stage >= 1 && session.stage <= 10 && <VisionWizard />}
      {session.stage === 11 && <VisionReview />}
      {session.stage === 12 && <VisionProcessing />}
      {session.stage === 13 && <VisionSummary />}
    </div>
  );
}

// Map pillar id to step id for gamification
const pillarToStepId: Record<string, string> = {
  missao: 'missao',
  visao: 'visao',
  valores: 'valores',
  indicadores: 'indicadores',
  projetos: 'projetos',
  energia: 'energia',
  desenvolvimento: 'desenvolvimento',
  'tomada-decisao': 'decisao',
  resumo: 'slides',
};

// Map step id (from journey) to pillar id (for tabs)
const stepIdToPillar: Record<string, string> = {
  missao: 'missao',
  visao: 'visao',
  valores: 'valores',
  indicadores: 'indicadores',
  projetos: 'projetos',
  energia: 'energia',
  desenvolvimento: 'desenvolvimento',
  decisao: 'tomada-decisao',
};

const CriacaoDeCultura = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const autoImport = searchParams.get('autoImport');
  const { isEPPartner, isSuperAdmin, loading: roleLoading } = useEPRole();
  const canImportPDF = isEPPartner || isSuperAdmin;
  
  // Map the tab param from URL to pillar id
  const initialPillar = tabFromUrl && stepIdToPillar[tabFromUrl] 
    ? stepIdToPillar[tabFromUrl] 
    : tabFromUrl && pillars.find(p => p.id === tabFromUrl)
      ? tabFromUrl
      : 'missao';
  
  const [activePillar, setActivePillar] = useState(initialPillar);
  const navigate = useNavigate();

  // Update active pillar when URL tab param changes
  useEffect(() => {
    if (tabFromUrl) {
      const mappedPillar = stepIdToPillar[tabFromUrl] || tabFromUrl;
      if (pillars.find(p => p.id === mappedPillar)) {
        setActivePillar(mappedPillar);
      }
    }
  }, [tabFromUrl]);

  // Update URL when tab changes (without adding to history)
  const handleTabChange = (pillarId: string) => {
    setActivePillar(pillarId);
    const stepId = pillarToStepId[pillarId] || pillarId;
    setSearchParams({ tab: stepId }, { replace: true });
  };

  const currentStepId = pillarToStepId[activePillar] || 'missao';

  const currentIndex = pillars.findIndex((p) => p.id === activePillar);
  const currentPillar = pillars[currentIndex];

  const handleNext = () => {
    if (currentIndex < pillars.length - 1) {
      setActivePillar(pillars[currentIndex + 1].id);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setActivePillar(pillars[currentIndex - 1].id);
    }
  };

  return (
    <AppLayout title="Criação de Cultura" breadcrumb={[{ label: "Home", href: "/" }, { label: "Cultura Organizacional" }, { label: "Criação de Cultura" }]}>
      <RequireCompany>
      <div className="space-y-6">
        <PageGamificationBanner journeyId="cultura" stepId={currentStepId} />
        
        <div className="bg-accent p-6 rounded-md print:hidden">
          <div className="flex justify-between items-start gap-4">
            <div>
              <h2 className="text-2xl font-semibold mb-2">Construa seu Código de Cultura</h2>
              <p className="text-muted-foreground">
                Desenvolva a cultura organizacional da sua empresa através de 8 pilares fundamentais.
                Cada pilar representa um elemento essencial para uma cultura forte e sustentável.
              </p>
            </div>
            {canImportPDF && (
              <div className="flex items-center gap-2">
                <CultureCodeLibraryImporter 
                  onImportComplete={() => handleTabChange("resumo")} 
                  autoOpen={autoImport === 'library'}
                />
                <CultureCodeImporter onImportComplete={() => handleTabChange("resumo")} />
              </div>
            )}
          </div>
        </div>

        <Tabs value={activePillar} onValueChange={handleTabChange}>
          <TabsList className="grid grid-cols-5 lg:grid-cols-9 w-full print:hidden">
            {pillars.map((pillar) => (
              <TabsTrigger key={pillar.id} value={pillar.id} className="text-xs">
                {pillar.name}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="missao">
            <MissionProvider>
              <MissionContent />
            </MissionProvider>
          </TabsContent>
          <TabsContent value="visao">
            <VisionProvider>
              <VisionContent />
            </VisionProvider>
          </TabsContent>
          <TabsContent value="valores">
            <ValuesProvider>
              <ValuesContent />
            </ValuesProvider>
          </TabsContent>
          <TabsContent value="indicadores">
            <IndicatorsWizard />
          </TabsContent>
          <TabsContent value="projetos">
            <ProjectsProvider>
              <ProjectsWizard />
            </ProjectsProvider>
          </TabsContent>
          <TabsContent value="energia">
            <EnergyProvider>
              <EnergyWizard />
            </EnergyProvider>
          </TabsContent>
          <TabsContent value="desenvolvimento">
            <DevelopmentProvider>
              <DevelopmentWizard />
            </DevelopmentProvider>
          </TabsContent>
          <TabsContent value="tomada-decisao">
            <DecisionProvider>
              <DecisionContent />
            </DecisionProvider>
          </TabsContent>
          <TabsContent value="resumo">
            <ExecutiveSummary onNavigateToPillar={setActivePillar} />
          </TabsContent>
        </Tabs>
      </div>
      </RequireCompany>
    </AppLayout>
  );
};

export default CriacaoDeCultura;
