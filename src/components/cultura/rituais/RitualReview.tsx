import { useState, useMemo, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRitual } from "@/contexts/RitualContext";
import { RITUAL_PILLARS, AIManagementRecommendation, MANAGEMENT_RITUALS, ApprovedRitual } from "@/types/ritual.types";
import { RitualStageInstructions } from "./RitualStageInstructions";
import { ChevronLeft, Check, Plus } from "lucide-react";
import logoGentia from "@/assets/logo-gentia.png";
import { toast } from "@/hooks/use-toast";

const MAX_SELECTION = 10;

function extractTitle(text: string): string {
  // Remove [Análise Final] prefix
  const cleaned = text.replace(/^\[Análise Final\]\s*/i, '');
  
  const quoteMatch = cleaned.match(/['']([^'']{5,60})['']/);
  if (quoteMatch) return quoteMatch[1];

  const punctMatch = cleaned.match(/^(.{10,70}?)[.,;:]/);
  if (punctMatch) return punctMatch[1].trim();

  if (cleaned.length > 60) return cleaned.slice(0, 60).trim() + "…";
  return cleaned;
}

interface CandidateRitual {
  id: string;
  text: string;
  title: string;
  source: 'management' | 'ai_recommendation' | 'pillar' | 'final_analysis';
  sourceLabel: string;
  sourceIcon: string;
  pillarNumber?: number;
  duration?: string;
  frequency?: string;
}

export function RitualReview() {
  const { session, updateStage, getItemsForPillar, items, saveApprovedRituals } = useRitual();

  // Build candidate list from all sources, with deduplication
  const candidates = useMemo(() => {
    if (!session) return [];
    const list: CandidateRitual[] = [];

    // 1. Management rituals
    const selectedIds = (session.management_rituals || []) as string[];
    selectedIds.forEach(id => {
      const ritual = MANAGEMENT_RITUALS.find(r => r.id === id);
      if (ritual) {
        list.push({
          id: `mgmt-${id}`,
          text: ritual.description,
          title: ritual.name,
          source: 'management',
          sourceLabel: 'Gestão',
          sourceIcon: ritual.icon,
          duration: ritual.duration,
          frequency: ritual.frequency,
        });
      }
    });

    // 2. Accepted AI management recommendations
    const aiRecs = ((session.ai_management_recommendations || []) as AIManagementRecommendation[]).filter(r => r.accepted);
    aiRecs.forEach(rec => {
      list.push({
        id: `ai-rec-${rec.id}`,
        text: rec.suggestion,
        title: extractTitle(rec.suggestion),
        source: 'ai_recommendation',
        sourceLabel: 'Recomendação IA',
        sourceIcon: '🤖',
        duration: rec.durationSuggested,
      });
    });

    // 3. Pillar items
    RITUAL_PILLARS.forEach(pillar => {
      const pillarItems = getItemsForPillar(pillar.number);
      pillarItems.forEach(item => {
        list.push({
          id: `pillar-${item.id}`,
          text: item.item_text,
          title: extractTitle(item.item_text),
          source: 'pillar',
          sourceLabel: pillar.title,
          sourceIcon: pillar.icon,
          pillarNumber: pillar.number,
        });
      });
    });

    // 4. Legacy pillar 4
    getItemsForPillar(4).forEach(item => {
      list.push({
        id: `pillar-${item.id}`,
        text: item.item_text,
        title: extractTitle(item.item_text),
        source: 'pillar',
        sourceLabel: 'Indicadores de Gestão',
        sourceIcon: '📊',
        pillarNumber: 4,
      });
    });

    // 5. Accepted final analysis recommendations
    const finalRecs = ((session.ai_final_recommendations || []) as AIManagementRecommendation[]).filter(r => r.accepted);
    finalRecs.forEach(rec => {
      list.push({
        id: `final-${rec.id}`,
        text: rec.suggestion,
        title: extractTitle(rec.suggestion),
        source: 'final_analysis',
        sourceLabel: 'Análise Final',
        sourceIcon: '🧠',
        duration: rec.durationSuggested,
      });
    });

    // --- Deduplication ---
    const sourcePriority: Record<CandidateRitual['source'], number> = {
      management: 0,
      ai_recommendation: 1,
      pillar: 2,
      final_analysis: 3,
    };

    const normalize = (text: string): string =>
      text
        .replace(/^\[Análise Final\]\s*/i, '')
        .replace(/[''""'"`]/g, '')
        .replace(/[.,;:!?()[\]{}]/g, ' ')
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    const deduplicated: CandidateRitual[] = [];
    const normalizedTexts: string[] = [];

    // Sort by priority descending so higher-priority items are added first
    const sorted = [...list].sort((a, b) => sourcePriority[b.source] - sourcePriority[a.source]);

    for (const item of sorted) {
      const norm = normalize(item.text);
      const isDuplicate = normalizedTexts.some(existing => {
        const shorter = norm.length < existing.length ? norm : existing;
        const longer = norm.length < existing.length ? existing : norm;
        // Only consider as duplicate if the shorter text is meaningful (≥30 chars)
        return shorter.length >= 30 && longer.includes(shorter);
      });

      if (!isDuplicate) {
        deduplicated.push(item);
        normalizedTexts.push(norm);
      }
    }

    // Re-sort by source groups for display: final_analysis first, then pillar, ai_rec, management
    deduplicated.sort((a, b) => sourcePriority[b.source] - sourcePriority[a.source]);

    return deduplicated;
  }, [session, items, getItemsForPillar]);

  // Initialize selected from existing approved_rituals
  const [selected, setSelected] = useState<Set<string>>(() => {
    if (session?.approved_rituals && (session.approved_rituals as ApprovedRitual[]).length > 0) {
      return new Set((session.approved_rituals as ApprovedRitual[]).map(r => r.id));
    }
    // Default: pre-select final analysis items (most curated)
    return new Set(candidates.filter(c => c.source === 'final_analysis').map(c => c.id));
  });

  // Auto-save selected rituals on changes (debounced)
  const mountedRef = useRef(false);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    if (selected.size === 0) return;

    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      const approved: ApprovedRitual[] = candidates
        .filter(c => selected.has(c.id))
        .map(c => ({
          id: c.id,
          text: c.text,
          source: c.source,
          sourceLabel: c.sourceLabel,
          pillarNumber: c.pillarNumber,
          duration: c.duration,
          frequency: c.frequency,
        }));
      saveApprovedRituals(approved);
    }, 800);

    return () => clearTimeout(autoSaveTimer.current);
  }, [selected, candidates, saveApprovedRituals]);

  if (!session) return null;

  const toggleSelection = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= MAX_SELECTION) {
          toast({
            title: 'Limite atingido',
            description: `Você pode selecionar no máximo ${MAX_SELECTION} rituais.`,
            variant: 'destructive',
          });
          return prev;
        }
        next.add(id);
      }
      return next;
    });
  };

  const handleFinish = async () => {
    const approved: ApprovedRitual[] = candidates
      .filter(c => selected.has(c.id))
      .map(c => ({
        id: c.id,
        text: c.text,
        source: c.source,
        sourceLabel: c.sourceLabel,
        pillarNumber: c.pillarNumber,
        duration: c.duration,
        frequency: c.frequency,
      }));

    await saveApprovedRituals(approved);
    await updateStage(8);
  };

  const handleBack = () => {
    updateStage(6);
  };

  const sourceColorMap: Record<string, string> = {
    management: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    ai_recommendation: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    pillar: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    final_analysis: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-center">
        <img src={logoGentia} alt="Gent.IA" className="h-36 w-auto" />
      </div>

      <RitualStageInstructions stage={7} />

      <Card>
        <CardHeader className="text-center pb-4">
          <CardTitle>Revisão Final dos Rituais de Cultura</CardTitle>
          <p className="text-muted-foreground text-sm">
            Selecione até {MAX_SELECTION} rituais para aprovação final — <strong>{selected.size}/{MAX_SELECTION}</strong> selecionados
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {candidates.length} rituais candidatos de todas as etapas
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {candidates.map(candidate => {
              const isSelected = selected.has(candidate.id);
              const isDisabled = !isSelected && selected.size >= MAX_SELECTION;

              return (
                <div
                  key={candidate.id}
                  onClick={() => !isDisabled && toggleSelection(candidate.id)}
                  className={`
                    relative rounded-xl border p-4 cursor-pointer transition-all duration-200
                    ${isSelected
                      ? 'border-green-400 bg-green-50/50 dark:bg-green-950/20 ring-1 ring-green-300 shadow-sm'
                      : isDisabled
                      ? 'border-border/30 bg-muted/20 opacity-50 cursor-not-allowed'
                      : 'border-border/50 bg-card hover:border-border hover:shadow-sm'
                    }
                  `}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-lg">{candidate.sourceIcon}</span>
                    {isSelected ? (
                      <div className="w-5 h-5 rounded-full bg-green-600 flex items-center justify-center shrink-0">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/20 flex items-center justify-center shrink-0">
                        <Plus className="h-3 w-3 text-muted-foreground/40" />
                      </div>
                    )}
                  </div>

                  <h4 className="font-medium text-sm mb-1.5 leading-snug">{candidate.title}</h4>

                  {candidate.text !== candidate.title && (
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-2">
                      {candidate.text}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-1 mt-auto">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${sourceColorMap[candidate.source] || 'bg-muted text-muted-foreground'}`}>
                      🏷 {candidate.sourceLabel}
                    </span>
                    {candidate.duration && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        ⏱ {candidate.duration}
                      </span>
                    )}
                    {candidate.frequency && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        🔁 {candidate.frequency}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={handleBack}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Voltar
        </Button>
        <Button onClick={handleFinish} disabled={selected.size === 0}>
          <Check className="h-4 w-4 mr-1" />
          Finalizar ({selected.size} rituais)
        </Button>
      </div>
    </div>
  );
}
