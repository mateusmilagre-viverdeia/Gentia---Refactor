import { TRAFFIC_LIGHT_CONFIG } from '@/types/unique-ability.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function TrafficLightLegend() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Legenda dos Semáforos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {(['red', 'yellow', 'green'] as const).map((color) => {
          const config = TRAFFIC_LIGHT_CONFIG[color];
          return (
            <div key={color} className="flex gap-3">
              <div className={`w-6 h-6 rounded-full ${config.bgColor} flex-shrink-0 mt-0.5 shadow-md`} />
              <div>
                <p className={`font-bold ${config.textColor}`}>{config.title}</p>
                <p className="text-sm text-muted-foreground">{config.description}</p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
