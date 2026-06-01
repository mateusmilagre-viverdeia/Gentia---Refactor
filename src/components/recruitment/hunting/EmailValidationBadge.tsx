import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertTriangle, HelpCircle, Trash2 } from 'lucide-react';

type Status = 'valid' | 'invalid' | 'catchall' | 'disposable' | 'unknown' | null | undefined;

interface Props {
  status: Status;
  className?: string;
}

const CONFIG: Record<NonNullable<Status>, { label: string; variant: 'default' | 'destructive' | 'secondary' | 'outline'; Icon: typeof CheckCircle2; cls: string }> = {
  valid: { label: 'Email válido', variant: 'default', Icon: CheckCircle2, cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30' },
  invalid: { label: 'Email inválido', variant: 'destructive', Icon: XCircle, cls: 'bg-destructive/15 text-destructive border-destructive/30' },
  catchall: { label: 'Catch-all', variant: 'secondary', Icon: AlertTriangle, cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30' },
  disposable: { label: 'Descartável', variant: 'destructive', Icon: Trash2, cls: 'bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30' },
  unknown: { label: 'Não verificado', variant: 'outline', Icon: HelpCircle, cls: 'text-muted-foreground' },
};

export function EmailValidationBadge({ status, className }: Props) {
  const cfg = CONFIG[status ?? 'unknown'] ?? CONFIG.unknown;
  const Icon = cfg.Icon;
  return (
    <Badge variant="outline" className={`gap-1 text-[10px] py-0 px-1.5 h-5 ${cfg.cls} ${className ?? ''}`}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </Badge>
  );
}
