import { useEffect, useRef, useState, } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRitual } from "@/contexts/RitualContext";
import { RITUAL_PILLARS, AIManagementRecommendation, MANAGEMENT_RITUALS, ApprovedRitual } from "@/types/ritual.types";
import { Pencil, RotateCcw, FileText, ChevronRight, ChevronDown, ChevronUp, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import logoGentia from "@/assets/logo-gentia.png";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { VersionHistoryCard } from "../shared/VersionHistoryCard";
import { RitualPDFPreview } from "./RitualPDFPreview";
import { RitualStageInstructions } from "./RitualStageInstructions";
import { useJourneyProgress } from "@/hooks/useJourneyProgress";
import { useAchievementChecker } from "@/hooks/useAchievementChecker";

interface CollapsibleSectionProps {
  id: string;
  icon: string;
  title: string;
  count: number;
  isOpen: boolean;
  onToggle: (id: string) => void;
  children: React.ReactNode;
}

function CollapsibleSection({ id, icon, title, count, isOpen, onToggle, children }: CollapsibleSectionProps) {
  if (count === 0) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={() => onToggle(id)}>
      <CollapsibleTrigger className="w-full">
        <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-card hover:bg-muted/30 transition-colors cursor-pointer">
          <div className="flex items-center gap-3">
            <span className="text-xl">{icon}</span>
            <span className="font-medium text-sm">{title}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
              {count}
            </span>
          </div>
          {isOpen ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-4 pt-3 pb-2 space-y-2">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function extractTitle(text: string): string {
  // Try to extract a quoted name like 'Reuniões Semanais'
  const quoteMatch = text.match(/['']([^'']{5,60})['']/);
  if (quoteMatch) return quoteMatch[1];

  // Try first sentence up to period, comma, or colon (max 70 chars)
  const punctMatch = text.match(/^(.{10,70}?)[.,;:]/);
  if (punctMatch) return punctMatch[1].trim();

  // Fallback: first 60 chars
  if (text.length > 60) return text.slice(0, 60).trim() + "…";
  return text;
}

function RitualCard({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const title = extractTitle(text);
  const hasMore = text.length > title.length + 5;

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <CollapsibleTrigger className="w-full text-left">
        <div className={`flex items-center justify-between gap-3 p-3.5 rounded-xl border transition-all cursor-pointer ${
          expanded
            ? 'border-primary/30 bg-primary/5 shadow-sm'
            : 'border-border/50 bg-card hover:border-border hover:shadow-sm'
        }`}>
          <span className="font-medium text-sm text-foreground">{title}</span>
          {hasMore && (
            expanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            )
          )}
        </div>
      </CollapsibleTrigger>
      {hasMore && (
        <CollapsibleContent>
          <div className="px-4 pt-2 pb-3 text-sm text-muted-foreground leading-relaxed">
            {text}
          </div>
        </CollapsibleContent>
      )}
    </Collapsible>
  );
}

const sourceColorMap: Record<string, string> = {
  management: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  ai_recommendation: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  pillar: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  final_analysis: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
};

function ApprovedRitualCard({ ritual }: { ritual: ApprovedRitual }) {
  const [expanded, setExpanded] = useState(false);
  const title = extractTitle(ritual.text);
  const hasMore = ritual.text.length > title.length + 5;

  const sourceIcon = ritual.source === 'management' ? '📋'
    : ritual.source === 'ai_recommendation' ? '🤖'
    : ritual.source === 'final_analysis' ? '🧠'
    : '🎨';

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <div
        className={`rounded-xl border p-4 transition-all duration-200 ${
          expanded
            ? 'border-green-400/50 bg-green-50/30 dark:bg-green-950/15 shadow-sm'
            : 'border-border/50 bg-card hover:border-border hover:shadow-sm'
        }`}
      >
        <CollapsibleTrigger className="w-full text-left">
          <div className="flex items-start justify-between gap-2 mb-2">
            <span className="text-lg">{sourceIcon}</span>
            <div className="w-5 h-5 rounded-full bg-green-600 flex items-center justify-center shrink-0">
              <Check className="h-3 w-3 text-white" />
            </div>
          </div>

          <h4 className="font-medium text-sm mb-1.5 leading-snug">{title}</h4>

          {hasMore && !expanded && (
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-2">
              {ritual.text}
            </p>
          )}

          <div className="flex flex-wrap gap-1 mt-auto">
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${sourceColorMap[ritual.source] || 'bg-muted text-muted-foreground'}`}>
              🏷 {ritual.sourceLabel || ritual.source}
            </span>
            {ritual.duration && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                ⏱ {ritual.duration}
              </span>
            )}
            {ritual.frequency && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                🔁 {ritual.frequency}
              </span>
            )}
          </div>
        </CollapsibleTrigger>

        {hasMore && (
          <CollapsibleContent>
            <div className="mt-3 pt-3 border-t border-border/30 text-sm text-muted-foreground leading-relaxed">
              {ritual.text}
            </div>
          </CollapsibleContent>
        )}
      </div>
    </Collapsible>
  );
}

export function RitualSummary() {
  const { session, updateStage, getItemsForPillar, resetSession, versionHistory, saveVersionSnapshot, restoreVersion } = useRitual();
  const { refetch } = useJourneyProgress();
  const { checkStepCompletion } = useAchievementChecker();
  const hasSavedInitial = useRef(false);
  const hasCheckedAchievements = useRef(false);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['final']));

  const totalItems = RITUAL_PILLARS.reduce(
    (acc, pillar) => acc + getItemsForPillar(pillar.number).length,
    0
  );

  useEffect(() => {
    refetch();
    if (!hasCheckedAchievements.current) {
      hasCheckedAchievements.current = true;
      checkStepCompletion('rituais');
    }
  }, [refetch, checkStepCompletion]);

  useEffect(() => {
    if (session && totalItems > 0 && !hasSavedInitial.current && versionHistory.length === 0) {
      hasSavedInitial.current = true;
      saveVersionSnapshot('initial');
    }
  }, [session, totalItems, versionHistory]);

  if (!session) return null;

  const handleEdit = () => {
    updateStage(7); // Go to Review (new stage 7)
  };

  const toggleSection = (id: string) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const approvedRituals = (session.approved_rituals || []) as ApprovedRitual[];
  const acceptedMgmtRecs = ((session.ai_management_recommendations || []) as AIManagementRecommendation[]).filter(r => r.accepted);
  const acceptedFinalRecs = ((session.ai_final_recommendations || []) as AIManagementRecommendation[]).filter(r => r.accepted);
  const selectedRitualIds = (session.management_rituals || []) as string[];

  // Use approved_rituals if available (new flow), otherwise fallback to acceptedFinalRecs (legacy)
  const primaryRituals = approvedRituals.length > 0 ? approvedRituals : null;
  const primaryCount = primaryRituals ? primaryRituals.length : acceptedFinalRecs.length;

  return (
    <>
      <div className="max-w-4xl mx-auto space-y-6 no-print">
        <div className="flex justify-center">
          <img src={logoGentia} alt="Gent.IA" className="h-36 w-auto" />
        </div>

        <RitualStageInstructions stage={8} />

        <Card>
         <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl">Rituais de Cultura Definidos!</CardTitle>
            <p className="text-muted-foreground">
              <strong>{primaryCount} rituais finais</strong> definidos
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Primary: Approved rituals as big cards */}
            <div className="space-y-2">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xl">🧠</span>
                <span className="font-medium text-sm">Rituais Aprovados</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                  {primaryCount}
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {primaryRituals ? (
                  primaryRituals.map(r => (
                    <ApprovedRitualCard key={r.id} ritual={r} />
                  ))
                ) : (
                  acceptedFinalRecs.map(rec => (
                    <RitualCard key={rec.id} text={rec.suggestion} />
                  ))
                )}
              </div>
            </div>


            {/* Steps for success */}
            <div className="mt-6">
              <h2 className="text-2xl font-bold text-center mb-8">
                Os 4 passos para ter sucesso na<br />
                implementação dos Rituais
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { step: 1, title: "Comece pelo Básico", description: "Escolha 2 ou 3 rituais e símbolos e vá testando." },
                  { step: 2, title: "Envolva a Liderança", description: "Sem exemplo dos líderes, nada ganha força." },
                  { step: 3, title: "Seja consistente", description: "Repita esse ritual pelo menos 1x por semana" },
                  { step: 4, title: "Crie rituais fáceis de adotar", description: "Simples > Complexo!" }
                ].map((item, index) => (
                  <div key={item.step} className="relative flex flex-col items-center">
                    {index < 3 && (
                      <div className="hidden lg:block absolute top-1/2 left-full w-4 border-t-2 border-dashed border-primary/30 -translate-y-1/2 z-0" />
                    )}
                    <div className="border-2 border-primary/20 rounded-xl p-4 text-center w-full bg-card h-full flex flex-col">
                      <span className="text-xs tracking-[0.2em] text-muted-foreground font-medium uppercase">
                        PASSO {item.step}
                      </span>
                      <div className="bg-gradient-to-r from-primary to-primary/70 text-primary-foreground rounded-lg py-2 px-3 my-3">
                        <span className="font-semibold text-sm">{item.title}</span>
                      </div>
                      <p className="text-sm text-muted-foreground flex-1">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <VersionHistoryCard
              history={versionHistory}
              renderPreview={(snapshot) => {
                const data = snapshot as any;
                const approvedCount = data.approved_rituals?.length || 0;
                const itemsCount = data.items?.length || 0;
                return (
                  <span className="text-xs text-muted-foreground">
                    {approvedCount > 0 ? `${approvedCount} rituais aprovados` : `${itemsCount} itens definidos`}
                  </span>
                );
              }}
              renderDetailedPreview={(snapshot) => {
                const data = snapshot as any;
                const approved = (data.approved_rituals || []) as ApprovedRitual[];
                const mgmt = (data.management_rituals || []) as string[];
                const pillarItems = (data.items || []) as { item_text: string; pillar_number: number }[];

                if (approved.length === 0 && pillarItems.length === 0 && mgmt.length === 0) {
                  return <span className="text-xs text-muted-foreground">Nenhum item nesta versão</span>;
                }

                return (
                  <div className="space-y-4">
                    {/* Approved rituals */}
                    {approved.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm">✅</span>
                          <span className="text-xs font-medium">Rituais Aprovados ({approved.length})</span>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {approved.map((r, i) => {
                            const srcIcon = r.source === 'management' ? '📋'
                              : r.source === 'ai_recommendation' ? '🤖'
                              : r.source === 'final_analysis' ? '🧠' : '🎨';
                            return (
                              <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg border border-border/50 bg-card">
                                <span className="text-sm shrink-0">{srcIcon}</span>
                                <div className="min-w-0">
                                  <p className="text-xs font-medium truncate">{extractTitle(r.text)}</p>
                                  {(r.frequency || r.duration) && (
                                    <div className="flex gap-1 mt-1">
                                      {r.frequency && <span className="text-[9px] px-1 py-0.5 rounded bg-muted text-muted-foreground">🔁 {r.frequency}</span>}
                                      {r.duration && <span className="text-[9px] px-1 py-0.5 rounded bg-muted text-muted-foreground">⏱ {r.duration}</span>}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Management rituals */}
                    {mgmt.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm">📋</span>
                          <span className="text-xs font-medium">Rituais de Gestão ({mgmt.length})</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {mgmt.map((id, i) => {
                            const parts = id.split('|');
                            const ritualId = parts[0];
                            const freq = parts[1];
                            const ritualDef = MANAGEMENT_RITUALS.find(r => r.id === ritualId);
                            return (
                              <span key={i} className="text-[10px] px-2 py-1 rounded-md border border-border/50 bg-card text-foreground">
                                {ritualDef?.name || ritualId}
                                {freq && <span className="ml-1 text-muted-foreground">· {freq}</span>}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Pillar items */}
                    {pillarItems.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm">🏛️</span>
                          <span className="text-xs font-medium">Itens dos Pilares ({pillarItems.length})</span>
                        </div>
                        <div className="space-y-1">
                          {RITUAL_PILLARS.map(pillar => {
                            const pItems = pillarItems.filter(it => it.pillar_number === pillar.number);
                            if (pItems.length === 0) return null;
                            return (
                              <div key={pillar.number}>
                                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                                  {pillar.icon} {pillar.title} ({pItems.length})
                                </span>
                                <div className="ml-4 space-y-0.5 mt-0.5">
                                  {pItems.map((item, j) => (
                                    <div key={j} className="flex items-center gap-1.5 text-xs">
                                      <span className="w-1 h-1 rounded-full bg-primary shrink-0" />
                                      <span className="text-foreground">{extractTitle(item.item_text)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              }}
              onRestore={restoreVersion}
            />
          </CardContent>
        </Card>

        <div className="flex justify-center gap-3">
          <Button variant="outline" onClick={handleEdit}>
            <Pencil className="h-4 w-4 mr-2" />
            Editar
          </Button>
          <Button variant="outline" onClick={resetSession}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Novo Planejamento
          </Button>
          <Button onClick={() => setPdfOpen(true)}>
            <FileText className="h-4 w-4 mr-2" />
            Exportar PDF
          </Button>
        </div>
      </div>

      <RitualPDFPreview
        open={pdfOpen}
        onClose={() => setPdfOpen(false)}
        getItemsForPillar={getItemsForPillar}
      />
    </>
  );
}
