import { DISCTeamAnalysis } from '@/types/disc.types';
import { Lightbulb } from 'lucide-react';

interface DISCLeaderRecommendationsProps {
  analysis: DISCTeamAnalysis;
}

export function DISCLeaderRecommendations({ analysis }: DISCLeaderRecommendationsProps) {
  const { recommendations } = analysis;

  if (recommendations.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        Complete mais assessments para gerar recomendações personalizadas
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {recommendations.map((rec, index) => (
        <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-primary">{index + 1}</span>
          </div>
          <span className="text-sm">{rec}</span>
        </div>
      ))}
    </div>
  );
}
