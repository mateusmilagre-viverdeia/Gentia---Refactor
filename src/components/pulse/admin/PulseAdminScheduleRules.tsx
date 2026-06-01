import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { RefreshCw, Calendar, RotateCcw, Save, Heart, Clock, CalendarDays } from 'lucide-react';
import { PulseScheduleRule, UpdateScheduleRulesData } from '@/hooks/usePulseScheduleRules';
import { PulseDriver } from '@/types/pulse.types';

interface Props {
  rules: PulseScheduleRule | null;
  drivers: PulseDriver[];
  loading: boolean;
  onUpdate: (data: UpdateScheduleRulesData) => Promise<boolean>;
  onReset: () => Promise<boolean>;
  onRefresh: () => void;
}

const TIMEZONES = [
  { value: 'America/Sao_Paulo', label: 'São Paulo (GMT-3)' },
  { value: 'America/Manaus', label: 'Manaus (GMT-4)' },
  { value: 'America/Belem', label: 'Belém (GMT-3)' },
  { value: 'America/Fortaleza', label: 'Fortaleza (GMT-3)' },
  { value: 'America/Recife', label: 'Recife (GMT-3)' },
  { value: 'America/Cuiaba', label: 'Cuiabá (GMT-4)' },
  { value: 'America/Porto_Velho', label: 'Porto Velho (GMT-4)' },
  { value: 'America/Rio_Branco', label: 'Rio Branco (GMT-5)' },
];

const WEEKDAYS = [
  { value: 0, label: 'Dom', shortLabel: 'D' },
  { value: 1, label: 'Seg', shortLabel: 'S' },
  { value: 2, label: 'Ter', shortLabel: 'T' },
  { value: 3, label: 'Qua', shortLabel: 'Q' },
  { value: 4, label: 'Qui', shortLabel: 'Q' },
  { value: 5, label: 'Sex', shortLabel: 'S' },
  { value: 6, label: 'Sáb', shortLabel: 'S' },
];

export function PulseAdminScheduleRules({
  rules,
  drivers,
  loading,
  onUpdate,
  onReset,
  onRefresh,
}: Props) {
  const [saving, setSaving] = useState(false);
  const [localRules, setLocalRules] = useState<UpdateScheduleRulesData>({});
  const [hasChanges, setHasChanges] = useState(false);

  const activeDrivers = drivers.filter(d => d.is_active);

  const getValue = <K extends keyof UpdateScheduleRulesData>(
    key: K
  ): UpdateScheduleRulesData[K] | undefined => {
    if (key in localRules) return localRules[key];
    if (!rules) return undefined;
    return rules[key as keyof PulseScheduleRule] as UpdateScheduleRulesData[K];
  };

  const updateLocal = <K extends keyof UpdateScheduleRulesData>(
    key: K,
    value: UpdateScheduleRulesData[K]
  ) => {
    setLocalRules(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const toggleDriverInArray = (
    key: 'must_include_driver_keys' | 'prefer_driver_keys' | 'rotation_pool_driver_keys' | 'anonymous_driver_keys',
    driverKey: string
  ) => {
    const current = getValue(key) || [];
    const updated = current.includes(driverKey)
      ? current.filter(k => k !== driverKey)
      : [...current, driverKey];
    updateLocal(key, updated);
  };

  const handleSave = async () => {
    setSaving(true);
    const success = await onUpdate(localRules);
    if (success) {
      setLocalRules({});
      setHasChanges(false);
    }
    setSaving(false);
  };

  const handleReset = async () => {
    setSaving(true);
    await onReset();
    setLocalRules({});
    setHasChanges(false);
    setSaving(false);
  };

  const handleResetCultureRotation = async () => {
    setSaving(true);
    const success = await onUpdate({ culture_rotation_next_pillar: 'mission' });
    if (success) {
      setLocalRules({});
      setHasChanges(false);
    }
    setSaving(false);
  };

  if (loading || !rules) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Regras de Agendamento
            </CardTitle>
            <CardDescription>
              Configure como o Pulse gera as perguntas diárias.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Scheduling Section */}
        <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
          <h4 className="font-medium flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-500" />
            Horário e Dias de Envio
          </h4>
          
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Horário de Envio</Label>
              <Input
                type="time"
                value={getValue('send_time') ?? '08:59'}
                onChange={e => updateLocal('send_time', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Horário local para enviar o Pulse
              </p>
            </div>

            <div className="space-y-2">
              <Label>Fuso Horário</Label>
              <Select
                value={getValue('timezone') ?? 'America/Sao_Paulo'}
                onValueChange={v => updateLocal('timezone', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map(tz => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Dias da Semana
            </Label>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map(day => {
                const isSelected = (getValue('send_days') || [1,2,3,4,5]).includes(day.value);
                return (
                  <button
                    key={day.value}
                    onClick={() => {
                      const current = getValue('send_days') || [1,2,3,4,5];
                      const updated = isSelected
                        ? current.filter(d => d !== day.value)
                        : [...current, day.value].sort();
                      updateLocal('send_days', updated);
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      isSelected
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-border hover:border-primary/50'
                    }`}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Selecione os dias em que o Pulse será enviado
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Data de Início (opcional)</Label>
              <Input
                type="date"
                value={getValue('start_date') || ''}
                onChange={e => updateLocal('start_date', e.target.value || null)}
              />
            </div>
            <div className="space-y-2">
              <Label>Data de Término (opcional)</Label>
              <Input
                type="date"
                value={getValue('end_date') || ''}
                onChange={e => updateLocal('end_date', e.target.value || null)}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              checked={getValue('is_recurring') ?? true}
              onCheckedChange={v => updateLocal('is_recurring', v)}
            />
            <span className="text-sm">
              Repetir automaticamente nos dias selecionados
            </span>
          </div>
        </div>

        {/* Basic Settings */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Perguntas por Dia</Label>
            <Select
              value={String(getValue('daily_questions_count') ?? 3)}
              onValueChange={v => updateLocal('daily_questions_count', Number(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5].map(n => (
                  <SelectItem key={n} value={String(n)}>
                    {n} pergunta{n > 1 ? 's' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Bloquear Repetição (dias)</Label>
            <Input
              type="number"
              min={1}
              max={90}
              value={getValue('max_repeat_block_days') ?? 30}
              onChange={e => updateLocal('max_repeat_block_days', Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              Dias antes de repetir uma pergunta
            </p>
          </div>

          <div className="space-y-2">
            <Label>Status do Pulse</Label>
            <div className="flex items-center gap-3 pt-2">
              <Switch
                checked={getValue('is_active') ?? true}
                onCheckedChange={v => updateLocal('is_active', v)}
              />
              <span className={`text-sm font-medium ${getValue('is_active') ? 'text-green-600' : 'text-muted-foreground'}`}>
                {getValue('is_active') ? 'Ativo' : 'Pausado'}
              </span>
            </div>
          </div>
        </div>

        {/* Culture Configuration */}
        <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
          <h4 className="font-medium flex items-center gap-2">
            <Heart className="h-4 w-4 text-pink-500" />
            Configurações de Cultura
          </h4>
          
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Perguntas de Cultura por Dia</Label>
              <Select
                value={String(getValue('culture_questions_count') ?? 2)}
                onValueChange={v => updateLocal('culture_questions_count', Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[0, 1, 2, 3].map(n => (
                    <SelectItem key={n} value={String(n)}>
                      {n === 0 ? 'Nenhuma' : `${n} pergunta${n > 1 ? 's' : ''}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Quantidade de perguntas sobre cultura organizacional
              </p>
            </div>

            <div className="space-y-2">
              <Label>Bloquear Repetição (Cultura) (dias)</Label>
              <Input
                type="number"
                min={0}
                max={365}
                value={getValue('culture_max_repeat_block_days') ?? 14}
                onChange={e => updateLocal('culture_max_repeat_block_days', Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Período mínimo antes de repetir perguntas de Cultura.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              checked={getValue('culture_rotation_enabled') ?? true}
              onCheckedChange={v => updateLocal('culture_rotation_enabled', v)}
            />
            <span className="text-sm">
              Rotação fixa: 1 Valor + 1 pilar (Missão → Visão → Decisão → Indicadores → Projetos → Energia → Desenvolvimento)
            </span>
          </div>

          <div className="text-sm text-muted-foreground">
            Próximo pilar (não-valor): <span className="font-medium text-foreground">{getValue('culture_rotation_next_pillar') ?? 'mission'}</span>
          </div>

          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResetCultureRotation}
              disabled={saving}
            >
              Resetar para Missão (Dia 1)
            </Button>
          </div>
        </div>

        {/* Driver Configuration */}
        <div className="space-y-4">
          <h4 className="font-medium">Configuração de Drivers</h4>
          
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              Drivers Obrigatórios
              <Badge variant="outline" className="text-xs">Sempre incluídos</Badge>
            </Label>
            <div className="flex flex-wrap gap-2">
              {activeDrivers.map(driver => (
                <button
                  key={driver.key}
                  onClick={() => toggleDriverInArray('must_include_driver_keys', driver.key)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    (getValue('must_include_driver_keys') || []).includes(driver.key)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background border-border hover:border-primary/50'
                  }`}
                >
                  {driver.name}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              Drivers Preferenciais
              <Badge variant="outline" className="text-xs">Prioridade na rotação</Badge>
            </Label>
            <div className="flex flex-wrap gap-2">
              {activeDrivers.map(driver => (
                <button
                  key={driver.key}
                  onClick={() => toggleDriverInArray('prefer_driver_keys', driver.key)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    (getValue('prefer_driver_keys') || []).includes(driver.key)
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-background border-border hover:border-blue-500/50'
                  }`}
                >
                  {driver.name}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              Pool de Rotação
              <Badge variant="outline" className="text-xs">Drivers que podem aparecer</Badge>
            </Label>
            <div className="flex flex-wrap gap-2">
              {activeDrivers.map(driver => (
                <button
                  key={driver.key}
                  onClick={() => toggleDriverInArray('rotation_pool_driver_keys', driver.key)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    (getValue('rotation_pool_driver_keys') || []).includes(driver.key)
                      ? 'bg-green-500 text-white border-green-500'
                      : 'bg-background border-border hover:border-green-500/50'
                  }`}
                >
                  {driver.name}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Deixe vazio para incluir todos os drivers ativos na rotação.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              Drivers Anônimos
              <Badge variant="outline" className="text-xs">Respostas sempre anônimas</Badge>
            </Label>
            <div className="flex flex-wrap gap-2">
              {activeDrivers.map(driver => (
                <button
                  key={driver.key}
                  onClick={() => toggleDriverInArray('anonymous_driver_keys', driver.key)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    (getValue('anonymous_driver_keys') || []).includes(driver.key)
                      ? 'bg-orange-500 text-white border-orange-500'
                      : 'bg-background border-border hover:border-orange-500/50'
                  }`}
                >
                  {driver.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button variant="outline" onClick={handleReset} disabled={saving}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Restaurar Padrões
          </Button>
          <Button onClick={handleSave} disabled={saving || !hasChanges}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
