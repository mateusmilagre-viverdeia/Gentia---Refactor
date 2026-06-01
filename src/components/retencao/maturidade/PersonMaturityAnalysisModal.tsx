import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle2, XCircle, Target, AlertTriangle, ThumbsUp, ArrowRight, Save, History } from 'lucide-react';
import type { PersonMaturityAIAnalysis, SavedAIAnalysis } from '@/types/team-maturity.types';
import { MATURITY_CONFIG } from '@/types/team-maturity.types';

import { ScrollArea } from '@/components/ui/scroll-area';
import { formatBRT } from "@/lib/datetime";

interface PersonMaturityAnalysisModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analysis: PersonMaturityAIAnalysis | null;
  isLoading: boolean;
  onSave?: () => void;
  savedHistory?: SavedAIAnalysis[];
  onViewSaved?: (analysis: SavedAIAnalysis) => void;
}

export function PersonMaturityAnalysisModal({
  open,
  onOpenChange,
  analysis,
  isLoading,
  onSave,
  savedHistory = [],
  onViewSaved,
}: PersonMaturityAnalysisModalProps) {
  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Analisando...</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4" />
            <p className="text-sm text-muted-foreground">Gerando recomendações personalizadas...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!analysis) return null;

  const config = MATURITY_CONFIG[analysis.currentLevel];
  const nextConfig = analysis.nextLevel ? MATURITY_CONFIG[analysis.nextLevel] : null;

  const renderAnalysisContent = (analysisData: PersonMaturityAIAnalysis, configData = config, nextConfigData = nextConfig) => (
    <div className="space-y-6">
      {/* Current Level */}
      <div className="flex items-center gap-3">
        <Badge
          style={{ backgroundColor: configData.color }}
          className="text-white text-sm px-3 py-1"
        >
          {analysisData.currentLevel} - {analysisData.currentLevelLabel}
        </Badge>
        {analysisData.nextLevel && nextConfigData && (
          <>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <Badge variant="outline" className="text-sm">
              Próximo: {analysisData.nextLevel} - {nextConfigData.label}
            </Badge>
          </>
        )}
      </div>

      {/* Leadership Style */}
      <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
        <h3 className="font-semibold mb-2 flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          Estilo de Liderança Recomendado
        </h3>
        <p className="font-medium text-primary">{analysisData.leadershipStyle.recommended}</p>
        <p className="text-sm text-muted-foreground mt-1">
          {analysisData.leadershipStyle.description}
        </p>

        <div className="grid md:grid-cols-2 gap-4 mt-4">
          {/* DOs */}
          <div className="bg-green-50 dark:bg-green-950/30 p-3 rounded-lg">
            <h4 className="font-medium text-green-700 dark:text-green-400 flex items-center gap-1 mb-2">
              <CheckCircle2 className="h-4 w-4" />
              Faça
            </h4>
            <ul className="space-y-1">
              {analysisData.leadershipStyle.dos.map((item, i) => (
                <li key={i} className="text-sm text-green-600 dark:text-green-400 flex items-start gap-2">
                  <span>✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* DON'Ts */}
          <div className="bg-red-50 dark:bg-red-950/30 p-3 rounded-lg">
            <h4 className="font-medium text-red-700 dark:text-red-400 flex items-center gap-1 mb-2">
              <XCircle className="h-4 w-4" />
              Evite
            </h4>
            <ul className="space-y-1">
              {analysisData.leadershipStyle.donts.map((item, i) => (
                <li key={i} className="text-sm text-red-600 dark:text-red-400 flex items-start gap-2">
                  <span>✗</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Development Path */}
      {analysisData.developmentPath && (
        <div className="p-4 border rounded-lg">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <ArrowRight className="h-4 w-4" />
            Caminho de Desenvolvimento
          </h3>
          <p className="text-sm font-medium">{analysisData.developmentPath.goal}</p>
          <p className="text-xs text-muted-foreground mb-3">
            Prazo estimado: {analysisData.developmentPath.timeframe}
          </p>
          <ul className="space-y-1">
            {analysisData.developmentPath.actions.map((action, i) => (
              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="text-primary">{i + 1}.</span>
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Strengths & Risks */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Strengths */}
        {analysisData.strengths && analysisData.strengths.length > 0 && (
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-2 flex items-center gap-2 text-green-600">
              <ThumbsUp className="h-4 w-4" />
              Pontos Fortes
            </h3>
            <ul className="space-y-1">
              {analysisData.strengths.map((item, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span>•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Risks */}
        {analysisData.risks && analysisData.risks.length > 0 && (
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-2 flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-4 w-4" />
              Riscos de Estilo Errado
            </h3>
            <ul className="space-y-1">
              {analysisData.risks.map((item, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span>⚠️</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                style={{ backgroundColor: config.color }}
              >
                {analysis.personName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
              </div>
              <div>
                <p>{analysis.personName}</p>
                <p className="text-sm font-normal text-muted-foreground">
                  Análise Individual de Maturidade
                </p>
              </div>
            </div>
            {onSave && (
              <Button variant="outline" size="sm" onClick={onSave}>
                <Save className="h-4 w-4 mr-1" />
                Salvar
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="current" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="current">Análise Atual</TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-1">
              <History className="h-3 w-3" />
              Histórico ({savedHistory.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="current" className="flex-1 overflow-auto mt-4">
            <ScrollArea className="h-full pr-4">
              {renderAnalysisContent(analysis)}
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="history" className="flex-1 overflow-auto mt-4">
            <ScrollArea className="h-full pr-4">
              {savedHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhuma análise salva ainda</p>
                  <p className="text-xs">Clique em "Salvar" para guardar esta análise</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {savedHistory.map((saved) => {
                    const savedAnalysis = saved.analysis as PersonMaturityAIAnalysis;
                    const savedConfig = MATURITY_CONFIG[savedAnalysis.currentLevel];
                    const snapshot = saved.position_snapshot as { x_position?: number; y_position?: number };
                    return (
                      <div key={saved.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Badge style={{ backgroundColor: savedConfig.color }} className="text-white">
                              {savedAnalysis.currentLevel}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {formatBRT(new Date(saved.created_at), "dd/MM/yyyy 'às' HH:mm")}
                            </span>
                          </div>
                          {snapshot && (
                            <span className="text-xs text-muted-foreground">
                              Posição: ({Math.round(snapshot.x_position || 0)}, {Math.round(snapshot.y_position || 0)})
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          {savedAnalysis.leadershipStyle.recommended}
                        </p>
                        {onViewSaved && (
                          <Button variant="outline" size="sm" onClick={() => onViewSaved(saved)}>
                            Ver análise completa
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
