import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck, Brain, Wrench, Star, CheckCircle2, XCircle } from "lucide-react";
import type { EvolutionWizardData } from "@/types/evolution.types";

interface WizardStepCompetencyAssessmentProps {
  data: EvolutionWizardData;
  updateData: (updates: Partial<EvolutionWizardData>) => void;
}

export function WizardStepCompetencyAssessment({ data, updateData }: WizardStepCompetencyAssessmentProps) {
  const toggleCompetency = (index: number, hasCompetency: boolean) => {
    const updated = [...data.competencyAssessments];
    updated[index] = { 
      ...updated[index], 
      has_competency: hasCompetency,
      // Reset development fields if they now have the competency
      ...(hasCompetency ? { development_deadline: undefined, success_indicators: [], actions: [] } : {})
    };
    updateData({ competencyAssessments: updated });
  };

  const behavioralCompetencies = data.competencyAssessments.filter(c => c.competency_type === 'behavioral');
  const technicalRequired = data.competencyAssessments.filter(c => c.competency_type === 'technical_required');
  const technicalDesired = data.competencyAssessments.filter(c => c.competency_type === 'technical_desired');

  const totalCompetencies = data.competencyAssessments.length;
  const hasCompetencies = data.competencyAssessments.filter(c => c.has_competency).length;
  const gaps = totalCompetencies - hasCompetencies;

  const renderCompetencyGroup = (
    title: string,
    icon: React.ReactNode,
    competencies: typeof data.competencyAssessments,
    badgeVariant: "default" | "secondary" | "outline"
  ) => {
    if (competencies.length === 0) return null;

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          {icon}
          <h4 className="font-medium">{title}</h4>
          <Badge variant={badgeVariant}>{competencies.length}</Badge>
        </div>
        <div className="space-y-2">
          {competencies.map((comp) => {
            const globalIndex = data.competencyAssessments.findIndex(
              c => c.competency_name === comp.competency_name && c.competency_type === comp.competency_type
            );
            
            return (
              <div
                key={`${comp.competency_type}-${comp.competency_name}`}
                className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                  comp.has_competency 
                    ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900' 
                    : 'bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  {comp.has_competency ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-orange-600" />
                  )}
                  <span className="font-medium">{comp.competency_name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Label 
                    htmlFor={`comp-${globalIndex}`} 
                    className={`text-sm ${comp.has_competency ? 'text-green-700 dark:text-green-400' : 'text-orange-700 dark:text-orange-400'}`}
                  >
                    {comp.has_competency ? 'Possui' : 'Gap'}
                  </Label>
                  <Switch
                    id={`comp-${globalIndex}`}
                    checked={comp.has_competency}
                    onCheckedChange={(checked) => toggleCompetency(globalIndex, checked)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (data.competencyAssessments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            Avaliação de Competências
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>Selecione um Job Description na etapa anterior para carregar as competências.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-primary" />
          Avaliação de Competências
        </CardTitle>
        <CardDescription>
          Avalie se o colaborador possui cada competência do cargo. Competências não possuídas entrarão automaticamente no PDI.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary */}
        <div className="flex items-center gap-4 p-4 rounded-lg bg-muted">
          <div className="flex-1">
            <div className="text-2xl font-bold">{hasCompetencies}/{totalCompetencies}</div>
            <div className="text-sm text-muted-foreground">Competências possuídas</div>
          </div>
          <div className="flex-1">
            <div className="text-2xl font-bold text-orange-600">{gaps}</div>
            <div className="text-sm text-muted-foreground">Gaps identificados</div>
          </div>
          <div className="flex-1">
            <div className="text-2xl font-bold text-green-600">
              {totalCompetencies > 0 ? Math.round((hasCompetencies / totalCompetencies) * 100) : 0}%
            </div>
            <div className="text-sm text-muted-foreground">Aderência ao cargo</div>
          </div>
        </div>

        {/* Behavioral Competencies */}
        {renderCompetencyGroup(
          "Competências Comportamentais",
          <Brain className="h-5 w-5 text-purple-600" />,
          behavioralCompetencies,
          "secondary"
        )}

        {/* Technical Required */}
        {renderCompetencyGroup(
          "Competências Técnicas Obrigatórias",
          <Wrench className="h-5 w-5 text-blue-600" />,
          technicalRequired,
          "default"
        )}

        {/* Technical Desired */}
        {renderCompetencyGroup(
          "Competências Técnicas Desejáveis",
          <Star className="h-5 w-5 text-amber-600" />,
          technicalDesired,
          "outline"
        )}

        {/* Tip */}
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
          <h4 className="font-medium text-primary mb-2">💡 Gap Analysis</h4>
          <p className="text-sm text-muted-foreground">
            Competências marcadas como "Gap" serão automaticamente incluídas no Plano de Desenvolvimento Individual (PDI). 
            Na próxima etapa, você definirá prazos e ações para cada gap identificado.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
