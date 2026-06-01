import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, RefreshCw, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay } from "date-fns";
import type { PulseDailyAssignment, PulseDailyAssignmentItem } from '@/types/pulse.types';
import { formatBRT } from "@/lib/datetime";

interface AssignmentWithItems extends PulseDailyAssignment {
  items: PulseDailyAssignmentItem[];
}

interface Props {
  assignments: AssignmentWithItems[];
  loading: boolean;
  onGenerate: (date: string, force?: boolean) => Promise<any>;
  onRefresh: (month?: string) => void;
}

export function PulseAdminSchedule({ assignments, loading, onGenerate, onRefresh }: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [generating, setGenerating] = useState(false);

  const monthStr = formatBRT(currentMonth, 'yyyy-MM');

  useEffect(() => {
    onRefresh(monthStr);
  }, [monthStr, onRefresh]);

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const getAssignmentForDate = (date: Date) => {
    const dateStr = formatBRT(date, 'yyyy-MM-dd');
    return assignments.find(a => a.date === dateStr);
  };

  const selectedAssignment = selectedDate ? getAssignmentForDate(selectedDate) : null;

  const handleGenerateToday = async () => {
    setGenerating(true);
    const dateStr = formatBRT(new Date(), 'yyyy-MM-dd');
    await onGenerate(dateStr);
    setGenerating(false);
  };

  const handleGenerateForDate = async (force: boolean = false) => {
    if (!selectedDate) return;
    setGenerating(true);
    const dateStr = formatBRT(selectedDate, 'yyyy-MM-dd');
    await onGenerate(dateStr, force);
    setGenerating(false);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Calendar */}
      <Card className="lg:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Agenda do Pulse
            </CardTitle>
            <CardDescription>Visualize e gere os pulsos diários</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium w-32 text-center capitalize">
              {formatBRT(currentMonth, 'MMMM yyyy')}
            </span>
            <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
              <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for days before the first of the month */}
            {Array.from({ length: startOfMonth(currentMonth).getDay() }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}

            {days.map(day => {
              const assignment = getAssignmentForDate(day);
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const hasAssignment = !!assignment;

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={`aspect-square rounded-lg flex flex-col items-center justify-center text-sm transition-colors relative ${
                    isSelected
                      ? 'bg-primary text-primary-foreground'
                      : isToday(day)
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'hover:bg-accent'
                  }`}
                >
                  <span>{formatBRT(day, 'd')}</span>
                  {hasAssignment && (
                    <span className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${
                      isSelected ? 'bg-primary-foreground' : 'bg-primary'
                    }`} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick action */}
          <div className="mt-4 pt-4 border-t flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {assignments.length} pulso{assignments.length !== 1 ? 's' : ''} neste mês
            </span>
            <Button
              onClick={handleGenerateToday}
              disabled={generating || loading}
              size="sm"
              className="gap-1"
            >
              {generating ? (
                'Gerando...'
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Gerar Hoje
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Selected Day Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {selectedDate
              ? formatBRT(selectedDate, "d 'de' MMMM")
              : 'Selecione um dia'}
          </CardTitle>
          <CardDescription>
            {selectedAssignment
              ? `Pulso gerado por ${selectedAssignment.generated_by || 'sistema'}`
              : selectedDate
              ? 'Nenhum pulso para este dia'
              : 'Clique em um dia no calendário'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : selectedAssignment ? (
            <div className="space-y-3">
              {selectedAssignment.items.map((item, idx) => (
                <div key={item.id} className="p-3 rounded-lg border bg-accent/30">
                  <div className="flex items-start gap-2">
                    <Badge variant="outline" className="shrink-0">
                      {idx + 1}
                    </Badge>
                    <div className="min-w-0">
                      <p className="text-sm font-medium line-clamp-2">
                        {(item as any).pulse_questions?.question_text || 'Pergunta'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {(item as any).pulse_questions?.pulse_drivers?.name || 'Driver'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleGenerateForDate(true)}
                disabled={generating}
                className="w-full mt-4"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Regerar Pulso
              </Button>
            </div>
          ) : selectedDate ? (
            <div className="text-center py-6">
              <p className="text-muted-foreground mb-4">
                Não há pulso agendado para este dia.
              </p>
              <Button
                onClick={() => handleGenerateForDate(false)}
                disabled={generating}
                size="sm"
              >
                {generating ? 'Gerando...' : 'Gerar Pulso'}
              </Button>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-6">
              Selecione um dia no calendário para ver detalhes.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
