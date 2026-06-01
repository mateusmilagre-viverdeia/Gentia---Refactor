import { Check, X } from 'lucide-react';
import { PASSWORD_RULES } from '@/lib/passwordValidation';
import { cn } from '@/lib/utils';

interface PasswordStrengthIndicatorProps {
  password: string;
  className?: string;
}

export function PasswordStrengthIndicator({ password, className }: PasswordStrengthIndicatorProps) {
  return (
    <div className={cn('rounded-md border bg-muted/40 p-3 space-y-1.5', className)}>
      <p className="text-xs font-medium text-muted-foreground mb-2">
        Sua senha precisa atender a todas as regras abaixo:
      </p>
      {PASSWORD_RULES.map(rule => {
        const ok = rule.test(password);
        return (
          <div
            key={rule.id}
            className={cn(
              'flex items-center gap-2 text-xs transition-colors',
              ok ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'
            )}
          >
            {ok ? (
              <Check className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <X className="h-3.5 w-3.5 shrink-0 opacity-50" />
            )}
            <span>{rule.label}</span>
          </div>
        );
      })}
    </div>
  );
}
