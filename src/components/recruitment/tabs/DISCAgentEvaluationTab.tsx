import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronRight, Save, Loader2, Target, Scale, ShieldAlert, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface DISCEvaluationSettings {
  min_match_score: number;
  primary_profile: string | null;
  secondary_profile: string | null;
  weight_d: number;
  weight_i: number;
  weight_s: number;
  weight_c: number;
  use_advanced_mode: boolean;
  target_d: number;
  target_i: number;
  target_s: number;
  target_c: number;
  tolerance: number;
  eliminator_d: number | null;
  eliminator_i: number | null;
  eliminator_s: number | null;
  eliminator_c: number | null;
}

const DEFAULT_SETTINGS: DISCEvaluationSettings = {
  min_match_score: 70,
  primary_profile: null,
  secondary_profile: null,
  weight_d: 25,
  weight_i: 25,
  weight_s: 25,
  weight_c: 25,
  use_advanced_mode: false,
  target_d: 50,
  target_i: 50,
  target_s: 50,
  target_c: 50,
  tolerance: 15,
  eliminator_d: null,
  eliminator_i: null,
  eliminator_s: null,
  eliminator_c: null,
};

const DIMENSIONS = [
  { key: "d", label: "Dominância", shortLabel: "D", color: "bg-red-500", textColor: "text-red-600" },
  { key: "i", label: "Influência", shortLabel: "I", color: "bg-yellow-500", textColor: "text-yellow-600" },
  { key: "s", label: "Estabilidade", shortLabel: "S", color: "bg-green-500", textColor: "text-green-600" },
  { key: "c", label: "Conformidade", shortLabel: "C", color: "bg-blue-500", textColor: "text-blue-600" },
] as const;

interface DISCAgentEvaluationTabProps {
  settings?: Record<string, unknown>;
  onSaveSettings: (settings: Record<string, unknown>) => void;
  isSaving: boolean;
}

export function DISCAgentEvaluationTab({ settings, onSaveSettings, isSaving }: DISCAgentEvaluationTabProps) {
  const [config, setConfig] = useState<DISCEvaluationSettings>(() => {
    const disc = (settings?.disc_evaluation ?? {}) as Partial<DISCEvaluationSettings>;
    return { ...DEFAULT_SETTINGS, ...disc };
  });
  const [advancedOpen, setAdvancedOpen] = useState(config.use_advanced_mode);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const disc = (settings?.disc_evaluation ?? {}) as Partial<DISCEvaluationSettings>;
    setConfig({ ...DEFAULT_SETTINGS, ...disc });
    setHasChanges(false);
  }, [settings]);

  const update = (patch: Partial<DISCEvaluationSettings>) => {
    setConfig((prev) => ({ ...prev, ...patch }));
    setHasChanges(true);
  };

  const handleWeightChange = (dimension: string, value: number) => {
    const others = DIMENSIONS.filter((d) => d.key !== dimension);
    const currentOthersTotal = others.reduce((sum, d) => sum + (config as any)[`weight_${d.key}`], 0);
    const remaining = 100 - value;

    if (currentOthersTotal === 0) {
      const each = Math.floor(remaining / 3);
      const remainder = remaining - each * 3;
      const patch: any = { [`weight_${dimension}`]: value };
      others.forEach((d, i) => {
        patch[`weight_${d.key}`] = each + (i === 0 ? remainder : 0);
      });
      update(patch);
    } else {
      const ratio = remaining / currentOthersTotal;
      const patch: any = { [`weight_${dimension}`]: value };
      let distributed = 0;
      others.forEach((d, i) => {
        const current = (config as any)[`weight_${d.key}`];
        if (i === others.length - 1) {
          patch[`weight_${d.key}`] = Math.max(0, remaining - distributed);
        } else {
          const newVal = Math.max(0, Math.round(current * ratio));
          patch[`weight_${d.key}`] = newVal;
          distributed += newVal;
        }
      });
      update(patch);
    }
  };

  const handleSave = () => {
    onSaveSettings({
      ...settings,
      disc_evaluation: config,
    });
    setHasChanges(false);
  };

  const totalWeight = config.weight_d + config.weight_i + config.weight_s + config.weight_c;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Critérios de Aprovação — Fit Comportamental</h3>
          <p className="text-sm text-muted-foreground">
            Configure os parâmetros para aprovação/reprovação automática dos candidatos.
          </p>
          <div className="mt-2 flex items-start gap-2 rounded-lg bg-primary/5 border border-primary/20 p-3">
            <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              Estes valores serão usados como <strong>padrão</strong> para novas vagas que utilizarem este agente no workflow. 
              Cada vaga pode sobrescrever as configurações individualmente.
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={isSaving || !hasChanges} className="gap-2">
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar
        </Button>
      </div>

      {/* Minimum compatibility */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Compatibilidade Mínima
          </CardTitle>
          <CardDescription>
            Candidatos abaixo deste percentual serão reprovados automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Slider
              value={[config.min_match_score]}
              onValueChange={([v]) => update({ min_match_score: v })}
              min={0}
              max={100}
              step={5}
              className="flex-1"
            />
            <span className="text-xl font-bold w-16 text-right tabular-nums">{config.min_match_score}%</span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>Flexível</span>
            <span>Rigoroso</span>
          </div>
        </CardContent>
      </Card>

      {/* Target profile */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Scale className="h-4 w-4 text-primary" />
            Perfil Alvo
          </CardTitle>
          <CardDescription>
            Selecione o perfil comportamental desejado para esta posição.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Perfil Primário</Label>
              <Select
                value={config.primary_profile ?? "none"}
                onValueChange={(v) => update({ primary_profile: v === "none" ? null : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {DIMENSIONS.map((d) => (
                    <SelectItem key={d.key} value={d.shortLabel}>
                      <span className="flex items-center gap-2">
                        <span className={cn("h-2.5 w-2.5 rounded-full", d.color)} />
                        {d.shortLabel} — {d.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Perfil Secundário <span className="text-muted-foreground">(opcional)</span></Label>
              <Select
                value={config.secondary_profile ?? "none"}
                onValueChange={(v) => update({ secondary_profile: v === "none" ? null : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {DIMENSIONS.filter((d) => d.shortLabel !== config.primary_profile).map((d) => (
                    <SelectItem key={d.key} value={d.shortLabel}>
                      <span className="flex items-center gap-2">
                        <span className={cn("h-2.5 w-2.5 rounded-full", d.color)} />
                        {d.shortLabel} — {d.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dimension weights */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            Pesos por Dimensão
            {totalWeight !== 100 && (
              <span className="text-xs text-destructive font-normal">(Total: {totalWeight}% — deve ser 100%)</span>
            )}
          </CardTitle>
          <CardDescription>
            Defina a importância relativa de cada dimensão na avaliação de compatibilidade.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {DIMENSIONS.map((dim) => {
            const weightKey = `weight_${dim.key}` as keyof DISCEvaluationSettings;
            const value = config[weightKey] as number;
            return (
              <div key={dim.key} className="flex items-center gap-3">
                <div className="flex items-center gap-2 w-32 shrink-0">
                  <span className={cn("h-3 w-3 rounded-full", dim.color)} />
                  <span className={cn("font-medium text-sm", dim.textColor)}>{dim.shortLabel}</span>
                  <span className="text-sm text-muted-foreground">{dim.label}</span>
                </div>
                <Slider
                  value={[value]}
                  onValueChange={([v]) => handleWeightChange(dim.key, v)}
                  min={0}
                  max={100}
                  step={5}
                  className="flex-1"
                />
                <span className="text-sm font-mono w-10 text-right">{value}%</span>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Advanced mode */}
      <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
              <CardTitle className="text-base flex items-center gap-2">
                <ChevronRight className={cn("h-4 w-4 transition-transform", advancedOpen && "rotate-90")} />
                <ShieldAlert className="h-4 w-4 text-primary" />
                Configuração Avançada
              </CardTitle>
              <CardDescription>
                Alvos específicos por dimensão, tolerância e eliminadores automáticos.
              </CardDescription>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-6 pt-0">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Switch
                  checked={config.use_advanced_mode}
                  onCheckedChange={(v) => update({ use_advanced_mode: v })}
                />
                <div>
                  <Label>Ativar modo avançado</Label>
                  <p className="text-xs text-muted-foreground">
                    Permite definir alvos numéricos e eliminadores por dimensão.
                  </p>
                </div>
              </div>

              {config.use_advanced_mode && (
                <>
                  {/* Targets */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Alvos por Dimensão (0-100)</Label>
                    <p className="text-xs text-muted-foreground">
                      Pontuação ideal esperada para cada dimensão. A compatibilidade é calculada pela proximidade do candidato a estes alvos.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {DIMENSIONS.map((dim) => {
                        const targetKey = `target_${dim.key}` as keyof DISCEvaluationSettings;
                        return (
                          <div key={dim.key} className="flex items-center gap-2">
                            <span className={cn("h-3 w-3 rounded-full shrink-0", dim.color)} />
                            <span className="text-sm w-6 font-medium">{dim.shortLabel}</span>
                            <Slider
                              value={[config[targetKey] as number]}
                              onValueChange={([v]) => update({ [targetKey]: v } as any)}
                              min={0}
                              max={100}
                              step={5}
                              className="flex-1"
                            />
                            <span className="text-sm font-mono w-8 text-right">{config[targetKey] as number}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Tolerance */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Tolerância (±)</Label>
                    <p className="text-xs text-muted-foreground">
                      Margem aceitável de variação em relação ao alvo. Ex: ±15 significa que um alvo de 70 aceita scores de 55 a 85.
                    </p>
                    <div className="flex items-center gap-3">
                      <Slider
                        value={[config.tolerance]}
                        onValueChange={([v]) => update({ tolerance: v })}
                        min={5}
                        max={30}
                        step={5}
                        className="flex-1 max-w-xs"
                      />
                      <span className="text-sm font-mono">±{config.tolerance}</span>
                    </div>
                  </div>

                  {/* Eliminators */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 text-destructive" />
                      Eliminadores
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Pontuação mínima obrigatória por dimensão. Se o candidato ficar abaixo, é reprovado automaticamente — independente do score geral. Deixe vazio para desativar.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {DIMENSIONS.map((dim) => {
                        const elimKey = `eliminator_${dim.key}` as keyof DISCEvaluationSettings;
                        const value = config[elimKey] as number | null;
                        return (
                          <div key={dim.key} className="flex items-center gap-2">
                            <span className={cn("h-3 w-3 rounded-full shrink-0", dim.color)} />
                            <span className="text-sm w-6 font-medium">{dim.shortLabel}</span>
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              placeholder="—"
                              value={value ?? ""}
                              onChange={(e) => {
                                const v = e.target.value === "" ? null : parseInt(e.target.value, 10);
                                update({ [elimKey]: v } as any);
                              }}
                              className="w-20 h-8 text-sm"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Info box */}
      <div className="flex gap-2 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
        <Info className="h-4 w-4 shrink-0 mt-0.5" />
        <p>
          Quando um candidato concluir o assessment de Fit Comportamental, o resultado será comparado com estas configurações.
          Candidatos com compatibilidade abaixo de <strong>{config.min_match_score}%</strong> ou que ativem um eliminador serão reprovados automaticamente.
        </p>
      </div>
    </div>
  );
}
