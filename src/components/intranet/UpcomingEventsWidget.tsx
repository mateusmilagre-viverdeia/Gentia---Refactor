import { differenceInDays } from "date-fns";
import { Calendar, ChevronRight, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useUpcomingEvents, type EventType } from '@/hooks/useOrgEvents';
import { formatBRT } from "@/lib/datetime";

const eventTypeLabels: Record<EventType, { label: string; color: string }> = {
  holiday: { label: 'Feriado', color: 'bg-purple-100 text-purple-700' },
  company_event: { label: 'Evento', color: 'bg-blue-100 text-blue-700' },
  training: { label: 'Treinamento', color: 'bg-amber-100 text-amber-700' },
  celebration: { label: 'Celebração', color: 'bg-green-100 text-green-700' },
};

export function UpcomingEventsWidget() {
  const { data: events, isLoading } = useUpcomingEvents(5);

  const getDaysUntil = (dateStr: string) => {
    const eventDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    eventDate.setHours(0, 0, 0, 0);
    return differenceInDays(eventDate, today);
  };

  const formatDaysUntil = (days: number) => {
    if (days === 0) return 'Hoje';
    if (days === 1) return 'Amanhã';
    return `${days} dias`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4 text-purple-500" />
            Próximos Eventos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="h-4 w-4 text-purple-500" />
          Próximos Eventos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!events || events.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-2">
            Nenhum evento programado
          </p>
        ) : (
          <>
            {events.map((event) => {
              const days = getDaysUntil(event.event_date);
              const typeConfig = eventTypeLabels[event.event_type] || eventTypeLabels.company_event;
              
              return (
                <div 
                  key={event.id} 
                  className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex flex-col items-center justify-center bg-muted rounded-lg p-2 min-w-[48px]">
                    <span className="text-lg font-bold leading-none">
                      {formatBRT(new Date(event.event_date), 'dd')}
                    </span>
                    <span className="text-xs text-muted-foreground uppercase">
                      {formatBRT(new Date(event.event_date), 'MMM')}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{event.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className={`text-xs ${typeConfig.color}`}>
                        {typeConfig.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDaysUntil(days)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
            
            <Button variant="ghost" size="sm" className="w-full text-xs">
              Ver calendário completo
              <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
