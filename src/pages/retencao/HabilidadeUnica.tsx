import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { RequireCompany } from '@/components/layout/RequireCompany';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Save, Zap, Sparkles, Loader2 } from 'lucide-react';
import { useUniqueAbility } from '@/hooks/useUniqueAbility';
import {
  AnalysisSelector,
  ActivitiesTable,
  VersionHistoryPanel,
  AIAnalysisView
} from '@/components/retencao/habilidade-unica';
import { PageGamificationBanner } from '@/components/gamification';

export default function HabilidadeUnica() {
  const navigate = useNavigate();
  const [historyOpen, setHistoryOpen] = useState(false);

  const {
    analyses,
    selectedAnalysis,
    setSelectedAnalysis,
    activities,
    versionHistory,
    loading,
    canAccess,
    createAnalysis,
    updateAnalysis,
    deleteAnalysis,
    addActivity,
    updateActivity,
    deleteActivity,
    saveVersionSnapshot,
    restoreVersion,
    aiAnalysis,
    analyzing,
    analyzeWithAI,
    clearAIAnalysis
  } = useUniqueAbility();

  useEffect(() => {
    if (!loading && !canAccess) {
      navigate('/');
    }
  }, [loading, canAccess, navigate]);

  // Check if we can analyze (has scored activities)
  const scoredActivities = activities.filter(a => 
    a.skill_score !== null && a.value_score !== null
  );
  const canAnalyze = scoredActivities.length > 0;
  
  // Debug logs
  console.log('=== HabilidadeUnica Debug ===');
  console.log('activities:', activities);
  console.log('scoredActivities:', scoredActivities);
  console.log('canAnalyze:', canAnalyze);
  console.log('analyzing:', analyzing);
  console.log('selectedAnalysis:', selectedAnalysis);

  if (loading || !canAccess) {
    return (
      <RequireCompany>
        <AppLayout 
          title="Habilidade Única" 
          breadcrumb={[
            { label: "Home", href: "/" },
            { label: "Retenção", href: "/retencao/analisador-pessoas" },
            { label: "Habilidade Única" }
          ]}
        >
          <div className="space-y-4">
            <Skeleton className="h-10 w-[300px]" />
            <Skeleton className="h-[400px] w-full" />
          </div>
        </AppLayout>
      </RequireCompany>
    );
  }

  // If AI analysis is available, show the analysis view
  if (aiAnalysis) {
    return (
      <RequireCompany>
        <AppLayout
          title="Habilidade Única"
          breadcrumb={[
            { label: "Home", href: "/" },
            { label: "Retenção", href: "/retencao/analisador-pessoas" },
            { label: "Habilidade Única" }
          ]}
        >
          <AIAnalysisView 
            analysis={aiAnalysis} 
            onBack={clearAIAnalysis} 
          />
        </AppLayout>
      </RequireCompany>
    );
  }

  return (
    <RequireCompany>
      <AppLayout
        title="Habilidade Única"
        breadcrumb={[
          { label: "Home", href: "/" },
          { label: "Retenção", href: "/retencao/analisador-pessoas" },
          { label: "Habilidade Única" }
        ]}
      >
        <div className="space-y-6">
          <PageGamificationBanner journeyId="retencao" stepId="habilidade_unica" />
          
          {/* Intro Card */}
          <Card className="bg-muted/30 border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Orientação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                O objetivo desta ferramenta é dar foco nas atividades que geram alto valor para você ou para os membros-chave do seu time, 
                além de te dar clareza do <strong>VILÃO</strong> que está roubando o seu tempo.
              </p>
              <p className="text-muted-foreground mt-2">
                Liste todas as atividades que você vem executando no seu dia a dia ou preencham durante 1 semana, 
                com todas as atividades realizadas, e atribua uma nota de 1 a 4 para a "Habilidade" e para o "Valor" 
                que essa atividade gera para o seu negócio.
              </p>
              <p className="text-sm text-muted-foreground mt-2 italic">
                Passe o mouse acima da palavra "Habilidade" e "Valor" na tabela para entender como dar a nota.
              </p>
            </CardContent>
          </Card>

          {/* Selector and Actions */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <AnalysisSelector
              analyses={analyses}
              selectedAnalysis={selectedAnalysis}
              onSelect={setSelectedAnalysis}
              onCreate={createAnalysis}
              onUpdate={updateAnalysis}
              onDelete={deleteAnalysis}
            />

            {selectedAnalysis && (
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => saveVersionSnapshot('manual')}
                  disabled={activities.length === 0}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Versão
                </Button>
                <VersionHistoryPanel
                  versions={versionHistory}
                  onRestore={restoreVersion}
                  open={historyOpen}
                  onOpenChange={setHistoryOpen}
                />
                <Button
                  onClick={analyzeWithAI}
                  disabled={!canAnalyze || analyzing}
                  className="bg-primary"
                >
                  {analyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analisando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Analisar com IA
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Main Content */}
          {selectedAnalysis ? (
            <ActivitiesTable
              activities={activities}
              onAddActivity={addActivity}
              onUpdateActivity={updateActivity}
              onDeleteActivity={deleteActivity}
            />
          ) : (
            <Card className="py-12">
              <CardContent className="text-center">
                <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <CardTitle className="mb-2">Nenhuma análise selecionada</CardTitle>
                <CardDescription>
                  Selecione uma análise existente ou crie uma nova para começar.
                </CardDescription>
              </CardContent>
            </Card>
          )}
        </div>
      </AppLayout>
    </RequireCompany>
  );
}
