import { DISCDimension, DISCTeamAggregation, DISC_DIMENSIONS } from '@/types/disc.types';
import { getDimensionHexColor } from '@/data/disc-team-analysis';
import { Progress } from '@/components/ui/progress';

interface DISCProfileDistributionProps {
  aggregation: DISCTeamAggregation;
}

export function DISCProfileDistribution({ aggregation }: DISCProfileDistributionProps) {
  const { profileDistribution, memberCount } = aggregation;
  const dimensions: DISCDimension[] = ['D', 'I', 'S', 'C'];

  if (memberCount === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum assessment concluído ainda
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {dimensions.map((dim) => {
        const count = profileDistribution[dim];
        const percentage = memberCount > 0 ? (count / memberCount) * 100 : 0;

        return (
          <div key={dim} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                  style={{ backgroundColor: getDimensionHexColor(dim) }}
                >
                  {dim}
                </div>
                <span className="font-medium">{DISC_DIMENSIONS[dim].name}</span>
              </div>
              <div className="text-right">
                <span className="font-semibold">{count}</span>
                <span className="text-muted-foreground ml-1">
                  ({percentage.toFixed(1)}%)
                </span>
              </div>
            </div>
            <div className="relative">
              <Progress
                value={percentage}
                className="h-3"
                style={{
                  // @ts-ignore
                  '--progress-color': getDimensionHexColor(dim)
                } as React.CSSProperties}
              />
            </div>
          </div>
        );
      })}

      <div className="pt-4 border-t mt-4">
        <p className="text-sm text-muted-foreground text-center">
          Total de perfis primários identificados: <span className="font-semibold text-foreground">{memberCount}</span>
        </p>
      </div>
    </div>
  );
}
