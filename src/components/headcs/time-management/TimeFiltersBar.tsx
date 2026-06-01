import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Download } from "lucide-react";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";
import { formatBRT } from "@/lib/datetime";

interface TimeFiltersBarProps {
  onDateRangeChange: (start: string, end: string) => void;
  onExport?: (format: 'pdf' | 'csv') => void;
  consultants?: { id: string; name: string }[];
  selectedConsultantId?: string;
  onConsultantChange?: (consultantId: string | undefined) => void;
}

type PresetPeriod = 'this_week' | 'last_week' | 'this_month' | 'last_30_days' | 'custom';

export function TimeFiltersBar({
  onDateRangeChange,
  onExport,
  consultants,
  selectedConsultantId,
  onConsultantChange,
}: TimeFiltersBarProps) {
  const [preset, setPreset] = useState<PresetPeriod>('this_week');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfWeek(new Date(), { weekStartsOn: 1 }),
    to: endOfWeek(new Date(), { weekStartsOn: 1 }),
  });

  const handlePresetChange = (value: PresetPeriod) => {
    setPreset(value);
    const today = new Date();
    let start: Date;
    let end: Date;

    switch (value) {
      case 'this_week':
        start = startOfWeek(today, { weekStartsOn: 1 });
        end = endOfWeek(today, { weekStartsOn: 1 });
        break;
      case 'last_week':
        start = startOfWeek(subDays(today, 7), { weekStartsOn: 1 });
        end = endOfWeek(subDays(today, 7), { weekStartsOn: 1 });
        break;
      case 'this_month':
        start = startOfMonth(today);
        end = endOfMonth(today);
        break;
      case 'last_30_days':
        start = subDays(today, 30);
        end = today;
        break;
      default:
        return;
    }

    setDateRange({ from: start, to: end });
    onDateRangeChange(formatBRT(start, 'yyyy-MM-dd'), formatBRT(end, 'yyyy-MM-dd'));
  };

  const handleCustomDateChange = (range: DateRange | undefined) => {
    setDateRange(range);
    if (range?.from && range?.to) {
      setPreset('custom');
      onDateRangeChange(
        formatBRT(range.from, 'yyyy-MM-dd'),
        formatBRT(range.to, 'yyyy-MM-dd')
      );
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Period Preset */}
      <Select value={preset} onValueChange={(v) => handlePresetChange(v as PresetPeriod)}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Período" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="this_week">Esta semana</SelectItem>
          <SelectItem value="last_week">Semana passada</SelectItem>
          <SelectItem value="this_month">Este mês</SelectItem>
          <SelectItem value="last_30_days">Últimos 30 dias</SelectItem>
          <SelectItem value="custom">Personalizado</SelectItem>
        </SelectContent>
      </Select>

      {/* Custom Date Picker */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "justify-start text-left font-normal",
              !dateRange && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateRange?.from ? (
              dateRange.to ? (
                <>
                  {formatBRT(dateRange.from, "dd/MM")} -{" "}
                  {formatBRT(dateRange.to, "dd/MM/yyyy")}
                </>
              ) : (
                formatBRT(dateRange.from, "dd/MM/yyyy")
              )
            ) : (
              <span>Selecionar datas</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={dateRange?.from}
            selected={dateRange}
            onSelect={handleCustomDateChange}
            numberOfMonths={2}
            locale={ptBR}
          />
        </PopoverContent>
      </Popover>

      {/* Consultant Filter */}
      {consultants && consultants.length > 0 && onConsultantChange && (
        <Select 
          value={selectedConsultantId || "all"} 
          onValueChange={(v) => onConsultantChange(v === "all" ? undefined : v)}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Todos os consultores" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os consultores</SelectItem>
            {consultants.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Export Buttons */}
      {onExport && (
        <div className="flex gap-2 ml-auto">
          <Button variant="outline" size="sm" onClick={() => onExport('csv')}>
            <Download className="mr-2 h-4 w-4" />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => onExport('pdf')}>
            <Download className="mr-2 h-4 w-4" />
            PDF
          </Button>
        </div>
      )}
    </div>
  );
}
