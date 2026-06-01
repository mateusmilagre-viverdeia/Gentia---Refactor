import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEvent } from "@/contexts/EventContext";
import { EVENT_PILLARS, EventFormat } from "@/types/event.types";
import { Pencil, RotateCcw, FileText, PartyPopper } from "lucide-react";
import logoGentia from "@/assets/logo-gentia.png";
import { VersionHistoryCard } from "../shared/VersionHistoryCard";
import { EventPDFPreview } from "./EventPDFPreview";
import { useJourneyProgress } from "@/hooks/useJourneyProgress";
import { useAchievementChecker } from "@/hooks/useAchievementChecker";

const formatLabels: Record<EventFormat, string> = {
  presencial: 'Presencial',
  online: 'Online',
  hibrido: 'Híbrido'
};

export function EventSummary() {
  const { session, getItemsForPillar, updateStage, resetSession, versionHistory, saveVersionSnapshot, restoreVersion } = useEvent();
  const { refetch } = useJourneyProgress();
  const { checkStepCompletion } = useAchievementChecker();
  const hasSavedInitial = useRef(false);
  const hasCheckedAchievements = useRef(false);
  const [pdfOpen, setPdfOpen] = useState(false);

  const totalItems = EVENT_PILLARS.reduce((acc, p) => acc + getItemsForPillar(p.number).length, 0);

  // Refetch journey progress and check achievements when summary mounts
  useEffect(() => {
    refetch();
    if (!hasCheckedAchievements.current) {
      hasCheckedAchievements.current = true;
      checkStepCompletion('evento');
    }
  }, [refetch, checkStepCompletion]);

  // Auto-save version on first load
  useEffect(() => {
    if (session && totalItems > 0 && !hasSavedInitial.current && versionHistory.length === 0) {
      hasSavedInitial.current = true;
      saveVersionSnapshot('initial');
    }
  }, [session, totalItems, versionHistory]);

  if (!session) return null;

  const handleEdit = async () => {
    await updateStage(10);
  };

  const handleExportPDF = () => {
    setPdfOpen(true);
  };

  return (
    <>
      <div className="max-w-3xl mx-auto space-y-6 no-print">
        <div className="flex justify-center">
          <img src={logoGentia} alt="Gent.IA" className="h-36 w-auto" />
        </div>

        <Card className="border-2 border-primary/20">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-2">
              <PartyPopper className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-2xl">Seu Evento de Cultura está pronto!</CardTitle>
            <CardDescription>
              Formato: <strong>{session.event_format ? formatLabels[session.event_format] : 'Não definido'}</strong>
              {' • '}
              <strong>{totalItems}</strong> itens planejados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {EVENT_PILLARS.map((pillar) => {
              const items = getItemsForPillar(pillar.number);
              return (
                <div key={pillar.number} className="border-b pb-4 last:border-b-0 last:pb-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{pillar.icon}</span>
                    <span className="font-semibold">{pillar.number}. {pillar.title}</span>
                  </div>
                  {items.length > 0 ? (
                    <ul className="list-disc list-inside pl-8 space-y-1">
                      {items.map((item) => (
                        <li key={item.id} className="text-sm">
                          {item.item_text}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground pl-8 italic">
                      Nenhum item planejado
                    </p>
                  )}
                </div>
              );
            })}

            {/* Version History */}
            <VersionHistoryCard
              history={versionHistory}
              renderPreview={(snapshot) => {
                const data = snapshot as { format?: string; items?: { item_text: string; pillar_number: number }[] };
                const totalItems = data.items ? data.items.length : 0;
                return <span className="text-xs text-muted-foreground">Formato: {data.format || 'N/A'} • {totalItems} itens planejados</span>;
              }}
              renderDetailedPreview={(snapshot) => {
                const data = snapshot as { items?: { item_text: string; pillar_number: number }[] };
                if (!data.items || data.items.length === 0) return <span className="text-xs text-muted-foreground">Nenhum item</span>;
                return (
                  <div className="space-y-1">
                    {data.items.map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                        <span className="text-muted-foreground">P{item.pillar_number}:</span>
                        <span className="text-foreground">{item.item_text}</span>
                      </div>
                    ))}
                  </div>
                );
              }}
              onRestore={restoreVersion}
            />
          </CardContent>
        </Card>

        <div className="flex justify-between gap-3">
          <Button variant="outline" onClick={handleEdit}>
            <Pencil className="h-4 w-4 mr-2" />
            Editar
          </Button>
          <Button variant="outline" onClick={resetSession}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Novo Evento
          </Button>
          <Button onClick={handleExportPDF}>
            <FileText className="h-4 w-4 mr-2" />
            Exportar PDF
          </Button>
        </div>
      </div>

      <EventPDFPreview
        open={pdfOpen}
        onClose={() => setPdfOpen(false)}
        eventFormat={session.event_format as EventFormat | null}
        getItemsForPillar={getItemsForPillar}
      />
    </>
  );
}
