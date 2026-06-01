import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEvent } from "@/contexts/EventContext";
import { EVENT_PILLARS, EventFormat } from "@/types/event.types";
import { EventProgress } from "./EventProgress";
import { EventItemRow } from "./EventItemRow";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import logoGentia from "@/assets/logo-gentia.png";

const formatLabels: Record<EventFormat, string> = {
  presencial: 'Presencial',
  online: 'Online',
  hibrido: 'Híbrido'
};

export function EventReview() {
  const { session, updateStage, getItemsForPillar, updateItem, deleteItem, resetSession } = useEvent();

  if (!session) return null;

  const handleEdit = async (pillarNumber: number) => {
    await updateStage(pillarNumber);
  };

  const handlePrevious = async () => {
    await updateStage(9);
  };

  const handleFinish = async () => {
    await updateStage(11);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex justify-center">
        <img src={logoGentia} alt="Gent.IA" className="h-36 w-auto" />
      </div>

      <EventProgress currentStage={session.stage} onStageClick={(s) => updateStage(s)} />

      <Card>
        <CardHeader>
          <CardTitle>Revisão do Evento de Cultura</CardTitle>
          <CardDescription>
            Formato: <strong>{session.event_format ? formatLabels[session.event_format] : 'Não definido'}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {EVENT_PILLARS.map((pillar) => {
            const items = getItemsForPillar(pillar.number);
            return (
              <div key={pillar.number} className="border-b pb-4 last:border-b-0 last:pb-0">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{pillar.icon}</span>
                    <span className="font-medium">{pillar.number}. {pillar.title}</span>
                    <span className="text-sm text-muted-foreground">({items.length} itens)</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(pillar.number)}>
                    Alterar
                  </Button>
                </div>
                {items.length > 0 ? (
                  <div className="space-y-2 pl-8">
                    {items.map((item) => (
                      <EventItemRow
                        key={item.id}
                        item={item}
                        onUpdate={updateItem}
                        onDelete={deleteItem}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground pl-8">Nenhum item adicionado</p>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={handlePrevious}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <Button variant="outline" onClick={resetSession}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Recomeçar
        </Button>
        <Button onClick={handleFinish}>
          Finalizar
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
