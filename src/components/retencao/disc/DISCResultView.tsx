import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, BarChart3, FileText, Sparkles, Briefcase, Rocket } from "lucide-react";
import { useDISCAssessment } from "@/hooks/useDISCAssessment";
import { useDISCFeedback } from "@/hooks/useDISCFeedback";
import { useDISCAIAnalysis } from "@/hooks/useDISCAIAnalysis";
import { DISCSession, DISCResult, DISC_DIMENSIONS, DISCDimension, DISCAnalysisLevel } from "@/types/disc.types";
import { DISCFeedbackSection } from "./DISCFeedbackSection";
import { DISCAIAnalysisView } from "./DISCAIAnalysisView";
import { DISCRadarChart } from "./DISCRadarChart";
import { DISCDisclaimer } from "./DISCDisclaimer";
import { DISCLeaderView } from "./DISCLeaderView";
import { CreateEvolutionFromDISC } from "./CreateEvolutionFromDISC";
import { getLeaderView } from "@/data/disc-leader-data";
import { cn } from "@/lib/utils";
import { formatBRT } from "@/lib/datetime";


interface DISCResultViewProps {
  session: DISCSession;
  onBack: () => void;
}

export function DISCResultView({ session, onBack }: DISCResultViewProps) {
  const { fetchResult } = useDISCAssessment();
  const [result, setResult] = useState<DISCResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { combinedProfile } = useDISCFeedback(result);
  
  // Evolution dialog state
  const [showEvolutionDialog, setShowEvolutionDialog] = useState(false);
  
  // AI Analysis state
  const [analysisLevel, setAnalysisLevel] = useState<DISCAnalysisLevel>('collaborator');
  const { 
    analysis, 
    isLoading: isAnalysisLoading, 
    error: analysisError, 
    generateAnalysis, 
    clearAnalysis 
  } = useDISCAIAnalysis();

  const handleGenerateAnalysis = () => {
    if (session?.id) {
      generateAnalysis(session.id, analysisLevel);
    }
  };

  const handleLevelChange = (level: DISCAnalysisLevel) => {
    setAnalysisLevel(level);
    if (analysis && level !== analysis.level) {
      generateAnalysis(session.id, level);
    }
  };

  useEffect(() => {
    const loadResult = async () => {
      setIsLoading(true);
      try {
        const data = await fetchResult(session.id);
        setResult(data);
      } catch (error) {
        console.error('Error loading result:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadResult();
  }, [session.id, fetchResult]);

  if (isLoading) {
    return (
      <AppLayout
        title="Resultado DISC"
        breadcrumb={[
          { label: "Retenção", href: "/retencao" },
          { label: "Assessment DISC", href: "/retencao/assessment-disc" },
          { label: session.participant_name }
        ]}
      >
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-muted-foreground">Carregando resultado...</div>
        </div>
      </AppLayout>
    );
  }

  if (!result) {
    return (
      <AppLayout
        title="Resultado DISC"
        breadcrumb={[
          { label: "Retenção", href: "/retencao" },
          { label: "Assessment DISC", href: "/retencao/assessment-disc" },
          { label: session.participant_name }
        ]}
      >
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <div className="text-muted-foreground">Resultado não encontrado</div>
          <Button onClick={onBack}>Voltar</Button>
        </div>
      </AppLayout>
    );
  }

  const primaryDim = DISC_DIMENSIONS[result.primary_profile];
  const secondaryDim = result.secondary_profile ? DISC_DIMENSIONS[result.secondary_profile] : null;

  const scores: { dimension: DISCDimension; normalized: number }[] = [
    { dimension: 'D', normalized: result.d_normalized },
    { dimension: 'I', normalized: result.i_normalized },
    { dimension: 'S', normalized: result.s_normalized },
    { dimension: 'C', normalized: result.c_normalized },
  ];

  const sortedScores = [...scores].sort((a, b) => b.normalized - a.normalized);

  return (
    <AppLayout
      title={`Resultado: ${session.participant_name}`}
      breadcrumb={[
        { label: "Retenção", href: "/retencao" },
        { label: "Assessment DISC", href: "/retencao/assessment-disc" },
        { label: session.participant_name }
      ]}
    >
      <div className="space-y-6">
        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para lista
          </Button>
          <Button onClick={() => setShowEvolutionDialog(true)}>
            <Rocket className="mr-2 h-4 w-4" />
            Criar PDI baseado no DISC
          </Button>
        </div>

        {/* Evolution Dialog */}
        {result && (
          <CreateEvolutionFromDISC
            open={showEvolutionDialog}
            onOpenChange={setShowEvolutionDialog}
            session={session}
            result={result}
          />
        )}

        {/* Profile Summary + Radar Chart Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Profile Summary */}
          <Card className="border-2" style={{ borderColor: getColorValue(primaryDim.bgColor) }}>
            <CardHeader>
              <div className="space-y-4">
                <div>
                  <CardDescription>Perfil Comportamental</CardDescription>
                  <CardTitle className="text-2xl flex items-center gap-3 mt-1">
                    <div className={cn("w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl", primaryDim.bgColor)}>
                      {result.primary_profile}
                    </div>
                    <span>{primaryDim.name}</span>
                    {secondaryDim && (
                      <>
                        <span className="text-muted-foreground">/</span>
                        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-white font-bold", secondaryDim.bgColor)}>
                          {result.secondary_profile}
                        </div>
                        <span className="text-lg text-muted-foreground">{secondaryDim.name}</span>
                      </>
                    )}
                  </CardTitle>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <Badge variant={
                    result.intensity === 'alta' ? 'default' :
                    result.intensity === 'média' ? 'secondary' : 'outline'
                  }>
                    Intensidade {result.intensity}
                  </Badge>
                  {result.is_balanced && (
                    <Badge variant="outline">
                      Perfil equilibrado
                    </Badge>
                  )}
                </div>

                {combinedProfile && (
                  <p className="text-sm text-muted-foreground leading-relaxed border-t pt-4">
                    {combinedProfile.summary}: {combinedProfile.behavior.slice(0, 150)}...
                  </p>
                )}
              </div>
            </CardHeader>
          </Card>

          {/* Radar Chart */}
          <DISCRadarChart result={result} />
        </div>

        {/* Tabs: Devolutiva / Líder-RH / Análise IA / Pontuação */}
        <Tabs defaultValue="feedback" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="feedback" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Devolutiva
            </TabsTrigger>
            <TabsTrigger value="leader-view" className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Líder/RH
            </TabsTrigger>
            <TabsTrigger value="ai-analysis" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Análise IA
            </TabsTrigger>
            <TabsTrigger value="scores" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Pontuação
            </TabsTrigger>
          </TabsList>

          {/* Devolutiva Tab */}
          <TabsContent value="feedback" className="mt-6">
            {combinedProfile && (
              <DISCFeedbackSection
                combinedProfile={combinedProfile}
                primaryDimension={result.primary_profile as DISCDimension}
                secondaryDimension={result.secondary_profile as DISCDimension | null}
              />
            )}
          </TabsContent>

          {/* Leader/HR View Tab */}
          <TabsContent value="leader-view" className="mt-6">
            {combinedProfile && (
              <DISCLeaderView
                leaderView={getLeaderView(
                  result.primary_profile as DISCDimension,
                  result.secondary_profile as DISCDimension | null
                )}
                primaryDimension={result.primary_profile as DISCDimension}
                secondaryDimension={result.secondary_profile as DISCDimension | null}
                profileSummary={combinedProfile.summary}
                intensity={result.intensity as 'baixa' | 'média' | 'alta'}
                normalizedScores={{
                  D: result.d_normalized,
                  I: result.i_normalized,
                  S: result.s_normalized,
                  C: result.c_normalized
                }}
              />
            )}
          </TabsContent>

          {/* AI Analysis Tab */}
          <TabsContent value="ai-analysis" className="mt-6">
            <DISCAIAnalysisView
              analysis={analysis}
              isLoading={isAnalysisLoading}
              error={analysisError}
              selectedLevel={analysisLevel}
              onLevelChange={handleLevelChange}
              onGenerate={handleGenerateAnalysis}
              onRegenerate={handleGenerateAnalysis}
            />
          </TabsContent>

          {/* Scores Tab */}
          <TabsContent value="scores" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Pontuação por Dimensão</CardTitle>
                <CardDescription>Score normalizado (0-100)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {sortedScores.map(({ dimension, normalized }) => {
                  const dimInfo = DISC_DIMENSIONS[dimension];
                  return (
                    <div key={dimension} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold", dimInfo.bgColor)}>
                            {dimension}
                          </div>
                          <span className="text-sm font-medium">{dimInfo.name}</span>
                        </div>
                        <span className="text-sm font-bold">{normalized.toFixed(1)}%</span>
                      </div>
                      <div className="h-3 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn("h-full transition-all duration-500", dimInfo.bgColor)}
                          style={{ width: `${normalized}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Detalhamento das Dimensões</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {(['D', 'I', 'S', 'C'] as const).map((dim) => {
                    const dimInfo = DISC_DIMENSIONS[dim];
                    const score = scores.find(s => s.dimension === dim)!;
                    const rawScore = dim === 'D' ? result.d_score :
                                     dim === 'I' ? result.i_score :
                                     dim === 'S' ? result.s_score : result.c_score;
                    const isPrimary = result.primary_profile === dim;
                    const isSecondary = result.secondary_profile === dim;

                    return (
                      <Card key={dim} className={cn(
                        "border-2",
                        isPrimary && "ring-2 ring-primary ring-offset-2"
                      )}>
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-white font-bold", dimInfo.bgColor)}>
                              {dim}
                            </div>
                            <div className="text-right">
                              {isPrimary && <Badge>Primário</Badge>}
                              {isSecondary && <Badge variant="secondary">Secundário</Badge>}
                            </div>
                          </div>
                          <CardTitle className="text-lg">{dimInfo.name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Score bruto</span>
                              <span className="font-medium">{rawScore}/40</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Normalizado</span>
                              <span className="font-bold">{score.normalized.toFixed(1)}%</span>
                            </div>
                            <Progress value={score.normalized} className="h-2" />
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Disclaimer */}
        <DISCDisclaimer />

        {/* Meta info */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div>
                <span>Participante: </span>
                <span className="font-medium text-foreground">{session.participant_name}</span>
                {session.participant_email && (
                  <span className="ml-2">({session.participant_email})</span>
                )}
              </div>
              <div>
                <span>Concluído em: </span>
                <span className="font-medium text-foreground">
                  {session.completed_at && formatBRT(new Date(session.completed_at), "dd/MM/yyyy 'às' HH:mm")}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

function getColorValue(bgClass: string): string {
  const colorMap: Record<string, string> = {
    'bg-red-500': '#ef4444',
    'bg-yellow-500': '#eab308',
    'bg-green-500': '#22c55e',
    'bg-blue-500': '#3b82f6',
  };
  return colorMap[bgClass] || '#6b7280';
}
