import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Lightbulb, Sparkles } from 'lucide-react';
import type { UniqueAbilityAIAnalysis } from '@/types/unique-ability.types';
import { StatisticsCards } from './StatisticsCards';
import { TimeVillainsSection } from './TimeVillainsSection';
import { FocusAreasSection } from './FocusAreasSection';
import { ActionPlanSection } from './ActionPlanSection';
import { TrafficLightLegend } from './TrafficLightLegend';

interface AIAnalysisViewProps {
  analysis: UniqueAbilityAIAnalysis;
  onBack: () => void;
}

export function AIAnalysisView({ analysis, onBack }: AIAnalysisViewProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para Tabela
        </Button>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Análise de IA
        </h2>
      </div>

      {/* Statistics Cards */}
      <StatisticsCards statistics={analysis.statistics} />

      {/* Executive Summary */}
      <Card className="bg-muted/30 border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Resumo Executivo</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{analysis.summary}</p>
        </CardContent>
      </Card>

      {/* Traffic Light Legend - moved here after Executive Summary */}
      <TrafficLightLegend />

      {/* Two column layout for Villains and Focus */}
      <div className="grid md:grid-cols-2 gap-6">
        <TimeVillainsSection villains={analysis.timeVillains} />
        <FocusAreasSection focusAreas={analysis.focusAreas} />
      </div>

      {/* Action Plan */}
      <ActionPlanSection actionPlan={analysis.actionPlan} />

      {/* Insights */}
      {analysis.insights && analysis.insights.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {analysis.insights.map((insight, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="text-primary mt-0.5">💡</span>
                  {insight}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
