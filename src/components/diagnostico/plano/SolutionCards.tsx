import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Clock, Rocket, RefreshCw } from 'lucide-react';
import { SOLUTIONS_CATALOG, type SolutionItem, type PlanMode } from '@/types/implementation-plan.types';

interface SolutionCardsProps {
  solutionModes: Record<string, PlanMode>;
  onToggle: (solutionId: string) => void;
  onModeChange: (solutionId: string, mode: PlanMode) => void;
}

export const SolutionCards = ({ solutionModes, onToggle, onModeChange }: SolutionCardsProps) => {
  const getDurationLabel = (solution: SolutionItem, mode: PlanMode) => {
    if (solution.baseDurationMonths && mode === 'revision') {
      const reduced = Math.max(1, Math.round(solution.baseDurationMonths / 3));
      return `~${reduced} ${reduced === 1 ? 'mês' : 'meses'}`;
    }
    return solution.durationLabel;
  };

  return (
    <div className="space-y-4">
      {SOLUTIONS_CATALOG.map((group) => (
        <Card key={group.pillar}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: group.color }}
              />
              {group.label}
              <Badge variant="secondary" className="text-[10px]">
                {group.solutions.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {group.solutions.map((solution) => {
                const selected = solution.id in solutionModes;
                const mode = solutionModes[solution.id] || 'creation';
                return (
                  <div key={solution.id} className="space-y-0">
                    <button
                      onClick={() => onToggle(solution.id)}
                      className={`w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${
                        selected
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/30'
                      }`}
                    >
                      <Checkbox checked={selected} className="mt-0.5" tabIndex={-1} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-tight">{solution.name}</p>
                        <div className="flex items-center gap-1 mt-1.5">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {getDurationLabel(solution, mode)}
                          </span>
                          {selected && mode === 'revision' && solution.baseDurationMonths && (
                            <Badge variant="outline" className="text-[9px] ml-1">3x mais rápido</Badge>
                          )}
                        </div>
                      </div>
                    </button>
                    {selected && (
                      <div className="flex gap-1 mt-1.5 ml-1">
                        <button
                          onClick={() => onModeChange(solution.id, 'creation')}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                            mode === 'creation'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground hover:bg-muted/80'
                          }`}
                        >
                          <Rocket className="h-3 w-3" />
                          Do zero
                        </button>
                        <button
                          onClick={() => onModeChange(solution.id, 'revision')}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                            mode === 'revision'
                              ? 'bg-amber-500 text-white'
                              : 'bg-muted text-muted-foreground hover:bg-muted/80'
                          }`}
                        >
                          <RefreshCw className="h-3 w-3" />
                          Revisão
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
