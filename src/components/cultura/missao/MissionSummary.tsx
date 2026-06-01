import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useMission } from "@/contexts/MissionContext";
import { Copy, Download, Sparkles, FileText, Home, ArrowLeft, Pencil, X, Plus, Save, Target, Focus, Globe, AlertTriangle, TrendingUp, Loader2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { RefinementChat } from "@/components/cultura/shared/RefinementChat";
import { supabase } from "@/integrations/supabase/client";
import { useJourneyProgress } from "@/hooks/useJourneyProgress";
import { useAchievementChecker } from "@/hooks/useAchievementChecker";
import { useCulturePulseAutoSync } from '@/hooks/useCulturePulseAutoSync';

// Helper para cores do score
const getScoreColor = (score: number) => {
  if (score <= 50) return { text: 'text-red-600', bg: 'bg-red-100', bar: 'bg-red-500' };
  if (score <= 75) return { text: 'text-amber-600', bg: 'bg-amber-100', bar: 'bg-amber-500' };
  return { text: 'text-green-600', bg: 'bg-green-100', bar: 'bg-green-500' };
};

// Helper para cores do rating
const getRatingColor = (rating: string) => {
  if (rating === 'Forte') return 'text-green-600 bg-green-100';
  if (rating === 'Médio') return 'text-amber-600 bg-amber-100';
  return 'text-red-600 bg-red-100';
};

export function MissionSummary() {
  const { session, versionHistory, addVersion, saveNotes, updateStage, updateKeywords, updateMissionStatement, upgradeToV2, updateAnalysisPartial } = useMission();
  const { refetch } = useJourneyProgress();
  const { checkStepCompletion } = useAchievementChecker();
  const { triggerSync } = useCulturePulseAutoSync('Missão');
  const { toast } = useToast();
  const navigate = useNavigate();
  const [notes, setNotes] = useState(session.notes);
  const [isEditingKeywords, setIsEditingKeywords] = useState(false);
  const [editableKeywords, setEditableKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState("");
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [isEditingMission, setIsEditingMission] = useState(false);
  const [editableMission, setEditableMission] = useState("");
  const hasCheckedAchievements = useRef(false);
  const analysis = session.analysis;
  const isV2 = session.questionnaireVersion === 2;

  // Refetch journey progress and check achievements when summary mounts
  useEffect(() => {
    refetch();
    if (!hasCheckedAchievements.current) {
      hasCheckedAchievements.current = true;
      checkStepCompletion('missao');
      triggerSync();
    }
  }, [refetch, checkStepCompletion, triggerSync]);

  if (!analysis) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Nenhuma análise disponível
        </CardContent>
      </Card>
    );
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: "Texto copiado para a área de transferência",
    });
  };

  const handleExportPDF = () => {
    toast({
      title: "Exportar PDF",
      description: "Funcionalidade em desenvolvimento",
    });
  };

  const handleSaveNotes = () => {
    saveNotes(notes);
    toast({
      title: "Anotações salvas",
      description: "Suas observações foram armazenadas",
    });
  };

  const handleBackToDashboard = () => {
    navigate('/');
  };

  const handleBackToReview = () => {
    updateStage(14);
  };

  const handleAcceptRefinement = async (statement: string) => {
    // 1. Salvar no histórico
    addVersion({
      missionStatement: statement,
      variant: 'alternative',
    });
    
    // 2. Atualizar a missão principal
    updateMissionStatement(statement);
    
    // 3. SE FOR V2: Reavaliar com a IA analisadora
    if (isV2) {
      setIsReanalyzing(true);
      toast({
        title: "Reavaliando missão...",
        description: "A IA está analisando sua nova declaração",
      });
      
      try {
        const { data, error } = await supabase.functions.invoke('analyze-mission', {
          body: {
            missionStatement: statement,
            answers: session.answers,
            segment: session.segment,
          }
        });
        
        if (error) throw error;
        
        if (data && !data.error) {
          // Atualizar score, diagnosis, pillars, etc.
          updateAnalysisPartial({
            score: data.score,
            diagnosis: data.diagnosis,
            pillars: data.pillars,
            lengthFeedback: data.lengthFeedback,
            recommendations: data.recommendations,
            benchmarks: data.benchmarks,
          });
          
          toast({
            title: "Missão reavaliada!",
            description: `Novo score: ${data.score}/100`,
          });
        }
      } catch (err) {
        console.error('Erro na reanálise:', err);
        toast({
          title: "Missão atualizada!",
          description: "A nova declaração foi salva, mas não foi possível reavaliar automaticamente.",
        });
      } finally {
        setIsReanalyzing(false);
      }
    } else {
      toast({
        title: "Missão atualizada!",
        description: "A nova declaração agora aparece no topo da página",
      });
    }
  };

  const handleManualReanalyze = async () => {
    if (!analysis.missionStatement) return;
    
    setIsReanalyzing(true);
    toast({
      title: "Analisando missão...",
      description: "A IA está avaliando sua declaração",
    });
    
    try {
      const { data, error } = await supabase.functions.invoke('analyze-mission', {
        body: {
          missionStatement: analysis.missionStatement,
          answers: session.answers,
          segment: session.segment,
        }
      });
      
      if (error) throw error;
      
      if (data && !data.error) {
        updateAnalysisPartial({
          score: data.score,
          diagnosis: data.diagnosis,
          pillars: data.pillars,
          lengthFeedback: data.lengthFeedback,
          recommendations: data.recommendations,
          benchmarks: data.benchmarks,
        });
        
        toast({
          title: "Análise concluída!",
          description: `Score: ${data.score}/100`,
        });
      }
    } catch (err) {
      console.error('Erro na análise:', err);
      toast({
        title: "Erro na análise",
        description: "Não foi possível analisar a missão. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsReanalyzing(false);
    }
  };

  const handleUpgradeQuestionnaire = async () => {
    const confirmed = window.confirm(
      "Tem certeza? Isso irá apagar suas respostas atuais e você precisará refazer o questionário com a nova metodologia EP Partners."
    );
    
    if (confirmed) {
      await upgradeToV2();
    }
  };

  // Keyword editing handlers
  const handleStartEditKeywords = () => {
    setEditableKeywords([...analysis.keywords]);
    setIsEditingKeywords(true);
  };

  const handleCancelEditKeywords = () => {
    setEditableKeywords([]);
    setNewKeyword("");
    setIsEditingKeywords(false);
  };

  const handleSaveKeywords = () => {
    updateKeywords(editableKeywords);
    setNewKeyword("");
    setIsEditingKeywords(false);
    toast({
      title: "Palavras-chave atualizadas",
      description: "As alterações foram salvas",
    });
  };

  const handleRemoveKeyword = (index: number) => {
    setEditableKeywords(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddKeyword = () => {
    const trimmed = newKeyword.trim().toLowerCase();
    if (trimmed && !editableKeywords.includes(trimmed)) {
      setEditableKeywords(prev => [...prev, trimmed]);
      setNewKeyword("");
    }
  };

  const handleKeywordInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddKeyword();
    }
  };

  return (
    <div className="space-y-6">
      {/* Card de Upgrade para V1 */}
      {!isV2 && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              Nova Versão do Questionário Disponível!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Atualizamos nosso questionário de missão com uma metodologia mais profunda 
              baseada na metodologia EP Partners. O novo questionário tem 9 perguntas em 3 camadas 
              estratégicas que ajudam a criar uma declaração ainda mais impactante.
            </p>
            <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4" />
              <span>Atenção: Isso irá apagar suas respostas atuais</span>
            </div>
            <Button
              variant="outline" 
              onClick={handleUpgradeQuestionnaire}
              className="border-amber-300 hover:bg-amber-100 dark:border-amber-700 dark:hover:bg-amber-900/30"
            >
              Atualizar para Novo Questionário
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Card Principal da Missão */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1.5">
              <CardTitle className="text-2xl flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-primary" />
                Sua Declaração de Missão
              </CardTitle>
              <CardDescription>
                Declaração inspiradora gerada com base nas suas respostas
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isEditingMission ? (
            <div className="space-y-3">
              <Textarea
                value={editableMission}
                onChange={(e) => setEditableMission(e.target.value)}
                className="min-h-[120px] text-lg"
                placeholder="Escreva ou cole aqui a declaração de missão exata..."
                autoFocus
              />
              <div className="flex flex-wrap gap-2 justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsEditingMission(false);
                    setEditableMission("");
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    const trimmed = editableMission.trim();
                    if (!trimmed) {
                      toast({
                        title: "Declaração vazia",
                        description: "Escreva o texto da missão antes de salvar.",
                        variant: "destructive",
                      });
                      return;
                    }
                    addVersion({ missionStatement: trimmed, variant: 'manual' });
                    updateMissionStatement(trimmed);
                    setIsEditingMission(false);
                    setEditableMission("");
                    toast({
                      title: "Missão oficial atualizada",
                      description: "Declaração salva manualmente.",
                    });
                  }}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Salvar como oficial
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Você pode reavaliar com a IA depois de salvar, se quiser um score atualizado.
              </p>
            </div>
          ) : (
            <div className="p-6 bg-background rounded-lg border-2 border-primary/20">
              <p className="text-2xl font-bold text-center leading-relaxed">
                {analysis.missionStatement}
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-2 justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCopy(analysis.missionStatement)}
              disabled={isEditingMission}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copiar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditableMission(analysis.missionStatement);
                setIsEditingMission(true);
              }}
              disabled={isEditingMission}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Editar manualmente
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPDF}
              disabled={isEditingMission}
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Card de Análise (apenas V2) */}
      {isV2 && analysis.score !== undefined && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              {isReanalyzing ? (
                <Loader2 className="h-5 w-5 text-primary animate-spin" />
              ) : (
                <TrendingUp className="h-5 w-5 text-primary" />
              )}
              Análise Automática da Sua Missão
              {isReanalyzing && <span className="text-sm font-normal text-muted-foreground">(Reavaliando...)</span>}
            </CardTitle>
            <CardDescription>
              Avaliação baseada em critérios da metodologia EP Partners
            </CardDescription>
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualReanalyze}
              disabled={isReanalyzing}
              className="ml-auto"
            >
              {isReanalyzing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Reanalisar
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Score Visual */}
            <div className="flex items-center gap-4">
              <div className={`text-4xl font-bold px-4 py-2 rounded-lg ${getScoreColor(analysis.score).bg} ${getScoreColor(analysis.score).text}`}>
                {analysis.score}/100
              </div>
              <div className="flex-1">
                <Progress value={analysis.score} className="h-3" />
              </div>
            </div>

            {/* Diagnóstico */}
            {analysis.diagnosis && (
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">Diagnóstico:</h4>
                <p className="text-sm text-muted-foreground">{analysis.diagnosis}</p>
              </div>
            )}

            {/* Avaliação por Pilar */}
            {analysis.pillars && (
              <div>
                <h4 className="font-medium mb-3">Avaliação por Pilar:</h4>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="h-4 w-4 text-primary" />
                      <span className="font-medium text-sm">Propósito e Crença</span>
                    </div>
                    <Badge className={getRatingColor(analysis.pillars.purpose.rating)}>
                      {analysis.pillars.purpose.rating}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-2">{analysis.pillars.purpose.explanation}</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Focus className="h-4 w-4 text-primary" />
                      <span className="font-medium text-sm">Clareza e Foco</span>
                    </div>
                    <Badge className={getRatingColor(analysis.pillars.clarity.rating)}>
                      {analysis.pillars.clarity.rating}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-2">{analysis.pillars.clarity.explanation}</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Globe className="h-4 w-4 text-primary" />
                      <span className="font-medium text-sm">Impacto Transcendente</span>
                    </div>
                    <Badge className={getRatingColor(analysis.pillars.impact.rating)}>
                      {analysis.pillars.impact.rating}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-2">{analysis.pillars.impact.explanation}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Feedback de Extensão */}
            {analysis.lengthFeedback && (
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">📏 Sobre a Extensão:</h4>
                <p className="text-sm text-muted-foreground">{analysis.lengthFeedback}</p>
              </div>
            )}

            {/* Recomendações */}
            {analysis.recommendations && analysis.recommendations.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">💡 Recomendações:</h4>
                <ul className="space-y-2">
                  {analysis.recommendations.map((rec, index) => (
                    <li key={index} className="text-sm flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Benchmarks */}
            {analysis.benchmarks && (
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">🏆 Benchmarks:</h4>
                <p className="text-sm text-muted-foreground">{analysis.benchmarks}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Chat de Refinamento */}
      <RefinementChat
        type="mission"
        currentStatement={analysis.missionStatement}
        originalAnswers={session.answers}
        keywords={analysis.keywords}
        onAcceptSuggestion={handleAcceptRefinement}
        storageKey={`mission_chat_${session.id}`}
      />

      {/* Keywords e Insights */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Palavras-Chave Identificadas</CardTitle>
                <CardDescription>
                  Conceitos centrais da sua missão
                </CardDescription>
              </div>
              {!isEditingKeywords && (
                <Button variant="ghost" size="sm" onClick={handleStartEditKeywords}>
                  <Pencil className="h-4 w-4 mr-1" />
                  Editar
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isEditingKeywords ? (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {editableKeywords.map((keyword, index) => (
                    <Badge key={index} variant="secondary" className="pr-1 gap-1">
                      {keyword}
                      <button
                        onClick={() => handleRemoveKeyword(index)}
                        className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    onKeyDown={handleKeywordInputKeyDown}
                    placeholder="Adicionar palavra-chave..."
                    className="flex-1"
                  />
                  <Button size="sm" variant="outline" onClick={handleAddKeyword} disabled={!newKeyword.trim()}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="outline" onClick={handleCancelEditKeywords}>
                    Cancelar
                  </Button>
                  <Button size="sm" onClick={handleSaveKeywords}>
                    <Save className="h-4 w-4 mr-1" />
                    Salvar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {analysis.keywords.map((keyword, index) => (
                  <Badge key={index} variant="secondary">
                    {keyword}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Insights Estratégicos</CardTitle>
            <CardDescription>
              Observações sobre seu propósito
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {analysis.insights.map((insight, index) => (
                <li key={index} className="text-sm flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Histórico de Versões */}
      {versionHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Histórico de Versões</CardTitle>
            <CardDescription>
              Versões anteriores e alternativas geradas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {versionHistory.map((version) => (
                <div
                  key={version.id}
                  className="p-4 bg-muted rounded-lg flex items-start justify-between gap-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={version.variant === 'original' ? 'default' : 'secondary'}>
                        {version.variant === 'original' ? 'Original' : 
                         version.variant === 'shorter' ? 'Mais Curta' : 
                         version.variant === 'backup_v1' ? 'Backup V1' : 'Alternativa'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(version.timestamp).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <p className="text-sm font-medium">{version.missionStatement}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(version.missionStatement)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Anotações Pessoais */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Anotações Pessoais</CardTitle>
          <CardDescription>
            Adicione suas observações e reflexões sobre a missão gerada
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Digite suas anotações aqui..."
            className="min-h-[120px]"
          />
          <Button onClick={handleSaveNotes} variant="secondary">
            <FileText className="h-4 w-4 mr-2" />
            Salvar Anotações
          </Button>
        </CardContent>
      </Card>

      {/* Navegação */}
      <div className="flex items-center justify-between gap-4 pt-4">
        <Button variant="outline" onClick={handleBackToReview}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Revisar Respostas
        </Button>
        <Button onClick={handleBackToDashboard}>
          <Home className="h-4 w-4 mr-2" />
          Voltar ao Dashboard
        </Button>
      </div>
    </div>
  );
}
