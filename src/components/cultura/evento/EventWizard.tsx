import { Button } from "@/components/ui/button";
import { useEvent } from "@/contexts/EventContext";
import { EVENT_PILLARS } from "@/types/event.types";
import { EventProgress } from "./EventProgress";
import { EventPillarCard } from "./EventPillarCard";
import { ChevronLeft, ChevronRight } from "lucide-react";
import logoGentia from "@/assets/logo-gentia.png";

export function EventWizard() {
  const { session, updateStage, getItemsForPillar } = useEvent();

  if (!session) return null;

  const currentPillar = EVENT_PILLARS.find(p => p.number === session.stage);
  const currentItems = getItemsForPillar(session.stage);

  const handlePrevious = async () => {
    if (session.stage > 1) {
      await updateStage(session.stage - 1);
    } else {
      await updateStage(0); // Back to format selection
    }
  };

  const handleNext = async () => {
    if (session.stage < 9) {
      await updateStage(session.stage + 1);
    } else {
      await updateStage(10); // Go to review
    }
  };

  if (!currentPillar) return null;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex justify-center">
        <img src={logoGentia} alt="Gent.IA" className="h-36 w-auto" />
      </div>

      <EventProgress currentStage={session.stage} onStageClick={(s) => updateStage(s)} />

      <EventPillarCard pillar={currentPillar} />

      <div className="flex justify-between">
        <Button variant="outline" onClick={handlePrevious}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <Button onClick={handleNext}>
          {session.stage === 9 ? 'Revisar' : 'Próximo'}
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
