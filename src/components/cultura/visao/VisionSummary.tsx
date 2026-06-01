import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useVision } from "@/contexts/VisionContext";
import {
  Target,
  TrendingUp,
  Copy,
  FileText,
  Home,
  ChevronDown,
  ChevronUp,
  Star,
  Check,
  ArrowLeft,
  Pencil,
  X,
  Plus,
  Save,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import logoGentia from "@/assets/logo-gentia.png";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { RefinementChat } from "@/components/cultura/shared/RefinementChat";
import { cn } from "@/lib/utils";
import { useJourneyProgress } from "@/hooks/useJourneyProgress";
import { useAchievementChecker } from "@/hooks/useAchievementChecker";
import { useCulturePulseAutoSync } from '@/hooks/useCulturePulseAutoSync';

export function VisionSummary() {
  const { session, addVersion, saveNotes, versionHistory, updateStage, selectFinalVision, updateVisionStatement, updateKeywords, forceSyncToDatabase, isSaving } = useVision();
  const { refetch } = useJourneyProgress();
  const { checkStepCompletion } = useAchievementChecker();
  const { triggerSync } = useCulturePulseAutoSync('Visão');
  const navigate = useNavigate();
  const [notes, setNotes] = useState(session.notes || "");
  const [expandedVersions, setExpandedVersions] = useState<Record<string, boolean>>({});
  const [isEditingKeywords, setIsEditingKeywords] = useState(false);
  const [editableKeywords, setEditableKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState("");
  const [editingVision, setEditingVision] = useState<null | 'inspirational' | 'measurable' | 'final'>(null);
  const [editableVisionText, setEditableVisionText] = useState("");
  const hasCheckedAchievements = useRef(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Refetch journey progress and check achievements when summary mounts
  useEffect(() => {
    refetch();
    if (!hasCheckedAchievements.current) {
      hasCheckedAchievements.current = true;
      checkStepCompletion('visao');
      triggerSync();
    }
  }, [refetch, checkStepCompletion, triggerSync]);

  const handleForceSync = async () => {
    setIsSyncing(true);
    try {
      const success = await forceSyncToDatabase();
      if (success) {
        await refetch();
      }
    } finally {
      setIsSyncing(false);
    }
  };
  
  // Auto-recovery: se não há análise, redirecionar para revisão
  useEffect(() => {
    if (!session.analysis || !session.analysis.visionInspirational) {
      console.log('🔄 VisionSummary: Análise não encontrada, redirecionando para stage 11...');
      toast.warning("Análise pendente. Redirecionando para revisão...");
      updateStage(11);
    }
  }, [session.analysis, updateStage]);

  if (!session.analysis || !session.analysis.visionInspirational) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-muted-foreground">Redirecionando para revisão...</p>
        </div>
      </div>
    );
  }
  
  const { visionInspirational, visionMeasurable, keywords, insights } = session.analysis;
  
  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copiada para área de transferência!`);
    } catch (error) {
      toast.error("Erro ao copiar texto");
    }
  };
  
  const handleExportPDF = () => {
    document.body.classList.add("print-mode");
    window.print();
    setTimeout(() => {
      document.body.classList.remove("print-mode");
    }, 100);
  };
  
  const handleNotesChange = (value: string) => {
    setNotes(value);
    saveNotes(value);
  };
  
  const handleBackToDashboard = () => {
    navigate('/');
  };

  const handleBackToReview = () => {
    updateStage(11); // Stage 11 = VisionReview
  };
  
  const toggleVersion = (versionId: string) => {
    setExpandedVersions(prev => ({
      ...prev,
      [versionId]: !prev[versionId],
    }));
  };
  
  const getVariantLabel = (variant: string) => {
    const labels = {
      original: "Original",
      shorter: "Mais Curto",
      alternative: "Alternativa",
      "short-term": "Curto Prazo",
      manual: "Manual",
    };
    return labels[variant as keyof typeof labels] || variant;
  };

  const handleAcceptRefinement = (statement: string) => {
    // Adiciona ao histórico
    addVersion({
      visionInspirational: statement,
      visionMeasurable: visionMeasurable,
      variant: "alternative",
    });
    
    // Atualiza a visão inspiracional principal
    updateVisionStatement('inspirational', statement);
    
    toast.success("Visão atualizada!", {
      description: "A nova declaração agora aparece no topo da página",
    });
  };

  const handleSelectFinalVision = (type: 'inspirational' | 'measurable') => {
    selectFinalVision(type);
    toast.success("Visão definitiva selecionada!", {
      description: type === 'inspirational' 
        ? "Visão Inspiracional definida como oficial" 
        : "Visão Mensurável definida como oficial",
    });
  };

  const handleStartEditVision = (target: 'inspirational' | 'measurable' | 'final') => {
    if (target === 'inspirational') setEditableVisionText(visionInspirational);
    else if (target === 'measurable') setEditableVisionText(visionMeasurable);
    else setEditableVisionText(session.finalVision || visionInspirational || '');
    setEditingVision(target);
  };

  const handleCancelEditVision = () => {
    setEditingVision(null);
    setEditableVisionText("");
  };

  const handleSaveEditedVision = () => {
    const trimmed = editableVisionText.trim();
    if (!trimmed) {
      toast.error("Escreva o texto da visão antes de salvar.");
      return;
    }
    if (editingVision === 'inspirational' || editingVision === 'measurable') {
      updateVisionStatement(editingVision, trimmed);
      addVersion({
        visionInspirational: editingVision === 'inspirational' ? trimmed : visionInspirational,
        visionMeasurable: editingVision === 'measurable' ? trimmed : visionMeasurable,
        variant: 'manual',
      });
      toast.success("Visão atualizada manualmente!", {
        description: editingVision === 'inspirational'
          ? "Visão Inspiracional editada com o texto exato."
          : "Visão Mensurável editada com o texto exato.",
      });
    } else if (editingVision === 'final') {
      // Override the inspirational variant and mark it as definitive
      updateVisionStatement('inspirational', trimmed);
      selectFinalVision('inspirational');
      addVersion({
        visionInspirational: trimmed,
        visionMeasurable: visionMeasurable,
        variant: 'manual',
      });
      toast.success("Visão Definitiva salva!", {
        description: "Texto inserido manualmente foi marcado como oficial.",
      });
    }
    setEditingVision(null);
    setEditableVisionText("");
  };

  // Keyword editing handlers
  const handleStartEditKeywords = () => {
    setEditableKeywords([...keywords]);
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
    toast.success("Palavras-chave atualizadas!");
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
      <div className="flex justify-center mb-8">
        <img src={logoGentia} alt="Gent.IA" className="h-36 w-auto" />
      </div>
      
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-semibold">Visão da Empresa</h1>
        <p className="text-sm text-muted-foreground">
          Gerada em {new Date(session.analysis.createdAt).toLocaleString("pt-BR")}
        </p>
      </div>

      {/* Visão Definitiva - Destaque no topo */}
      {session.finalVision && editingVision !== 'final' && (
        <Card className="border-2 border-black bg-muted/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
              Visão Definitiva da Empresa
              <Badge variant="secondary" className="ml-2">
                {session.selectedVisionType === 'inspirational' ? 'Inspiracional' : 'Mensurável'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-medium leading-relaxed">{session.finalVision}</p>
            <div className="flex flex-wrap gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy(session.finalVision!, "Visão Definitiva")}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copiar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStartEditVision('final')}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Editar manualmente
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Editor manual da Visão Definitiva */}
      {editingVision === 'final' && (
        <Card className="border-2 border-primary bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Escrever Visão Definitiva manualmente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={editableVisionText}
              onChange={(e) => setEditableVisionText(e.target.value)}
              className="min-h-[120px] text-lg"
              placeholder="Digite ou cole aqui o texto exato da visão oficial..."
              autoFocus
            />
            <div className="flex flex-wrap gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={handleCancelEditVision}>
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button size="sm" onClick={handleSaveEditedVision}>
                <Save className="h-4 w-4 mr-2" />
                Salvar como oficial
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Este texto será marcado como a Visão Definitiva da empresa, exatamente como você escreveu.
            </p>
          </CardContent>
        </Card>
      )}

      {/* CTA para criar Visão Definitiva manual quando ainda não há */}
      {!session.finalVision && editingVision !== 'final' && (
        <Card className="border-dashed">
          <CardContent className="py-4 flex items-center justify-between gap-4">
            <div>
              <p className="font-medium">Já tem o texto exato da visão oficial?</p>
              <p className="text-sm text-muted-foreground">
                Pule o refinamento com a IA e escreva você mesmo a Visão Definitiva.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => handleStartEditVision('final')}>
              <Pencil className="h-4 w-4 mr-2" />
              Escrever manualmente
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <Card className={cn(
          "border-2 transition-all",
          session.selectedVisionType === 'inspirational' && "border-black bg-muted/20"
        )}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Visão Inspiracional
              {session.selectedVisionType === 'inspirational' && (
                <Badge className="ml-auto bg-black text-white">
                  <Check className="h-3 w-3 mr-1" />
                  Selecionada
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {editingVision === 'inspirational' ? (
              <div className="space-y-3">
                <Textarea
                  value={editableVisionText}
                  onChange={(e) => setEditableVisionText(e.target.value)}
                  className="min-h-[100px]"
                  autoFocus
                />
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" size="sm" onClick={handleCancelEditVision}>
                    <X className="h-4 w-4 mr-1" />Cancelar
                  </Button>
                  <Button size="sm" onClick={handleSaveEditedVision}>
                    <Save className="h-4 w-4 mr-1" />Salvar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="bg-muted p-4 rounded-md">
                <p className="text-lg leading-relaxed">{visionInspirational}</p>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy(visionInspirational, "Visão Inspiracional")}
                disabled={editingVision === 'inspirational'}
                className="flex-1"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copiar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStartEditVision('inspirational')}
                disabled={editingVision === 'inspirational'}
                className="flex-1"
              >
                <Pencil className="h-4 w-4 mr-2" />
                Editar
              </Button>
              <Button
                variant={session.selectedVisionType === 'inspirational' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleSelectFinalVision('inspirational')}
                disabled={editingVision === 'inspirational'}
                className={cn(
                  "flex-1",
                  session.selectedVisionType === 'inspirational' && "bg-black hover:bg-gray-800"
                )}
              >
                {session.selectedVisionType === 'inspirational' ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Definitiva
                  </>
                ) : (
                  'Usar como Definitiva'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card className={cn(
          "border-2 transition-all",
          session.selectedVisionType === 'measurable' && "border-black bg-muted/20"
        )}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Visão Mensurável
              {session.selectedVisionType === 'measurable' && (
                <Badge className="ml-auto bg-black text-white">
                  <Check className="h-3 w-3 mr-1" />
                  Selecionada
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {editingVision === 'measurable' ? (
              <div className="space-y-3">
                <Textarea
                  value={editableVisionText}
                  onChange={(e) => setEditableVisionText(e.target.value)}
                  className="min-h-[100px]"
                  autoFocus
                />
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" size="sm" onClick={handleCancelEditVision}>
                    <X className="h-4 w-4 mr-1" />Cancelar
                  </Button>
                  <Button size="sm" onClick={handleSaveEditedVision}>
                    <Save className="h-4 w-4 mr-1" />Salvar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="bg-muted p-4 rounded-md">
                <p className="text-lg leading-relaxed">{visionMeasurable}</p>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy(visionMeasurable, "Visão Mensurável")}
                disabled={editingVision === 'measurable'}
                className="flex-1"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copiar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStartEditVision('measurable')}
                disabled={editingVision === 'measurable'}
                className="flex-1"
              >
                <Pencil className="h-4 w-4 mr-2" />
                Editar
              </Button>
              <Button
                variant={session.selectedVisionType === 'measurable' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleSelectFinalVision('measurable')}
                disabled={editingVision === 'measurable'}
                className={cn(
                  "flex-1",
                  session.selectedVisionType === 'measurable' && "bg-black hover:bg-gray-800"
                )}
              >
                {session.selectedVisionType === 'measurable' ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Definitiva
                  </>
                ) : (
                  'Usar como Definitiva'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <RefinementChat
        type="vision"
        currentStatement={`Inspiracional: ${visionInspirational}\nMensurável: ${visionMeasurable}`}
        originalAnswers={session.answers}
        onAcceptSuggestion={handleAcceptRefinement}
        storageKey={`vision_chat_${session.id}`}
      />
      
      <Card>
        <CardHeader>
          <CardTitle>Análise Detalhada</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold">Palavras-chave Identificadas</h4>
              {!isEditingKeywords && (
                <Button variant="ghost" size="sm" onClick={handleStartEditKeywords}>
                  <Pencil className="h-4 w-4 mr-1" />
                  Editar
                </Button>
              )}
            </div>
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
                {keywords.map((keyword, index) => (
                  <Badge key={index} variant="secondary">
                    {keyword}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          
          <div>
            <h4 className="font-semibold mb-3">Insights</h4>
            <ul className="space-y-2">
              {insights.map((insight, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-muted-foreground mt-1">•</span>
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-3">Observações</h4>
            <Textarea
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Adicione suas notas e observações pessoais aqui..."
              className="min-h-[100px]"
            />
          </div>
        </CardContent>
      </Card>
      
      <div className="flex items-center justify-between gap-4 pt-4">
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleBackToReview}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Revisar Respostas
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleForceSync} 
            disabled={isSyncing || isSaving}
            title="Sincronizar dados com o servidor"
          >
            <RefreshCw className={cn("h-4 w-4", (isSyncing || isSaving) && "animate-spin")} />
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportPDF}>
            <FileText className="h-4 w-4 mr-2" />
            Exportar PDF
          </Button>
          <Button onClick={handleBackToDashboard}>
            <Home className="h-4 w-4 mr-2" />
            Voltar ao Dashboard
          </Button>
        </div>
      </div>
      
      {versionHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Versões</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {versionHistory.map((version) => (
              <Collapsible key={version.id}>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="secondary">{getVariantLabel(version.variant)}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {new Date(version.timestamp).toLocaleString("pt-BR")}
                          </span>
                        </div>
                        <p className="text-sm">
                          {expandedVersions[version.id]
                            ? version.visionInspirational
                            : `${version.visionInspirational.substring(0, 100)}...`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <CollapsibleTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleVersion(version.id)}
                          >
                            {expandedVersions[version.id] ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleCopy(
                              `${version.visionInspirational}\n\n${version.visionMeasurable}`,
                              "Versão"
                            )
                          }
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <CollapsibleContent>
                      <div className="mt-3 pt-3 border-t space-y-2">
                        <div>
                          <p className="text-sm font-semibold mb-1">Visão Inspiracional:</p>
                          <p className="text-sm">{version.visionInspirational}</p>
                        </div>
                        <div>
                          <p className="text-sm font-semibold mb-1">Visão Mensurável:</p>
                          <p className="text-sm">{version.visionMeasurable}</p>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </CardContent>
                </Card>
              </Collapsible>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
