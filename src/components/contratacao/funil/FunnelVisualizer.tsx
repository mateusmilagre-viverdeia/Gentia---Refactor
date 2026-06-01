import { HiringFunnelStage } from '@/types/hiring-funnel.types';

interface FunnelVisualizerProps {
  stages: HiringFunnelStage[];
}

export function FunnelVisualizer({ stages }: FunnelVisualizerProps) {
  if (stages.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <p>Nenhuma etapa definida</p>
      </div>
    );
  }

  const maxWidth = 100;
  const minWidth = 30;
  const widthStep = (maxWidth - minWidth) / Math.max(stages.length - 1, 1);

  return (
    <div className="flex flex-col items-center gap-1 py-6">
      {stages.map((stage, index) => {
        const width = maxWidth - (widthStep * index);
        const isFirst = index === 0;
        const isLast = index === stages.length - 1;
        
        return (
          <div
            key={stage.id}
            className="relative flex items-center justify-center transition-all duration-300"
            style={{
              width: `${width}%`,
              minHeight: '44px',
            }}
          >
            {/* Trapezoid shape using clip-path */}
            <div
              className="absolute inset-0 bg-primary/10 border border-primary/20"
              style={{
                clipPath: isFirst 
                  ? 'polygon(0 0, 100% 0, 95% 100%, 5% 100%)'
                  : isLast
                  ? 'polygon(5% 0, 95% 0, 50% 100%, 50% 100%)'
                  : 'polygon(0 0, 100% 0, 95% 100%, 5% 100%)',
                borderRadius: isFirst ? '8px 8px 0 0' : isLast ? '0 0 8px 8px' : '0',
              }}
            />
            
            {/* Stage name */}
            <span className="relative z-10 text-xs font-medium text-center px-2 truncate max-w-[90%]">
              {stage.name}
            </span>
          </div>
        );
      })}
    </div>
  );
}
