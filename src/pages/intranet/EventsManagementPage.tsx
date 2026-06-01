import { useState, useMemo } from 'react';
import { startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { Plus, ChevronLeft, ChevronRight, Calendar, Edit, Trash2, Loader2, Cake, PartyPopper, GraduationCap, CalendarDays } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useOrgEvents, type OrgEvent } from '@/hooks/useOrgEvents';
import { EventForm } from '@/components/intranet/EventForm';
import { cn } from '@/lib/utils';
import { formatBRT } from "@/lib/datetime";

const eventTypeConfig: Record<string, { icon: typeof Calendar; label: string; color: string }> = {
  holiday: { icon: PartyPopper, label: 'Feriado', color: 'bg-purple-100 text-purple-700 border-purple-300' },
  company_event: { icon: CalendarDays, label: 'Evento', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  training: { icon: GraduationCap, label: 'Treinamento', color: 'bg-green-100 text-green-700 border-green-300' },
  celebration: { icon: Cake, label: 'Celebração', color: 'bg-pink-100 text-pink-700 border-pink-300' },
};

export default function EventsManagementPage() {
  const { events, isLoading, deleteEvent } = useOrgEvents();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [formOpen, setFormOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<OrgEvent | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, OrgEvent[]>();
    events.forEach(event => {
      const dateKey = formatBRT(new Date(event.event_date), 'yyyy-MM-dd');
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(event);
    });
    return map;
  }, [events]);

  const handleEdit = (event: OrgEvent) => {
    setEditEvent(event);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteEvent.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const handleNewEvent = (date?: Date) => {
    setSelectedDate(date || null);
    setEditEvent(null);
    setFormOpen(true);
  };

  const breadcrumb = [
    { label: 'Intranet', href: '/intranet' },
    { label: 'Eventos' },
  ];

  const upcomingEvents = events
    .filter(e => new Date(e.event_date) >= new Date())
    .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())
    .slice(0, 5);

  return (
    <AppLayout title="Calendário de Eventos" breadcrumb={breadcrumb}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {formatBRT(currentMonth, 'MMMM yyyy')}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button onClick={() => handleNewEvent()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Evento
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                  <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                    {day}
                  </div>
                ))}
                
                {/* Empty cells for days before month starts */}
                {Array.from({ length: days[0].getDay() }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-24" />
                ))}
                
                {days.map(day => {
                  const dateKey = formatBRT(day, 'yyyy-MM-dd');
                  const dayEvents = eventsByDate.get(dateKey) || [];
                  const isToday = isSameDay(day, new Date());
                  
                  return (
                    <div
                      key={dateKey}
                      className={cn(
                        'h-24 border rounded-lg p-1 cursor-pointer hover:bg-muted/50 transition-colors',
                        isToday && 'border-primary bg-primary/5',
                        !isSameMonth(day, currentMonth) && 'opacity-50'
                      )}
                      onClick={() => handleNewEvent(day)}
                    >
                      <div className={cn(
                        'text-xs font-medium mb-1',
                        isToday && 'text-primary'
                      )}>
                        {formatBRT(day, 'd')}
                      </div>
                      <div className="space-y-0.5 overflow-hidden">
                        {dayEvents.slice(0, 2).map(event => {
                          const config = eventTypeConfig[event.event_type] || eventTypeConfig.company_event;
                          return (
                            <div
                              key={event.id}
                              className={cn(
                                'text-xs truncate px-1 py-0.5 rounded border',
                                config.color
                              )}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(event);
                              }}
                            >
                              {event.title}
                            </div>
                          );
                        })}
                        {dayEvents.length > 2 && (
                          <div className="text-xs text-muted-foreground px-1">
                            +{dayEvents.length - 2} mais
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Próximos Eventos</CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum evento agendado
              </p>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.map(event => {
                  const config = eventTypeConfig[event.event_type] || eventTypeConfig.company_event;
                  const Icon = config.icon;
                  
                  return (
                    <div key={event.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 group">
                      <div className={cn('p-2 rounded-lg', config.color.replace('text-', 'bg-').replace('100', '50'))}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{event.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatBRT(new Date(event.event_date), "dd 'de' MMMM")}
                        </p>
                        <Badge variant="outline" className="mt-1 text-xs">
                          {config.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(event)}>
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(event.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <EventForm
        open={formOpen}
        onOpenChange={setFormOpen}
        editEvent={editEvent}
        defaultDate={selectedDate}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir evento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O evento será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              {deleteEvent.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
