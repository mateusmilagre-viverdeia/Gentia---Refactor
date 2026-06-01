import { Button } from '@/components/ui/button';
import { ActionPlanStatus } from '@/types/action-plan.types';

interface ActionPlanFiltersProps {
  currentFilter: ActionPlanStatus | 'todas';
  onFilterChange: (filter: ActionPlanStatus | 'todas') => void;
  counts: Record<string, number>;
}

const FILTER_OPTIONS: { value: ActionPlanStatus | 'todas'; label: string }[] = [
  { value: 'todas', label: 'Todas' },
  { value: 'planejada', label: 'Planejadas' },
  { value: 'em_andamento', label: 'Em Andamento' },
  { value: 'concluida', label: 'Concluídas' },
  { value: 'cancelada', label: 'Canceladas' },
];

export function ActionPlanFilters({ currentFilter, onFilterChange, counts }: ActionPlanFiltersProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {FILTER_OPTIONS.map((option) => (
        <Button
          key={option.value}
          variant={currentFilter === option.value ? 'default' : 'outline'}
          size="sm"
          onClick={() => onFilterChange(option.value)}
          className="min-w-[100px]"
        >
          {option.label} ({counts[option.value] || 0})
        </Button>
      ))}
    </div>
  );
}
