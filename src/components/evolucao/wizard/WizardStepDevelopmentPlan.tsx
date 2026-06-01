import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  GraduationCap, Calendar, Plus, X, Target, 
  Briefcase, Users, BookOpen, ChevronDown, ChevronUp 
} from "lucide-react";
import type { EvolutionWizardData, EvolutionActionType, CompetencyAssessment } from "@/types/evolution.types";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface WizardStepDevelopmentPlanProps {
  data: EvolutionWizardData;
  updateData: (updates: Partial<EvolutionWizardData>) => void;
}

const actionTypeConfig: Record<EvolutionActionType, { 
  label: string; 
  icon: typeof Briefcase; 
  description: string;
  percentage: string;
}> = {
  practical: {
    label: "70% - Prática",
    icon: Briefcase,
    description: "Projeto real, responsabilidade, on-the-job",
    percentage: "70%",
  },
  support: {
    label: "20% - Suporte",
    icon: Users,
    description: "Mentoria, feedback, shadowing",
    percentage: "20%",
  },
  learning: {
    label: "10% - Aprendizado",
    icon: BookOpen,
    description: "Curso, leitura, estudo",
    percentage: "10%",
  },
};

export function WizardStepDevelopmentPlan({ data, updateData }: WizardStepDevelopmentPlanProps) {
  const [expandedGaps, setExpandedGaps] = useState<Set<number>>(new Set([0]));
  const [newIndicator, setNewIndicator] = useState("");

  const gaps = data.competencyAssessments
    .map((comp, index) => ({ ...comp, originalIndex: index }))
    .filter(comp => !comp.has_competency);

  const toggleExpanded = (index: number) => {
    const newExpanded = new Set(expandedGaps);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedGaps(newExpanded);
  };

  const updateGap = (originalIndex: number, updates: Partial<CompetencyAssessment>) => {
    const updated = [...data.competencyAssessments];
    updated[originalIndex] = { ...updated[originalIndex], ...updates };
    updateData({ competencyAssessments: updated });
  };

  const addIndicator = (originalIndex: number) => {
    if (!newIndicator.trim()) return;
    const comp = data.competencyAssessments[originalIndex];
    updateGap(originalIndex, {
      success_indicators: [...(comp.success_indicators || []), newIndicator.trim()]
    });
    setNewIndicator("");
  };

  const removeIndicator = (originalIndex: number, indicatorIndex: number) => {
    const comp = data.competencyAssessments[originalIndex];
    updateGap(originalIndex, {
      success_indicators: comp.success_indicators?.filter((_, i) => i !== indicatorIndex) || []
    });
  };

  const addAction = (originalIndex: number, actionType: EvolutionActionType) => {
    const comp = data.competencyAssessments[originalIndex];
    updateGap(originalIndex, {
      actions: [...(comp.actions || []), { action_type: actionType, description: "" }]
    });
  };

  const updateAction = (originalIndex: number, actionIndex: number, updates: Partial<CompetencyAssessment["actions"][0]>) => {
    const comp = data.competencyAssessments[originalIndex];
    const newActions = [...(comp.actions || [])];
    newActions[actionIndex] = { ...newActions[actionIndex], ...updates };
    updateGap(originalIndex, { actions: newActions });
  };

  const removeAction = (originalIndex: number, actionIndex: number) => {
    const comp = data.competencyAssessments[originalIndex];
    updateGap(originalIndex, {
      actions: comp.actions?.filter((_, i) => i !== actionIndex) || []
    });
  };

  if (gaps.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            Plano de Desenvolvimento Individual (PDI)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-4xl mb-4">🎉</div>
            <h3 className="text-lg font-semibold text-green-600 mb-2">
              Nenhum gap identificado!
            </h3>
            <p className="text-muted-foreground">
              O colaborador possui todas as competências do cargo. Você pode prosseguir para a revisão.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-primary" />
          Plano de Desenvolvimento Individual (PDI)
        </CardTitle>
        <CardDescription>
          Defina prazos e ações de desenvolvimento para cada gap identificado usando o modelo 70-20-10
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="flex items-center gap-2 p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900">
          <Target className="h-5 w-5 text-orange-600" />
          <span className="font-medium">{gaps.length} competência(s) para desenvolver</span>
        </div>

        {/* Gap Cards */}
        {gaps.map((gap, gapIndex) => {
          const isExpanded = expandedGaps.has(gapIndex);
          const hasDeadline = !!gap.development_deadline;
          const hasActions = (gap.actions?.length || 0) > 0;

          return (
            <Collapsible key={gap.originalIndex} open={isExpanded} onOpenChange={() => toggleExpanded(gapIndex)}>
              <div className="border rounded-lg overflow-hidden">
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <Badge variant={gap.competency_type === 'behavioral' ? 'secondary' : 'default'}>
                        {gap.competency_type === 'behavioral' ? 'Comportamental' : 
                         gap.competency_type === 'technical_required' ? 'Técnica Obrigatória' : 'Técnica Desejável'}
                      </Badge>
                      <span className="font-medium">{gap.competency_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {hasDeadline && (
                        <Badge variant="outline" className="gap-1">
                          <Calendar className="h-3 w-3" />
                          {gap.development_deadline}
                        </Badge>
                      )}
                      {hasActions && (
                        <Badge variant="secondary">{gap.actions?.length} ações</Badge>
                      )}
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="p-4 pt-0 space-y-4 border-t">
                    {/* Deadline */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Prazo para Desenvolvimento *
                      </Label>
                      <Input
                        type="date"
                        value={gap.development_deadline || ""}
                        onChange={(e) => updateGap(gap.originalIndex, { development_deadline: e.target.value })}
                        min={data.start_date}
                        max={data.end_date}
                      />
                    </div>

                    {/* Success Indicators */}
                    <div className="space-y-2">
                      <Label>Indicadores de Sucesso</Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Como saberemos que desenvolveu esta competência..."
                          value={newIndicator}
                          onChange={(e) => setNewIndicator(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addIndicator(gap.originalIndex);
                            }
                          }}
                        />
                        <Button variant="outline" size="icon" onClick={() => addIndicator(gap.originalIndex)}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {gap.success_indicators?.map((indicator, iIndex) => (
                          <Badge key={iIndex} variant="outline" className="gap-1 pr-1">
                            {indicator}
                            <button onClick={() => removeIndicator(gap.originalIndex, iIndex)} className="ml-1 hover:text-destructive">
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="space-y-3">
                      <Label>Ações de Desenvolvimento (70-20-10)</Label>
                      
                      {gap.actions?.map((action, actionIndex) => {
                        const config = actionTypeConfig[action.action_type];
                        const Icon = config.icon;
                        
                        return (
                          <div key={actionIndex} className="p-3 rounded-lg border bg-card space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4 text-primary" />
                                <Badge variant="secondary">{config.label}</Badge>
                              </div>
                              <Button variant="ghost" size="icon" onClick={() => removeAction(gap.originalIndex, actionIndex)}>
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                            <Textarea
                              placeholder={config.description}
                              value={action.description}
                              onChange={(e) => updateAction(gap.originalIndex, actionIndex, { description: e.target.value })}
                              rows={2}
                            />
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label className="text-xs">Responsável</Label>
                                <Input
                                  placeholder="Quem vai apoiar"
                                  value={action.responsible || ""}
                                  onChange={(e) => updateAction(gap.originalIndex, actionIndex, { responsible: e.target.value })}
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Prazo</Label>
                                <Input
                                  type="date"
                                  value={action.due_date || ""}
                                  onChange={(e) => updateAction(gap.originalIndex, actionIndex, { due_date: e.target.value })}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {/* Add Action Buttons */}
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(actionTypeConfig).map(([type, config]) => {
                          const Icon = config.icon;
                          return (
                            <Button
                              key={type}
                              variant="outline"
                              size="sm"
                              onClick={() => addAction(gap.originalIndex, type as EvolutionActionType)}
                              className="gap-2"
                            >
                              <Icon className="h-4 w-4" />
                              {config.percentage}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}

        {/* Tip */}
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
          <h4 className="font-medium text-primary mb-2">💡 Modelo 70-20-10</h4>
          <p className="text-sm text-muted-foreground">
            <strong>70%</strong> Aprendizado no trabalho (projetos reais, responsabilidades)<br />
            <strong>20%</strong> Aprendizado com outros (mentoria, feedback, shadowing)<br />
            <strong>10%</strong> Aprendizado formal (cursos, leituras, certificações)
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
