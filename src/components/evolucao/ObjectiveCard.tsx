import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Target, 
  ChevronDown, 
  ChevronUp, 
  Briefcase, 
  Users, 
  BookOpen,
  CheckCircle2,
  Clock,
  AlertCircle
} from "lucide-react";
import { useEvolutionActions } from "@/hooks/useEvolutionActions";
import type { EvolutionObjective, EvolutionAction, EvolutionActionType, EvolutionActionStatus } from "@/types/evolution.types";

interface ObjectiveCardProps {
  objective: EvolutionObjective;
  index: number;
  cycleId: string;
  isActive: boolean;
}

const actionTypeConfig: Record<EvolutionActionType, { 
  label: string; 
  icon: typeof Briefcase; 
  color: string;
}> = {
  practical: { label: "Prática", icon: Briefcase, color: "text-green-600" },
  support: { label: "Suporte", icon: Users, color: "text-blue-600" },
  learning: { label: "Aprendizado", icon: BookOpen, color: "text-purple-600" },
};

const statusConfig: Record<EvolutionActionStatus, {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
}> = {
  pending: { label: "Pendente", variant: "outline" },
  in_progress: { label: "Em andamento", variant: "default" },
  completed: { label: "Concluída", variant: "secondary" },
  cancelled: { label: "Cancelada", variant: "destructive" },
};

export function ObjectiveCard({ objective, index, cycleId, isActive }: ObjectiveCardProps) {
  const [isOpen, setIsOpen] = useState(true);
  const { updateActionStatus } = useEvolutionActions(cycleId);

  const actions = objective.actions || [];
  const completedCount = actions.filter((a) => a.status === "completed").length;
  const progress = actions.length > 0 ? (completedCount / actions.length) * 100 : 0;

  const handleToggleAction = async (action: EvolutionAction) => {
    if (!isActive) return;
    
    const newStatus = action.status === "completed" ? "pending" : "completed";
    await updateActionStatus.mutateAsync({ id: action.id, status: newStatus });
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Target className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">
                    Objetivo {index + 1}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {objective.objective_text}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm font-medium">{completedCount}/{actions.length} ações</p>
                  <p className="text-xs text-muted-foreground">{Math.round(progress)}% concluído</p>
                </div>
                {isOpen ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            {/* Key Behaviors */}
            {objective.key_behaviors && objective.key_behaviors.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Comportamentos Observáveis</p>
                <div className="flex flex-wrap gap-2">
                  {objective.key_behaviors.map((behavior, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {behavior}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Ações</p>
              {actions.length > 0 ? (
                <div className="space-y-2">
                  {actions.map((action) => {
                    const typeConfig = actionTypeConfig[action.action_type];
                    const TypeIcon = typeConfig.icon;
                    const status = statusConfig[action.status];

                    return (
                      <div
                        key={action.id}
                        className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                          action.status === "completed" 
                            ? "bg-muted/50 opacity-75" 
                            : "bg-card hover:bg-muted/30"
                        }`}
                      >
                        {isActive && (
                          <Checkbox
                            checked={action.status === "completed"}
                            onCheckedChange={() => handleToggleAction(action)}
                            className="mt-1"
                          />
                        )}
                        <TypeIcon className={`h-5 w-5 mt-0.5 ${typeConfig.color}`} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">
                              {typeConfig.label}
                            </Badge>
                            <Badge variant={status.variant} className="text-xs">
                              {status.label}
                            </Badge>
                          </div>
                          <p className={`text-sm ${action.status === "completed" ? "line-through" : ""}`}>
                            {action.description}
                          </p>
                          {(action.responsible || action.due_date) && (
                            <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                              {action.responsible && (
                                <span>👤 {action.responsible}</span>
                              )}
                              {action.due_date && (
                                <span>📅 {action.due_date}</span>
                              )}
                            </div>
                          )}
                          {action.evidence_description && (
                            <div className="mt-2 p-2 bg-green-50 dark:bg-green-950/30 rounded text-xs">
                              ✅ Evidência: {action.evidence_description}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma ação definida para este objetivo
                </p>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
