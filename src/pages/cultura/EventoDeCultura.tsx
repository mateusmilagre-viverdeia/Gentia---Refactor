import { AppLayout } from "@/components/layout/AppLayout";
import { RequireCompany } from "@/components/layout/RequireCompany";
import { EventProvider, useEvent } from "@/contexts/EventContext";
import { 
  EventFormatSelector, 
  EventWizard, 
  EventReview, 
  EventSummary 
} from "@/components/cultura/evento";
import { Loader2 } from "lucide-react";
import { PageGamificationBanner } from "@/components/gamification";
import { VersionHistoryButton } from "@/components/shared/VersionHistoryButton";
import { captureSnapshot, restoreSnapshot } from "@/lib/versionSnapshot";

function EventContent() {
  const { session, loading } = useEvent();

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
        <p className="text-muted-foreground">Erro ao carregar sessão. Por favor, recarregue a página.</p>
      </div>
    );
  }

  const cfg = {
    sessionTable: "event_sessions",
    sessionId: session.id,
    childTables: [{ table: "event_items", fkColumn: "session_id" }],
    sessionSkipColumns: ["account_id", "user_id", "created_at", "updated_at"],
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <VersionHistoryButton
          moduleKey="cultura.evento"
          entityId={session.id}
          serialize={() => captureSnapshot(cfg)}
          apply={async (snap) => {
            await restoreSnapshot(cfg, snap);
            window.location.reload();
          }}
          buildSummary={(snap) => ({
            counts: { itens: snap.children?.event_items?.length ?? 0 },
            description: `Etapa ${snap.session?.stage ?? 0}`,
          })}
        />
      </div>
      {session.stage === 0 && <EventFormatSelector />}
      {session.stage >= 1 && session.stage <= 9 && <EventWizard />}
      {session.stage === 10 && <EventReview />}
      {session.stage === 11 && <EventSummary />}
    </div>
  );
}

const EventoDeCultura = () => {
  return (
    <AppLayout title="Evento de Cultura" breadcrumb={[{ label: "Home", href: "/" }, { label: "Cultura Organizacional", href: "/cultura" }, { label: "Evento de Cultura" }]}>
      <RequireCompany>
        <PageGamificationBanner journeyId="cultura" stepId="evento" />
        <EventProvider>
          <EventContent />
        </EventProvider>
      </RequireCompany>
    </AppLayout>
  );
};

export default EventoDeCultura;
