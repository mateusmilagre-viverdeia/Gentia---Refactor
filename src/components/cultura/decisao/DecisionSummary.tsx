import { useEffect, useRef, useState } from "react";
import { ArrowLeft, FileText, Save, ChevronDown, ChevronUp, Loader2, Sparkles, CheckCircle2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useDecision } from "@/contexts/DecisionContext";
import { DECISION_QUESTIONS } from "@/types/decision.types";
import { DecisionProgress } from "./DecisionProgress";
import logoGentia from "@/assets/logo-gentia.png";
import { VersionHistoryCard } from "@/components/cultura/shared/VersionHistoryCard";
import { toast } from "sonner";
import { useJourneyProgress } from "@/hooks/useJourneyProgress";
import { useAchievementChecker } from "@/hooks/useAchievementChecker";
import { useCulturePulseAutoSync } from '@/hooks/useCulturePulseAutoSync';

export function DecisionSummary() {
  const { 
    answers, 
    updateStage, 
    resetSession, 
    versionHistory, 
    saveVersionSnapshot,
    compiledDecision,
    isCompiling,
    compileDecision,
    restoreVersion
  } = useDecision();
  const { refetch } = useJourneyProgress();
  const { checkStepCompletion } = useAchievementChecker();
  const { triggerSync } = useCulturePulseAutoSync('Decisão');
  const hasSavedInitial = useRef(false);
  const hasAutoCompiled = useRef(false);
  const hasCheckedAchievements = useRef(false);
  const [showDetails, setShowDetails] = useState(false);

  // Refetch journey progress and check achievements when summary mounts
  useEffect(() => {
    refetch();
    if (!hasCheckedAchievements.current) {
      hasCheckedAchievements.current = true;
      checkStepCompletion('decisao');
      triggerSync();
    }
  }, [refetch, checkStepCompletion, triggerSync]);

  // Auto-save version on first load
  useEffect(() => {
    if (answers.length > 0 && !hasSavedInitial.current && versionHistory.length === 0) {
      hasSavedInitial.current = true;
      saveVersionSnapshot('initial');
    }
  }, [answers, versionHistory]);

  // Auto-compile ONLY on first time (when no compiled decision exists in DB)
  // Since compiledDecision is now loaded from DB, this will only trigger once
  useEffect(() => {
    if (answers.length > 0 && !compiledDecision && !isCompiling && !hasAutoCompiled.current) {
      hasAutoCompiled.current = true;
      console.log('🔄 Auto-compiling decision framework (first time)...');
      compileDecision();
    }
  }, [answers, compiledDecision, isCompiling, compileDecision]);

  const handleEdit = async () => { await updateStage(8); };
  const handleReset = async () => {
    if (confirm("Tem certeza que deseja recomeçar? Todas as respostas serão apagadas.")) {
      await resetSession();
    }
  };
  const handleSaveVersion = async () => { 
    await saveVersionSnapshot('final'); 
    toast.success('Versão salva!'); 
  };
  const handleRecompile = async () => {
    await compileDecision();
  };

  const questionTitles: Record<number, string> = {
    1: "Comportamentos Intoleráveis", 2: "Regras da Empresa", 3: "Considerações para Decisões",
    4: "Critérios de Contratação", 5: "Critérios de Demissão", 6: "Critérios de Promoção", 7: "Processo de Decisão"
  };

  const renderHistoryPreview = (snapshot: unknown) => {
    const s = snapshot as { answers?: { answer_text: string }[], compiledDecision?: { guidelines: string[] } };
    if (s.compiledDecision?.guidelines) {
      return <span className="text-xs text-muted-foreground">{s.compiledDecision.guidelines.length} diretrizes</span>;
    }
    return <span className="text-xs text-muted-foreground">{s.answers?.length || 0} respostas</span>;
  };

  const renderDetailedPreview = (snapshot: unknown) => {
    const s = snapshot as { answers?: { question_number: number; answer_text: string }[], compiledDecision?: { guidelines: string[]; summary?: string } };
    return (
      <div className="space-y-2">
        {s.compiledDecision?.guidelines && (
          <div className="space-y-1">
            <span className="text-xs font-medium text-foreground">Diretrizes:</span>
            {s.compiledDecision.guidelines.map((g, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-1" />
                <span className="text-foreground">{g}</span>
              </div>
            ))}
          </div>
        )}
        {s.answers && s.answers.length > 0 && (
          <div className="space-y-1">
            <span className="text-xs font-medium text-foreground">Respostas ({s.answers.length}):</span>
            {s.answers.slice(0, 8).map((a, i) => (
              <div key={i} className="text-xs text-muted-foreground truncate">Q{a.question_number}: {a.answer_text}</div>
            ))}
            {s.answers.length > 8 && <span className="text-xs text-muted-foreground">+{s.answers.length - 8} mais</span>}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto py-6 px-4 space-y-6">
      <DecisionProgress currentStage={9} onStageClick={(s) => updateStage(s)} />
      <div className="text-center mb-8">
        <img src={logoGentia} alt="Gent.IA" className="h-36 w-auto mx-auto mb-6" />
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium mb-4">
          <FileText className="w-4 h-4" />Código de Tomada de Decisão
        </div>
        <h1 className="text-2xl font-bold">Como a Empresa Toma Decisão</h1>
      </div>

      {/* Compiled Framework Card */}
      <Card className="border-0 shadow-lg mb-6">
        <CardContent className="p-6">
          {isCompiling ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Compilando framework de decisão...</p>
            </div>
          ) : compiledDecision ? (
            <div className="space-y-6">
              {/* Summary */}
              {compiledDecision.summary && (
                <div className="text-center pb-4 border-b border-border">
                  <p className="text-muted-foreground italic">"{compiledDecision.summary}"</p>
                </div>
              )}
              
              {/* Guidelines */}
              <ul className="space-y-3">
                {compiledDecision.guidelines.map((guideline, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-foreground">{guideline}</span>
                  </li>
                ))}
              </ul>

              {/* Recompile button */}
              <div className="pt-4 border-t border-border">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleRecompile}
                  className="text-muted-foreground"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Recompilar
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Sparkles className="w-8 h-8 text-muted-foreground" />
              <p className="text-muted-foreground">Nenhum framework compilado</p>
              <Button onClick={compileDecision} disabled={answers.length === 0}>
                <Sparkles className="w-4 h-4 mr-2" />
                Compilar Framework
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Toggle Details */}
      <Button
        variant="ghost"
        onClick={() => setShowDetails(!showDetails)}
        className="w-full justify-between"
      >
        <span className="text-muted-foreground">Ver Detalhes das Respostas</span>
        {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </Button>

      {/* Detailed Answers (collapsible) */}
      {showDetails && (
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6 space-y-8">
            {DECISION_QUESTIONS.map((question) => {
              const questionAnswers = answers.filter(a => a.question_number === question.number);
              if (questionAnswers.length === 0) return null;
              return (
                <div key={question.number}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">{question.number}</div>
                    <h3 className="font-semibold text-foreground">{questionTitles[question.number]}</h3>
                  </div>
                  <ul className="space-y-2 pl-10">
                    {questionAnswers.map((answer) => (
                      <li key={answer.id} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                        <span className="text-sm text-foreground/90">{answer.answer_text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <Button variant="outline" onClick={handleEdit}><ArrowLeft className="w-4 h-4 mr-2" />Editar Respostas</Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSaveVersion}><Save className="w-4 h-4 mr-2" />Salvar Versão</Button>
        </div>
      </div>

      <VersionHistoryCard history={versionHistory} renderPreview={renderHistoryPreview} renderDetailedPreview={renderDetailedPreview} onRestore={restoreVersion} title="Histórico de Versões" />
    </div>
  );
}
