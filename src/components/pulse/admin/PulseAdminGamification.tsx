import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Trophy, Coins } from 'lucide-react';
import { PulseGamificationRule } from '@/hooks/usePulseGamificationRules';

interface Props {
  rules: PulseGamificationRule[];
  loading: boolean;
  onToggle: (ruleId: string, isActive: boolean) => Promise<boolean>;
  onUpdatePoints: (ruleId: string, points: number) => Promise<boolean>;
  onRefresh: () => void;
}

const EVENT_LABELS: Record<string, { label: string; description: string; icon: string }> = {
  pulse_response: {
    label: 'Resposta do Pulse',
    description: 'Pontos ganhos ao responder o Pulse diário',
    icon: '✅',
  },
  streak_3: {
    label: 'Streak de 3 dias',
    description: 'Bônus por manter streak de 3 dias',
    icon: '🔥',
  },
  streak_7: {
    label: 'Streak de 7 dias',
    description: 'Bônus por manter streak de 7 dias',
    icon: '🔥🔥',
  },
  streak_30: {
    label: 'Streak de 30 dias',
    description: 'Bônus por manter streak de 30 dias',
    icon: '🔥🔥🔥',
  },
  first_response: {
    label: 'Primeira Resposta',
    description: 'Bônus por responder o primeiro Pulse',
    icon: '🎉',
  },
  perfect_week: {
    label: 'Semana Perfeita',
    description: 'Bônus por responder todos os dias da semana',
    icon: '⭐',
  },
  badge_unlocked: {
    label: 'Badge Desbloqueada',
    description: 'Pontos por desbloquear uma badge',
    icon: '🏆',
  },
  level_up: {
    label: 'Subiu de Nível',
    description: 'Bônus por subir de nível',
    icon: '🚀',
  },
};

export function PulseAdminGamification({
  rules,
  loading,
  onToggle,
  onUpdatePoints,
  onRefresh,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number>(0);

  const handleSavePoints = async (ruleId: string) => {
    await onUpdatePoints(ruleId, editValue);
    setEditingId(null);
  };

  const startEditing = (rule: PulseGamificationRule) => {
    setEditingId(rule.id);
    setEditValue(rule.points);
  };

  const getRuleInfo = (eventKey: string) => {
    return EVENT_LABELS[eventKey] || {
      label: eventKey,
      description: 'Regra de gamificação',
      icon: '📌',
    };
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16 w-full" />)}
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
              <Trophy className="h-5 w-5 text-primary" />
              Regras de Gamificação
            </CardTitle>
            <CardDescription>
              Configure os pontos concedidos para cada ação no Pulse.
            </CardDescription>
          </div>
          <Button variant="outline" size="icon" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {rules.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma regra de gamificação configurada.
          </div>
        ) : (
          <div className="space-y-3">
            {rules.map(rule => {
              const info = getRuleInfo(rule.event_key);
              return (
                <div
                  key={rule.id}
                  className={`flex items-center justify-between p-4 rounded-lg border bg-card transition-opacity ${
                    !rule.is_active ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{info.icon}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{info.label}</span>
                        {rule.is_default && (
                          <Badge variant="secondary" className="text-xs">Padrão</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{info.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {editingId === rule.id ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={editValue}
                          onChange={e => setEditValue(Number(e.target.value))}
                          className="w-20"
                          min={0}
                        />
                        <Button size="sm" onClick={() => handleSavePoints(rule.id)}>
                          Salvar
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                          Cancelar
                        </Button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEditing(rule)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-muted hover:bg-muted/80 transition-colors"
                      >
                        <Coins className="h-4 w-4 text-yellow-500" />
                        <span className="font-medium">{rule.points}</span>
                        <span className="text-sm text-muted-foreground">pts</span>
                      </button>
                    )}
                    <Switch
                      checked={rule.is_active}
                      onCheckedChange={checked => onToggle(rule.id, checked)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <h4 className="font-medium mb-2">Como funciona a gamificação</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Usuários ganham pontos ao realizar ações no Pulse</li>
            <li>• Pontos acumulados determinam o nível do usuário</li>
            <li>• Streaks (sequências de respostas) dão bônus especiais</li>
            <li>• Badges são desbloqueadas automaticamente ao atingir critérios</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
