import { DISCDimension, DISCTeamAnalysis, DISC_DIMENSIONS } from '@/types/disc.types';
import { getDimensionHexColor } from '@/data/disc-team-analysis';
import { AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface DISCTeamGapsProps {
  analysis: DISCTeamAnalysis;
}

const GAP_IMPACTS: Record<DISCDimension, string[]> = {
  D: ['Tomada de decisão', 'Assertividade', 'Liderança em crises'],
  I: ['Comunicação', 'Integração do time', 'Networking'],
  S: ['Estabilidade operacional', 'Gestão de conhecimento', 'Processos contínuos'],
  C: ['Controle de qualidade', 'Análise de riscos', 'Documentação']
};

export function DISCTeamGaps({ analysis }: DISCTeamGapsProps) {
  const { gaps } = analysis;

  if (gaps.length === 0) {
    return (
      <div className="text-center py-6">
        <div className="text-green-500 font-medium mb-2">Composição equilibrada</div>
        <p className="text-sm text-muted-foreground">
          Todos os perfis DISC estão adequadamente representados no time
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {gaps.map((dim) => (
        <div key={dim} className="p-4 rounded-lg border bg-muted/30">
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: getDimensionHexColor(dim) }}
            >
              {dim}
            </div>
            <div>
              <div className="font-medium">
                Perfil {DISC_DIMENSIONS[dim].name} sub-representado
              </div>
              <div className="text-sm text-muted-foreground">
                Menos de 15% do time
              </div>
            </div>
          </div>
          
          <div className="ml-13 space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <span>Impacto nas áreas:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {GAP_IMPACTS[dim].map((impact) => (
                <Badge key={impact} variant="outline" className="text-xs">
                  {impact}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
