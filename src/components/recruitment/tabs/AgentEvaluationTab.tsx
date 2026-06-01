import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Settings2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AgentCriterion {
  id: string;
  name: string;
  description: string;
  excellenceDescription: string;
  warningSignsDescription: string;
  minimumScore: number;
  importance: "minor" | "moderate" | "important" | "very_important" | "critical";
  weight: number;
  color: string;
}

interface AgentEvaluationTabProps {
  minimumScore: number;
  criteria: AgentCriterion[];
  isEditing: boolean;
  onCriteriaChange: (criteria: AgentCriterion[]) => void;
  onMinimumScoreChange?: (value: number) => void;
}

const scoreOptions = [2, 3, 4, 5, 6, 7, 8, 9];

const importanceOptions = [
  { value: "minor", label: "x1", fullLabel: "Baixa importância", weight: 1 },
  { value: "moderate", label: "x2", fullLabel: "Moderada", weight: 2 },
  { value: "important", label: "x3", fullLabel: "Importante", weight: 3 },
  { value: "very_important", label: "x4", fullLabel: "Muito importante", weight: 4 },
  { value: "critical", label: "x5", fullLabel: "Crítica", weight: 5 },
] as const;

// Same color scheme as AgentOverviewTab
const criteriaColors = [
  { bg: "bg-red-500", text: "text-red-500" },
  { bg: "bg-blue-500", text: "text-blue-500" },
  { bg: "bg-green-500", text: "text-green-500" },
  { bg: "bg-yellow-500", text: "text-yellow-500" },
  { bg: "bg-orange-500", text: "text-orange-500" },
  { bg: "bg-purple-500", text: "text-purple-500" },
  { bg: "bg-pink-500", text: "text-pink-500" },
  { bg: "bg-cyan-500", text: "text-cyan-500" },
];

export const AgentEvaluationTab = ({
  minimumScore,
  criteria,
  isEditing,
  onCriteriaChange,
  onMinimumScoreChange,
}: AgentEvaluationTabProps) => {
  const [editingCriterionId, setEditingCriterionId] = useState<string | null>(null);

  const handleCriterionChange = (
    id: string,
    field: keyof AgentCriterion,
    value: string | number
  ) => {
    onCriteriaChange(
      criteria.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  const handleAddCriterion = () => {
    const newId = `c-${Date.now()}`;
    const newCriterion: AgentCriterion = {
      id: newId,
      name: "",
      description: "",
      excellenceDescription: "",
      warningSignsDescription: "",
      minimumScore: 7,
      importance: "important",
      weight: 3,
      color: "blue",
    };
    onCriteriaChange([...criteria, newCriterion]);
    setEditingCriterionId(newId);
  };

  const handleRemoveCriterion = (id: string) => {
    onCriteriaChange(criteria.filter((c) => c.id !== id));
  };

  const getImportanceLabel = (importance: string) => {
    const option = importanceOptions.find(o => o.value === importance);
    return option ? `${option.fullLabel} (${option.label})` : importance;
  };

  const getWeight = (importance: string) => {
    return importanceOptions.find(o => o.value === importance)?.weight || 1;
  };

  // Calculate total weight and impact percentages
  const totalWeight = criteria.reduce((sum, c) => sum + getWeight(c.importance), 0);
  const getImpact = (importance: string) => {
    if (totalWeight === 0) return 0;
    return (getWeight(importance) / totalWeight) * 100;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">Critérios de Avaliação</h3>
          <p className="text-sm text-muted-foreground">
            Defina os critérios que serão avaliados nas entrevistas.
          </p>
        </div>
        {isEditing && (
          <Button onClick={handleAddCriterion} size="sm" className="gap-1.5 shrink-0">
            <Plus className="h-4 w-4" />
            Adicionar
          </Button>
        )}
      </div>

      {/* Overall Performance Standard */}
      <div className="bg-muted/30 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-sm">Nota mínima geral</h4>
            <p className="text-xs text-muted-foreground">
              Nota base para aprovação do candidato
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              inputMode="decimal"
              step={0.1}
              min={0}
              max={10}
              value={Number.isFinite(minimumScore) ? minimumScore : 7}
              disabled={!isEditing}
              onChange={(e) => {
                const raw = e.target.value;
                const next = raw === "" ? 0 : Number.parseFloat(raw);
                if (Number.isNaN(next)) return;
                const clamped = Math.min(10, Math.max(0, next));
                // Round to 1 decimal
                onMinimumScoreChange?.(Math.round(clamped * 10) / 10);
              }}
              className="w-28"
            />
            <span className="text-xs text-muted-foreground">/ 10</span>
          </div>
        </div>
      </div>

      {/* Criteria List */}
      <div className="border rounded-lg divide-y overflow-hidden bg-background">
        {criteria.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">Nenhum critério configurado</p>
            {isEditing && (
              <Button onClick={handleAddCriterion} variant="link" className="mt-2">
                Adicionar primeiro critério
              </Button>
            )}
          </div>
        )}

        {criteria.map((criterion, index) => {
          const impact = getImpact(criterion.importance);
          const colorScheme = criteriaColors[index % criteriaColors.length];
          
          return (
            <div key={criterion.id} className="flex items-start gap-4 p-4 hover:bg-muted/30 transition-colors">
              {/* Color indicator */}
              <div className={cn(
                "w-3 h-3 rounded-full mt-1.5 shrink-0",
                colorScheme.bg
              )} />

              {/* Content */}
              <div className="flex-1 min-w-0 space-y-1">
                <h4 className="font-semibold text-sm">
                  {criterion.name || "Critério sem nome"}
                </h4>
                {criterion.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {criterion.description}
                  </p>
                )}
                <div className="flex items-center gap-4 pt-1">
                  <span className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Média mínima exigida:</span> {criterion.minimumScore}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Peso:</span> {getImportanceLabel(criterion.importance)}
                  </span>
                </div>
              </div>

              {/* Impact - using same color as indicator */}
              <div className="text-right shrink-0 min-w-[80px]">
                <span className={cn("text-lg font-semibold", colorScheme.text)}>
                  {impact.toFixed(2)}%
                </span>
                <p className="text-xs text-muted-foreground">Impacto</p>
              </div>

              {/* Actions */}
              {isEditing && (
                <div className="flex items-center gap-1 shrink-0">
                  <Dialog open={editingCriterionId === criterion.id} onOpenChange={(open) => setEditingCriterionId(open ? criterion.id : null)}>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      >
                        <Settings2 className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                      <DialogHeader>
                        <DialogTitle>Editar Critério</DialogTitle>
                      </DialogHeader>
                      <ScrollArea className="max-h-[70vh]">
                        <div className="space-y-4 pr-4">
                          {/* Name */}
                          <div className="space-y-2">
                            <Label className="text-sm">Nome do critério</Label>
                            <Input
                              value={criterion.name}
                              onChange={(e) => handleCriterionChange(criterion.id, "name", e.target.value)}
                              placeholder="Ex: Comunicação, Trabalho em equipe..."
                            />
                          </div>

                          {/* Description */}
                          <div className="space-y-2">
                            <Label className="text-sm">Por que é importante</Label>
                            <Textarea
                              value={criterion.description}
                              onChange={(e) => handleCriterionChange(criterion.id, "description", e.target.value)}
                              placeholder="Descreva a importância deste critério para a vaga..."
                              rows={3}
                            />
                          </div>

                          {/* Excellence */}
                          <div className="space-y-2">
                            <Label className="text-sm">O que é excelência neste critério?</Label>
                            <Textarea
                              value={criterion.excellenceDescription}
                              onChange={(e) => handleCriterionChange(criterion.id, "excellenceDescription", e.target.value)}
                              placeholder="Descreva como seria o desempenho ideal..."
                              rows={2}
                            />
                          </div>

                          {/* Warning signs */}
                          <div className="space-y-2">
                            <Label className="text-sm">Sinais de alerta</Label>
                            <Textarea
                              value={criterion.warningSignsDescription}
                              onChange={(e) => handleCriterionChange(criterion.id, "warningSignsDescription", e.target.value)}
                              placeholder="Quais comportamentos devem ser evitados..."
                              rows={2}
                            />
                          </div>

                          {/* Score */}
                          <div className="space-y-2">
                            <Label className="text-sm">Nota mínima exigida</Label>
                            <div className="flex gap-1">
                              {scoreOptions.map((score) => (
                                <Button
                                  key={score}
                                  variant={criterion.minimumScore === score ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => handleCriterionChange(criterion.id, "minimumScore", score)}
                                  className="w-9 h-9 p-0"
                                >
                                  {score}
                                </Button>
                              ))}
                            </div>
                          </div>

                          {/* Importance */}
                          <div className="space-y-2">
                            <Label className="text-sm">Peso / Importância</Label>
                            <div className="flex gap-2 flex-wrap">
                              {importanceOptions.map((option) => (
                                <Button
                                  key={option.value}
                                  variant={criterion.importance === option.value ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => handleCriterionChange(criterion.id, "importance", option.value)}
                                  className="h-9"
                                >
                                  {option.label} - {option.fullLabel}
                                </Button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </ScrollArea>
                    </DialogContent>
                  </Dialog>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleRemoveCriterion(criterion.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
