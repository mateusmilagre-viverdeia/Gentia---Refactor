import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertOctagon } from 'lucide-react';
import type { UniqueAbilityAIAnalysis } from '@/types/unique-ability.types';

interface TimeVillainsSectionProps {
  villains: UniqueAbilityAIAnalysis['timeVillains'];
}

export function TimeVillainsSection({ villains }: TimeVillainsSectionProps) {
  if (!villains || villains.length === 0) return null;

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'alta':
        return <Badge variant="destructive">Urgente</Badge>;
      case 'média':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Médio</Badge>;
      default:
        return <Badge variant="outline">Baixa</Badge>;
    }
  };

  return (
    <Card className="border-red-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-red-700">
          <AlertOctagon className="h-5 w-5" />
          Vilões do Tempo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {villains.map((villain, index) => (
          <div 
            key={index} 
            className="p-3 bg-red-50 rounded-lg border border-red-100"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className="font-medium text-foreground">{villain.activity}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  → {villain.recommendation}
                </p>
              </div>
              {getUrgencyBadge(villain.urgency)}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
