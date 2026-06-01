import { DISCTeamAnalysis } from '@/types/disc.types';
import { CheckCircle2 } from 'lucide-react';

interface DISCTeamStrengthsProps {
  analysis: DISCTeamAnalysis;
}

export function DISCTeamStrengths({ analysis }: DISCTeamStrengthsProps) {
  const { strengths } = analysis;

  if (strengths.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        Complete mais assessments para identificar as forças do time
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {strengths.map((strength, index) => (
        <div key={index} className="flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
          <span className="text-sm">{strength}</span>
        </div>
      ))}
    </div>
  );
}
