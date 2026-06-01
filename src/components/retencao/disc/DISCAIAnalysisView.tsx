import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, RefreshCw, AlertCircle } from "lucide-react";
import { DISCAIAnalysisResult } from "@/hooks/useDISCAIAnalysis";
import { DISCAnalysisLevelSelector } from "./DISCAnalysisLevelSelector";
import { DISCAnalysisLevel } from "@/types/disc.types";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

interface DISCAIAnalysisViewProps {
  analysis: DISCAIAnalysisResult | null;
  isLoading: boolean;
  error: string | null;
  selectedLevel: DISCAnalysisLevel;
  onLevelChange: (level: DISCAnalysisLevel) => void;
  onGenerate: () => void;
  onRegenerate: () => void;
}

interface AnalysisSectionProps {
  title: string;
  emoji: string;
  content: string;
}

function AnalysisSection({ title, emoji, content }: AnalysisSectionProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <span>{emoji}</span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="prose prose-sm max-w-none dark:prose-invert">
        <ReactMarkdown>{content}</ReactMarkdown>
      </CardContent>
    </Card>
  );
}

interface DevelopmentPlanSectionProps {
  developmentPlan: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
}

function DevelopmentPlanSection({ developmentPlan }: DevelopmentPlanSectionProps) {
  const sections = [
    { title: 'Esta Semana', items: developmentPlan.immediate, color: 'bg-green-500' },
    { title: 'Este Mês', items: developmentPlan.shortTerm, color: 'bg-yellow-500' },
    { title: 'Próximo Trimestre', items: developmentPlan.longTerm, color: 'bg-blue-500' },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <span>📈</span>
          Plano de Desenvolvimento
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {sections.map((section) => (
            <div key={section.title} className="space-y-2">
              <div className="flex items-center gap-2">
                <div className={cn("w-3 h-3 rounded-full", section.color)} />
                <span className="font-medium text-sm">{section.title}</span>
              </div>
              <ul className="space-y-1">
                {section.items.map((item, index) => (
                  <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-muted-foreground/60">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function DISCAIAnalysisView({
  analysis,
  isLoading,
  error,
  selectedLevel,
  onLevelChange,
  onGenerate,
  onRegenerate
}: DISCAIAnalysisViewProps) {
  
  // Initial state - no analysis yet
  if (!analysis && !isLoading && !error) {
    return (
      <div className="space-y-6">
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center text-center py-8 space-y-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Análise Profunda com IA</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Nossa IA analista comportamental sênior irá gerar uma análise 
                  personalizada e profunda baseada nos scores DISC deste participante.
                </p>
              </div>
              
              <div className="w-full max-w-md">
                <DISCAnalysisLevelSelector
                  value={selectedLevel}
                  onChange={onLevelChange}
                  disabled={isLoading}
                />
              </div>
              
              <Button onClick={onGenerate} className="mt-4">
                <Sparkles className="mr-2 h-4 w-4" />
                Gerar Análise
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center text-center py-12 space-y-4">
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Analisando perfil...</h3>
                <p className="text-sm text-muted-foreground">
                  A IA está gerando uma análise profunda e personalizada.
                  <br />Isso pode levar alguns segundos.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <Card className="border-destructive/50">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center text-center py-8 space-y-4">
              <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Erro ao gerar análise</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  {error}
                </p>
              </div>
              <Button onClick={onGenerate} variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" />
                Tentar novamente
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Analysis display
  if (!analysis) return null;

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-sm">
            {analysis.profileCode}
          </Badge>
          <Badge variant="secondary" className="text-sm">
            {analysis.level === 'collaborator' ? 'Visão Colaborador' : 'Visão Líder/RH'}
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          <DISCAnalysisLevelSelector
            value={selectedLevel}
            onChange={onLevelChange}
            disabled={isLoading}
          />
          <Button variant="outline" size="sm" onClick={onRegenerate}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Regenerar
          </Button>
        </div>
      </div>

      {/* Analysis Sections */}
      <div className="grid grid-cols-1 gap-4">
        <AnalysisSection
          title="Resumo Executivo"
          emoji="📝"
          content={analysis.executiveSummary}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnalysisSection
            title="Estilo de Liderança"
            emoji="🎯"
            content={analysis.leadershipStyle}
          />
          
          <AnalysisSection
            title="Motivação e Engajamento"
            emoji="🔥"
            content={analysis.motivationEngagement}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnalysisSection
            title="Pontos de Atenção"
            emoji="⚠️"
            content={analysis.risksBlindSpots}
          />
          
          <AnalysisSection
            title="Comunicação Eficaz"
            emoji="💬"
            content={analysis.communication}
          />
        </div>

        <AnalysisSection
          title="Ambiente Ideal"
          emoji="🏠"
          content={analysis.idealEnvironment}
        />

        <DevelopmentPlanSection developmentPlan={analysis.developmentPlan} />
      </div>
    </div>
  );
}
