import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Check, X, ChevronLeft, ChevronRight, Loader2, Sparkles, RefreshCw, Pencil, Plus } from "lucide-react";
import { useRitual } from "@/contexts/RitualContext";
import { AIManagementRecommendation, RITUAL_PILLARS } from "@/types/ritual.types";
import { RitualStageInstructions } from "./RitualStageInstructions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import logoGentia from "@/assets/logo-gentia.png";

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
  
  // Direct map match
  for (const [key, num] of Object.entries(PILLAR_NAME_MAP)) {
    if (normalized.includes(key) || key.includes(normalized)) return num;
  }
  
  // Regex: capture "Pilar N" format
  const pilarMatch = normalized.match(/pilar\s*(\d+)/);
  if (pilarMatch) {
    const num = parseInt(pilarMatch[1]);
    if (num >= 1 && num <= 3) return num;
    // Legacy pillar numbers (4, 5) → map to closest valid (3)
    if (num > 3) return 3;
  }
  
  // Fallback: default to pillar 1 rather than failing
  return 1;
}

export function RitualFinalAnalysis() {
  const { session, updateStage, saveFinalRecommendations, items, addItem } = useRitual();
  const [recommendations, setRecommendations] = useState<AIManagementRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [addedAsRitual, setAddedAsRitual] = useState<Set<string>>(new Set());

  const dataLoadedRef = useRef(false);
  useEffect(() => {
    if (dataLoadedRef.current) return;
    if (session?.ai_final_recommendations && (session.ai_final_recommendations as AIManagementRecommendation[]).length > 0) {
      setRecommendations(session.ai_final_recommendations as AIManagementRecommendation[]);
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
      saveFinalRecommendations(recommendations);
    }, 800);

    return () => clearTimeout(autoSaveTimer.current);
  }, [recommendations, generated, saveFinalRecommendations]);

  const generateFinalAnalysis = async () => {
    if (!session) return;
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-ritual-final-analysis', {
        body: {
          sessionId: session.id,
          managementRitualIds: session.management_rituals || [],
          acceptedRecommendations: (session.ai_management_recommendations as AIManagementRecommendation[] || []).filter(r => r.accepted),
          pillarItems: items.map(i => ({ pillar: i.pillar_number, text: i.item_text })),
        },
      });

      if (error) throw error;

      if (data?.recommendations) {
        const recs: AIManagementRecommendation[] = data.recommendations.map((r: any, i: number) => ({
          id: `final-${i}`,
          suggestion: r.suggestion,
          pillarRelated: r.pillarRelated,
          durationSuggested: r.durationSuggested,
          accepted: true,
        }));
        setRecommendations(recs);
        setGenerated(true);
        setAddedAsRitual(new Set());
        // auto-save will trigger via mountedRef
      }
    } catch (error) {
      console.error('Error generating final analysis:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível gerar a análise final. Tente novamente.',
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

    const text = `[Análise Final] ${rec.suggestion}`;
    await addItem(pillarNum, text, 'ai');
    setAddedAsRitual(prev => new Set(prev).add(rec.id));
    toast({
      title: 'Adicionado!',
      description: `Ritual adicionado ao pilar "${RITUAL_PILLARS.find(p => p.number === pillarNum)?.title}"`,
    });
  };

  const handleNext = async () => {
    await saveFinalRecommendations(recommendations);
    await updateStage(7);
  };

  const handleBack = async () => {
    await saveFinalRecommendations(recommendations);
    await updateStage(5);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-center">
        <img src={logoGentia} alt="Gent.IA" className="h-36 w-auto" />
      </div>

      <RitualStageInstructions stage={6} />

      {!generated && !loading && (
        <div className="text-center py-8 space-y-4">
          <Sparkles className="h-12 w-12 text-purple-500 mx-auto" />
          <p className="text-muted-foreground">
            A IA vai compilar todas as informações do processo e organizar as iniciativas definidas.
          </p>
          <Button size="lg" onClick={generateFinalAnalysis} className="gap-2">
            <Sparkles className="h-4 w-4" />
            Gerar Análise Final
          </Button>
        </div>
      )}

      {loading && (
        <div className="text-center py-12 space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-purple-500 mx-auto" />
          <p className="text-muted-foreground">A IA está compilando a análise final...</p>
        </div>
      )}

      {generated && !loading && (
        <>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">
              {recommendations.length} sugestões finais
              <span className="text-muted-foreground font-normal ml-2">
                ({recommendations.filter(r => r.accepted).length} aceitas)
              </span>
            </h3>
            <Button variant="outline" size="sm" onClick={generateFinalAnalysis} className="gap-1">
              <RefreshCw className="h-3 w-3" />
              Regenerar
            </Button>
          </div>

          <div className="grid gap-3">
            {recommendations.map(rec => {
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
          Revisão Final
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
