import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Gauge, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  Zap,
  Target
} from "lucide-react";
import { DISCDimension, DISC_DIMENSIONS } from "@/types/disc.types";
import { cn } from "@/lib/utils";

interface DISCIntensityCardProps {
  intensity: 'baixa' | 'média' | 'alta';
  primaryDimension: DISCDimension;
  normalizedScores: {
    D: number;
    I: number;
    S: number;
    C: number;
  };
}

// Alertas de perfis extremos baseados nos scores
interface ExtremeProfileAlert {
  type: 'warning' | 'info';
  title: string;
  description: string;
  dimension: DISCDimension;
}

const EXTREME_THRESHOLDS = {
  high: 85, // Score acima de 85% é considerado extremo alto
  low: 15,  // Score abaixo de 15% é considerado extremo baixo
};

const EXTREME_HIGH_ALERTS: Record<DISCDimension, { title: string; description: string }> = {
  D: {
    title: "Risco de Autoritarismo",
    description: "Perfil D muito alto pode gerar conflitos por imposição de decisões. Requer coaching em delegação e escuta ativa."
  },
  I: {
    title: "Risco de Dispersão",
    description: "Perfil I muito alto pode comprometer entregas por excesso de projetos. Requer estrutura de acompanhamento."
  },
  S: {
    title: "Risco de Resistência",
    description: "Perfil S muito alto pode bloquear mudanças necessárias. Requer exposição gradual a novos processos."
  },
  C: {
    title: "Risco de Paralisia Analítica",
    description: "Perfil C muito alto pode atrasar decisões por excesso de análise. Requer definição de prazos firmes."
  }
};

const EXTREME_LOW_ALERTS: Record<DISCDimension, { title: string; description: string }> = {
  D: {
    title: "Baixa Assertividade",
    description: "Pode ter dificuldade em posicionar-se em decisões importantes. Desenvolver autoconfiança."
  },
  I: {
    title: "Baixa Conectividade",
    description: "Pode ter dificuldade em construir relacionamentos. Considerar pareamento com perfis mais sociais."
  },
  S: {
    title: "Baixa Estabilidade",
    description: "Pode ter dificuldade com rotinas e consistência. Precisa de desafios variados."
  },
  C: {
    title: "Baixa Precisão",
    description: "Pode negligenciar detalhes importantes. Pareamento com perfil C para tarefas críticas."
  }
};

function getExtremeAlerts(scores: DISCIntensityCardProps['normalizedScores']): ExtremeProfileAlert[] {
  const alerts: ExtremeProfileAlert[] = [];
  
  (['D', 'I', 'S', 'C'] as const).forEach(dim => {
    const score = scores[dim];
    
    if (score >= EXTREME_THRESHOLDS.high) {
      alerts.push({
        type: 'warning',
        title: EXTREME_HIGH_ALERTS[dim].title,
        description: EXTREME_HIGH_ALERTS[dim].description,
        dimension: dim
      });
    }
    
    if (score <= EXTREME_THRESHOLDS.low) {
      alerts.push({
        type: 'info',
        title: EXTREME_LOW_ALERTS[dim].title,
        description: EXTREME_LOW_ALERTS[dim].description,
        dimension: dim
      });
    }
  });
  
  return alerts;
}

function getIntensityInfo(intensity: 'baixa' | 'média' | 'alta') {
  switch (intensity) {
    case 'alta':
      return {
        label: 'Alta Intensidade',
        description: 'Comportamentos muito marcantes e consistentes. Tendência a reagir de forma previsível em situações diversas.',
        color: 'text-orange-600 dark:text-orange-400',
        bgColor: 'bg-orange-100 dark:bg-orange-900/30',
        borderColor: 'border-orange-200 dark:border-orange-800',
        icon: Zap,
        management: 'Requer gestão consciente das intensidades. Pode ser muito eficaz em funções alinhadas ao perfil.'
      };
    case 'média':
      return {
        label: 'Intensidade Moderada',
        description: 'Comportamentos equilibrados com flexibilidade. Consegue adaptar-se a diferentes situações.',
        color: 'text-blue-600 dark:text-blue-400',
        bgColor: 'bg-blue-100 dark:bg-blue-900/30',
        borderColor: 'border-blue-200 dark:border-blue-800',
        icon: Target,
        management: 'Perfil versátil que pode atuar em diferentes contextos. Boa capacidade de adaptação.'
      };
    case 'baixa':
      return {
        label: 'Baixa Intensidade',
        description: 'Comportamentos sutis e flexíveis. Alta adaptabilidade, mas pode parecer menos definido.',
        color: 'text-green-600 dark:text-green-400',
        bgColor: 'bg-green-100 dark:bg-green-900/30',
        borderColor: 'border-green-200 dark:border-green-800',
        icon: TrendingDown,
        management: 'Grande flexibilidade comportamental. Pode precisar de mais clareza sobre expectativas.'
      };
  }
}

export function DISCIntensityCard({ 
  intensity, 
  primaryDimension,
  normalizedScores 
}: DISCIntensityCardProps) {
  const intensityInfo = getIntensityInfo(intensity);
  const extremeAlerts = getExtremeAlerts(normalizedScores);
  const primaryInfo = DISC_DIMENSIONS[primaryDimension];
  const IntensityIcon = intensityInfo.icon;

  return (
    <div className="space-y-4">
      {/* Intensity Card */}
      <Card className={cn("border-2", intensityInfo.borderColor)}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-lg", intensityInfo.bgColor)}>
              <Gauge className={cn("h-5 w-5", intensityInfo.color)} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">Intensidade Comportamental</CardTitle>
                <Badge variant="outline" className={cn("font-semibold", intensityInfo.color)}>
                  <IntensityIcon className="h-3 w-3 mr-1" />
                  {intensityInfo.label}
                </Badge>
              </div>
              <CardDescription>Como os traços comportamentais se manifestam</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className={cn("p-4 rounded-lg", intensityInfo.bgColor)}>
            <p className="text-sm font-medium mb-2">{intensityInfo.description}</p>
            <p className="text-xs text-muted-foreground">{intensityInfo.management}</p>
          </div>
          
          {/* Score bars for context */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Distribuição dos Scores
            </p>
            <div className="grid grid-cols-4 gap-2">
              {(['D', 'I', 'S', 'C'] as const).map(dim => {
                const score = normalizedScores[dim];
                const dimInfo = DISC_DIMENSIONS[dim];
                const isExtreme = score >= EXTREME_THRESHOLDS.high || score <= EXTREME_THRESHOLDS.low;
                
                return (
                  <div key={dim} className="text-center">
                    <div className={cn(
                      "w-full h-16 rounded-lg relative overflow-hidden bg-muted",
                      isExtreme && "ring-2 ring-amber-500 ring-offset-1"
                    )}>
                      <div 
                        className={cn("absolute bottom-0 left-0 right-0 transition-all", dimInfo.bgColor)}
                        style={{ height: `${score}%` }}
                      />
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-foreground">
                        {score.toFixed(0)}%
                      </span>
                    </div>
                    <span className="text-xs font-medium mt-1 block">{dim}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Extreme Profile Alerts */}
      {extremeAlerts.length > 0 && (
        <div className="space-y-3">
          {extremeAlerts.map((alert, index) => (
            <Alert 
              key={index} 
              variant={alert.type === 'warning' ? 'destructive' : 'default'}
              className={alert.type === 'warning' 
                ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30' 
                : 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
              }
            >
              <AlertTriangle className={cn(
                "h-4 w-4",
                alert.type === 'warning' ? 'text-amber-600' : 'text-blue-600'
              )} />
              <AlertTitle className="flex items-center gap-2">
                {alert.title}
                <Badge variant="outline" className={cn("text-xs", DISC_DIMENSIONS[alert.dimension].bgColor, "text-white")}>
                  {alert.dimension}: {normalizedScores[alert.dimension].toFixed(0)}%
                </Badge>
              </AlertTitle>
              <AlertDescription className="text-sm">
                {alert.description}
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}
    </div>
  );
}
