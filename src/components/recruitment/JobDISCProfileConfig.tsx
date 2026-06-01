import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useJobDISCProfile, JobDISCProfileInput } from '@/hooks/useJobDISCProfile';
import { DISCDimension, DISC_DIMENSIONS } from '@/types/disc.types';
import { Brain, Save, Trash2, Loader2, Settings2, Zap, AlertTriangle, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface JobDISCProfileConfigProps {
  jobId?: string;
  className?: string;
  onSave?: () => void;
  compact?: boolean;
  // Draft mode: when provided, the component does not persist to DB.
  // It seeds the form from `draftValue` and calls `onDraftChange` on save.
  draftValue?: JobDISCProfileInput | null;
  onDraftChange?: (value: JobDISCProfileInput) => void;
}

// Presets for common roles
const DISC_PRESETS = {
  vendas: {
    name: 'Vendas',
    target_d: 70, target_i: 70, target_s: 40, target_c: 50,
    primary_profile: 'D' as DISCDimension, secondary_profile: 'I' as DISCDimension,
  },
  suporte: {
    name: 'Suporte / Atendimento',
    target_d: 30, target_i: 65, target_s: 70, target_c: 60,
    primary_profile: 'S' as DISCDimension, secondary_profile: 'I' as DISCDimension,
  },
  mkt_performance: {
    name: 'Marketing de Performance',
    target_d: 60, target_i: 35, target_s: 40, target_c: 70,
    primary_profile: 'C' as DISCDimension, secondary_profile: 'D' as DISCDimension,
  },
  social_media: {
    name: 'Social Media',
    target_d: 50, target_i: 70, target_s: 40, target_c: 65,
    primary_profile: 'I' as DISCDimension, secondary_profile: 'C' as DISCDimension,
  },
  pre_vendas: {
    name: 'Pré-vendas / Qualificação',
    target_d: 65, target_i: 70, target_s: 55, target_c: 70,
    primary_profile: 'I' as DISCDimension, secondary_profile: 'C' as DISCDimension,
  },
  consultor: {
    name: 'Consultor',
    target_d: 60, target_i: 70, target_s: 70, target_c: 70,
    primary_profile: 'C' as DISCDimension, secondary_profile: 'S' as DISCDimension,
  },
  lider: {
    name: 'Líder',
    target_d: 70, target_i: 70, target_s: 60, target_c: 70,
    primary_profile: 'D' as DISCDimension, secondary_profile: 'I' as DISCDimension,
  },
  programador: {
    name: 'Programador',
    target_d: 30, target_i: 20, target_s: 60, target_c: 70,
    primary_profile: 'C' as DISCDimension, secondary_profile: 'S' as DISCDimension,
  },
  designer: {
    name: 'Designer',
    target_d: 40, target_i: 65, target_s: 50, target_c: 70,
    primary_profile: 'C' as DISCDimension, secondary_profile: 'I' as DISCDimension,
  },
  recursos_humanos: {
    name: 'RH / Gente e Gestão',
    target_d: 40, target_i: 60, target_s: 70, target_c: 70,
    primary_profile: 'S' as DISCDimension, secondary_profile: 'C' as DISCDimension,
  },
  financeiro: {
    name: 'Financeiro',
    target_d: 35, target_i: 25, target_s: 65, target_c: 70,
    primary_profile: 'C' as DISCDimension, secondary_profile: 'S' as DISCDimension,
  },
  direcao_estrategia: {
    name: 'Direção / Estratégia',
    target_d: 70, target_i: 60, target_s: 45, target_c: 65,
    primary_profile: 'D' as DISCDimension, secondary_profile: 'C' as DISCDimension,
  },
  marketing: {
    name: 'Marketing',
    target_d: 50, target_i: 70, target_s: 45, target_c: 65,
    primary_profile: 'I' as DISCDimension, secondary_profile: 'C' as DISCDimension,
  },
  operacoes: {
    name: 'Operações / Entrega / Projetos',
    target_d: 55, target_i: 40, target_s: 70, target_c: 70,
    primary_profile: 'S' as DISCDimension, secondary_profile: 'C' as DISCDimension,
  },
  customer_success: {
    name: 'Customer Success / CS',
    target_d: 40, target_i: 65, target_s: 70, target_c: 60,
    primary_profile: 'S' as DISCDimension, secondary_profile: 'I' as DISCDimension,
  },
  administrativo: {
    name: 'Administrativo',
    target_d: 30, target_i: 35, target_s: 70, target_c: 70,
    primary_profile: 'C' as DISCDimension, secondary_profile: 'S' as DISCDimension,
  },
  tecnologia: {
    name: 'Tecnologia / TI',
    target_d: 35, target_i: 25, target_s: 60, target_c: 70,
    primary_profile: 'C' as DISCDimension, secondary_profile: 'S' as DISCDimension,
  },
  produto: {
    name: 'Produto / Desenvolvimento de Soluções',
    target_d: 60, target_i: 50, target_s: 55, target_c: 70,
    primary_profile: 'C' as DISCDimension, secondary_profile: 'D' as DISCDimension,
  },
  juridico: {
    name: 'Jurídico / Compliance',
    target_d: 25, target_i: 20, target_s: 60, target_c: 70,
    primary_profile: 'C' as DISCDimension, secondary_profile: 'S' as DISCDimension,
  },
  bi_dados: {
    name: 'BI / Dados / Performance',
    target_d: 50, target_i: 25, target_s: 50, target_c: 70,
    primary_profile: 'C' as DISCDimension, secondary_profile: 'D' as DISCDimension,
  },
  processos_pmo: {
    name: 'Processos / Qualidade / PMO',
    target_d: 50, target_i: 30, target_s: 65, target_c: 70,
    primary_profile: 'C' as DISCDimension, secondary_profile: 'S' as DISCDimension,
  },
  parcerias: {
    name: 'Parcerias / Canais',
    target_d: 60, target_i: 70, target_s: 50, target_c: 55,
    primary_profile: 'I' as DISCDimension, secondary_profile: 'D' as DISCDimension,
  },
};

type PresetKey = keyof typeof DISC_PRESETS;

export function JobDISCProfileConfig({ jobId, className, onSave, compact, draftValue, onDraftChange }: JobDISCProfileConfigProps) {
  const isDraftMode = !!onDraftChange;
  const { profile, isLoading, saveProfile, deleteProfile, isSaving, isDeleting } = useJobDISCProfile(jobId);
  
  const [mode, setMode] = useState<'simple' | 'advanced'>('simple');
  
  const [formData, setFormData] = useState<{
    primary_profile: DISCDimension | null;
    secondary_profile: DISCDimension | null;
    min_match_score: number;
    weight_d: number;
    weight_i: number;
    weight_s: number;
    weight_c: number;
    // Advanced mode
    target_d: number;
    target_i: number;
    target_s: number;
    target_c: number;
    tolerance: number;
    eliminator_d: number | null;
    eliminator_i: number | null;
    eliminator_s: number | null;
    eliminator_c: number | null;
    eliminator_d_enabled: boolean;
    eliminator_i_enabled: boolean;
    eliminator_s_enabled: boolean;
    eliminator_c_enabled: boolean;
  }>({
    primary_profile: null,
    secondary_profile: null,
    min_match_score: 70,
    weight_d: 25,
    weight_i: 25,
    weight_s: 25,
    weight_c: 25,
    target_d: 50,
    target_i: 50,
    target_s: 50,
    target_c: 50,
    tolerance: 15,
    eliminator_d: null,
    eliminator_i: null,
    eliminator_s: null,
    eliminator_c: null,
    eliminator_d_enabled: false,
    eliminator_i_enabled: false,
    eliminator_s_enabled: false,
    eliminator_c_enabled: false,
  });

  // Load existing profile (DB or draft)
  useEffect(() => {
    const source: any = isDraftMode ? draftValue : profile;
    if (source) {
      setFormData({
        primary_profile: source.primary_profile ?? null,
        secondary_profile: source.secondary_profile ?? null,
        min_match_score: source.min_match_score ?? 70,
        weight_d: source.weight_d ?? 25,
        weight_i: source.weight_i ?? 25,
        weight_s: source.weight_s ?? 25,
        weight_c: source.weight_c ?? 25,
        target_d: source.target_d ?? 50,
        target_i: source.target_i ?? 50,
        target_s: source.target_s ?? 50,
        target_c: source.target_c ?? 50,
        tolerance: source.tolerance ?? 15,
        eliminator_d: source.eliminator_d ?? null,
        eliminator_i: source.eliminator_i ?? null,
        eliminator_s: source.eliminator_s ?? null,
        eliminator_c: source.eliminator_c ?? null,
        eliminator_d_enabled: source.eliminator_d != null,
        eliminator_i_enabled: source.eliminator_i != null,
        eliminator_s_enabled: source.eliminator_s != null,
        eliminator_c_enabled: source.eliminator_c != null,
      });
      setMode(source.use_advanced_mode ? 'advanced' : 'simple');
    }
  }, [profile, draftValue, isDraftMode]);

  const handleSave = () => {
    if (mode === 'simple' && !formData.primary_profile) return;
    
    const input: JobDISCProfileInput = {
      job_id: jobId ?? '',
      primary_profile: formData.primary_profile || 'D',
      secondary_profile: formData.secondary_profile,
      min_match_score: formData.min_match_score,
      weight_d: formData.weight_d,
      weight_i: formData.weight_i,
      weight_s: formData.weight_s,
      weight_c: formData.weight_c,
      use_advanced_mode: mode === 'advanced',
      target_d: formData.target_d,
      target_i: formData.target_i,
      target_s: formData.target_s,
      target_c: formData.target_c,
      tolerance: formData.tolerance,
      eliminator_d: formData.eliminator_d_enabled ? formData.eliminator_d : null,
      eliminator_i: formData.eliminator_i_enabled ? formData.eliminator_i : null,
      eliminator_s: formData.eliminator_s_enabled ? formData.eliminator_s : null,
      eliminator_c: formData.eliminator_c_enabled ? formData.eliminator_c : null,
    };
    
    if (isDraftMode) {
      onDraftChange?.(input);
      onSave?.();
      return;
    }

    saveProfile(input, {
      onSuccess: () => {
        onSave?.();
      },
    });
  };

  const handleProfileClick = (dimension: DISCDimension, isPrimary: boolean) => {
    if (isPrimary) {
      setFormData(prev => ({
        ...prev,
        primary_profile: prev.primary_profile === dimension ? null : dimension,
        secondary_profile: prev.secondary_profile === dimension ? null : prev.secondary_profile,
      }));
    } else {
      if (formData.primary_profile === dimension) return;
      setFormData(prev => ({
        ...prev,
        secondary_profile: prev.secondary_profile === dimension ? null : dimension,
      }));
    }
  };

  const applyPreset = (presetKey: PresetKey) => {
    const preset = DISC_PRESETS[presetKey];
    const hasElimD = 'eliminator_d' in preset;
    const hasElimI = 'eliminator_i' in preset;
    const hasElimS = 'eliminator_s' in preset;
    const hasElimC = 'eliminator_c' in preset;
    
    setFormData(prev => ({
      ...prev,
      target_d: preset.target_d,
      target_i: preset.target_i,
      target_s: preset.target_s,
      target_c: preset.target_c,
      primary_profile: 'primary_profile' in preset ? preset.primary_profile : prev.primary_profile,
      secondary_profile: 'secondary_profile' in preset ? preset.secondary_profile : prev.secondary_profile,
      eliminator_d: hasElimD ? (preset as { eliminator_d?: number }).eliminator_d ?? null : null,
      eliminator_i: hasElimI ? (preset as { eliminator_i?: number }).eliminator_i ?? null : null,
      eliminator_s: hasElimS ? (preset as { eliminator_s?: number }).eliminator_s ?? null : null,
      eliminator_c: hasElimC ? (preset as { eliminator_c?: number }).eliminator_c ?? null : null,
      eliminator_d_enabled: hasElimD,
      eliminator_i_enabled: hasElimI,
      eliminator_s_enabled: hasElimS,
      eliminator_c_enabled: hasElimC,
    }));
  };

  if (isLoading) {
    if (compact) {
      return (
        <div className={cn("flex items-center justify-center py-8", className)}>
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      );
    }
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const dimensions: DISCDimension[] = ['D', 'I', 'S', 'C'];

  const content = (
    <div className="space-y-6">
        {/* Mode Toggle */}
        <Tabs value={mode} onValueChange={(v) => setMode(v as 'simple' | 'advanced')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="simple" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Modo Simples
            </TabsTrigger>
            <TabsTrigger value="advanced" className="flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              Modo Avançado
            </TabsTrigger>
          </TabsList>

          {/* Simple Mode */}
          <TabsContent value="simple" className="space-y-6 mt-4">
            {/* Primary Profile Selection */}
            <div className="space-y-3">
              <Label>Perfil Primário *</Label>
              <div className="grid grid-cols-4 gap-2">
                {dimensions.map((dim) => {
                  const info = DISC_DIMENSIONS[dim];
                  const isSelected = formData.primary_profile === dim;
                  
                  return (
                    <button
                      key={dim}
                      type="button"
                      onClick={() => handleProfileClick(dim, true)}
                      className={cn(
                        "flex flex-col items-center gap-1 p-3 rounded-lg border transition-all",
                        isSelected
                          ? `${info.bgColor} text-white border-transparent`
                          : "border-border hover:border-primary/50 bg-card"
                      )}
                    >
                      <span className="text-xl font-bold">{dim}</span>
                      <span className="text-xs">{info.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Secondary Profile Selection */}
            <div className="space-y-3">
              <Label>Perfil Secundário (opcional)</Label>
              <div className="grid grid-cols-4 gap-2">
                {dimensions.map((dim) => {
                  const info = DISC_DIMENSIONS[dim];
                  const isSelected = formData.secondary_profile === dim;
                  const isDisabled = formData.primary_profile === dim;
                  
                  return (
                    <button
                      key={dim}
                      type="button"
                      onClick={() => handleProfileClick(dim, false)}
                      disabled={isDisabled}
                      className={cn(
                        "flex flex-col items-center gap-1 p-3 rounded-lg border transition-all",
                        isDisabled && "opacity-30 cursor-not-allowed",
                        isSelected
                          ? `${info.bgColor} text-white border-transparent`
                          : "border-border hover:border-primary/50 bg-card"
                      )}
                    >
                      <span className="text-xl font-bold">{dim}</span>
                      <span className="text-xs">{info.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Profile Summary */}
            {formData.primary_profile && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                <span className="text-sm text-muted-foreground">Perfil desejado:</span>
                <Badge className={cn(DISC_DIMENSIONS[formData.primary_profile].bgColor, "text-white")}>
                  {formData.primary_profile} - {DISC_DIMENSIONS[formData.primary_profile].name}
                </Badge>
                {formData.secondary_profile && (
                  <>
                    <span className="text-muted-foreground">/</span>
                    <Badge variant="outline" className={DISC_DIMENSIONS[formData.secondary_profile].color}>
                      {formData.secondary_profile} - {DISC_DIMENSIONS[formData.secondary_profile].name}
                    </Badge>
                  </>
                )}
              </div>
            )}

            <p className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg flex items-start gap-2">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              No modo simples, o sistema assume targets fixos: Primário=80, Secundário=60, Outros=30.
              Use o Modo Avançado para definir targets individuais por dimensão.
            </p>
          </TabsContent>

          {/* Advanced Mode */}
          <TabsContent value="advanced" className="space-y-6 mt-4">
            {/* Presets */}
            <div className="space-y-3">
              <Label>Templates por Cargo</Label>
              <div className="flex flex-wrap gap-2">
                {(Object.entries(DISC_PRESETS) as [PresetKey, typeof DISC_PRESETS[PresetKey]][]).map(([key, preset]) => (
                  <Button
                    key={key}
                    variant="outline"
                    size="sm"
                    onClick={() => applyPreset(key)}
                  >
                    {preset.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* Individual Targets */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Targets Ideais por Dimensão</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Defina o score ideal (0-100) para cada dimensão. Candidatos serão avaliados pela proximidade a estes targets.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              
              {dimensions.map((dim) => {
                const info = DISC_DIMENSIONS[dim];
                const targetKey = `target_${dim.toLowerCase()}` as keyof typeof formData;
                const value = formData[targetKey] as number;
                
                return (
                  <div key={dim} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={cn("text-sm font-medium", info.color)}>
                        {dim} - {info.name}
                      </span>
                      <span className="text-sm font-semibold tabular-nums w-12 text-right">{value}</span>
                    </div>
                    <Slider
                      value={[value]}
                      onValueChange={([newValue]) => 
                        setFormData(prev => ({ ...prev, [targetKey]: newValue }))
                      }
                      min={0}
                      max={100}
                      step={5}
                      className="w-full"
                    />
                  </div>
                );
              })}
            </div>

            {/* Elimination Criteria */}
            <div className="space-y-4 p-4 border border-destructive/20 rounded-lg bg-destructive/5">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <Label className="text-destructive">Critérios Eliminatórios (opcional)</Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Candidatos abaixo destes mínimos serão automaticamente eliminados, independente do score geral.
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                {dimensions.map((dim) => {
                  const info = DISC_DIMENSIONS[dim];
                  const enabledKey = `eliminator_${dim.toLowerCase()}_enabled` as keyof typeof formData;
                  const valueKey = `eliminator_${dim.toLowerCase()}` as keyof typeof formData;
                  const isEnabled = formData[enabledKey] as boolean;
                  const value = formData[valueKey] as number | null;
                  
                  return (
                    <div key={dim} className="flex items-center gap-3">
                      <Checkbox
                        id={enabledKey}
                        checked={isEnabled}
                        onCheckedChange={(checked) => 
                          setFormData(prev => ({
                            ...prev,
                            [enabledKey]: !!checked,
                            [valueKey]: checked ? (prev[valueKey] ?? 50) : null,
                          }))
                        }
                      />
                      <label 
                        htmlFor={enabledKey}
                        className={cn("text-sm font-medium cursor-pointer", info.color)}
                      >
                        {dim} mínimo:
                      </label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={value ?? ''}
                        onChange={(e) => 
                          setFormData(prev => ({
                            ...prev,
                            [valueKey]: e.target.value ? parseInt(e.target.value) : null,
                          }))
                        }
                        disabled={!isEnabled}
                        className="w-16 h-8 text-center"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tolerance */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label>Margem de Tolerância</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>Diferenças menores que esta margem não serão penalizadas. Ex: com tolerância 15, um candidato com D=60 é considerado "perfeito" para um target D=70.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <span className="text-sm font-semibold">±{formData.tolerance} pontos</span>
              </div>
              <Slider
                value={[formData.tolerance]}
                onValueChange={([value]) => 
                  setFormData(prev => ({ ...prev, tolerance: value }))
                }
                min={0}
                max={30}
                step={5}
                className="w-full"
              />
            </div>
          </TabsContent>
        </Tabs>

        {/* Dimension Weights (both modes) */}
        <div className="space-y-4 pt-4 border-t">
          <Label>Pesos por Dimensão</Label>
          <p className="text-xs text-muted-foreground">
            Defina a importância de cada dimensão no cálculo do match
          </p>
          
          {dimensions.map((dim) => {
            const info = DISC_DIMENSIONS[dim];
            const weightKey = `weight_${dim.toLowerCase()}` as keyof typeof formData;
            const value = formData[weightKey] as number;
            
            return (
              <div key={dim} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className={cn("text-sm font-medium", info.color)}>
                    {dim} - {info.name}
                  </span>
                  <span className="text-sm text-muted-foreground">{value}%</span>
                </div>
                <Slider
                  value={[value]}
                  onValueChange={([newValue]) => 
                    setFormData(prev => ({ ...prev, [weightKey]: newValue }))
                  }
                  min={0}
                  max={100}
                  step={5}
                  className="w-full"
                />
              </div>
            );
          })}
        </div>

        {/* Minimum Match Score */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Score Mínimo de Match</Label>
            <span className="text-lg font-semibold text-primary">{formData.min_match_score}%</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Candidatos abaixo deste score serão marcados como "não recomendados"
          </p>
          <Slider
            value={[formData.min_match_score]}
            onValueChange={([value]) => 
              setFormData(prev => ({ ...prev, min_match_score: value }))
            }
            min={0}
            max={100}
            step={5}
            className="w-full"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-3">
            {!isDraftMode && profile && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteProfile()}
                disabled={isDeleting}
                className="text-destructive hover:text-destructive"
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Remover Perfil
              </Button>
            )}
            {!isDraftMode && profile?.updated_at && (
              <span className="text-xs text-muted-foreground">
                Último salvamento: {new Date(profile.updated_at).toLocaleString('pt-BR')}
              </span>
            )}
            {isDraftMode && (
              <span className="text-xs text-muted-foreground">
                O perfil será salvo quando você concluir a criação da vaga.
              </span>
            )}
          </div>
          
          <Button
            onClick={handleSave}
            disabled={(mode === 'simple' && !formData.primary_profile) || isSaving}
            className="ml-auto"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {isDraftMode ? 'Aplicar Perfil' : 'Salvar Perfil'}
          </Button>
        </div>
      </div>
  );

  if (compact) {
    return <div className={className}>{content}</div>;
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          Perfil DISC Desejado
        </CardTitle>
        <CardDescription>
          Configure o perfil comportamental ideal para esta vaga. O sistema calculará 
          automaticamente o match com cada candidato.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  );
}