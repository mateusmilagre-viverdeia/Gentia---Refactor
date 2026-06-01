import { AppLayout } from "@/components/layout/AppLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { ValuesQuestionsProvider, useValuesQuestions } from "@/contexts/ValuesQuestionsContext";
import {
  ValuesQuestionsIntro,
  ValuesQuestionsWizard,
  ValuesQuestionsReview,
  ValuesQuestionsSummary
} from "@/components/contratacao/perguntas-valores";
import { PageGamificationBanner } from "@/components/gamification";
import { VersionHistoryButton } from "@/components/shared/VersionHistoryButton";
import { captureSnapshot, restoreSnapshot, buildCounts } from "@/lib/versionSnapshot";

function PerguntasValoresContent() {
  const { session, loading } = useValuesQuestions();

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const stage = session?.stage || 0;

  return (
    <div className="max-w-4xl mx-auto">
      {session && (
        <div className="flex justify-end mb-4">
          <VersionHistoryButton
            moduleKey="contratacao.perguntas_valores"
            entityId={session.id}
            serialize={() =>
              captureSnapshot({
                sessionTable: "values_questions_sessions",
                sessionId: session.id,
                childTables: [{ table: "values_questions_items", fkColumn: "session_id" }],
                sessionSkipColumns: ["account_id", "user_id", "created_at", "updated_at"],
              })
            }
            apply={async (snap) => {
              await restoreSnapshot(
                {
                  sessionTable: "values_questions_sessions",
                  sessionId: session.id,
                  childTables: [{ table: "values_questions_items", fkColumn: "session_id" }],
                  sessionSkipColumns: ["account_id", "user_id", "created_at", "updated_at"],
                },
                snap
              );
              window.location.reload();
            }}
            buildSummary={(snap) => ({
              counts: { perguntas: snap.children?.values_questions_items?.length ?? 0 },
              description: `Etapa ${snap.session?.stage ?? 0}`,
            })}
          />
        </div>
      )}
      {stage === 0 && <ValuesQuestionsIntro />}
      {stage >= 1 && stage <= 4 && <ValuesQuestionsWizard />}
      {stage === 5 && <ValuesQuestionsReview />}
      {stage === 6 && <ValuesQuestionsSummary />}
    </div>
  );
}

export default function PerguntasValores() {
  return (
    <AppLayout 
      title="Perguntas baseadas em Valores" 
      breadcrumb={[{ label: "Home", href: "/" }, { label: "Atração e Contratação", href: "/atracao-contratacao" }, { label: "Contratação", href: "/atracao-contratacao/contratacao" }, { label: "Perguntas baseadas em Valores" }]}
    >
      <PageGamificationBanner journeyId="atracao" stepId="perguntas_valores" />
      <ValuesQuestionsProvider>
        <PerguntasValoresContent />
      </ValuesQuestionsProvider>
    </AppLayout>
  );
}
