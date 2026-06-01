import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  ChevronLeft, 
  ChevronRight, 
  Target, 
  Building2, 
  Layers, 
  CheckCircle2,
  DollarSign,
  Lightbulb
} from "lucide-react";
import type { ValorWizardStep, CreatePositionInput, CreatePositionLevelInput } from "@/types/compensation.types";
import { cn } from "@/lib/utils";

interface ValorWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  familyId: string;
  onComplete: (position: CreatePositionInput, levels: CreatePositionLevelInput[]) => void;
  isLoading?: boolean;
}

const STEPS: { id: ValorWizardStep; label: string; icon: React.ElementType; description: string }[] = [
  { id: "value", label: "V - Valor", icon: Target, description: "Por que esse cargo existe?" },
  { id: "architecture", label: "A - Arquitetura", icon: Building2, description: "Como se encaixa na organização?" },
  { id: "levels", label: "L - Níveis", icon: Layers, description: "Quais os níveis de complexidade?" },
  { id: "outcomes", label: "O - Entregas", icon: CheckCircle2, description: "O que se espera em cada nível?" },
  { id: "remuneration", label: "R - Remuneração", icon: DollarSign, description: "Qual a faixa salarial?" },
];

const DEFAULT_LEVELS = [
  { code: "JR", name: "Júnior", description: "Profissional em desenvolvimento, requer supervisão" },
  { code: "PL", name: "Pleno", description: "Profissional autônomo, executa com qualidade" },
  { code: "SR", name: "Sênior", description: "Referência técnica, lidera iniciativas" },
];

export const ValorWizard = ({
  open,
  onOpenChange,
  familyId,
  onComplete,
  isLoading,
}: ValorWizardProps) => {
  const [currentStep, setCurrentStep] = useState<ValorWizardStep>("value");
  const [position, setPosition] = useState<Partial<CreatePositionInput>>({
    family_id: familyId,
  });
  const [levels, setLevels] = useState<Partial<CreatePositionLevelInput>[]>(
    DEFAULT_LEVELS.map((l, i) => ({ ...l, level_order: i + 1 }))
  );

  const currentStepIndex = STEPS.findIndex(s => s.id === currentStep);
  const progress = ((currentStepIndex + 1) / STEPS.length) * 100;
  const CurrentIcon = STEPS[currentStepIndex].icon;

  const canProceed = () => {
    switch (currentStep) {
      case "value":
        return !!position.name?.trim() && !!position.mission?.trim();
      case "architecture":
        return !!position.area?.trim();
      case "levels":
        return levels.length > 0 && levels.every(l => l.code && l.name);
      case "outcomes":
        return true; // Optional step
      case "remuneration":
        return true; // Optional step for now
      default:
        return true;
    }
  };

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex].id);
    } else {
      // Complete wizard
      const finalPosition: CreatePositionInput = {
        family_id: familyId,
        name: position.name!,
        code: position.code,
        mission: position.mission,
        strategic_value: position.strategic_value,
        business_problem: position.business_problem,
        strategic_delivery: position.strategic_delivery,
        area: position.area,
        sub_area: position.sub_area,
        reports_to: position.reports_to,
        critical_interfaces: position.critical_interfaces,
      };
      
      const finalLevels: CreatePositionLevelInput[] = levels
        .filter(l => l.code && l.name)
        .map((l, i) => ({
          position_id: "", // Will be set after position creation
          code: l.code!,
          name: l.name!,
          description: l.description,
          level_order: i + 1,
          autonomy_level: l.autonomy_level,
          complexity_level: l.complexity_level,
          impact_level: l.impact_level,
          decision_scope: l.decision_scope,
          influence_degree: l.influence_degree,
        }));

      onComplete(finalPosition, finalLevels);
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex].id);
    }
  };

  const updateLevel = (index: number, field: string, value: string) => {
    setLevels(prev => prev.map((l, i) => 
      i === index ? { ...l, [field]: value } : l
    ));
  };

  const addLevel = () => {
    setLevels(prev => [...prev, { code: "", name: "", description: "", level_order: prev.length + 1 }]);
  };

  const removeLevel = (index: number) => {
    setLevels(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <CurrentIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>{STEPS[currentStepIndex].label}</DialogTitle>
              <p className="text-sm text-muted-foreground">{STEPS[currentStepIndex].description}</p>
            </div>
          </div>
        </DialogHeader>

        {/* Progress */}
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between">
            {STEPS.map((step, i) => (
              <div
                key={step.id}
                className={cn(
                  "text-xs",
                  i <= currentStepIndex ? "text-primary" : "text-muted-foreground"
                )}
              >
                {step.label.split(" - ")[0]}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="py-4 space-y-4">
          {currentStep === "value" && (
            <>
              <Card className="bg-muted/50 border-dashed">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="h-5 w-5 text-amber-500 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium">Dica V.A.L.O.R</p>
                      <p className="text-muted-foreground">
                        Antes de definir o título, pense: qual problema de negócio esse cargo resolve?
                        Qual entrega estratégica ele sustenta?
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-2">
                <Label htmlFor="name">Nome do Cargo *</Label>
                <Input
                  id="name"
                  value={position.name || ""}
                  onChange={(e) => setPosition(p => ({ ...p, name: e.target.value }))}
                  placeholder="Ex: Engenheiro de Software"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="code">Código (opcional)</Label>
                <Input
                  id="code"
                  value={position.code || ""}
                  onChange={(e) => setPosition(p => ({ ...p, code: e.target.value }))}
                  placeholder="Ex: ENG-01"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mission">Missão do Cargo *</Label>
                <Textarea
                  id="mission"
                  value={position.mission || ""}
                  onChange={(e) => setPosition(p => ({ ...p, mission: e.target.value }))}
                  placeholder="Em uma frase: qual o propósito fundamental deste cargo?"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="business_problem">Problema de Negócio que Resolve</Label>
                <Textarea
                  id="business_problem"
                  value={position.business_problem || ""}
                  onChange={(e) => setPosition(p => ({ ...p, business_problem: e.target.value }))}
                  placeholder="Qual desafio do negócio este cargo endereça?"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="strategic_value">Valor Estratégico</Label>
                <Textarea
                  id="strategic_value"
                  value={position.strategic_value || ""}
                  onChange={(e) => setPosition(p => ({ ...p, strategic_value: e.target.value }))}
                  placeholder="Como este cargo contribui para a estratégia da empresa?"
                  rows={2}
                />
              </div>
            </>
          )}

          {currentStep === "architecture" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="area">Área *</Label>
                  <Input
                    id="area"
                    value={position.area || ""}
                    onChange={(e) => setPosition(p => ({ ...p, area: e.target.value }))}
                    placeholder="Ex: Tecnologia"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sub_area">Subárea</Label>
                  <Input
                    id="sub_area"
                    value={position.sub_area || ""}
                    onChange={(e) => setPosition(p => ({ ...p, sub_area: e.target.value }))}
                    placeholder="Ex: Backend"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reports_to">Reporta para</Label>
                <Input
                  id="reports_to"
                  value={position.reports_to || ""}
                  onChange={(e) => setPosition(p => ({ ...p, reports_to: e.target.value }))}
                  placeholder="Ex: Tech Lead"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="interfaces">Interfaces Críticas</Label>
                <Input
                  id="interfaces"
                  value={position.critical_interfaces?.join(", ") || ""}
                  onChange={(e) => setPosition(p => ({ 
                    ...p, 
                    critical_interfaces: e.target.value.split(",").map(s => s.trim()).filter(Boolean)
                  }))}
                  placeholder="Ex: Produto, Design, QA (separados por vírgula)"
                />
              </div>
            </>
          )}

          {currentStep === "levels" && (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                Defina os níveis de senioridade para este cargo. Cada nível representa um grau diferente de autonomia, complexidade e impacto.
              </p>

              <div className="space-y-3">
                {levels.map((level, index) => (
                  <Card key={index}>
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-4">
                        <Badge variant="outline" className="mt-1">
                          {index + 1}
                        </Badge>
                        <div className="flex-1 space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs">Código *</Label>
                              <Input
                                value={level.code || ""}
                                onChange={(e) => updateLevel(index, "code", e.target.value)}
                                placeholder="JR"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Nome *</Label>
                              <Input
                                value={level.name || ""}
                                onChange={(e) => updateLevel(index, "name", e.target.value)}
                                placeholder="Júnior"
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Descrição</Label>
                            <Input
                              value={level.description || ""}
                              onChange={(e) => updateLevel(index, "description", e.target.value)}
                              placeholder="Descreva as características deste nível"
                            />
                          </div>
                        </div>
                        {levels.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeLevel(index)}
                            className="text-destructive"
                          >
                            Remover
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Button variant="outline" onClick={addLevel} className="w-full">
                + Adicionar Nível
              </Button>
            </>
          )}

          {currentStep === "outcomes" && (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p>Definição de entregas esperadas estará disponível na próxima versão.</p>
              <p className="text-sm mt-2">Por enquanto, você pode definir isso após criar o cargo.</p>
            </div>
          )}

          {currentStep === "remuneration" && (
            <div className="text-center py-8 text-muted-foreground">
              <DollarSign className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p>Definição de faixas salariais estará disponível na próxima versão.</p>
              <p className="text-sm mt-2">Por enquanto, você pode definir isso após criar o cargo.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStepIndex === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>

          <Button
            onClick={handleNext}
            disabled={!canProceed() || isLoading}
          >
            {currentStepIndex === STEPS.length - 1 ? (
              isLoading ? "Criando..." : "Criar Cargo"
            ) : (
              <>
                Próximo
                <ChevronRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
