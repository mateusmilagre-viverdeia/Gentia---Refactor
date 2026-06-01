import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { OrgChart } from '@/types/org-chart.types';

interface OrgChartSelectorProps {
  charts: OrgChart[];
  selectedChart: OrgChart | null;
  onSelect: (chart: OrgChart) => void;
  onCreateNew: () => void;
}

export function OrgChartSelector({
  charts,
  selectedChart,
  onSelect,
  onCreateNew,
}: OrgChartSelectorProps) {
  const handleChange = (chartId: string) => {
    const chart = charts.find(c => c.id === chartId);
    if (chart) onSelect(chart);
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={selectedChart?.id || ''} onValueChange={handleChange}>
        <SelectTrigger className="w-[250px]">
          <SelectValue placeholder="Selecione um organograma" />
        </SelectTrigger>
        <SelectContent>
          {charts.map(chart => (
            <SelectItem key={chart.id} value={chart.id}>
              {chart.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button variant="outline" size="icon" onClick={onCreateNew} title="Novo organograma">
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}
