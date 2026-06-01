import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { Loader2, FileText, Star, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ProgressRing } from '@/components/roip/ProgressRing';
import { RadarChart } from '@/components/roip/RadarChart';
import { AIAnalysisCard } from '@/components/roip/AIAnalysisCard';
import { useOrganization } from '@/contexts/OrganizationContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatBRT } from "@/lib/datetime";

interface AssessmentRecord {
  id: string;
  created_at: string;
  completed: boolean;
  is_default: boolean;
  roip_results: {
    overall_score: number;
    pillar_scores: any;
    ai_analysis: any;
  } | null;
}

interface SelectedAssessment {
  id: string;
  date: string;
  overallScore: number;
  pillarScores: any;
  aiAnalysis: any;
  classification: ClassificationData;
}

interface ClassificationData {
  badge: string;
  icon: string;
  label: string;
}

const getClassificationColor = (score: number): ClassificationData => {
  if (score >= 70) return {
    badge: 'bg-green-100 border-green-300 text-green-700',
    icon: '🟢',
    label: 'VERDE - Satisfatório'
  };
  if (score >= 50) return {
    badge: 'bg-yellow-100 border-yellow-300 text-yellow-700',
    icon: '🟡',
    label: 'AMARELO - Em Desenvolvimento'
  };
  return {
    badge: 'bg-red-100 border-red-300 text-red-700',
    icon: '🔴',
    label: 'VERMELHO - Crítico'
  };
};

export default function AssessmentHistory() {
  const navigate = useNavigate();
  const { currentAccount } = useOrganization();
  const [loading, setLoading] = useState(true);
  const [assessments, setAssessments] = useState<AssessmentRecord[]>([]);
  const [selectedAssessment, setSelectedAssessment] = useState<SelectedAssessment | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [assessmentToDelete, setAssessmentToDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchAssessmentHistory();
  }, [currentAccount?.id]);

  const fetchAssessmentHistory = async () => {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Não autenticado');
        navigate('/auth');
        return;
      }

      let query = supabase
        .from('roip_assessments')
        .select(`
          id,
          created_at,
          completed,
          is_default,
          roip_results (
            overall_score,
            pillar_scores,
            ai_analysis
          )
        `)
        .eq('completed', true)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      query = currentAccount?.id
        ? query.eq('account_id', currentAccount.id)
        : query.eq('user_id', user.id);

      const { data, error } = await query;

      if (error) throw error;

      setAssessments(data || []);
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
      toast.error('Erro ao carregar histórico de assessments');
    } finally {
      setLoading(false);
    }
  };

  const openDetailsModal = (assessment: AssessmentRecord) => {
    const result = assessment.roip_results;
    if (!result) return;

    setSelectedAssessment({
      id: assessment.id,
      date: formatBRT(new Date(assessment.created_at), "dd/MM/yyyy 'às' HH:mm"),
      overallScore: result.overall_score,
      pillarScores: result.pillar_scores,
      aiAnalysis: result.ai_analysis,
      classification: getClassificationColor(result.overall_score),
    });

    setDialogOpen(true);
  };

  const handleSetDefault = async (assessmentId: string) => {
    try {
      const { error } = await supabase
        .from('roip_assessments')
        .update({ is_default: true })
        .eq('id', assessmentId);

      if (error) throw error;

      toast.success('Assessment definido como padrão para análises de IA');
      fetchAssessmentHistory();
    } catch (error) {
      console.error('Erro ao definir padrão:', error);
      toast.error('Erro ao definir assessment como padrão');
    }
  };

  const handleRemoveDefault = async (assessmentId: string) => {
    try {
      const { error } = await supabase
        .from('roip_assessments')
        .update({ is_default: false })
        .eq('id', assessmentId);

      if (error) throw error;

      toast.success('Assessment removido como padrão');
      fetchAssessmentHistory();
    } catch (error) {
      console.error('Erro ao remover padrão:', error);
      toast.error('Erro ao remover assessment como padrão');
    }
  };

  const confirmDelete = (assessmentId: string) => {
    setAssessmentToDelete(assessmentId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteAssessment = async () => {
    if (!assessmentToDelete) return;

    try {
      // Buscar roip_results associado
      const { data: resultsData } = await supabase
        .from('roip_results')
        .select('id')
        .eq('roip_assessment_id', assessmentToDelete)
        .single();

      // Excluir na ordem: answers -> results -> assessment
      if (resultsData) {
        await supabase
          .from('roip_answers')
          .delete()
          .eq('roip_assessment_id', assessmentToDelete);

        await supabase
          .from('roip_results')
          .delete()
          .eq('roip_assessment_id', assessmentToDelete);
      }

      const { error } = await supabase
        .from('roip_assessments')
        .delete()
        .eq('id', assessmentToDelete);

      if (error) throw error;

      toast.success('Assessment excluído com sucesso');
      setDeleteDialogOpen(false);
      setAssessmentToDelete(null);
      fetchAssessmentHistory();
    } catch (error) {
      console.error('Erro ao excluir assessment:', error);
      toast.error('Erro ao excluir assessment');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (assessments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-4">
        <FileText className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-2xl font-bold text-foreground">Nenhum assessment realizado ainda</h2>
        <p className="text-muted-foreground text-center">
          Comece agora a avaliar a maturidade organizacional da sua empresa
        </p>
        <Button onClick={() => navigate('/app/assessment/roip')}>
          Fazer Primeiro Assessment
        </Button>
      </div>
    );
  }

  const defaultAssessment = assessments.find(a => a.is_default);
  const otherAssessments = assessments.filter(a => !a.is_default);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Histórico de Assessments</h1>
          <p className="text-muted-foreground">
            Visualize e gerencie seus assessments ROIP realizados
          </p>
        </div>

        {/* Assessment Padrão */}
        {defaultAssessment && (
          <Card className="border-primary/50 bg-primary/5">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-primary fill-primary" />
                <CardTitle className="text-lg">Assessment Padrão</CardTitle>
              </div>
              <p className="text-sm text-muted-foreground">Usado nas análises de IA</p>
            </CardHeader>
            <CardContent>
              {(() => {
                const result = defaultAssessment.roip_results;
                if (!result) return null;

                const classification = getClassificationColor(result.overall_score);
                const formattedDate = formatBRT(new Date(defaultAssessment.created_at), "dd/MM/yyyy 'às' HH:mm");

                return (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      📅 Realizado em: {formattedDate}
                    </p>
                    <div className="flex flex-wrap items-center gap-4">
                      <Badge className={classification.badge}>
                        Score Geral: {Math.round(result.overall_score)}%
                      </Badge>
                      <span className="text-sm">
                        {classification.icon} {classification.label}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => openDetailsModal(defaultAssessment)}
                      >
                        Ver Detalhes
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleRemoveDefault(defaultAssessment.id)}
                      >
                        <Star className="h-4 w-4 mr-1" />
                        Remover Padrão
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => confirmDelete(defaultAssessment.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Excluir
                      </Button>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        )}

        {/* Outros Assessments */}
        {otherAssessments.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">
              {defaultAssessment ? 'Outros Assessments' : 'Todos os Assessments'}
            </h2>
            {otherAssessments.map((assessment) => {
              const result = assessment.roip_results;
              if (!result) return null;

              const classification = getClassificationColor(result.overall_score);
              const formattedDate = formatBRT(new Date(assessment.created_at), "dd/MM/yyyy 'às' HH:mm");

              return (
                <Card key={assessment.id}>
                  <CardContent className="pt-6 space-y-4">
                    <p className="text-sm text-muted-foreground">
                      📅 Realizado em: {formattedDate}
                    </p>
                    <div className="flex flex-wrap items-center gap-4">
                      <Badge className={classification.badge}>
                        Score Geral: {Math.round(result.overall_score)}%
                      </Badge>
                      <span className="text-sm">
                        {classification.icon} {classification.label}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => openDetailsModal(assessment)}
                      >
                        Ver Detalhes
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleSetDefault(assessment.id)}
                      >
                        <Star className="h-4 w-4 mr-1" />
                        Definir como Padrão
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => confirmDelete(assessment.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Excluir
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Alert Dialog para Confirmação de Exclusão */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este assessment? Esta ação não pode ser desfeita.
                Todos os dados, incluindo respostas e resultados, serão permanentemente removidos.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setAssessmentToDelete(null)}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteAssessment} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Excluir Definitivamente
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Dialog de Detalhes */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Detalhes do Assessment</DialogTitle>
            </DialogHeader>
            {selectedAssessment && (
              <ScrollArea className="max-h-[70vh] pr-4">
                <div className="space-y-6">
                  {/* Header com Data e Score */}
                  <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b">
                    <span className="text-muted-foreground">
                      📅 {selectedAssessment.date}
                    </span>
                    <Badge className={selectedAssessment.classification.badge}>
                      {selectedAssessment.classification.icon} {selectedAssessment.classification.label}
                    </Badge>
                  </div>

                  {/* Overall Score */}
                  <div className="flex justify-center py-4">
                    <ProgressRing value={selectedAssessment.overallScore} />
                  </div>

                  {/* Scores por Pilar */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-foreground">Scores por Pilar</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedAssessment.pillarScores?.map((pillar: any, index: number) => {
                        const pillarClassification = getClassificationColor(pillar.score);
                        return (
                          <div key={index} className="p-4 rounded-lg bg-muted/50">
                            <div className="flex justify-between items-center">
                              <span className="font-medium text-foreground">{pillar.name}</span>
                              <div className="flex items-center gap-2">
                                <Badge className={pillarClassification.badge}>
                                  {Math.round(pillar.score)}%
                                </Badge>
                                <span className="text-sm">
                                  {pillarClassification.icon}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Radar Chart */}
                  {selectedAssessment.pillarScores && (
                    <div className="space-y-4">
                      <h3 className="font-semibold text-foreground">Visualização Gráfica</h3>
                      <RadarChart pillarScores={selectedAssessment.pillarScores} />
                    </div>
                  )}

                  {/* Análise IA */}
                  {selectedAssessment.aiAnalysis && (
                    <div className="space-y-4">
                      <h3 className="font-semibold text-foreground">Análise Personalizada</h3>
                      <AIAnalysisCard analysisData={selectedAssessment.aiAnalysis} />
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
