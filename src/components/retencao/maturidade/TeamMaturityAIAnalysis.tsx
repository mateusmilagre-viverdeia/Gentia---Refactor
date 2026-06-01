import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Users, Target, AlertTriangle, Lightbulb, Rocket, Save, History } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { TeamMaturityAIAnalysis as AnalysisType, SavedAIAnalysis } from '@/types/team-maturity.types';
import { MATURITY_CONFIG } from '@/types/team-maturity.types';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { formatBRT } from "@/lib/datetime";

interface TeamMaturityAIAnalysisProps {
  analysis: AnalysisType;
  onBack: () => void;
  onSave?: () => void;
  savedAnalyses?: SavedAIAnalysis[];
  onViewSaved?: (analysis: SavedAIAnalysis) => void;
}

export function TeamMaturityAIAnalysis({ 
  analysis, 
  onBack, 
  onSave,
  savedAnalyses = [],
  onViewSaved,
}: TeamMaturityAIAnalysisProps) {
  const levelColor = (level: string) => {
    const config = MATURITY_CONFIG[level as keyof typeof MATURITY_CONFIG];
    return config?.color || '#666';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar ao Gráfico
          </Button>
          <h2 className="text-xl font-semibold">Análise do Time</h2>
        </div>
        {onSave && (
          <Button variant="outline" size="sm" onClick={onSave}>
            <Save className="h-4 w-4 mr-1" />
            Salvar no Histórico
          </Button>
        )}
      </div>

      {/* Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-5 w-5" />
            Resumo Geral
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{analysis.summary}</p>
          <div className="mt-4 flex items-center gap-2">
            <span className="text-sm font-medium">Maturidade Média:</span>
            <Badge
              style={{ backgroundColor: levelColor(analysis.averageMaturity) }}
              className="text-white"
            >
              {analysis.averageMaturity} - {analysis.averageMaturityLabel}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Distribution */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-5 w-5" />
            Distribuição por Nível
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(['M1', 'M2', 'M3', 'M4'] as const).map((level) => {
              const config = MATURITY_CONFIG[level];
              const count = analysis.distribution[level];
              return (
                <div
                  key={level}
                  className="text-center p-4 rounded-lg border"
                  style={{ borderColor: config.color }}
                >
                  <div
                    className="text-2xl font-bold"
                    style={{ color: config.color }}
                  >
                    {count}
                  </div>
                  <div className="text-sm font-medium">{level}</div>
                  <div className="text-xs text-muted-foreground">{config.label}</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Leadership Recommendations */}
      {analysis.leadershipRecommendations && analysis.leadershipRecommendations.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Rocket className="h-5 w-5" />
              Estilo de Liderança Recomendado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {analysis.leadershipRecommendations.map((rec, i) => (
              <div key={i} className="p-3 bg-muted/50 rounded-lg">
                <p className="font-medium">{rec.style}</p>
                <p className="text-sm text-muted-foreground mt-1">{rec.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Gaps */}
      {analysis.gaps && analysis.gaps.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Gaps Identificados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {analysis.gaps.map((gap, i) => (
              <div key={i} className="p-3 border rounded-lg">
                <p className="font-medium text-amber-600">{gap.issue}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Impacto:</strong> {gap.impact}
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Recomendação:</strong> {gap.recommendation}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Action Plan */}
      {analysis.actionPlan && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Plano de Ação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {analysis.actionPlan.immediate && analysis.actionPlan.immediate.length > 0 && (
              <div>
                <h4 className="font-medium text-sm mb-2 text-red-600">🔴 Imediato (Esta Semana)</h4>
                <ul className="space-y-1">
                  {analysis.actionPlan.immediate.map((action, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span>•</span>
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {analysis.actionPlan.shortTerm && analysis.actionPlan.shortTerm.length > 0 && (
              <div>
                <h4 className="font-medium text-sm mb-2 text-amber-600">🟡 Curto Prazo (30 dias)</h4>
                <ul className="space-y-1">
                  {analysis.actionPlan.shortTerm.map((action, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span>•</span>
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {analysis.actionPlan.longTerm && analysis.actionPlan.longTerm.length > 0 && (
              <div>
                <h4 className="font-medium text-sm mb-2 text-green-600">🟢 Longo Prazo (3-6 meses)</h4>
                <ul className="space-y-1">
                  {analysis.actionPlan.longTerm.map((action, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span>•</span>
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Insights */}
      {analysis.insights && analysis.insights.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-amber-500" />
              Insights Estratégicos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {analysis.insights.map((insight, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-amber-500">💡</span>
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Saved History */}
      {savedAnalyses.length > 0 && onViewSaved && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <History className="h-5 w-5" />
              Histórico de Análises ({savedAnalyses.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {savedAnalyses.map((saved, i) => {
                const savedAnalysis = saved.analysis as AnalysisType;
                return (
                  <AccordionItem key={saved.id} value={saved.id}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3 text-sm">
                        <Badge variant="outline">
                          {savedAnalysis.averageMaturity}
                        </Badge>
                        <span>
                          {formatBRT(new Date(saved.created_at), "dd/MM/yyyy 'às' HH:mm")}
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 pt-2">
                        <p className="text-sm text-muted-foreground">{savedAnalysis.summary}</p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => onViewSaved(saved)}
                        >
                          Ver análise completa
                        </Button>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
