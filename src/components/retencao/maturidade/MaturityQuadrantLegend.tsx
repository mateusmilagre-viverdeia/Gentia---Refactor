import { MATURITY_CONFIG } from '@/types/team-maturity.types';

export function MaturityQuadrantLegend() {
  const levels = [
    MATURITY_CONFIG.M1,
    MATURITY_CONFIG.M2,
    MATURITY_CONFIG.M3,
    MATURITY_CONFIG.M4,
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-muted/30 rounded-lg">
      {levels.map((config) => (
        <div key={config.level} className="text-center">
          <span className="text-sm font-medium text-foreground block mb-1">
            {config.level} - {config.label}
          </span>
          <span className="text-[10px] text-muted-foreground block">
            {config.sublabel}
          </span>
          <span className="text-[10px] text-muted-foreground block mt-1">
            Estilo: {config.leadershipStyle}
          </span>
        </div>
      ))}
    </div>
  );
}
