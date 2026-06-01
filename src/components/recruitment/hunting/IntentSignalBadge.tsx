import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TrendingUp, ArrowRightLeft, Briefcase, Activity, Sparkles, MapPin, Award, Clock } from 'lucide-react';

export type IntentSignalType =
  | 'open_to_work'
  | 'job_change'
  | 'promotion'
  | 'company_layoff'
  | 'activity_spike'
  | 'new_skill'
  | 'location_change'
  | 'tenure_milestone';

export interface IntentSignal {
  signal_type: IntentSignalType;
  signal_strength: number;
  evidence?: Record<string, unknown>;
}

const SIGNAL_META: Record<IntentSignalType, { label: string; icon: any; tone: string; help: string }> = {
  open_to_work:      { label: 'Aberto a oportunidades', icon: Sparkles, tone: 'bg-emerald-500/15 text-emerald-700 border-emerald-300 dark:text-emerald-300', help: 'Sinalizou abertura no LinkedIn' },
  job_change:        { label: 'Mudou de empresa', icon: ArrowRightLeft, tone: 'bg-blue-500/15 text-blue-700 border-blue-300 dark:text-blue-300', help: 'Trocou de empresa recentemente — janela quente' },
  promotion:         { label: 'Promovido', icon: TrendingUp, tone: 'bg-violet-500/15 text-violet-700 border-violet-300 dark:text-violet-300', help: 'Promoção recente na mesma empresa' },
  company_layoff:    { label: 'Empresa em layoff', icon: Briefcase, tone: 'bg-orange-500/15 text-orange-700 border-orange-300 dark:text-orange-300', help: 'Empresa atual em onda de demissões' },
  activity_spike:    { label: 'Mais ativo', icon: Activity, tone: 'bg-pink-500/15 text-pink-700 border-pink-300 dark:text-pink-300', help: 'Aumento de atividade nas redes' },
  new_skill:         { label: 'Nova skill', icon: Award, tone: 'bg-cyan-500/15 text-cyan-700 border-cyan-300 dark:text-cyan-300', help: 'Adicionou novas competências' },
  location_change:   { label: 'Mudou de cidade', icon: MapPin, tone: 'bg-amber-500/15 text-amber-700 border-amber-300 dark:text-amber-300', help: 'Mudança recente de localização' },
  tenure_milestone:  { label: 'Tempo de casa', icon: Clock, tone: 'bg-slate-500/15 text-slate-700 border-slate-300 dark:text-slate-300', help: 'Atingiu marco de tempo na empresa atual' },
};

interface IntentSignalBadgeProps {
  signal: IntentSignal;
  size?: 'sm' | 'md';
}

export function IntentSignalBadge({ signal, size = 'sm' }: IntentSignalBadgeProps) {
  const meta = SIGNAL_META[signal.signal_type];
  if (!meta) return null;
  const Icon = meta.icon;
  const evidenceText = signal.evidence
    ? Object.entries(signal.evidence).slice(0, 3).map(([k, v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`).join(' · ')
    : '';

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={`${meta.tone} gap-1 ${size === 'sm' ? 'h-5 px-1.5 text-[10px]' : 'h-6 px-2 text-xs'}`}>
            <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
            <span>{meta.label}</span>
            {signal.signal_strength >= 70 && <span className="ml-0.5 opacity-70">·{signal.signal_strength}</span>}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="text-xs font-medium">{meta.help}</p>
          {evidenceText && <p className="text-[11px] text-muted-foreground mt-1">{evidenceText}</p>}
          <p className="text-[10px] text-muted-foreground mt-1">Força: {signal.signal_strength}/100</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface IntentSignalsListProps {
  signals: IntentSignal[] | null | undefined;
  max?: number;
  size?: 'sm' | 'md';
}

export function IntentSignalsList({ signals, max = 3, size = 'sm' }: IntentSignalsListProps) {
  if (!signals || signals.length === 0) return null;
  const sorted = [...signals].sort((a, b) => b.signal_strength - a.signal_strength).slice(0, max);
  return (
    <div className="flex flex-wrap gap-1">
      {sorted.map((s, i) => (
        <IntentSignalBadge key={`${s.signal_type}-${i}`} signal={s} size={size} />
      ))}
      {signals.length > max && (
        <Badge variant="outline" className="h-5 px-1.5 text-[10px]">+{signals.length - max}</Badge>
      )}
    </div>
  );
}
