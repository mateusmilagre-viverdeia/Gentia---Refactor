import { parseISO } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  CheckCircle2, 
  User, 
  Calendar, 
  Target, 
  TrendingUp, 
  Zap,
  Briefcase,
  Users,
  BookOpen,
  AlertTriangle,
  CheckCircle
} from "lucide-react";
import type { EvolutionWizardData, EvolutionActionType } from "@/types/evolution.types";
import { useAccountMembers } from "@/hooks/useAccountMembers";
import { formatBRT } from "@/lib/datetime";

interface WizardStepReviewProps {
  data: EvolutionWizardData;
}

const actionTypeConfig: Record<EvolutionActionType, { 
  label: string; 
  icon: typeof Briefcase; 
  color: string;
}> = {
  practical: { label: "Prática (70%)", icon: Briefcase, color: "text-green-600" },
  support: { label: "Suporte (20%)", icon: Users, color: "text-blue-600" },
  learning: { label: "Aprendizado (10%)", icon: BookOpen, color: "text-purple-600" },
};

const competencyTypeLabels: Record<string, string> = {
  behavioral: "Comportamental",
  technical: "Técnica",
  leadership: "Liderança",
  cultural: "Cultural",
};

export function WizardStepReview({ data }: WizardStepReviewProps) {
  const { members } = useAccountMembers();
  
  const collaborator = members.find(m => m.user_id === data.collaborator_id);
  const leader = data.leader_id ? members.find(m => m.user_id === data.leader_id) : null;

  // Separar competências que possui vs gaps
  const competenciasQuePossui = data.competencyAssessments.filter(c => c.has_competency);
  const gaps = data.competencyAssessments.filter(c => !c.has_competency);

  // Contar total de ações no PDI
  const totalActions = gaps.reduce((acc, gap) => acc + gap.actions.length, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-primary" />
          Revisão do Ciclo de Evolução
        </CardTitle>
        <CardDescription>
          Revise todas as informações antes de ativar o ciclo
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Informações Básicas */}
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            Informações Básicas
          </h4>
          <div className="grid gap-2 text-sm bg-muted/50 rounded-lg p-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Colaborador:</span>
              <span className="font-medium">
                {collaborator ? collaborator.name : "Não selecionado"}
              </span>
            </div>
            {leader && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Líder:</span>
                <span>{leader.name}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Período:</span>
              <span>
                {formatBRT(parseISO(data.start_date), "dd/MM/yyyy")} -{" "}
                {formatBRT(parseISO(data.end_date), "dd/MM/yyyy")}
              </span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Avaliação de Competências */}
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Avaliação de Competências
          </h4>
          
          {/* Competências que possui */}
          {competenciasQuePossui.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Competências que possui ({competenciasQuePossui.length})
              </p>
              <div className="grid gap-2">
                {competenciasQuePossui.map((comp, index) => (
                  <div 
                    key={index} 
                    className="flex items-center justify-between bg-green-50 dark:bg-green-950/20 rounded-lg p-3 border border-green-200 dark:border-green-900"
                  >
                    <span className="font-medium">{comp.competency_name}</span>
                    <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                      {competencyTypeLabels[comp.competency_type] || comp.competency_type}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Gaps identificados */}
          {gaps.length > 0 && (
            <div className="space-y-2 mt-4">
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                Gaps identificados ({gaps.length})
              </p>
              <div className="grid gap-2">
                {gaps.map((gap, index) => (
                  <div 
                    key={index} 
                    className="flex items-center justify-between bg-amber-50 dark:bg-amber-950/20 rounded-lg p-3 border border-amber-200 dark:border-amber-900"
                  >
                    <div>
                      <span className="font-medium">{gap.competency_name}</span>
                      {gap.development_deadline && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Prazo: {formatBRT(parseISO(gap.development_deadline), "dd/MM/yyyy")}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300">
                      {competencyTypeLabels[gap.competency_type] || gap.competency_type}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.competencyAssessments.length === 0 && (
            <p className="text-sm text-muted-foreground italic">
              Nenhuma competência avaliada
            </p>
          )}
        </div>

        <Separator />

        {/* Plano de Desenvolvimento (PDI) - Apenas para gaps */}
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Plano de Desenvolvimento (PDI) - {totalActions} ação(ões)
          </h4>
          
          {gaps.length > 0 ? (
            <div className="space-y-4">
              {gaps.map((gap, gapIndex) => (
                <div key={gapIndex} className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-primary">{gap.competency_name}</p>
                    {gap.development_deadline && (
                      <Badge variant="outline" className="text-xs">
                        <Calendar className="h-3 w-3 mr-1" />
                        {formatBRT(parseISO(gap.development_deadline), "dd/MM/yyyy")}
                      </Badge>
                    )}
                  </div>

                  {/* Indicadores de sucesso */}
                  {gap.success_indicators.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Indicadores de sucesso:</p>
                      <div className="flex flex-wrap gap-1">
                        {gap.success_indicators.map((indicator, iIndex) => (
                          <Badge key={iIndex} variant="secondary" className="text-xs">
                            {indicator}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Ações */}
                  {gap.actions.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">Ações (70-20-10):</p>
                      {gap.actions.map((action, actionIndex) => {
                        const config = actionTypeConfig[action.action_type];
                        const Icon = config.icon;
                        return (
                          <div key={actionIndex} className="flex items-start gap-2 bg-background rounded p-2 border">
                            <Icon className={`h-4 w-4 mt-0.5 ${config.color}`} />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {config.label}
                                </Badge>
                                {action.due_date && (
                                  <span className="text-xs text-muted-foreground">
                                    até {formatBRT(parseISO(action.due_date), "dd/MM")}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm mt-1">{action.description}</p>
                              {action.responsible && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Responsável: {action.responsible}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {gap.actions.length === 0 && (
                    <p className="text-sm text-muted-foreground italic">
                      Nenhuma ação definida para este gap
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic bg-muted/50 rounded-lg p-4">
              Nenhum gap identificado - colaborador possui todas as competências avaliadas! 🎉
            </p>
          )}
        </div>

        {/* Resumo */}
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
          <h4 className="font-medium text-primary mb-3">📊 Resumo do Ciclo</h4>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-primary">{data.competencyAssessments.length}</p>
              <p className="text-xs text-muted-foreground">Competências</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{competenciasQuePossui.length}</p>
              <p className="text-xs text-muted-foreground">Possui</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600">{gaps.length}</p>
              <p className="text-xs text-muted-foreground">Gaps</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">{totalActions}</p>
              <p className="text-xs text-muted-foreground">Ações PDI</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
