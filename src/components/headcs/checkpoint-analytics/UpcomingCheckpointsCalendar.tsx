import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users } from "lucide-react";
import { parseISO, isToday, isTomorrow } from "date-fns";
import type { UpcomingCheckpoint } from "@/types/checkpoint-analytics.types";
import { formatBRT } from "@/lib/datetime";

interface UpcomingCheckpointsCalendarProps {
  checkpoints: UpcomingCheckpoint[];
}

export function UpcomingCheckpointsCalendar({ checkpoints }: UpcomingCheckpointsCalendarProps) {
  if (checkpoints.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Próximos Checkpoints
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhum checkpoint agendado
          </p>
        </CardContent>
      </Card>
    );
  }

  const getDateLabel = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Hoje';
    if (isTomorrow(date)) return 'Amanhã';
    return formatBRT(date, "EEEE, dd/MM");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Próximos Checkpoints
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {checkpoints.map((checkpoint) => (
            <div
              key={checkpoint.id}
              className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              <div className="flex flex-col items-center min-w-[60px]">
                <span className="text-xs text-muted-foreground">
                  {formatBRT(parseISO(checkpoint.checkpointDate), "MMM")}
                </span>
                <span className="text-2xl font-bold">
                  {formatBRT(parseISO(checkpoint.checkpointDate), "dd")}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{checkpoint.clientName}</span>
                  {(isToday(parseISO(checkpoint.checkpointDate)) || isTomorrow(parseISO(checkpoint.checkpointDate))) && (
                    <Badge variant="info" className="text-[10px] px-1.5">
                      {isToday(parseISO(checkpoint.checkpointDate)) ? 'Hoje' : 'Amanhã'}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {checkpoint.topic}
                </p>
                {checkpoint.consultantNames.length > 0 && (
                  <div className="flex items-center gap-1 mt-1">
                    <Users className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {checkpoint.consultantNames.join(', ')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
