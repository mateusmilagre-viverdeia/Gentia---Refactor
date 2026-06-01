import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Target } from 'lucide-react';
import type { UniqueAbilityAIAnalysis } from '@/types/unique-ability.types';

interface FocusAreasSectionProps {
  focusAreas: UniqueAbilityAIAnalysis['focusAreas'];
}

export function FocusAreasSection({ focusAreas }: FocusAreasSectionProps) {
  if (!focusAreas || focusAreas.length === 0) return null;

  return (
    <Card className="border-green-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-green-700">
          <Target className="h-5 w-5" />
          Seu Foco
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {focusAreas.map((area, index) => (
          <div 
            key={index} 
            className="p-3 bg-green-50 rounded-lg border border-green-100"
          >
            <p className="font-medium text-foreground">{area.activity}</p>
            <p className="text-sm text-muted-foreground mt-1">
              ✓ {area.reason}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
