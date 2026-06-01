import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import { ptBR } from "date-fns/locale";
import { CalendarIcon, Clock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TimeEntry, TimeEntryCategory, CreateTimeEntryInput, UpdateTimeEntryInput } from "@/types/time-tracking.types";
import { TIME_CATEGORY_LABELS, TIME_CATEGORIES, calculateDuration } from "@/types/time-tracking.types";
import { formatBRT } from "@/lib/datetime";

interface Project {
  id: string;
  name: string;
}

interface TimeEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry?: TimeEntry | null;
  projects: Project[];
  onSave: (data: CreateTimeEntryInput | UpdateTimeEntryInput) => Promise<void>;
  isSaving?: boolean;
}

export function TimeEntryDialog({
  open,
  onOpenChange,
  entry,
  projects,
  onSave,
  isSaving = false,
}: TimeEntryDialogProps) {
  const [date, setDate] = useState<Date>(new Date());
  const [accountId, setAccountId] = useState("");
  const [category, setCategory] = useState<TimeEntryCategory>("checkpoint");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [description, setDescription] = useState("");
  const [billable, setBillable] = useState(true);
  const [useTimeRange, setUseTimeRange] = useState(false);

  // Reset form when dialog opens/closes or entry changes
  useEffect(() => {
    if (open) {
      if (entry) {
        setDate(new Date(entry.entry_date));
        setAccountId(entry.account_id);
        setCategory(entry.category);
        setStartTime(entry.start_time || "");
        setEndTime(entry.end_time || "");
        setDurationMinutes(entry.duration_minutes);
        setDescription(entry.description || "");
        setBillable(entry.billable);
        setUseTimeRange(!!(entry.start_time && entry.end_time));
      } else {
        setDate(new Date());
        setAccountId(projects[0]?.id || "");
        setCategory("checkpoint");
        setStartTime("");
        setEndTime("");
        setDurationMinutes(60);
        setDescription("");
        setBillable(true);
        setUseTimeRange(false);
      }
    }
  }, [open, entry, projects]);

  // Calculate duration when times change
  useEffect(() => {
    if (useTimeRange && startTime && endTime) {
      const duration = calculateDuration(startTime, endTime);
      if (duration > 0) {
        setDurationMinutes(duration);
      }
    }
  }, [startTime, endTime, useTimeRange]);

  const handleSubmit = async () => {
    const data: CreateTimeEntryInput = {
      account_id: accountId,
      entry_date: formatBRT(date, "yyyy-MM-dd"),
      start_time: useTimeRange && startTime ? startTime : null,
      end_time: useTimeRange && endTime ? endTime : null,
      duration_minutes: durationMinutes,
      category,
      description: description || null,
      billable,
    };

    await onSave(entry ? { ...data } : data);
    onOpenChange(false);
  };

  const isValid = accountId && durationMinutes > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {entry ? "Editar Registro de Tempo" : "Novo Registro de Tempo"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Project Selection */}
          <div className="space-y-2">
            <Label>Projeto *</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o projeto" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label>Data *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? formatBRT(date, "PPP") : "Selecione a data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && setDate(d)}
                  locale={ptBR}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Categoria *</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as TimeEntryCategory)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {TIME_CATEGORY_LABELS[cat]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Time Mode Toggle */}
          <div className="flex items-center justify-between">
            <Label>Usar horário início/fim</Label>
            <Switch checked={useTimeRange} onCheckedChange={setUseTimeRange} />
          </div>

          {/* Duration or Time Range */}
          {useTimeRange ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Início</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Fim</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Duração (minutos) *</Label>
              <Input
                type="number"
                min={1}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">
                {Math.floor(durationMinutes / 60)}h {durationMinutes % 60}min
              </p>
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva as atividades realizadas..."
              rows={3}
            />
          </div>

          {/* Billable Toggle */}
          <div className="flex items-center justify-between">
            <Label>Faturável</Label>
            <Switch checked={billable} onCheckedChange={setBillable} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {entry ? "Salvar" : "Registrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
