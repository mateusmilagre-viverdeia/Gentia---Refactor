import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, isSameDay, parseISO } from "date-fns";
import type { TimeEntryWithRelations } from "@/types/time-tracking.types";
import { formatDuration } from "@/types/time-tracking.types";
import { cn } from "@/lib/utils";
import { formatBRT } from "@/lib/datetime";

interface WeeklyTimesheetViewProps {
  entries: TimeEntryWithRelations[];
  weekStart: Date;
  onWeekChange: (newStart: Date) => void;
}

export function WeeklyTimesheetView({ 
  entries, 
  weekStart, 
  onWeekChange 
}: WeeklyTimesheetViewProps) {
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Group entries by project and day
  const timesheetData = useMemo(() => {
    const projectMap = new Map<string, {
      accountId: string;
      accountName: string;
      dailyMinutes: number[];
      totalMinutes: number;
    }>();

    entries.forEach((entry) => {
      const entryDate = parseISO(entry.entry_date);
      const dayIndex = weekDays.findIndex((d) => isSameDay(d, entryDate));
      
      if (dayIndex === -1) return;

      const existing = projectMap.get(entry.account_id);
      if (existing) {
        existing.dailyMinutes[dayIndex] += entry.duration_minutes;
        existing.totalMinutes += entry.duration_minutes;
      } else {
        const dailyMinutes = Array(7).fill(0);
        dailyMinutes[dayIndex] = entry.duration_minutes;
        projectMap.set(entry.account_id, {
          accountId: entry.account_id,
          accountName: entry.account?.name || "Desconhecido",
          dailyMinutes,
          totalMinutes: entry.duration_minutes,
        });
      }
    });

    // Calculate daily totals
    const dailyTotals = Array(7).fill(0);
    projectMap.forEach((project) => {
      project.dailyMinutes.forEach((minutes, index) => {
        dailyTotals[index] += minutes;
      });
    });

    const weekTotal = dailyTotals.reduce((a, b) => a + b, 0);

    return {
      projects: Array.from(projectMap.values()),
      dailyTotals,
      weekTotal,
    };
  }, [entries, weekDays]);

  const handlePreviousWeek = () => {
    onWeekChange(subWeeks(weekStart, 1));
  };

  const handleNextWeek = () => {
    onWeekChange(addWeeks(weekStart, 1));
  };

  const handleCurrentWeek = () => {
    onWeekChange(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };

  const isCurrentWeek = isSameDay(weekStart, startOfWeek(new Date(), { weekStartsOn: 1 }));

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Timesheet Semanal</CardTitle>
            <CardDescription>
              {formatBRT(weekStart, "dd 'de' MMMM")} - {formatBRT(weekEnd, "dd 'de' MMMM, yyyy")}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handlePreviousWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleCurrentWeek}
              disabled={isCurrentWeek}
            >
              Hoje
            </Button>
            <Button variant="outline" size="icon" onClick={handleNextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-2 font-medium text-muted-foreground min-w-[200px]">
                  Projeto
                </th>
                {weekDays.map((day, index) => {
                  const isToday = isSameDay(day, new Date());
                  return (
                    <th 
                      key={index}
                      className={cn(
                        "text-center py-3 px-2 font-medium min-w-[80px]",
                        isToday ? "text-primary" : "text-muted-foreground"
                      )}
                    >
                      <div className="text-xs uppercase">
                        {formatBRT(day, "EEE")}
                      </div>
                      <div className={cn(
                        "text-sm",
                        isToday && "bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center mx-auto"
                      )}>
                        {formatBRT(day, "d")}
                      </div>
                    </th>
                  );
                })}
                <th className="text-center py-3 px-2 font-medium text-muted-foreground min-w-[80px]">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {timesheetData.projects.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-muted-foreground">
                    Nenhum registro nesta semana
                  </td>
                </tr>
              ) : (
                <>
                  {timesheetData.projects.map((project) => (
                    <tr key={project.accountId} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-2 font-medium truncate max-w-[200px]">
                        {project.accountName}
                      </td>
                      {project.dailyMinutes.map((minutes, index) => (
                        <td key={index} className="text-center py-3 px-2">
                          {minutes > 0 ? (
                            <span className="text-sm bg-primary/10 text-primary px-2 py-1 rounded">
                              {formatDuration(minutes)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/50">-</span>
                          )}
                        </td>
                      ))}
                      <td className="text-center py-3 px-2 font-semibold">
                        {formatDuration(project.totalMinutes)}
                      </td>
                    </tr>
                  ))}
                  {/* Totals Row */}
                  <tr className="bg-muted/50 font-semibold">
                    <td className="py-3 px-2">Total</td>
                    {timesheetData.dailyTotals.map((minutes, index) => (
                      <td key={index} className="text-center py-3 px-2">
                        {minutes > 0 ? formatDuration(minutes) : "-"}
                      </td>
                    ))}
                    <td className="text-center py-3 px-2 text-primary">
                      {formatDuration(timesheetData.weekTotal)}
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
