import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, Plus, ChevronRight, ChevronLeft, X, ArrowRight } from "lucide-react";
import { useRitual } from "@/contexts/RitualContext";
import { MANAGEMENT_RITUALS, MANAGEMENT_RITUAL_LEVELS, ManagementRitualLevel, FREQUENCY_BY_LEVEL, FREQUENCY_OPTIONS_DEFAULT } from "@/types/ritual.types";
import { RitualStageInstructions } from "./RitualStageInstructions";
import logoGentia from "@/assets/logo-gentia.png";

interface CustomRitual {
  name: string;
  duration: string;
  frequency: string;
  objective: string;
}

function parseCustomRitual(encoded: string): CustomRitual | null {
  if (!encoded.startsWith("custom:")) return null;
  try {
    return JSON.parse(encoded.slice(7));
  } catch {
    return null;
  }
}

function encodeCustomRitual(r: CustomRitual): string {
  return `custom:${JSON.stringify(r)}`;
}

/** Parse "ritual-id|frequency" format, returns [id, frequency] */
function parseRitualWithFrequency(s: string): [string, string] {
  const pipeIdx = s.indexOf('|');
  if (pipeIdx === -1) return [s, ''];
  return [s.substring(0, pipeIdx), s.substring(pipeIdx + 1)];
}

const DURATION_OPTIONS = ["15min", "30min", "60min", "90min", "120min", "Outro"];
const FREQUENCY_OPTIONS = FREQUENCY_OPTIONS_DEFAULT;

export function RitualManagementSelection() {
  const { session, updateStage, saveManagementRituals } = useRitual();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [customRituals, setCustomRituals] = useState<CustomRitual[]>([]);
  const [subStep, setSubStep] = useState<1 | 2>(1);
  const [ritualFrequencies, setRitualFrequencies] = useState<Record<string, string>>({});
  const [otherFrequencies, setOtherFrequencies] = useState<Record<string, string>>({});

  // Custom form state
  const [isCreating, setIsCreating] = useState(false);
  const [formStep, setFormStep] = useState(1);
  const [formName, setFormName] = useState("");
  const [formDuration, setFormDuration] = useState("");
  const [formFrequency, setFormFrequency] = useState("");
  const [formFrequencyOther, setFormFrequencyOther] = useState("");
  const [formObjective, setFormObjective] = useState("");

  useEffect(() => {
    if (session?.management_rituals) {
      const all = session.management_rituals as string[];
      const presetIds: string[] = [];
      const freqs: Record<string, string> = {};
      const otherFreqs: Record<string, string> = {};

      all.forEach(s => {
        if (s.startsWith("custom:")) return;
        const [id, freq] = parseRitualWithFrequency(s);
        const ritual = MANAGEMENT_RITUALS.find(r => r.id === id);
        if (ritual) {
          presetIds.push(id);
          if (freq) {
            // Marcador "Outro:texto" — preserva a seleção mesmo sem texto digitado
            if (freq.startsWith('Outro:')) {
              freqs[id] = 'Outro';
              otherFreqs[id] = freq.slice(6);
            } else {
              const levelOptions = FREQUENCY_BY_LEVEL[ritual.level];
              if (levelOptions.includes(freq)) {
                freqs[id] = freq;
              } else {
                freqs[id] = 'Outro';
                otherFreqs[id] = freq;
              }
            }
          }
        }
      });

      setSelectedIds(presetIds);
      setRitualFrequencies(freqs);
      setOtherFrequencies(otherFreqs);

      const customs = all
        .filter(s => s.startsWith("custom:"))
        .map(parseCustomRitual)
        .filter(Boolean) as CustomRitual[];
      setCustomRituals(customs);
    }
    // Apenas reidrata na montagem ou ao trocar de sessão — evita ping-pong com o auto-save
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id]);

  const getEffectiveFrequency = (id: string): string => {
    const freq = ritualFrequencies[id];
    if (freq === 'Outro') {
      const txt = otherFrequencies[id]?.trim() || '';
      // Sempre preserva o marcador "Outro" para sobreviver ao reload
      return `Outro:${txt}`;
    }
    return freq || '';
  };

  const getAllRituals = useCallback((): string[] => [
    ...selectedIds.map(id => {
      const freq = getEffectiveFrequency(id);
      return freq ? `${id}|${freq}` : id;
    }),
    ...customRituals.map(encodeCustomRitual),
  ], [selectedIds, customRituals, ritualFrequencies, otherFrequencies]);

  // Auto-save on changes (debounced) — skip only the first render (mount)
  const mountedRef = useRef(false);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    if (selectedIds.length === 0 && customRituals.length === 0) return;

    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      saveManagementRituals(getAllRituals());
    }, 800);

    return () => clearTimeout(autoSaveTimer.current);
  }, [selectedIds, customRituals, ritualFrequencies, otherFrequencies, saveManagementRituals, getAllRituals]);

  const toggleRitual = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const resetForm = () => {
    setIsCreating(false);
    setFormStep(1);
    setFormName("");
    setFormDuration("");
    setFormFrequency("");
    setFormFrequencyOther("");
    setFormObjective("");
  };

  const addCustomRitual = () => {
    const finalFrequency = formFrequency === 'Outro'
      ? (formFrequencyOther.trim() || 'Outro')
      : formFrequency;
    const newRitual: CustomRitual = {
      name: formName.trim(),
      duration: formDuration,
      frequency: finalFrequency,
      objective: formObjective.trim(),
    };
    setCustomRituals(prev => [...prev, newRitual]);
    resetForm();
  };

  const removeCustomRitual = (index: number) => {
    setCustomRituals(prev => prev.filter((_, i) => i !== index));
  };

  const setFrequency = (id: string, freq: string) => {
    setRitualFrequencies(prev => ({ ...prev, [id]: freq }));
    if (freq !== 'Outro') {
      setOtherFrequencies(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const setOtherFrequency = (id: string, text: string) => {
    setOtherFrequencies(prev => ({ ...prev, [id]: text }));
  };

  const allFrequenciesFilled = selectedIds.every(id => {
    const freq = ritualFrequencies[id];
    if (!freq) return false;
    if (freq === 'Outro') return !!otherFrequencies[id]?.trim();
    return true;
  });

  const handleNextSubStep = () => {
    if (subStep === 1) {
      setSubStep(2);
    } else {
      handleNext();
    }
  };

  const handleNext = async () => {
    await saveManagementRituals(getAllRituals());
    await updateStage(2);
  };

  const handleBack = async () => {
    if (subStep === 2) {
      setSubStep(1);
      return;
    }
    await saveManagementRituals(getAllRituals());
    await updateStage(0);
  };

  const levels: ManagementRitualLevel[] = ['estrategico', 'tatico', 'operacional'];

  const selectedRitualsByLevel = levels.map(level => ({
    level,
    rituals: MANAGEMENT_RITUALS.filter(r => r.level === level && selectedIds.includes(r.id)),
  })).filter(g => g.rituals.length > 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-center">
        <img src={logoGentia} alt="Gent.IA" className="h-36 w-auto" />
      </div>

      <RitualStageInstructions stage={1} />

      {/* Sub-step indicator */}
      <div className="flex items-center gap-2 justify-center">
        <span className={`text-xs font-medium px-3 py-1 rounded-full ${subStep === 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
          1. Seleção
        </span>
        <ChevronRight className="h-3 w-3 text-muted-foreground" />
        <span className={`text-xs font-medium px-3 py-1 rounded-full ${subStep === 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
          2. Frequência
        </span>
      </div>

      {subStep === 1 ? (
        <>
          {levels.map(level => {
            const rituals = MANAGEMENT_RITUALS.filter(r => r.level === level);
            const levelInfo = MANAGEMENT_RITUAL_LEVELS[level];

            return (
              <div key={level} className="space-y-3">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs border ${levelInfo.color}`}>
                    {levelInfo.label}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    ({rituals.filter(r => selectedIds.includes(r.id)).length}/{rituals.length} selecionados)
                  </span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {rituals.map(ritual => {
                    const isSelected = selectedIds.includes(ritual.id);
                    return (
                      <Card
                        key={ritual.id}
                        className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                          isSelected
                            ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                            : 'hover:border-muted-foreground/30'
                        }`}
                        onClick={() => toggleRitual(ritual.id)}
                      >
                        <CardContent className="p-4 space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-xl">{ritual.icon}</span>
                              <h4 className="font-medium text-sm leading-tight">{ritual.name}</h4>
                            </div>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                              isSelected
                                ? 'bg-primary border-primary text-primary-foreground'
                                : 'border-muted-foreground/30'
                            }`}>
                              {isSelected && <Check className="h-3 w-3" />}
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                            {ritual.description}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                              ⏱ {ritual.duration}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                              🔁 {ritual.frequency}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Custom rituals */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Rituais personalizados</h3>

            {customRituals.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {customRituals.map((r, i) => (
                  <Card key={i} className="border-primary/30 bg-primary/5">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <h4 className="font-medium text-sm">{r.name}</h4>
                        <button
                          className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                          onClick={() => removeCustomRitual(i)}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          ⏱ {r.duration}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          🔁 {r.frequency}
                        </span>
                      </div>
                      {r.objective && (
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                          🎯 {r.objective}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {!isCreating ? (
              <Button variant="outline" onClick={() => setIsCreating(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Criar ritual personalizado
              </Button>
            ) : (
              <Card className="border-primary/40">
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">Novo ritual personalizado</h4>
                    <button onClick={resetForm} className="text-muted-foreground hover:text-foreground">
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">1. Nome do ritual</label>
                    <Input
                      placeholder="Ex: Reunião de Alinhamento, Retrospectiva..."
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      autoFocus
                    />
                  </div>

                  {formStep >= 2 && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">2. Duração</label>
                      <Select value={formDuration} onValueChange={setFormDuration}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a duração" />
                        </SelectTrigger>
                        <SelectContent>
                          {DURATION_OPTIONS.map(d => (
                            <SelectItem key={d} value={d}>{d}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {formStep >= 3 && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">3. Frequência</label>
                      <Select value={formFrequency} onValueChange={(v) => { setFormFrequency(v); if (v !== 'Outro') setFormFrequencyOther(''); }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a frequência" />
                        </SelectTrigger>
                        <SelectContent>
                          {FREQUENCY_OPTIONS.map(f => (
                            <SelectItem key={f} value={f}>{f}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {formFrequency === 'Outro' && (
                        <Input
                          className="mt-2"
                          placeholder="Especifique a frequência..."
                          value={formFrequencyOther}
                          onChange={(e) => setFormFrequencyOther(e.target.value)}
                        />
                      )}
                    </div>
                  )}

                  {formStep >= 4 && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">4. Objetivo</label>
                      <Textarea
                        placeholder="Qual o objetivo principal deste ritual?"
                        value={formObjective}
                        onChange={(e) => setFormObjective(e.target.value)}
                        rows={2}
                      />
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={resetForm}>
                      Cancelar
                    </Button>
                    {formStep < 4 ? (
                      <Button
                        size="sm"
                        onClick={() => setFormStep(prev => prev + 1)}
                        disabled={
                          (formStep === 1 && !formName.trim()) ||
                          (formStep === 2 && !formDuration) ||
                          (formStep === 3 && (!formFrequency || (formFrequency === 'Outro' && !formFrequencyOther.trim())))
                        }
                      >
                        Próximo
                        <ArrowRight className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={addCustomRitual}
                        disabled={!formName.trim() || !formDuration || !formFrequency || (formFrequency === 'Outro' && !formFrequencyOther.trim())}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Adicionar
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      ) : (
        /* Sub-step 2: Frequency selection */
        <div className="space-y-6">
          <div className="text-center space-y-1">
            <h3 className="font-semibold text-base">Defina a frequência real de cada ritual</h3>
            <p className="text-sm text-muted-foreground">
              Informe com que frequência cada ritual acontece na sua empresa atualmente.
            </p>
          </div>

          {selectedRitualsByLevel.map(({ level, rituals }) => {
            const levelInfo = MANAGEMENT_RITUAL_LEVELS[level];
            const freqOptions = FREQUENCY_BY_LEVEL[level];

            return (
              <div key={level} className="space-y-3">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs border ${levelInfo.color}`}>
                    {levelInfo.label}
                  </span>
                </h3>
                <div className="grid gap-3">
                  {rituals.map(ritual => {
                    const currentFreq = ritualFrequencies[ritual.id] || '';
                    const isOther = currentFreq === 'Outro';

                    return (
                      <Card key={ritual.id} className="border-border/60">
                        <CardContent className="p-4">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <span className="text-lg">{ritual.icon}</span>
                              <div className="min-w-0">
                                <h4 className="font-medium text-sm leading-tight truncate">{ritual.name}</h4>
                                <span className="text-[10px] text-muted-foreground">⏱ {ritual.duration}</span>
                              </div>
                            </div>
                            <div className="flex flex-col gap-1.5 sm:w-48 shrink-0">
                              <Select value={currentFreq} onValueChange={(v) => setFrequency(ritual.id, v)}>
                                <SelectTrigger className="h-9">
                                  <SelectValue placeholder="Frequência..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {freqOptions.map(f => (
                                    <SelectItem key={f} value={f}>{f}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {isOther && (
                                <Input
                                  className="h-9 text-sm"
                                  placeholder="Digite a frequência..."
                                  value={otherFrequencies[ritual.id] || ''}
                                  onChange={(e) => setOtherFrequency(ritual.id, e.target.value)}
                                />
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Custom rituals already have frequency set */}
          {customRituals.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-xs border bg-muted text-muted-foreground border-border">
                  Personalizados
                </span>
              </h3>
              <div className="grid gap-3">
                {customRituals.map((r, i) => (
                  <Card key={i} className="border-primary/30 bg-primary/5">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate">{r.name}</h4>
                          <span className="text-[10px] text-muted-foreground">⏱ {r.duration} · 🔁 {r.frequency}</span>
                        </div>
                        <Check className="h-4 w-4 text-primary shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={handleBack}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Voltar
        </Button>
        <Button
          onClick={handleNextSubStep}
          disabled={
            subStep === 1
              ? (selectedIds.length === 0 && customRituals.length === 0)
              : !allFrequenciesFilled
          }
        >
          Próximo
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
