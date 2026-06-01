import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, Target } from 'lucide-react';
import { motion } from 'framer-motion';

interface TimelinePilar {
  ordem: number;
  pilar: string;
  score_atual: number;
  status: string;
  e_prioritario?: boolean;
  prazo_planejamento?: string;
  prazo_execucao?: string;
}

interface ROIPTimelineProps {
  pilares: TimelinePilar[];
  marcoAtual?: string;
}

// Premium minimalist palette - neutral tones
const PILLAR_COLORS: Record<string, { bg: string; text: string; ring: string }> = {
  'Cultura': { bg: 'bg-slate-700', text: 'text-slate-700', ring: 'ring-slate-300' },
  'Atração': { bg: 'bg-slate-700', text: 'text-slate-700', ring: 'ring-slate-300' },
  'Retenção': { bg: 'bg-slate-700', text: 'text-slate-700', ring: 'ring-slate-300' },
  'Resultado': { bg: 'bg-slate-700', text: 'text-slate-700', ring: 'ring-slate-300' },
};

const getStatusConfig = (status: string, score: number) => {
  if (status === 'saudavel' || score > 70) {
    return { icon: CheckCircle2, color: 'bg-slate-600', label: 'Concluído' };
  }
  if (status === 'critico' || score < 50) {
    return { icon: Target, color: 'bg-slate-800', label: 'Crítico' };
  }
  return { icon: Circle, color: 'bg-slate-500', label: 'Atenção' };
};

export const ROIPTimeline = ({ pilares, marcoAtual }: ROIPTimelineProps) => {
  // Filter: only show priority pillar + non-green pillars (score <= 70)
  const filteredPilares = pilares.filter(p => 
    p.e_prioritario || (p.status !== 'saudavel' && p.score_atual <= 70)
  );

  // Find current pillar (first non-green)
  const currentPilarIndex = filteredPilares.findIndex(p => p.status !== 'saudavel' && p.score_atual <= 70);
  const effectiveCurrentIndex = currentPilarIndex === -1 ? 0 : currentPilarIndex;

  // Add diagnostic step + filtered pillars only
  const steps = [
    { ordem: 0, pilar: 'Diagnóstico', score_atual: 100, status: 'saudavel', prazo: 'Concluído' },
    ...filteredPilares
  ];

  return (
    <div className="w-full py-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-foreground">Trilha da Consultoria</h3>
        <Badge variant="outline" className="gap-1 bg-slate-50 border-slate-300 text-slate-600">
          <Target className="h-3 w-3" />
          Você está aqui
        </Badge>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Progress bar background */}
        <div className="absolute top-6 left-0 right-0 h-1 bg-slate-200 rounded-full" />
        
        {/* Progress bar filled */}
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${((effectiveCurrentIndex + 1) / steps.length) * 100}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="absolute top-6 left-0 h-1 bg-slate-700 rounded-full"
        />

        {/* Timeline nodes */}
        <div className="relative flex justify-between">
          {steps.map((step, index) => {
            const isCompleted = step.status === 'saudavel' && step.score_atual > 70;
            const isCurrent = index === effectiveCurrentIndex + 1; // +1 because of diagnostic
            const isPriority = 'e_prioritario' in step ? step.e_prioritario : false;
            const stepPrazo = 'prazo_planejamento' in step ? step.prazo_planejamento : ('prazo' in step ? step.prazo : undefined);

            return (
              <motion.div
                key={step.pilar}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex flex-col items-center"
                style={{ width: `${100 / steps.length}%` }}
              >
                {/* Node - Premium neutral design */}
                <div className={`
                  relative z-10 flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all
                  ${isCompleted 
                    ? 'bg-slate-600 border-slate-400 text-white' 
                    : isCurrent || isPriority
                      ? 'bg-slate-800 border-slate-600 ring-2 ring-slate-300 text-white shadow-md'
                      : 'bg-white border-slate-300 text-slate-500'
                  }
                `}>
                  {isCompleted ? (
                    <CheckCircle2 className="h-6 w-6" />
                  ) : step.pilar === 'Diagnóstico' ? (
                    <CheckCircle2 className="h-6 w-6" />
                  ) : (
                    <span className="font-bold text-lg">{step.score_atual}%</span>
                  )}
                </div>

                {/* Label */}
                <div className="mt-3 text-center">
                  <p className={`font-semibold text-sm ${isCurrent || isPriority ? 'text-slate-800' : 'text-slate-500'}`}>
                    {step.pilar}
                  </p>
                  {step.pilar !== 'Diagnóstico' && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      {stepPrazo || (step.score_atual > 70 ? '✓' : `${step.score_atual}%`)}
                    </p>
                  )}
                </div>

                {/* Priority indicator - Static, no pulse */}
                {(isCurrent || isPriority) && step.pilar !== 'Diagnóstico' && (
                  <Badge className="mt-2 bg-slate-800 text-white text-xs border-0">
                    Foco Atual
                  </Badge>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
