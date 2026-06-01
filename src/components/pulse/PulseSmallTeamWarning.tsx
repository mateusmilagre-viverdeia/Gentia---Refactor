import { Shield, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface PulseSmallTeamWarningProps {
  teamSize: number;
  threshold: number;
  variant?: 'banner' | 'compact';
}

export function PulseSmallTeamWarning({
  teamSize,
  threshold,
  variant = 'banner',
}: PulseSmallTeamWarningProps) {
  if (variant === 'compact') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 text-xs rounded-md">
              <Shield className="h-3 w-3" />
              <span>Dados agregados</span>
              <Info className="h-3 w-3" />
            </div>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p>
              Para proteger a privacidade, respostas anônimas são mostradas apenas
              como médias semanais quando a equipe tem menos de {threshold} membros.
            </p>
            <p className="mt-1 text-muted-foreground text-xs">
              Sua equipe tem {teamSize} membros ativos.
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Alert className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
      <Shield className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      <AlertTitle className="text-amber-800 dark:text-amber-200">
        Equipe pequena — Privacidade protegida
      </AlertTitle>
      <AlertDescription className="text-amber-700 dark:text-amber-300">
        Para proteger a privacidade dos membros, respostas anônimas são mostradas 
        apenas como médias semanais quando a equipe tem menos de {threshold} membros.
        <span className="block mt-1 text-sm opacity-80">
          Sua equipe tem atualmente {teamSize} membros ativos. Adicione mais {threshold - teamSize} membro(s) 
          para visualizar respostas individuais.
        </span>
      </AlertDescription>
    </Alert>
  );
}
