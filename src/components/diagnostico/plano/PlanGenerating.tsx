import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Brain } from 'lucide-react';

export const PlanGenerating = () => {
  return (
    <Card className="border-dashed border-2 border-primary/30">
      <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="relative">
          <Brain className="h-12 w-12 text-primary/40" />
          <Loader2 className="h-6 w-6 text-primary animate-spin absolute -bottom-1 -right-1" />
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold">Gerando seu Plano de Implementação</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            A IA está cruzando seus dados do Assessment ROIP, Calculadora e soluções selecionadas para criar um plano personalizado com prioridades e prazos...
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
