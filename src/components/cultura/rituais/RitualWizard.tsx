import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useRitual } from "@/contexts/RitualContext";
import { RITUAL_PILLARS, WORK_MODELS } from "@/types/ritual.types";
import { RitualPillarCard } from "./RitualPillarCard";
import { RitualStageInstructions } from "./RitualStageInstructions";
import { ChevronLeft, ChevronRight, SkipForward, Pencil } from "lucide-react";
import logoGentia from "@/assets/logo-gentia.png";

export function RitualWizard() {
  const { session, updateStage, saveWorkModel } = useRitual();
  const [showWorkModelPicker, setShowWorkModelPicker] = useState(false);

  if (!session) return null;

  const pillarNumber = session.stage - 2;
  const currentPillar = RITUAL_PILLARS.find((p) => p.number === pillarNumber);

  // Stage 3 (Artefatos) needs work model selection first
  const isArtefatosStage = session.stage === 3;
  const needsWorkModel = isArtefatosStage && !session.work_model && !showWorkModelPicker;
  const showingWorkModelPicker = isArtefatosStage && (!session.work_model || showWorkModelPicker);

  const handlePrevious = async () => {
    if (showWorkModelPicker) {
      setShowWorkModelPicker(false);
      return;
    }
    if (session.stage > 3) {
      await updateStage(session.stage - 1);
    } else {
      await updateStage(2);
    }
  };

  const handleNext = async () => {
    if (session.stage < 5) {
      await updateStage(session.stage + 1);
    } else {
      await updateStage(6);
    }
  };

  const handleSkip = async () => {
    await handleNext();
  };

  const handleSelectWorkModel = async (model: string) => {
    await saveWorkModel(model);
    setShowWorkModelPicker(false);
  };

  if (!currentPillar) return null;

  // Work model selection screen
  if (showingWorkModelPicker || needsWorkModel) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-center">
          <img src={logoGentia} alt="Gent.IA" className="h-36 w-auto" />
        </div>

        <RitualStageInstructions stage={session.stage} />

        <Card>
          <CardContent className="pt-6 space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold">Qual é o modelo de trabalho da sua empresa?</h3>
              <p className="text-sm text-muted-foreground">
                Isso nos ajuda a recomendar artefatos adequados ao seu ambiente de trabalho.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {WORK_MODELS.map((wm) => (
                <button
                  key={wm.value}
                  onClick={() => handleSelectWorkModel(wm.value)}
                  className={`p-6 rounded-xl border-2 text-left transition-all duration-200 hover:scale-[1.02] ${
                    session.work_model === wm.value
                      ? 'border-primary bg-primary/5 shadow-md'
                      : 'border-border hover:border-primary/50 hover:shadow-sm'
                  }`}
                >
                  <div className="text-3xl mb-3">{wm.icon}</div>
                  <h4 className="font-semibold mb-1">{wm.label}</h4>
                  <p className="text-xs text-muted-foreground">{wm.description}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button variant="outline" onClick={handlePrevious}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-center">
        <img src={logoGentia} alt="Gent.IA" className="h-36 w-auto" />
      </div>

      <RitualStageInstructions stage={session.stage} />

      {/* Show work model badge on Artefatos stage */}
      {isArtefatosStage && session.work_model && (
        <div className="flex items-center justify-center gap-2">
          <span className="text-sm text-muted-foreground">
            Modelo: <span className="font-medium text-foreground">
              {WORK_MODELS.find(w => w.value === session.work_model)?.label}
            </span>
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowWorkModelPicker(true)}
            className="h-7 px-2"
          >
            <Pencil className="h-3 w-3" />
          </Button>
        </div>
      )}

      <RitualPillarCard pillar={currentPillar} />

      <div className="flex justify-between">
        <Button variant="outline" onClick={handlePrevious}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={handleSkip} className="text-muted-foreground">
            <SkipForward className="h-4 w-4 mr-1" />
            Pular etapa
          </Button>
          <Button onClick={handleNext}>
            {session.stage === 5 ? "Revisar" : "Próximo"}
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
