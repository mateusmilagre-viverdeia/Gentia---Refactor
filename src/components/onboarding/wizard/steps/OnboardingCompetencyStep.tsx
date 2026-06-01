import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { 
  Target, 
  CheckCircle, 
  AlertTriangle, 
  Wrench, 
  Star, 
  Heart,
  ListTodo,
  TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  OnboardingCompetencyAssessment,
  OnboardingCompetencyType,
  JobDescriptionCompetency,
  getCompetencyTypeLabel,
  getCompetencyTypeColor,
} from '@/types/onboarding-competency.types';

interface OnboardingCompetencyStepProps {
  competencies: JobDescriptionCompetency[];
  assessments: OnboardingCompetencyAssessment[];
  onAssessmentsChange: (assessments: OnboardingCompetencyAssessment[]) => void;
  jobDescriptionTitle: string;
  onBack: () => void;
  onNext: () => void;
}

export function OnboardingCompetencyStep({
  competencies,
  assessments,
  onAssessmentsChange,
  jobDescriptionTitle,
  onBack,
  onNext,
}: OnboardingCompetencyStepProps) {
  // Group competencies by type
  const groupedCompetencies = useMemo(() => {
    const grouped: Record<OnboardingCompetencyType, JobDescriptionCompetency[]> = {
      technical_required: [],
      technical_desired: [],
      behavioral: [],
    };

    competencies.forEach(comp => {
      grouped[comp.type].push(comp);
    });

    return grouped;
  }, [competencies]);

  // Find assessment for a competency
  const getAssessment = (competencyName: string, type: OnboardingCompetencyType): OnboardingCompetencyAssessment => {
    const existing = assessments.find(
      a => a.competency_name === competencyName && a.competency_type === type
    );
    if (existing) return existing;

    // Default assessment
    return {
      id: `${type}-${competencyName}`,
      competency_name: competencyName,
      competency_type: type,
      has_competency: true, // Default to "has"
      create_onboarding_task: false,
      add_to_evolution: true,
    };
  };

  // Update an assessment
  const updateAssessment = (
    competencyName: string, 
    type: OnboardingCompetencyType, 
    updates: Partial<OnboardingCompetencyAssessment>
  ) => {
    const existing = getAssessment(competencyName, type);
    const updated = { ...existing, ...updates };

    const newAssessments = assessments.filter(
      a => !(a.competency_name === competencyName && a.competency_type === type)
    );
    newAssessments.push(updated);
    onAssessmentsChange(newAssessments);
  };

  // Summary stats
  const stats = useMemo(() => {
    let hasCount = 0;
    let gapCount = 0;
    let onboardingTasks = 0;
    let evolutionItems = 0;

    competencies.forEach(comp => {
      const assessment = getAssessment(comp.name, comp.type);
      if (assessment.has_competency) {
        hasCount++;
      } else {
        gapCount++;
        if (assessment.create_onboarding_task) onboardingTasks++;
        if (assessment.add_to_evolution) evolutionItems++;
      }
    });

    return { hasCount, gapCount, onboardingTasks, evolutionItems };
  }, [competencies, assessments]);

  const getTypeIcon = (type: OnboardingCompetencyType) => {
    switch (type) {
      case 'technical_required':
        return <Wrench className="h-4 w-4" />;
      case 'technical_desired':
        return <Star className="h-4 w-4" />;
      case 'behavioral':
        return <Heart className="h-4 w-4" />;
    }
  };

  const renderCompetencyGroup = (type: OnboardingCompetencyType) => {
    const items = groupedCompetencies[type];
    if (!items.length) return null;

    return (
      <div key={type} className="space-y-3">
        <div className="flex items-center gap-2">
          {getTypeIcon(type)}
          <h4 className="font-medium">{getCompetencyTypeLabel(type)}</h4>
          <Badge variant="outline" className="ml-auto">{items.length}</Badge>
        </div>

        <div className="space-y-2">
          {items.map(comp => {
            const assessment = getAssessment(comp.name, comp.type);
            const isGap = !assessment.has_competency;

            return (
              <div
                key={`${type}-${comp.name}`}
                className={cn(
                  "p-3 rounded-lg border transition-colors",
                  isGap ? "bg-amber-50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-800" : "bg-muted/30"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{comp.name}</span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => updateAssessment(comp.name, comp.type, { has_competency: true })}
                      className={cn(
                        "flex items-center gap-1 px-2 py-1 rounded text-sm transition-colors",
                        !isGap 
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" 
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      )}
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      Possui
                    </button>
                    <button
                      type="button"
                      onClick={() => updateAssessment(comp.name, comp.type, { 
                        has_competency: false,
                        add_to_evolution: true,
                        create_onboarding_task: type === 'technical_required'
                      })}
                      className={cn(
                        "flex items-center gap-1 px-2 py-1 rounded text-sm transition-colors",
                        isGap 
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" 
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      )}
                    >
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Gap
                    </button>
                  </div>
                </div>

                {/* Gap options */}
                {isGap && (
                  <div className="pt-2 mt-2 border-t border-amber-200 dark:border-amber-800 space-y-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`task-${comp.name}`}
                        checked={assessment.create_onboarding_task}
                        onCheckedChange={(checked) => 
                          updateAssessment(comp.name, comp.type, { create_onboarding_task: !!checked })
                        }
                      />
                      <Label 
                        htmlFor={`task-${comp.name}`}
                        className="text-sm flex items-center gap-1 cursor-pointer"
                      >
                        <ListTodo className="h-3.5 w-3.5" />
                        Criar tarefa no onboarding
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`evolution-${comp.name}`}
                        checked={assessment.add_to_evolution}
                        onCheckedChange={(checked) => 
                          updateAssessment(comp.name, comp.type, { add_to_evolution: !!checked })
                        }
                      />
                      <Label 
                        htmlFor={`evolution-${comp.name}`}
                        className="text-sm flex items-center gap-1 cursor-pointer"
                      >
                        <TrendingUp className="h-3.5 w-3.5" />
                        Adicionar ao PDI (Sistema de Evolução)
                      </Label>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Avaliação de Competências
        </CardTitle>
        <CardDescription>
          Avalie se o colaborador possui cada competência do cargo <strong>{jobDescriptionTitle}</strong>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 bg-muted rounded-lg text-center">
            <p className="text-2xl font-bold">{competencies.length}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
            <p className="text-2xl font-bold text-green-600">{stats.hasCount}</p>
            <p className="text-xs text-muted-foreground">Possui</p>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-center">
            <p className="text-2xl font-bold text-amber-600">{stats.gapCount}</p>
            <p className="text-xs text-muted-foreground">Gaps</p>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.evolutionItems}</p>
            <p className="text-xs text-muted-foreground">Itens PDI</p>
          </div>
        </div>

        {/* Competency groups */}
        <div className="space-y-6">
          {renderCompetencyGroup('technical_required')}
          {renderCompetencyGroup('technical_desired')}
          {renderCompetencyGroup('behavioral')}
        </div>

        {/* Summary of actions */}
        {stats.gapCount > 0 && (
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">Resumo das Ações</h4>
            <ul className="text-sm space-y-1">
              {stats.onboardingTasks > 0 && (
                <li className="flex items-center gap-2">
                  <ListTodo className="h-4 w-4 text-muted-foreground" />
                  {stats.onboardingTasks} tarefa(s) serão criadas no onboarding
                </li>
              )}
              {stats.evolutionItems > 0 && (
                <li className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  {stats.evolutionItems} competência(s) serão adicionadas ao PDI
                </li>
              )}
            </ul>
          </div>
        )}

        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={onBack}>
            Voltar
          </Button>
          <Button onClick={onNext}>
            Próximo
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
