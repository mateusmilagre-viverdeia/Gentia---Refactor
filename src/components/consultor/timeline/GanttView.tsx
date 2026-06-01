import { useMemo, useState } from 'react';
import { ProjectMilestone, PILLAR_CONFIG, STATUS_COLORS, isMilestoneOverdue } from '@/types/project-timeline.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { addDays, differenceInDays, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isSameMonth } from "date-fns";
import { formatBRT } from "@/lib/datetime";

interface GanttViewProps {
  milestones: ProjectMilestone[];
  loading: boolean;
  onUpdateMilestone: (id: string, updates: Partial<ProjectMilestone>) => Promise<boolean>;
  readOnly?: boolean;
}

type TimeScale = 'days' | 'weeks' | 'months';

export function GanttView({ milestones, loading, onUpdateMilestone, readOnly = false }: GanttViewProps) {
  const [timeScale, setTimeScale] = useState<TimeScale>('weeks');

  // Calculate date range
  const { startDate, endDate, days } = useMemo(() => {
    const now = new Date();
    let minDate = now;
    let maxDate = addDays(now, 90); // Default 3 months ahead

    milestones.forEach(m => {
      if (m.planned_start) {
        const start = new Date(m.planned_start);
        if (start < minDate) minDate = start;
      }
      if (m.planned_end) {
        const end = new Date(m.planned_end);
        if (end > maxDate) maxDate = end;
      }
    });

    // Add padding
    minDate = addDays(startOfMonth(minDate), -7);
    maxDate = addDays(endOfMonth(maxDate), 7);

    const allDays = eachDayOfInterval({ start: minDate, end: maxDate });

    return { startDate: minDate, endDate: maxDate, days: allDays };
  }, [milestones]);

  const totalDays = differenceInDays(endDate, startDate);
  const dayWidth = timeScale === 'days' ? 40 : timeScale === 'weeks' ? 20 : 8;
  const chartWidth = totalDays * dayWidth;

  // Group milestones by pillar
  const groupedMilestones = useMemo(() => {
    const groups: Record<string, ProjectMilestone[]> = {};
    
    milestones.forEach(m => {
      const key = m.pillar || 'other';
      if (!groups[key]) groups[key] = [];
      groups[key].push(m);
    });

    // Sort by pillar order
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      const orderA = PILLAR_CONFIG[a as keyof typeof PILLAR_CONFIG]?.order ?? 99;
      const orderB = PILLAR_CONFIG[b as keyof typeof PILLAR_CONFIG]?.order ?? 99;
      return orderA - orderB;
    });

    return sortedKeys.map(key => ({
      pillar: key,
      config: PILLAR_CONFIG[key as keyof typeof PILLAR_CONFIG],
      items: groups[key],
    }));
  }, [milestones]);

  const getBarPosition = (milestone: ProjectMilestone) => {
    const start = milestone.planned_start ? new Date(milestone.planned_start) : new Date();
    const end = milestone.planned_end ? new Date(milestone.planned_end) : addDays(start, 7);
    
    const startOffset = differenceInDays(start, startDate);
    const duration = differenceInDays(end, start) + 1;

    return {
      left: startOffset * dayWidth,
      width: Math.max(duration * dayWidth, 30), // Minimum width
    };
  };

  const getBarColor = (milestone: ProjectMilestone) => {
    if (isMilestoneOverdue(milestone)) {
      return 'bg-red-500';
    }
    switch (milestone.status) {
      case 'completed':
        return 'bg-green-500';
      case 'in_progress':
        return 'bg-blue-500';
      case 'blocked':
        return 'bg-red-400';
      case 'cancelled':
        return 'bg-gray-400';
      default:
        return 'bg-muted-foreground/50';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Timeline Gantt</CardTitle>
          <Select value={timeScale} onValueChange={(v) => setTimeScale(v as TimeScale)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="days">Dias</SelectItem>
              <SelectItem value="weeks">Semanas</SelectItem>
              <SelectItem value="months">Meses</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="flex">
          {/* Left sidebar with milestone names */}
          <div className="w-64 shrink-0 border-r">
            <div className="h-12 border-b bg-muted/50 flex items-center px-4">
              <span className="text-sm font-medium text-muted-foreground">Marcos</span>
            </div>
            {groupedMilestones.map(group => (
              <div key={group.pillar}>
                {/* Pillar header */}
                <div className="h-8 bg-muted/30 flex items-center px-4 border-b">
                  {group.config ? (
                    <Badge 
                      variant="outline" 
                      style={{ 
                        backgroundColor: `${group.config.color}15`,
                        borderColor: group.config.color,
                        color: group.config.color 
                      }}
                    >
                      {group.config.label}
                    </Badge>
                  ) : (
                    <Badge variant="outline">Outros</Badge>
                  )}
                </div>
                {/* Milestones */}
                {group.items.map(milestone => (
                  <div 
                    key={milestone.id} 
                    className="h-12 flex items-center px-4 border-b text-sm truncate"
                  >
                    {milestone.milestone_name}
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Gantt chart area */}
          <ScrollArea className="flex-1">
            <div style={{ width: chartWidth, minWidth: '100%' }}>
              {/* Timeline header */}
              <div className="h-12 border-b bg-muted/50 flex">
                {days.map((day, i) => {
                  const showDate = timeScale === 'days' || 
                    (timeScale === 'weeks' && day.getDay() === 1) ||
                    (timeScale === 'months' && day.getDate() === 1);
                  
                  return (
                    <div
                      key={i}
                      className={`flex items-center justify-center border-r ${
                        isToday(day) ? 'bg-primary/10' : ''
                      }`}
                      style={{ width: dayWidth, minWidth: dayWidth }}
                    >
                      {showDate && (
                        <span className="text-xs text-muted-foreground">
                          {formatBRT(day, timeScale === 'months' ? 'MMM' : 'dd/MM')}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Milestone rows */}
              <TooltipProvider>
                {groupedMilestones.map(group => (
                  <div key={group.pillar}>
                    {/* Pillar header row */}
                    <div className="h-8 bg-muted/30 border-b relative">
                      {days.map((day, i) => (
                        <div
                          key={i}
                          className={`absolute h-full border-r ${isToday(day) ? 'bg-primary/10' : ''}`}
                          style={{ left: i * dayWidth, width: dayWidth }}
                        />
                      ))}
                    </div>
                    
                    {/* Milestone bars */}
                    {group.items.map(milestone => {
                      const { left, width } = getBarPosition(milestone);
                      const barColor = getBarColor(milestone);
                      const isOverdue = isMilestoneOverdue(milestone);

                      return (
                        <div key={milestone.id} className="h-12 border-b relative">
                          {/* Day grid lines */}
                          {days.map((day, i) => (
                            <div
                              key={i}
                              className={`absolute h-full border-r ${isToday(day) ? 'bg-primary/5' : ''}`}
                              style={{ left: i * dayWidth, width: dayWidth }}
                            />
                          ))}
                          
                          {/* Today line */}
                          {days.some(d => isToday(d)) && (
                            <div
                              className="absolute h-full w-0.5 bg-primary z-10"
                              style={{
                                left: differenceInDays(new Date(), startDate) * dayWidth + dayWidth / 2,
                              }}
                            />
                          )}
                          
                          {/* Milestone bar */}
                          {(milestone.planned_start || milestone.planned_end) && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div
                                  className={`absolute top-2 h-8 rounded-md cursor-pointer transition-all hover:opacity-80 ${barColor}`}
                                  style={{ left, width }}
                                >
                                  {/* Progress fill */}
                                  <div 
                                    className="absolute inset-0 bg-white/20 rounded-md"
                                    style={{ width: `${milestone.progress_percentage}%` }}
                                  />
                                  <span className="absolute inset-0 flex items-center justify-center text-xs text-white font-medium truncate px-2">
                                    {milestone.progress_percentage}%
                                  </span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="space-y-1">
                                  <p className="font-medium">{milestone.milestone_name}</p>
                                  <p className="text-xs">
                                    {milestone.planned_start && formatBRT(new Date(milestone.planned_start), 'dd/MM/yyyy')}
                                    {' → '}
                                    {milestone.planned_end && formatBRT(new Date(milestone.planned_end), 'dd/MM/yyyy')}
                                  </p>
                                  <p className="text-xs">Progresso: {milestone.progress_percentage}%</p>
                                  {isOverdue && (
                                    <p className="text-xs text-red-400">⚠️ Atrasado</p>
                                  )}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </TooltipProvider>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
