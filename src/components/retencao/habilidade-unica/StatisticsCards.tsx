import { Card, CardContent } from '@/components/ui/card';
import { Clock, AlertOctagon, AlertTriangle, Target } from 'lucide-react';
import type { UniqueAbilityAIAnalysis } from '@/types/unique-ability.types';

interface StatisticsCardsProps {
  statistics: UniqueAbilityAIAnalysis['statistics'];
}

export function StatisticsCards({ statistics }: StatisticsCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500 rounded-lg">
              <AlertOctagon className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-700">{statistics.redCount}</p>
              <p className="text-xs text-red-600 font-medium">PARE! ({statistics.redPercentage}%)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-700">{statistics.yellowCount}</p>
              <p className="text-xs text-yellow-600 font-medium">ATENÇÃO ({statistics.yellowPercentage}%)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500 rounded-lg">
              <Target className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-700">{statistics.greenCount}</p>
              <p className="text-xs text-green-600 font-medium">FOCO ({statistics.greenPercentage}%)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary rounded-lg">
              <Clock className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-lg font-bold text-primary">{statistics.estimatedTimeFreed}</p>
              <p className="text-xs text-muted-foreground font-medium">Tempo a liberar</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
