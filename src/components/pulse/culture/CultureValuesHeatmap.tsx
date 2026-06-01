import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ValueScore {
  value: string;
  score: number;
  count: number;
}

interface CultureValuesHeatmapProps {
  data: ValueScore[];
  loading?: boolean;
}

function getValueColor(score: number): string {
  if (score >= 8) return 'bg-green-500 text-white';
  if (score >= 6) return 'bg-green-400 text-white';
  if (score >= 5) return 'bg-amber-400 text-white';
  if (score >= 3) return 'bg-orange-400 text-white';
  return 'bg-red-400 text-white';
}

function getValueBorderColor(score: number): string {
  if (score >= 8) return 'border-green-600';
  if (score >= 6) return 'border-green-500';
  if (score >= 5) return 'border-amber-500';
  if (score >= 3) return 'border-orange-500';
  return 'border-red-500';
}

export function CultureValuesHeatmap({ data, loading }: CultureValuesHeatmapProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="h-16 w-32" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Valores Organizacionais</CardTitle>
        <CardDescription>Score de vivência de cada valor</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <div className="flex flex-wrap gap-3">
            {data.map(item => (
              <div
                key={item.value}
                className={cn(
                  "flex flex-col items-center justify-center p-4 rounded-lg border-2 min-w-[120px]",
                  getValueBorderColor(item.score),
                  "bg-card"
                )}
              >
                <span className="text-sm font-medium text-center mb-2 line-clamp-2">
                  {item.value}
                </span>
                <Badge className={cn("text-lg font-bold px-3", getValueColor(item.score))}>
                  {item.score.toFixed(1)}
                </Badge>
                <span className="text-xs text-muted-foreground mt-1">
                  {item.count} respostas
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-32 flex items-center justify-center text-muted-foreground">
            Nenhum valor configurado ainda
          </div>
        )}
      </CardContent>
    </Card>
  );
}
