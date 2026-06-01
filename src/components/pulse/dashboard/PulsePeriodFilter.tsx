import { useState } from 'react';

import { ptBR } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';
import { formatBRT } from "@/lib/datetime";

export interface PeriodOption {
  value: number | 'custom';
  label: string;
}

const PERIOD_OPTIONS: PeriodOption[] = [
  { value: 30, label: '30 dias' },
  { value: 120, label: '120 dias' },
  { value: 180, label: '180 dias' },
  { value: 365, label: '1 ano' },
  { value: 'custom', label: 'Personalizado' },
];

interface PulsePeriodFilterProps {
  selectedPeriod: number | 'custom';
  onPeriodChange: (days: number) => void;
  onCustomRangeChange: (startDate: string, endDate: string) => void;
  className?: string;
}

export function PulsePeriodFilter({
  selectedPeriod,
  onPeriodChange,
  onCustomRangeChange,
  className,
}: PulsePeriodFilterProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [popoverOpen, setPopoverOpen] = useState(false);

  const handlePeriodClick = (option: PeriodOption) => {
    if (option.value === 'custom') {
      setPopoverOpen(true);
      return;
    }
    onPeriodChange(option.value);
  };

  const handleDateRangeSelect = (range: DateRange | undefined) => {
    setDateRange(range);
    if (range?.from && range?.to) {
      onCustomRangeChange(
        formatBRT(range.from, 'yyyy-MM-dd'),
        formatBRT(range.to, 'yyyy-MM-dd')
      );
      setPopoverOpen(false);
    }
  };

  return (
    <div className={cn("flex items-center gap-1 flex-wrap", className)}>
      {PERIOD_OPTIONS.map((option) => {
        if (option.value === 'custom') {
          return (
            <Popover key="custom" open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant={selectedPeriod === 'custom' ? 'default' : 'outline'}
                  size="sm"
                  className="gap-1.5"
                >
                  <CalendarIcon className="h-3.5 w-3.5" />
                  {selectedPeriod === 'custom' && dateRange?.from && dateRange?.to
                    ? `${formatBRT(dateRange.from, 'dd/MM')} - ${formatBRT(dateRange.to, 'dd/MM')}`
                    : option.label
                  }
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={handleDateRangeSelect}
                  numberOfMonths={2}
                  locale={ptBR}
                  disabled={(date) => date > new Date()}
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          );
        }

        return (
          <Button
            key={option.value}
            variant={selectedPeriod === option.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => handlePeriodClick(option)}
          >
            {option.label}
          </Button>
        );
      })}
    </div>
  );
}
