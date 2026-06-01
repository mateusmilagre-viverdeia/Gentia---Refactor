import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { PulsePillar } from '@/types/pulse.types';

interface Props {
  pillars: PulsePillar[];
  loading: boolean;
}

export function PulseAdminPillars({ pillars, loading }: Props) {
  if (loading && pillars.length === 0) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pilares do Pulse</CardTitle>
        <CardDescription>Visualize os pilares que agregam os drivers</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {pillars.map(pillar => (
            <div
              key={pillar.id}
              className="flex items-start gap-3 p-3 rounded-lg border"
              style={{ borderLeftColor: pillar.color || undefined, borderLeftWidth: pillar.color ? 4 : 1 }}
            >
              <span className="text-2xl">{pillar.emoji || '📊'}</span>
              <div className="flex-1 min-w-0">
                <div className="font-medium">{pillar.name}</div>
                {pillar.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {pillar.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
