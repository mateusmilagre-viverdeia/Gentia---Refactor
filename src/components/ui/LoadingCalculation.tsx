import { Calculator } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface LoadingCalculationProps {
  message: string;
  progress: number;
}

export function LoadingCalculation({ message, progress }: LoadingCalculationProps) {
  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-6 p-8 max-w-md text-center">
        {/* Logo ou ícone */}
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Calculator className="h-10 w-10 text-primary animate-pulse" />
          </div>
          <div className="absolute -inset-4 rounded-3xl border-2 border-primary/20 animate-ping" />
        </div>

        {/* Título */}
        <h2 className="text-2xl font-bold text-foreground">
          Calculando ROIP
        </h2>

        {/* Barra de progresso */}
        <div className="w-full max-w-xs">
          <Progress value={progress} className="h-2" />
        </div>

        {/* Mensagem dinâmica */}
        <p className="text-muted-foreground text-sm min-h-[1.5rem]">
          {message}
        </p>

        {/* Porcentagem */}
        <span className="text-xs text-muted-foreground/60">
          {progress}%
        </span>
      </div>
    </div>
  );
}
