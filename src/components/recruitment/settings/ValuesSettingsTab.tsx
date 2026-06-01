import { useEffect, useRef } from "react";
import {
  ValuesSelect20,
  ValuesSelect10,
  ValuesSelect5,
  ValuesOpenQuestions,
  ValuesRatings,
  ValuesFinalCheck,
  ValuesApproval,
  ValuesSummary,
  ValuesImportExport,
} from "@/components/cultura/valores";
import { ValuesProvider, useValues } from "@/contexts/ValuesContext";
import { RecruitmentValuesProgress } from "./RecruitmentValuesProgress";
import { Card } from "@/components/ui/card";
import { Heart } from "lucide-react";
import { VersionHistoryButton } from "@/components/shared/VersionHistoryButton";
import { captureSnapshot, restoreSnapshot } from "@/lib/versionSnapshot";

function ValuesContent() {
  const { session, loading, updateStage } = useValues();
  const handledStage8 = useRef(false);

  // Defesa: se a sessão chegar em 8 (vinda da Cultura), avança uma vez para 9.
  useEffect(() => {
    if (session?.stage === 8 && !handledStage8.current) {
      handledStage8.current = true;
      updateStage(9);
    }
    if (session?.stage !== 8) {
      handledStage8.current = false;
    }
  }, [session?.stage, updateStage]);

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Carregando...</div>;
  }

  const stage = session?.stage ?? 1;

  const cfg = session
    ? {
        sessionTable: "values_sessions",
        sessionId: session.id,
        childTables: [
          { table: "values_selections", fkColumn: "session_id" },
          { table: "values_behaviors_selections", fkColumn: "session_id" },
        ],
        sessionSkipColumns: ["account_id", "user_id", "created_at", "updated_at"],
      }
    : null;

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between gap-2 mb-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Valores da Empresa</h2>
        </div>
        <div className="flex items-center gap-2">
          <ValuesImportExport />
          {cfg && (
            <VersionHistoryButton
              moduleKey="cultura.valores"
              entityId={cfg.sessionId}
              serialize={() => captureSnapshot(cfg)}
              apply={async (snap) => {
                await restoreSnapshot(cfg, snap);
                window.location.reload();
              }}
              buildSummary={(snap: any) => ({
                counts: {
                  selecoes: snap.children?.values_selections?.length ?? 0,
                  comportamentos: snap.children?.values_behaviors_selections?.length ?? 0,
                },
                description: `Etapa ${snap.session?.stage ?? 0}`,
              })}
            />
          )}
        </div>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Defina os valores que orientarão o recrutamento. Esses valores são compartilhados
        com a página de Cultura — qualquer atualização aqui se reflete lá.
      </p>

      <div className="mb-4">
        <RecruitmentValuesProgress
          stage={stage}
          onStageClick={(s) => updateStage(s)}
        />
      </div>

      {/* Etapa 8 (Comportamentos) é pulada nesta aba via prop skipBehaviors */}
      <div key={`values-stage-${stage}`}>
        {stage === 1 && <ValuesSelect20 />}
        {stage === 2 && <ValuesSelect10 />}
        {stage === 3 && <ValuesSelect5 />}
        {stage === 4 && <ValuesOpenQuestions />}
        {stage === 5 && <ValuesRatings />}
        {stage === 6 && <ValuesFinalCheck />}
        {stage === 7 && <ValuesApproval skipBehaviors />}
        {stage === 9 && <ValuesSummary skipBehaviors />}
      </div>
    </Card>
  );
}

export function ValuesSettingsTab() {
  return (
    <ValuesProvider>
      <ValuesContent />
    </ValuesProvider>
  );
}
