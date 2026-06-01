import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Check, X, ChevronLeft, ChevronRight, Loader2, Sparkles, RefreshCw, Pencil, Plus } from "lucide-react";
import { useRitual } from "@/contexts/RitualContext";
import { AIManagementRecommendation, MANAGEMENT_RITUALS, RITUAL_PILLARS } from "@/types/ritual.types";
import { RitualStageInstructions } from "./RitualStageInstructions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import logoGentia from "@/assets/logo-gentia.png";

// Map pillar names to pillar numbers
const PILLAR_NAME_MAP: Record<string, number> = {
  'artefatos': 1,
  'artefato': 1,
  'ideias adicionais e símbolos': 2,
  'ideias adicionais e simbolos': 2,
  'ideias adicionais': 2,
  'símbolos': 2,
  'simbolos': 2,
  'rituais de alinhamento com valores': 3,
  'rituais de alinhamento de valores': 3,
  'alinhamento com valores': 3,
  'alinhamento de valores': 3,
  'valores': 3,
};

function getPillarNumber(pillarName: string | undefined): number | null {
  if (!pillarName) return null;
  const normalized = pillarName.toLowerCase().trim();
  
  for (const [key, num] of Object.entries(PILLAR_NAME_MAP)) {
    if (normalized.includes(key) || key.includes(normalized)) return num;
  }
  
  const pilarMatch = normalized.match(/pilar\s*(\d+)/);
  if (pilarMatch) {
    const num = parseInt(pilarMatch[1]);
    if (num >= 1 && num <= 3) return num;
    if (num > 3) return 3;
  }
  
  return 1;
}

export function RitualAIRecommendations() {
  const { session, updateStage, saveAIRecommendations, addItem } = useRitual();
  const [recommendations, setRecommendations] = useState<AIManagementRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [addedAsRitual, setAddedAsRitual] = useState<Set<string>>(new Set());

  const dataLoadedRef = useRef(false);
  useEffect(() => {
    if (dataLoadedRef.current) return;
    if (session?.ai_management_recommendations && (session.ai_management_recommendations as AIManagementRecommendation[]).length > 0) {
      setRecommendations(session.ai_management_recommendations as AIManagementRecommendation[]);
      setGenerated(true);
      dataLoadedRef.current = true;
    }
  }, [session]);

  // Auto-save recommendations on changes (debounced) — skip only the first render
  const mountedRef = useRef(false);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    if (!generated || recommendations.length === 0) return;

    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      saveAIRecommendations(recommendations);
    }, 800);

    return () => clearTimeout(autoSaveTimer.current);
  }, [recommendations, generated, saveAIRecommendations]);

  const generateRecommendations = async () => {
    if (!session) return;
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-ritual-management-recommendations', {
        body: {
          managementRitualIds: session.management_rituals || [],
          sessionId: session.id,
        },
      });

      if (error) {
        console.error('Edge function error:', error);
        const errorMsg = error.message || '';
        if (errorMsg.includes('429') || errorMsg.includes('rate_limit')) {
          toast({ title: 'Limite atingido', description: 'Limite de chamadas de IA atingido. Tente novamente mais tarde.', variant: 'destructive' });
        } else if (errorMsg.includes('402')) {
          toast({ title: 'Créditos esgotados', description: 'Créditos de IA esgotados.', variant: 'destructive' });
        } else {
          toast({ title: 'Erro', description: 'Não foi possível gerar recomendações. Tente novamente.', variant: 'destructive' });
        }
        return;
      }

      // Check for error in response body
      if (data?.error) {
        console.error('AI response error:', data.error, data.message);
        toast({
          title: 'Erro na análise',
          description: data.message || 'A IA não conseguiu gerar recomendações. Tente novamente.',
          variant: 'destructive',
        });
        return;
      }

      if (data?.recommendations && Array.isArray(data.recommendations) && data.recommendations.length > 0) {
        const recs: AIManagementRecommendation[] = data.recommendations.map((r: any, i: number) => ({
          id: `rec-${i}`,
          ritualId: r.ritualId,
          ritualName: r.ritualName,
          suggestion: r.suggestion,
          pillarRelated: r.pillarRelated,
          durationSuggested: r.durationSuggested,
          accepted: true,
        }));
        setRecommendations(recs);
        setGenerated(true);
        setAddedAsRitual(new Set());
        // auto-save will trigger via mountedRef
      } else {
        toast({
          title: 'Sem recomendações',
          description: 'Nenhuma recomendação foi gerada para os rituais selecionados. Tente regenerar.',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Error generating recommendations:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível gerar recomendações. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleAccepted = (id: string) => {
    setRecommendations(prev =>
      prev.map(r => r.id === id ? { ...r, accepted: !r.accepted } : r)
    );
  };

  const startEditing = (rec: AIManagementRecommendation) => {
    setEditingId(rec.id);
    setEditText(rec.suggestion);
  };

  const saveEdit = (id: string) => {
    if (editText.trim()) {
      setRecommendations(prev =>
        prev.map(r => r.id === id ? { ...r, suggestion: editText.trim() } : r)
      );
    }
    setEditingId(null);
    setEditText("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText("");
  };

  const addAsCultureRitual = async (rec: AIManagementRecommendation) => {
    const pillarNum = getPillarNumber(rec.pillarRelated);
    if (!pillarNum) {
      toast({
        title: 'Pilar não identificado',
        description: 'Não foi possível identificar o pilar para esta recomendação.',
        variant: 'destructive',
      });
      return;
    }

    const text = `[${rec.ritualName || 'Recomendação IA'}] ${rec.suggestion}`;
    await addItem(pillarNum, text, 'ai');
    setAddedAsRitual(prev => new Set(prev).add(rec.id));
    toast({
      title: 'Adicionado!',
      description: `Ritual adicionado ao pilar "${RITUAL_PILLARS.find(p => p.number === pillarNum)?.title}"`,
    });
  };

  const handleNext = async () => {
    await saveAIRecommendations(recommendations);
    await updateStage(3);
  };

  const handleBack = async () => {
    await saveAIRecommendations(recommendations);
    await updateStage(1);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-center">
        <img src={logoGentia} alt="Gent.IA" className="h-36 w-auto" />
      </div>

      <RitualStageInstructions stage={2} />

      {!generated && !loading && (
        <div className="text-center py-8 space-y-4">
          <Sparkles className="h-12 w-12 text-purple-500 mx-auto" />
          <p className="text-muted-foreground">
            Clique abaixo para que a IA analise seus rituais de gestão e a cultura da empresa
          </p>
          <Button size="lg" onClick={generateRecommendations} className="gap-2">
            <Sparkles className="h-4 w-4" />
            Gerar Recomendações
          </Button>
        </div>
      )}

      {loading && (
        <div className="text-center py-12 space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-purple-500 mx-auto" />
          <p className="text-muted-foreground">A IA está analisando seus rituais e cultura...</p>
        </div>
      )}

      {generated && !loading && (
        <>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">
              {recommendations.length} recomendações geradas
              <span className="text-muted-foreground font-normal ml-2">
                ({recommendations.filter(r => r.accepted).length} aceitas)
              </span>
            </h3>
            <Button variant="outline" size="sm" onClick={generateRecommendations} className="gap-1">
              <RefreshCw className="h-3 w-3" />
              Regenerar
            </Button>
          </div>

          <div className="grid gap-3">
            {recommendations.map(rec => {
              const ritual = MANAGEMENT_RITUALS.find(r => r.id === rec.ritualId);
              const isEditing = editingId === rec.id;
              const isAddedAsRitual = addedAsRitual.has(rec.id);

              return (
                <Card
                  key={rec.id}
                  className={`transition-all duration-200 ${
                    rec.accepted
                      ? 'border-green-300 bg-green-50/50 dark:bg-green-950/20'
                      : 'border-muted opacity-60'
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => toggleAccepted(rec.id)}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                          rec.accepted
                            ? 'bg-green-600 border-green-600 text-white'
                            : 'border-muted-foreground/30 hover:border-muted-foreground/60'
                        }`}
                      >
                        {rec.accepted ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5 text-muted-foreground/40" />}
                      </button>
                      <div className="flex-1 space-y-2">
                        {(rec.ritualName || ritual) && (
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{ritual?.icon || '📌'}</span>
                            <span className="text-xs font-medium text-muted-foreground">
                              {rec.ritualName || ritual?.name}
                            </span>
                          </div>
                        )}

                        {isEditing ? (
                          <div className="space-y-2">
                            <Textarea
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              className="text-sm min-h-[80px]"
                              autoFocus
                            />
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => saveEdit(rec.id)} className="gap-1">
                                <Check className="h-3 w-3" />
                                Salvar
                              </Button>
                              <Button size="sm" variant="outline" onClick={cancelEdit} className="gap-1">
                                <X className="h-3 w-3" />
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm leading-relaxed">{rec.suggestion}</p>
                        )}

                        <div className="flex flex-wrap gap-1.5">
                          {rec.pillarRelated && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                              {rec.pillarRelated}
                            </span>
                          )}
                          {rec.durationSuggested && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                              ⏱ {rec.durationSuggested}
                            </span>
                          )}
                        </div>

                        {/* Action buttons for accepted recommendations */}
                        {rec.accepted && !isEditing && (
                          <div className="flex gap-2 pt-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => startEditing(rec)}
                              className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
                            >
                              <Pencil className="h-3 w-3" />
                              Editar
                            </Button>
                            {isAddedAsRitual ? (
                              <span className="text-xs text-green-600 flex items-center gap-1 px-2">
                                <Check className="h-3 w-3" />
                                Adicionado como ritual
                              </span>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => addAsCultureRitual(rec)}
                                className="h-7 text-xs gap-1 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                              >
                                <Plus className="h-3 w-3" />
                                Adicionar como Ritual de Cultura
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={handleBack}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Voltar
        </Button>
        <Button onClick={handleNext}>
          Próximo
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
