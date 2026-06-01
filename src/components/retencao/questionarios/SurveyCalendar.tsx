import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isWithinInterval, startOfWeek, endOfWeek, addMonths, subMonths } from "date-fns";
import type { Survey, SurveySchedule } from "@/types/survey.types";
import { formatBRT } from "@/lib/datetime";

interface CalendarData {
  surveys: Survey[];
  schedules: SurveySchedule[];
}

interface SurveyCalendarProps {
  data: CalendarData;
  onSelectSurvey: (survey: Survey) => void;
  onMonthChange: (date: Date) => void;
}

export function SurveyCalendar({ data, onSelectSurvey, onMonthChange }: SurveyCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const handlePrevMonth = () => {
    const newDate = subMonths(currentDate, 1);
    setCurrentDate(newDate);
    onMonthChange(newDate);
  };

  const handleNextMonth = () => {
    const newDate = addMonths(currentDate, 1);
    setCurrentDate(newDate);
    onMonthChange(newDate);
  };

  const getSurveysForDay = (day: Date) => {
    return data.surveys.filter((survey) => {
      const start = new Date(survey.start_date);
      const end = new Date(survey.end_date);
      return isWithinInterval(day, { start, end });
    });
  };

  const getSchedulesForDay = (day: Date) => {
    return data.schedules.filter((schedule) => {
      const start = new Date(schedule.scheduled_start_date);
      const end = new Date(schedule.scheduled_end_date);
      return isWithinInterval(day, { start, end }) && schedule.status === 'pending';
    });
  };

  const getStatusColor = (survey: Survey) => {
    if (survey.status === 'draft') return 'bg-muted text-muted-foreground';
    if (survey.status === 'closed') return 'bg-red-500 text-white';
    if (survey.status === 'active') return 'bg-green-500 text-white';
    return 'bg-muted text-muted-foreground';
  };

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Calendário de Questionários
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handlePrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-medium min-w-[160px] text-center">
              {formatBRT(currentDate, "MMMM yyyy")}
            </span>
            <Button variant="outline" size="icon" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Legend */}
        <div className="flex items-center gap-4 mb-4 text-sm">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-green-500" />
            <span>Ativo</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-amber-500" />
            <span>Agendado</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-muted" />
            <span>Rascunho</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-red-500" />
            <span>Encerrado</span>
          </div>
        </div>

        {/* Week Headers */}
        <div className="grid grid-cols-7 gap-px mb-1">
          {weekDays.map((day) => (
            <div
              key={day}
              className="text-center text-xs font-medium text-muted-foreground py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
          {days.map((day) => {
            const surveysForDay = getSurveysForDay(day);
            const schedulesForDay = getSchedulesForDay(day);
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isToday = isSameDay(day, new Date());

            return (
              <div
                key={day.toISOString()}
                className={`min-h-[100px] bg-background p-1 ${
                  !isCurrentMonth ? 'opacity-40' : ''
                }`}
              >
                <div
                  className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                    isToday ? 'bg-primary text-primary-foreground' : ''
                  }`}
                >
                  {formatBRT(day, 'd')}
                </div>
                <div className="space-y-0.5 overflow-hidden">
                  {surveysForDay.slice(0, 3).map((survey) => (
                    <button
                      key={survey.id}
                      onClick={() => onSelectSurvey(survey)}
                      className={`w-full text-left text-[10px] px-1 py-0.5 rounded truncate ${getStatusColor(
                        survey
                      )} hover:opacity-80 transition-opacity`}
                      title={survey.title}
                    >
                      {survey.title}
                    </button>
                  ))}
                  {schedulesForDay.map((schedule) => (
                    <div
                      key={schedule.id}
                      className="text-[10px] px-1 py-0.5 rounded truncate bg-amber-500 text-white"
                      title="Agendado"
                    >
                      📅 Agendado
                    </div>
                  ))}
                  {surveysForDay.length > 3 && (
                    <div className="text-[10px] text-muted-foreground text-center">
                      +{surveysForDay.length - 3} mais
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
