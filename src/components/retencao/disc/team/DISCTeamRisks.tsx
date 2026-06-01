import { DISCTeamAnalysis } from '@/types/disc.types';
import { AlertTriangle } from 'lucide-react';

interface DISCTeamRisksProps {
  analysis: DISCTeamAnalysis;
}

export function DISCTeamRisks({ analysis }: DISCTeamRisksProps) {
  const { risks } = analysis;

  if (risks.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        Nenhum risco significativo identificado
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {risks.map((risk, index) => (
        <div key={index} className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
          <span className="text-sm">{risk}</span>
        </div>
      ))}
    </div>
  );
}
