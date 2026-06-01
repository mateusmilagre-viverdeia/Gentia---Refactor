import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronRight, Save, Loader2, Target, Scale, ShieldAlert, Info, Clock, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

interface TechnicalEvaluationSettings {
  min_score: number;
  weight_required: number;
  weight_desired: number;
  threshold_recommended: number;
  threshold_conditional: number;
  max_questions_per_skill: number;
  max_followup_depth: number;
  max_duration_minutes: number;
  include_desired_skills: boolean;
  skill_eliminators: Record<string, number>;
}

const DEFAULT_SETTINGS: TechnicalEvaluationSettings = {
  min_score: 60,
  weight_required: 70,
  weight_desired: 30,
  threshold_recommended: 75,
  threshold_conditional: 60,
  max_questions_per_skill: 3,
  max_followup_depth: 2,
  max_duration_minutes: 25,
  include_desired_skills: true,
  skill_eliminators: {},
};

interface TechnicalAgentEvaluationTabProps {
  settings?: Record<string, unknown>;
  onSaveSettings: (settings: Record<string, unknown>) => void;
  isSaving: boolean;
}

export function TechnicalAgentEvaluationTab({ settings, onSaveSettings, isSaving }: TechnicalAgentEvaluationTabProps) {
  const [config, setConfig] = useState<TechnicalEvaluationSettings>(() => {
    const tech = (settings?.technical_evaluation ?? {}) as Partial<TechnicalEvaluationSettings>;
    return { ...DEFAULT_SETTINGS, ...tech };
  });
  const [advancedOpen, setAdvancedOpen] = useState(
    Object.keys(config.skill_eliminators || {}).length > 0
  );
  const [hasChanges, setHasChanges] = useState(false);
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillMin, setNewSkillMin] = useState(50);

  useEffect(() => {
    const tech = (settings?.technical_evaluation ?? {}) as Partial<TechnicalEvaluationSettings>;
    setConfig({ ...DEFAULT_SETTINGS, ...tech });
    setHasChanges(false);
  }, [settings]);

  const update = (patch: Partial<TechnicalEvaluationSettings>) => {
    setConfig((prev) => ({ ...prev, ...patch }));
    setHasChanges(true);
  };

  const handleWeightRequiredChange = (value: number) => {
    update({ weight_required: value, weight_desired: 100 - value });
  };

  const handleSave = () => {
    onSaveSettings({
      ...settings,
      technical_evaluation: config,
    });
    setHasChanges(false);
  };

  const addEliminator = () => {
    if (!newSkillName.trim()) return;
    update({
      skill_eliminators: {
        ...config.skill_eliminators,
        [newSkillName.trim()]: newSkillMin,
      },
    });
    setNewSkillName("");
    setNewSkillMin(50);
  };

  const removeEliminator = (skill: string) => {
    const next = { ...config.skill_eliminators };
    delete next[skill];
    update({ skill_eliminators: next });
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Critérios de Aprovação — Fit Técnico</h3>
          <p className="text-sm text-muted-foreground">
            Configure nota de corte e parâmetros de avaliação automática dos candidatos.
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

      {/* Minimum score */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Score Mínimo de Aprovação
          </CardTitle>
          <CardDescription>
            Candidatos abaixo deste percentual serão reprovados automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Slider
              value={[config.min_score]}
              onValueChange={([v]) => update({ min_score: v })}
              min={0}
              max={100}
              step={5}
              className="flex-1"
            />
            <span className="text-xl font-bold w-16 text-right tabular-nums">{config.min_score}%</span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>Flexível</span>
            <span>Rigoroso</span>
          </div>
        </CardContent>
      </Card>

      {/* Weights */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Scale className="h-4 w-4 text-primary" />
            Pesos na Avaliação
          </CardTitle>
          <CardDescription>
            Distribua a importância entre skills obrigatórias e desejáveis na composição do score final.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-sm w-28 shrink-0 font-medium">Obrigatórias</span>
              <Slider
                value={[config.weight_required]}
                onValueChange={([v]) => handleWeightRequiredChange(v)}
                min={50}
                max={100}
                step={5}
                className="flex-1"
              />
              <span className="text-sm font-mono w-10 text-right">{config.weight_required}%</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm w-28 shrink-0 text-muted-foreground">Desejáveis</span>
              <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-muted-foreground/40 rounded-full transition-all"
                  style={{ width: `${config.weight_desired}%` }}
                />
              </div>
              <span className="text-sm font-mono w-10 text-right text-muted-foreground">{config.weight_desired}%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommendation thresholds */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            Faixas de Recomendação
          </CardTitle>
          <CardDescription>
            Defina os limites para classificação automática do candidato.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
                Recomendado
              </Label>
              <div className="flex items-center gap-1">
                <span className="text-sm text-muted-foreground">≥</span>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={config.threshold_recommended}
                  onChange={(e) => update({ threshold_recommended: parseInt(e.target.value, 10) || 0 })}
                  className="w-20 h-8 text-sm"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
                Condicional
              </Label>
              <div className="flex items-center gap-1">
                <span className="text-sm text-muted-foreground">≥</span>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={config.threshold_conditional}
                  onChange={(e) => update({ threshold_conditional: parseInt(e.target.value, 10) || 0 })}
                  className="w-20 h-8 text-sm"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                Não recomendado
              </Label>
              <p className="text-sm text-muted-foreground pt-1">
                &lt; {config.threshold_conditional}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Interview parameters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Parâmetros da Entrevista
          </CardTitle>
          <CardDescription>
            Configure a estrutura e duração da entrevista técnica por IA.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Perguntas por skill</Label>
              <Input
                type="number"
                min={1}
                max={10}
                value={config.max_questions_per_skill}
                onChange={(e) => update({ max_questions_per_skill: parseInt(e.target.value, 10) || 1 })}
                className="h-9"
              />
              <p className="text-xs text-muted-foreground">Quantidade máxima de perguntas para cada skill avaliada.</p>
            </div>
            <div className="space-y-2">
              <Label>Profundidade de follow-up</Label>
              <Input
                type="number"
                min={0}
                max={5}
                value={config.max_followup_depth}
                onChange={(e) => update({ max_followup_depth: parseInt(e.target.value, 10) || 0 })}
                className="h-9"
              />
              <p className="text-xs text-muted-foreground">Níveis de aprofundamento após a pergunta inicial.</p>
            </div>
            <div className="space-y-2">
              <Label>Duração máxima (min)</Label>
              <Input
                type="number"
                min={5}
                max={60}
                value={config.max_duration_minutes}
                onChange={(e) => update({ max_duration_minutes: parseInt(e.target.value, 10) || 5 })}
                className="h-9"
              />
              <p className="text-xs text-muted-foreground">Tempo máximo para a entrevista.</p>
            </div>
            <div className="flex items-center gap-3 pt-5">
              <Switch
                checked={config.include_desired_skills}
                onCheckedChange={(v) => update({ include_desired_skills: v })}
              />
              <div>
                <Label>Incluir skills desejáveis</Label>
                <p className="text-xs text-muted-foreground">Avaliar também skills não obrigatórias.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advanced: skill eliminators */}
      <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
              <CardTitle className="text-base flex items-center gap-2">
                <ChevronRight className={cn("h-4 w-4 transition-transform", advancedOpen && "rotate-90")} />
                <ShieldAlert className="h-4 w-4 text-primary" />
                Eliminadores por Skill
              </CardTitle>
              <CardDescription>
                Score mínimo obrigatório em skills específicas. Candidatos abaixo serão reprovados independente do score geral.
              </CardDescription>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
              {/* Existing eliminators */}
              {Object.entries(config.skill_eliminators).length > 0 && (
                <div className="space-y-2">
                  {Object.entries(config.skill_eliminators).map(([skill, minScore]) => (
                    <div key={skill} className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
                      <span className="text-sm font-medium flex-1">{skill}</span>
                      <span className="text-sm text-muted-foreground">Score mín:</span>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={minScore}
                        onChange={(e) => {
                          update({
                            skill_eliminators: {
                              ...config.skill_eliminators,
                              [skill]: parseInt(e.target.value, 10) || 0,
                            },
                          });
                        }}
                        className="w-20 h-8 text-sm"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-destructive hover:text-destructive"
                        onClick={() => removeEliminator(skill)}
                      >
                        Remover
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add new eliminator */}
              <div className="flex items-end gap-3">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Nome da skill</Label>
                  <Input
                    placeholder="Ex: React, Python, SQL..."
                    value={newSkillName}
                    onChange={(e) => setNewSkillName(e.target.value)}
                    className="h-8 text-sm"
                    onKeyDown={(e) => e.key === "Enter" && addEliminator()}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Score mín.</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={newSkillMin}
                    onChange={(e) => setNewSkillMin(parseInt(e.target.value, 10) || 0)}
                    className="w-20 h-8 text-sm"
                  />
                </div>
                <Button variant="outline" size="sm" className="h-8" onClick={addEliminator} disabled={!newSkillName.trim()}>
                  Adicionar
                </Button>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Info box */}
      <div className="flex gap-2 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
        <Info className="h-4 w-4 shrink-0 mt-0.5" />
        <p>
          Quando um candidato concluir a entrevista técnica por IA, o score será comparado com estas configurações.
          Candidatos com score abaixo de <strong>{config.min_score}%</strong> ou que ativem um eliminador serão reprovados automaticamente.
          Candidatos com score ≥ <strong>{config.threshold_recommended}%</strong> serão marcados como "Recomendado".
        </p>
      </div>
    </div>
  );
}
