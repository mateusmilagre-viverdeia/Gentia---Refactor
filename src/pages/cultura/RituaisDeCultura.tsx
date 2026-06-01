import { AppLayout } from "@/components/layout/AppLayout";
import { RequireCompany } from "@/components/layout/RequireCompany";
import { RitualProvider, useRitual } from "@/contexts/RitualContext";
import { 
  RitualIntro, RitualWizard, RitualReview, RitualSummary,
  RitualManagementSelection, RitualAIRecommendations, RitualFinalAnalysis
} from "@/components/cultura/rituais";
import { RitualProgress } from "@/components/cultura/rituais/RitualProgress";
import { Loader2 } from "lucide-react";
import { PageGamificationBanner } from "@/components/gamification";
import { VersionHistoryButton } from "@/components/shared/VersionHistoryButton";
import { captureSnapshot, restoreSnapshot } from "@/lib/versionSnapshot";

function RitualContent() {
  const { session, loading, updateStage, highestStageReached } = useRitual();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Erro ao carregar sessão</p>
      </div>
    );
  }

  const showProgress = session.stage >= 1;

  const renderStage = () => {
    if (session.stage === 0) return <RitualIntro />;
    if (session.stage === 1) return <RitualManagementSelection />;
    if (session.stage === 2) return <RitualAIRecommendations />;
    if (session.stage >= 3 && session.stage <= 5) return <RitualWizard key={`stage-${session.stage}`} />;
    if (session.stage === 6) return <RitualFinalAnalysis />;
    if (session.stage === 7) return <RitualReview />;
    if (session.stage === 8 || session.stage === 9) return <RitualSummary />;
    return <RitualIntro />;
  };

  const snapshotConfig = {
    sessionTable: "ritual_sessions",
    sessionId: session.id,
    childTables: [{ table: "ritual_items", fkColumn: "session_id" }],
    sessionSkipColumns: ["account_id", "user_id", "created_at", "updated_at"],
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <VersionHistoryButton
          moduleKey="cultura.rituais"
          entityId={session.id}
          serialize={() => captureSnapshot(snapshotConfig)}
          apply={async (snap) => {
            await restoreSnapshot(snapshotConfig, snap);
            window.location.reload();
          }}
          buildSummary={(snap) => ({
            counts: { rituais: snap.children?.ritual_items?.length ?? 0 },
            description: `Etapa ${snap.session?.stage ?? 0}`,
          })}
        />
      </div>
      {showProgress && (
        <RitualProgress
          currentStage={session.stage}
          highestStageReached={highestStageReached}
          onStageClick={(stage) => updateStage(stage)}
        />
      )}
      {renderStage()}
    </div>
  );
}

const RituaisDeCultura = () => {
  return (
    <AppLayout title="Rituais de Cultura" breadcrumb={[{ label: "Home", href: "/" }, { label: "Cultura Organizacional", href: "/cultura" }, { label: "Rituais de Cultura" }]}>
      <RequireCompany>
        <PageGamificationBanner journeyId="cultura" stepId="rituais" />
        <RitualProvider>
          <RitualContent />
        </RitualProvider>
      </RequireCompany>
    </AppLayout>
  );
};

export default RituaisDeCultura;
