import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAssessmentStore } from '@/store/assessmentStore';
import { useROIPPersistence } from '@/hooks/useROIPPersistence';
import { useJourneyProgress } from '@/hooks/useJourneyProgress';
import { useBadges } from '@/hooks/useBadges';
import { ProgressRing } from '@/components/roip/ProgressRing';
import { RadarChart } from '@/components/roip/RadarChart';
import { ComparisonTable } from '@/components/roip/ComparisonTable';
import { AIAnalysisCard } from '@/components/roip/AIAnalysisCard';
import { Download, Sparkles, RefreshCw, Loader2, Building, Target, Users, BarChart3, ArrowUp, ArrowDown, History } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { supabase } from '@/integrations/supabase/client';

interface ResultsPageProps {
  onBack: () => void;
  onRestart: () => void;
}

export const ResultsPage = ({ onBack, onRestart }: ResultsPageProps) => {
  const navigate = useNavigate();
  const { overallScore, pillarScores, analysisData, setAIAnalysis, answers, roipAssessmentId, setAnswer, calculateScores } = useAssessmentStore();
  const [isGeneratingAnalysis, setIsGeneratingAnalysis] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [isLinkingSimulation, setIsLinkingSimulation] = useState(false);
  const { saveResults, linkAssessmentToSimulation } = useROIPPersistence();
  const { completeStep, refetch: refetchJourney } = useJourneyProgress();
  const { grantBadge, hasBadge } = useBadges();
  const hasSaved = useRef(false);
  const hasBadgesGranted = useRef(false);
  const hasLinkedSimulation = useRef(false);

  // Save results when assessment is completed
  useEffect(() => {
    const saveResults_ = async () => {
      if (!roipAssessmentId || hasSaved.current) return;

      console.log('[ResultsPage] Attempting to save results:', {
        assessmentId: roipAssessmentId,
        overallScore,
        answersCount: Array.isArray(answers) ? answers.length : 0,
        pillarScores: pillarScores.map(p => ({ name: p.name, score: p.score })),
      });

      try {
        const answersArray = Array.isArray(answers) ? answers : [];
        if (overallScore > 0 && pillarScores.length === 4 && answersArray.length === 20) {
          await saveResults(roipAssessmentId);
          hasSaved.current = true;
          
          await completeStep('diagnostico', 'assessment_roip');
          await refetchJourney();
          
          toast.success('Assessment salvo com sucesso!');
          console.log('[ResultsPage] ✓ Results saved and step marked as complete');
        } else {
          console.warn('[ResultsPage] Cannot save - invalid data:', {
            overallScore,
            pillarScoresLength: pillarScores.length,
            answersLength: answersArray.length,
          });
        }
      } catch (error) {
        console.error('[ResultsPage] Failed to save results:', error);
      }
    };

    saveResults_();
  }, [roipAssessmentId, overallScore, pillarScores, answers, saveResults, completeStep, refetchJourney]);

  // Grant badges retroactively - separate from save logic
  useEffect(() => {
    const grantBadgesRetroactively = async () => {
      if (!roipAssessmentId || hasBadgesGranted.current || overallScore <= 0) return;
      
      hasBadgesGranted.current = true;
      console.log('[ResultsPage] Checking badges retroactively...');

      try {
        // Grant ROIP Concluído badge
        const { data: completeBadge } = await supabase
          .from('badges')
          .select('id')
          .eq('name', 'ROIP Concluído')
          .maybeSingle();
        
        if (completeBadge && !hasBadge(completeBadge.id)) {
          await grantBadge(completeBadge.id);
          console.log('[ResultsPage] Granted ROIP Concluído badge (retroactive)');
        }
        
        // Grant score-based badge
        if (overallScore >= 80) {
          const { data: highScoreBadge } = await supabase
            .from('badges')
            .select('id')
            .eq('name', 'Alto Investidor em Pessoas')
            .maybeSingle();
          
          if (highScoreBadge && !hasBadge(highScoreBadge.id)) {
            await grantBadge(highScoreBadge.id);
            console.log('[ResultsPage] Granted Alto Investidor badge');
          }
        } else if (overallScore >= 60) {
          const { data: mediumScoreBadge } = await supabase
            .from('badges')
            .select('id')
            .eq('name', 'Investidor em Pessoas')
            .maybeSingle();
          
          if (mediumScoreBadge && !hasBadge(mediumScoreBadge.id)) {
            await grantBadge(mediumScoreBadge.id);
            console.log('[ResultsPage] Granted Investidor badge');
          }
        }
      } catch (error) {
        console.error('[ResultsPage] Failed to grant badges:', error);
      }
    };

    grantBadgesRetroactively();
  }, [roipAssessmentId, overallScore, grantBadge, hasBadge]);

  // Reset flags on unmount
  useEffect(() => {
    return () => {
      hasSaved.current = false;
      hasBadgesGranted.current = false;
      hasLinkedSimulation.current = false;
    };
  }, []);

  // Link assessment to simulation and regenerate analysis if needed
  useEffect(() => {
    const linkAndRegenerate = async () => {
      if (!roipAssessmentId || hasLinkedSimulation.current || isGeneratingAnalysis) return;
      
      hasLinkedSimulation.current = true;
      setIsLinkingSimulation(true);
      
      try {
        console.log('[ResultsPage] Checking simulation link...');
        const wasLinked = await linkAssessmentToSimulation(roipAssessmentId);
        
        if (wasLinked) {
          console.log('[ResultsPage] Simulation linked, regenerating analysis with real data...');
          toast.info('Conectando dados da Calculadora ROIP...');
          
          // Auto-regenerate analysis to pull real calculator data
          const { data, error } = await supabase.functions.invoke('generate-roip-analysis', {
            body: { roip_assessment_id: roipAssessmentId },
          });

          if (!error && data?.analysis) {
            setAIAnalysis(data.analysis);
            toast.success('Análise atualizada com dados reais da Calculadora!');
            console.log('[ResultsPage] ✓ Analysis regenerated with real calculator data');
          }
        }
      } catch (error) {
        console.error('[ResultsPage] Error linking simulation:', error);
      } finally {
        setIsLinkingSimulation(false);
      }
    };

    // Only run if we don't have analysis data yet (first load)
    if (!analysisData) {
      linkAndRegenerate();
    }
  }, [roipAssessmentId, analysisData, linkAssessmentToSimulation, setAIAnalysis, isGeneratingAnalysis]);

  // Recovery mechanism: reload from database
  const handleRecoverData = async () => {
    if (!roipAssessmentId) {
      toast.error('ID da avaliação não encontrado.');
      return;
    }

    setIsRecovering(true);
    try {
      console.log('[ResultsPage] Recovering data from database...');

      // Fetch answers from database
      const { data: savedAnswers, error: answersError } = await supabase
        .from('roip_answers')
        .select('question_id, answer_value')
        .eq('roip_assessment_id', roipAssessmentId)
        .order('question_id');

      if (answersError) throw answersError;

      if (!savedAnswers || savedAnswers.length === 0) {
        toast.error('Nenhum dado encontrado no banco de dados.');
        return;
      }

      console.log('[ResultsPage] Found', savedAnswers.length, 'answers in database');

      // Load answers back into store
      savedAnswers.forEach(answer => {
        setAnswer(answer.question_id, answer.answer_value);
      });

      // Recalculate scores
      calculateScores();

      console.log('[ResultsPage] ✓ Data recovered and scores recalculated');

      toast.success(`${savedAnswers.length} respostas carregadas do banco de dados.`);

      // Try to save results again
      const { overallScore: newOverallScore } = useAssessmentStore.getState();
      if (newOverallScore > 0) {
        await saveResults(roipAssessmentId);
        hasSaved.current = true;
      }
    } catch (error) {
      console.error('[ResultsPage] Recovery failed:', error);
      toast.error('Não foi possível recuperar os dados do banco.');
    } finally {
      setIsRecovering(false);
    }
  };

  // Classification based on overall score
  const getClassification = (score: number) => {
    if (score < 60) return { label: 'CRÍTICO', color: 'text-red-600', bg: 'bg-red-50' };
    if (score < 80) return { label: 'EM DESENVOLVIMENTO', color: 'text-yellow-600', bg: 'bg-yellow-50' };
    return { label: 'MADURO', color: 'text-green-600', bg: 'bg-green-50' };
  };

  const classification = getClassification(overallScore);

  // Helper functions for pillar cards
  const getScoreBackground = (score: number): string => {
    if (score >= 80) return 'bg-green-100 border-green-300 text-green-700';
    if (score >= 60) return 'bg-blue-100 border-blue-300 text-blue-700';
    if (score >= 40) return 'bg-yellow-100 border-yellow-300 text-yellow-700';
    return 'bg-red-100 border-red-300 text-red-700';
  };

  const getProgressColor = (score: number): string => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-blue-500';
    if (score >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getPillarIcon = (pillarName: string) => {
    switch (pillarName) {
      case 'Cultura Organizacional': return Building;
      case 'Atração': return Target;
      case 'Retenção': return Users;
      case 'Resultados': return BarChart3;
      default: return BarChart3;
    }
  };

  const getMaturityLevel = (score: number): string => {
    if (score >= 80) return 'Nível 5: É um ponto muito forte';
    if (score >= 60) return 'Nível 4: É satisfatório';
    if (score >= 40) return 'Nível 3: Está rodando mas não é satisfatório';
    if (score >= 20) return 'Nível 2: Tentamos implementar, mas não está rodando';
    return 'Nível 1: Não existe';
  };

  // ATUALIZADO: Usa Edge Function ao invés de webhook
  const handleGenerateAnalysis = async () => {
    if (!roipAssessmentId) {
      toast.error('ID da avaliação não encontrado. Salve o assessment primeiro.');
      return;
    }

    setIsGeneratingAnalysis(true);
    try {
      console.log('[ResultsPage] Generating AI analysis for assessment:', roipAssessmentId);

      const { data, error } = await supabase.functions.invoke('generate-roip-analysis', {
        body: { roip_assessment_id: roipAssessmentId },
      });

      if (error) {
        console.error('[ResultsPage] Edge function error:', error);

        // Handle specific error cases
        if (error.message?.includes('429') || error.message?.includes('rate limit')) {
          toast.error('Limite de requisições atingido. Aguarde alguns minutos e tente novamente.');
          return;
        }
        if (error.message?.includes('402') || error.message?.includes('Payment')) {
          toast.error('Créditos insuficientes. Entre em contato com o suporte.');
          return;
        }

        throw new Error(error.message || 'Erro ao gerar análise');
      }

      if (!data || !data.analysis) {
        throw new Error('Resposta inválida da análise IA');
      }

      console.log('[ResultsPage] AI analysis generated successfully:', data);

      // Update store with the generated analysis
      setAIAnalysis(data.analysis);
      toast.success('Análise com IA gerada com sucesso!');

    } catch (error) {
      console.error('[ResultsPage] Error generating analysis:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error(`Erro ao gerar análise: ${errorMessage}`);
    } finally {
      setIsGeneratingAnalysis(false);
    }
  };

  const handleExportPDF = async () => {
    setIsExportingPDF(true);
    try {
      const element = document.getElementById('results-content');
      if (!element) throw new Error('Elemento não encontrado');

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Assessment_ROIP_${Date.now()}.pdf`);

      toast.success('PDF exportado com sucesso!');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Erro ao exportar PDF. Tente novamente.');
    } finally {
      setIsExportingPDF(false);
    }
  };

  return (
    <div className="py-4">
      <div className="space-y-8">
        {/* Header Actions */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h1 className="text-3xl font-bold text-foreground">Resultados do Assessment</h1>
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={handleGenerateAnalysis} 
              disabled={isGeneratingAnalysis}
              variant={analysisData ? "outline" : "default"}
            >
              {isGeneratingAnalysis ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Gerando...
                </>
              ) : analysisData ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refazer Análise IA
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Gerar Análise com IA
                </>
              )}
            </Button>
            <Button variant="outline" onClick={handleExportPDF} disabled={isExportingPDF}>
              {isExportingPDF ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Exportando...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar PDF
                </>
              )}
            </Button>
            <Button variant="outline" onClick={handleRecoverData} disabled={isRecovering}>
              {isRecovering ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Recuperando...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Recuperar Dados
                </>
              )}
            </Button>
            <Button variant="secondary" onClick={onRestart}>
              Refazer Assessment
            </Button>
            <Button 
              onClick={() => navigate('/app/assessment/roip/history')} 
              variant="outline"
              className="border-primary/50"
            >
              <History className="h-4 w-4 mr-2" />
              Ver Histórico
            </Button>
          </div>
        </div>

        {/* Results Content */}
        <div id="results-content" className="space-y-8">
          {/* Overall Score */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-center">Score Geral</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center space-y-4">
                <ProgressRing value={overallScore} />
                <Badge className={`${classification.bg} ${classification.color} text-lg px-4 py-2`}>
                  {classification.label}
                </Badge>
                <p className="text-center text-muted-foreground max-w-lg">
                  Sua organização obteve {overallScore}% de maturidade em gestão de pessoas. 
                  {overallScore >= 80 && ' Parabéns! Sua empresa demonstra práticas maduras de gestão de pessoas.'}
                  {overallScore >= 60 && overallScore < 80 && ' Há oportunidades claras de melhoria em alguns pilares.'}
                  {overallScore < 60 && ' Recomendamos atenção prioritária aos pontos críticos identificados.'}
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Radar Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Análise por Pilares</CardTitle>
              </CardHeader>
              <CardContent className="flex justify-center">
                <RadarChart pillarScores={pillarScores} />
              </CardContent>
            </Card>
          </motion.div>

          {/* Comparison Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <ComparisonTable pillarScores={pillarScores} />
          </motion.div>

          {/* Note: Pillar Detail Cards removed to avoid duplication with AIAnalysisCard's "Diagnóstico por Pilar" */}

          {/* AI Analysis */}
          {analysisData && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <AIAnalysisCard analysisData={analysisData} />
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};
