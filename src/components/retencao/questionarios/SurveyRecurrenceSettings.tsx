import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CalendarIcon, Repeat, Info, Plus, Trash2 } from "lucide-react";
import { addWeeks, addMonths, addYears, differenceInDays, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { RecurrencePattern, CustomRecurrenceDate } from "@/types/survey.types";
import { RECURRENCE_LABELS } from "@/types/survey.types";
import { formatBRT } from "@/lib/datetime";

interface SurveyRecurrenceSettingsProps {
  isRecurring: boolean;
  recurrencePattern: RecurrencePattern | null;
  recurrenceEndDate: Date | null;
  startDate: Date;
  endDate: Date;
  customRecurrenceDates?: CustomRecurrenceDate[] | null;
  onChange: (data: {
    isRecurring: boolean;
    recurrencePattern: RecurrencePattern | null;
    recurrenceEndDate: Date | null;
    customRecurrenceDates?: CustomRecurrenceDate[] | null;
  }) => void;
}

type CustomMode = 'count' | 'dates';

export function SurveyRecurrenceSettings({
  isRecurring,
  recurrencePattern,
  recurrenceEndDate,
  startDate,
  endDate,
  customRecurrenceDates,
  onChange,
}: SurveyRecurrenceSettingsProps) {
  const [scheduledDates, setScheduledDates] = useState<{ start: Date; end: Date }[]>([]);
  
  // Custom recurrence state
  const [customMode, setCustomMode] = useState<CustomMode>('count');
  const [repeatCount, setRepeatCount] = useState(6);
  const [intervalDays, setIntervalDays] = useState(30);
  const [manualDates, setManualDates] = useState<{ start: Date; end: Date }[]>([]);
  const [isAddingDate, setIsAddingDate] = useState(false);
  const [newDateStart, setNewDateStart] = useState<Date | null>(null);
  const [newDateEnd, setNewDateEnd] = useState<Date | null>(null);

  // Initialize manual dates from props
  useEffect(() => {
    if (customRecurrenceDates && Array.isArray(customRecurrenceDates)) {
      setManualDates(
        customRecurrenceDates.map(d => ({
          start: new Date(d.start),
          end: new Date(d.end),
        }))
      );
    }
  }, []);

  // Generate preview of scheduled dates
  useEffect(() => {
    if (!isRecurring || !recurrencePattern) {
      setScheduledDates([]);
      return;
    }

    // For custom pattern with manual dates mode
    if (recurrencePattern === 'custom' && customMode === 'dates') {
      setScheduledDates(manualDates);
      return;
    }

    // For custom pattern with count mode
    if (recurrencePattern === 'custom' && customMode === 'count') {
      const dates: { start: Date; end: Date }[] = [];
      const duration = differenceInDays(endDate, startDate);
      let currentStart = endDate;

      for (let i = 0; i < repeatCount; i++) {
        const nextStart = addDays(currentStart, intervalDays);
        const nextEnd = addDays(nextStart, duration);
        dates.push({ start: nextStart, end: nextEnd });
        currentStart = nextEnd;
      }

      setScheduledDates(dates);
      
      // Update custom dates in parent
      onChange({
        isRecurring,
        recurrencePattern,
        recurrenceEndDate,
        customRecurrenceDates: dates.map(d => ({
          start: d.start.toISOString(),
          end: d.end.toISOString(),
        })),
      });
      return;
    }

    // Standard patterns
    if (!recurrenceEndDate) {
      setScheduledDates([]);
      return;
    }

    const dates: { start: Date; end: Date }[] = [];
    const duration = differenceInDays(endDate, startDate);
    let currentStart = startDate;
    let iterations = 0;
    const maxIterations = 50;

    while (currentStart < recurrenceEndDate && iterations < maxIterations) {
      let nextStart: Date;

      switch (recurrencePattern) {
        case 'weekly':
          nextStart = addWeeks(currentStart, 1);
          break;
        case 'biweekly':
          nextStart = addWeeks(currentStart, 2);
          break;
        case 'monthly':
          nextStart = addMonths(currentStart, 1);
          break;
        case 'quarterly':
          nextStart = addMonths(currentStart, 3);
          break;
        case 'biannual':
          nextStart = addMonths(currentStart, 6);
          break;
        case 'annually':
          nextStart = addYears(currentStart, 1);
          break;
        default:
          nextStart = addMonths(currentStart, 1);
      }

      if (nextStart <= recurrenceEndDate) {
        const nextEnd = new Date(nextStart);
        nextEnd.setDate(nextEnd.getDate() + duration);
        dates.push({ start: nextStart, end: nextEnd });
      }

      currentStart = nextStart;
      iterations++;
    }

    setScheduledDates(dates);
  }, [isRecurring, recurrencePattern, recurrenceEndDate, startDate, endDate, customMode, repeatCount, intervalDays, manualDates]);

  const handleAddManualDate = () => {
    if (newDateStart && newDateEnd) {
      const newDates = [...manualDates, { start: newDateStart, end: newDateEnd }].sort(
        (a, b) => a.start.getTime() - b.start.getTime()
      );
      setManualDates(newDates);
      setNewDateStart(null);
      setNewDateEnd(null);
      setIsAddingDate(false);

      onChange({
        isRecurring,
        recurrencePattern,
        recurrenceEndDate,
        customRecurrenceDates: newDates.map(d => ({
          start: d.start.toISOString(),
          end: d.end.toISOString(),
        })),
      });
    }
  };

  const handleRemoveManualDate = (index: number) => {
    const newDates = manualDates.filter((_, i) => i !== index);
    setManualDates(newDates);

    onChange({
      isRecurring,
      recurrencePattern,
      recurrenceEndDate,
      customRecurrenceDates: newDates.map(d => ({
        start: d.start.toISOString(),
        end: d.end.toISOString(),
      })),
    });
  };

  const handlePatternChange = (newPattern: RecurrencePattern) => {
    if (newPattern === 'custom') {
      onChange({
        isRecurring,
        recurrencePattern: newPattern,
        recurrenceEndDate: null,
        customRecurrenceDates: [],
      });
    } else {
      onChange({
        isRecurring,
        recurrencePattern: newPattern,
        recurrenceEndDate,
        customRecurrenceDates: null,
      });
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Repeat className="h-4 w-4" />
          Recorrência
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Este questionário se repete</Label>
            <p className="text-xs text-muted-foreground">
              Criar automaticamente novas instâncias
            </p>
          </div>
          <Switch
            checked={isRecurring}
            onCheckedChange={(checked) =>
              onChange({
                isRecurring: checked,
                recurrencePattern: checked ? 'monthly' : null,
                recurrenceEndDate: checked ? addMonths(endDate, 12) : null,
                customRecurrenceDates: null,
              })
            }
          />
        </div>

        {isRecurring && (
          <>
            <div className="space-y-2">
              <Label>Frequência</Label>
              <Select
                value={recurrencePattern || 'monthly'}
                onValueChange={(v) => handlePatternChange(v as RecurrencePattern)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(RECURRENCE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Custom Recurrence Options */}
            {recurrencePattern === 'custom' && (
              <div className="space-y-4 p-3 rounded-lg border bg-muted/30">
                <div className="space-y-2">
                  <Label>Modo personalizado</Label>
                  <RadioGroup
                    value={customMode}
                    onValueChange={(v) => {
                      setCustomMode(v as CustomMode);
                      setManualDates([]);
                      onChange({
                        isRecurring,
                        recurrencePattern,
                        recurrenceEndDate: null,
                        customRecurrenceDates: [],
                      });
                    }}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="count" id="count" />
                      <Label htmlFor="count" className="cursor-pointer font-normal">
                        Por quantidade
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="dates" id="dates" />
                      <Label htmlFor="dates" className="cursor-pointer font-normal">
                        Datas específicas
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {customMode === 'count' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Repetir</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={1}
                            max={50}
                            value={repeatCount}
                            onChange={(e) => setRepeatCount(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-20"
                          />
                          <span className="text-sm text-muted-foreground">vezes</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Intervalo</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={1}
                            max={365}
                            value={intervalDays}
                            onChange={(e) => setIntervalDays(Math.max(1, parseInt(e.target.value) || 30))}
                            className="w-20"
                          />
                          <span className="text-sm text-muted-foreground">dias</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {customMode === 'dates' && (
                  <div className="space-y-3">
                    {manualDates.length > 0 && (
                      <div className="space-y-2">
                        {manualDates.map((date, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2 rounded border bg-background text-sm"
                          >
                            <span className="text-muted-foreground">{idx + 1}.</span>
                            <span>
                              {formatBRT(date.start, "dd/MM/yyyy")} -{" "}
                              {formatBRT(date.end, "dd/MM/yyyy")}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                              onClick={() => handleRemoveManualDate(idx)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    {isAddingDate ? (
                      <div className="space-y-2 p-2 rounded border bg-background">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Início</Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !newDateStart && "text-muted-foreground"
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-3 w-3" />
                                  {newDateStart
                                    ? formatBRT(newDateStart, "dd/MM/yy")
                                    : "Selecione"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0">
                                <Calendar
                                  mode="single"
                                  selected={newDateStart || undefined}
                                  onSelect={(d) => {
                                    if (d) {
                                      setNewDateStart(d);
                                      // Auto-set end date based on survey duration
                                      const duration = differenceInDays(endDate, startDate);
                                      setNewDateEnd(addDays(d, duration));
                                    }
                                  }}
                                  locale={ptBR}
                                  disabled={(date) => date < endDate}
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Fim</Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !newDateEnd && "text-muted-foreground"
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-3 w-3" />
                                  {newDateEnd
                                    ? formatBRT(newDateEnd, "dd/MM/yy")
                                    : "Selecione"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0">
                                <Calendar
                                  mode="single"
                                  selected={newDateEnd || undefined}
                                  onSelect={(d) => d && setNewDateEnd(d)}
                                  locale={ptBR}
                                  disabled={(date) => date < (newDateStart || endDate)}
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={handleAddManualDate}
                            disabled={!newDateStart || !newDateEnd}
                          >
                            Adicionar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setIsAddingDate(false);
                              setNewDateStart(null);
                              setNewDateEnd(null);
                            }}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => setIsAddingDate(true)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Adicionar data
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Standard pattern end date */}
            {recurrencePattern !== 'custom' && (
              <div className="space-y-2">
                <Label>Repetir até</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !recurrenceEndDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {recurrenceEndDate
                        ? formatBRT(recurrenceEndDate, "dd/MM/yyyy")
                        : "Selecione"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={recurrenceEndDate || undefined}
                      onSelect={(d) =>
                        d &&
                        onChange({
                          isRecurring,
                          recurrencePattern,
                          recurrenceEndDate: d,
                          customRecurrenceDates: null,
                        })
                      }
                      locale={ptBR}
                      disabled={(date) => date < endDate}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {/* Scheduled dates preview */}
            {scheduledDates.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  {recurrencePattern === 'custom' && customMode === 'dates' 
                    ? 'Datas configuradas'
                    : 'Próximas datas agendadas'}
                </Label>
                <div className="max-h-32 overflow-y-auto space-y-1 rounded-md border p-2 bg-muted/50">
                  {scheduledDates.slice(0, 10).map((date, idx) => (
                    <div key={idx} className="text-xs text-muted-foreground flex justify-between">
                      <span>{idx + 1}.</span>
                      <span>
                        {formatBRT(date.start, "dd/MM/yyyy")} -{" "}
                        {formatBRT(date.end, "dd/MM/yyyy")}
                      </span>
                    </div>
                  ))}
                  {scheduledDates.length > 10 && (
                    <div className="text-xs text-muted-foreground text-center pt-1">
                      + {scheduledDates.length - 10} mais...
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total: {scheduledDates.length} execuções programadas
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}