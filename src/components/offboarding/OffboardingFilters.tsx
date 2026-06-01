import { useState } from "react";
import { Calendar, Download, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { subMonths, startOfMonth, endOfMonth, subQuarters, subYears } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { OffboardingTerminationType } from "@/types/offboarding.types";
import { formatBRT } from "@/lib/datetime";

export interface OffboardingFiltersState {
  period: 'current_month' | 'last_quarter' | 'last_year' | 'custom';
  dateRange: { start: string; end: string } | null;
  department: string | null;
  terminationType: OffboardingTerminationType | null;
}

interface OffboardingFiltersProps {
  filters: OffboardingFiltersState;
  onFiltersChange: (filters: OffboardingFiltersState) => void;
  departments: string[];
  onExport?: () => void;
}

export function OffboardingFilters({
  filters,
  onFiltersChange,
  departments,
  onExport,
}: OffboardingFiltersProps) {
  const [customDateOpen, setCustomDateOpen] = useState(false);
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>();
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>();

  const handlePeriodChange = (period: OffboardingFiltersState['period']) => {
    const now = new Date();
    let dateRange: { start: string; end: string } | null = null;

    switch (period) {
      case 'current_month':
        dateRange = {
          start: formatBRT(startOfMonth(now), 'yyyy-MM-dd'),
          end: formatBRT(endOfMonth(now), 'yyyy-MM-dd'),
        };
        break;
      case 'last_quarter':
        const quarterStart = subQuarters(now, 1);
        dateRange = {
          start: formatBRT(startOfMonth(quarterStart), 'yyyy-MM-dd'),
          end: formatBRT(now, 'yyyy-MM-dd'),
        };
        break;
      case 'last_year':
        const yearStart = subYears(now, 1);
        dateRange = {
          start: formatBRT(yearStart, 'yyyy-MM-dd'),
          end: formatBRT(now, 'yyyy-MM-dd'),
        };
        break;
      case 'custom':
        // Don't update dateRange yet, wait for custom date selection
        break;
    }

    onFiltersChange({ ...filters, period, dateRange });
  };

  const handleCustomDateApply = () => {
    if (customStartDate && customEndDate) {
      onFiltersChange({
        ...filters,
        period: 'custom',
        dateRange: {
          start: formatBRT(customStartDate, 'yyyy-MM-dd'),
          end: formatBRT(customEndDate, 'yyyy-MM-dd'),
        },
      });
      setCustomDateOpen(false);
    }
  };

  const handleDepartmentChange = (value: string) => {
    onFiltersChange({
      ...filters,
      department: value === 'all' ? null : value,
    });
  };

  const handleTerminationTypeChange = (value: string) => {
    onFiltersChange({
      ...filters,
      terminationType: value === 'all' ? null : (value as OffboardingTerminationType),
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 bg-muted/30 rounded-lg border">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Filter className="h-4 w-4" />
        <span className="text-sm font-medium">Filtros:</span>
      </div>

      {/* Period Filter */}
      <Select value={filters.period} onValueChange={handlePeriodChange}>
        <SelectTrigger className="w-[180px] h-9">
          <Calendar className="h-4 w-4 mr-2" />
          <SelectValue placeholder="Período" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="current_month">Mês atual</SelectItem>
          <SelectItem value="last_quarter">Último trimestre</SelectItem>
          <SelectItem value="last_year">Último ano</SelectItem>
          <SelectItem value="custom">Personalizado</SelectItem>
        </SelectContent>
      </Select>

      {/* Custom Date Picker */}
      {filters.period === 'custom' && (
        <Popover open={customDateOpen} onOpenChange={setCustomDateOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-9">
              {filters.dateRange
                ? `${formatBRT(new Date(filters.dateRange.start), 'dd/MM/yy')} - ${formatBRT(new Date(filters.dateRange.end), 'dd/MM/yy')}`
                : 'Selecionar datas'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-4" align="start">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium mb-2">Data inicial</p>
                  <CalendarComponent
                    mode="single"
                    selected={customStartDate}
                    onSelect={setCustomStartDate}
                    locale={ptBR}
                  />
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">Data final</p>
                  <CalendarComponent
                    mode="single"
                    selected={customEndDate}
                    onSelect={setCustomEndDate}
                    locale={ptBR}
                  />
                </div>
              </div>
              <Button
                onClick={handleCustomDateApply}
                disabled={!customStartDate || !customEndDate}
                className="w-full"
              >
                Aplicar
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* Department Filter */}
      {departments.length > 0 && (
        <Select
          value={filters.department || 'all'}
          onValueChange={handleDepartmentChange}
        >
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="Departamento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os departamentos</SelectItem>
            {departments.map((dept) => (
              <SelectItem key={dept} value={dept}>
                {dept}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Termination Type Filter */}
      <Select
        value={filters.terminationType || 'all'}
        onValueChange={handleTerminationTypeChange}
      >
        <SelectTrigger className="w-[160px] h-9">
          <SelectValue placeholder="Tipo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os tipos</SelectItem>
          <SelectItem value="voluntary">Voluntário</SelectItem>
          <SelectItem value="involuntary">Involuntário</SelectItem>
          <SelectItem value="contract_end">Término de Contrato</SelectItem>
        </SelectContent>
      </Select>

      {/* Export Button */}
      {onExport && (
        <Button variant="outline" size="sm" onClick={onExport} className="ml-auto h-9">
          <Download className="h-4 w-4 mr-2" />
          Exportar
        </Button>
      )}
    </div>
  );
}
