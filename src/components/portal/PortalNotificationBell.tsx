import { useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { usePortalActivityLog, useMarkPortalEventsSeen } from "@/hooks/usePortalActivityLog";
import { parseISO } from "date-fns";
import { formatBRT } from "@/lib/datetime";

interface PortalNotificationBellProps {
  token: string;
}

const EVENT_LABELS: Record<string, string> = {
  shortlist_ready: "Shortlist pronta",
  candidate_advanced: "Candidato avançou",
  candidate_hired: "Candidato contratado",
  stage_update: "Atualização de etapa",
  sla_warning: "Alerta de prazo",
  feedback_requested: "Feedback solicitado",
};

export function PortalNotificationBell({ token }: PortalNotificationBellProps) {
  const [open, setOpen] = useState(false);
  const { data: events = [] } = usePortalActivityLog(token, 20);
  const markSeen = useMarkPortalEventsSeen(token);

  const unread = events.filter((e) => !e.seen_by_client);
  const unreadCount = unread.length;

  const handleOpen = (next: boolean) => {
    setOpen(next);
    if (next && unreadCount > 0) {
      markSeen.mutate(unread.map((e) => e.id));
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] flex items-center justify-center"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="px-4 py-3 border-b">
          <h4 className="font-semibold text-sm">Notificações</h4>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {events.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              Sem notificações ainda.
            </div>
          ) : (
            events.slice(0, 10).map((e) => (
              <div
                key={e.id}
                className={`px-4 py-2.5 border-b last:border-b-0 hover:bg-muted/30 ${
                  !e.seen_by_client ? "bg-primary/5" : ""
                }`}
              >
                <p className="text-sm font-medium">
                  {EVENT_LABELS[e.event_type] || e.event_type}
                </p>
                {(e.event_data as any)?.job_title && (
                  <p className="text-xs text-muted-foreground">
                    {(e.event_data as any).job_title}
                  </p>
                )}
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {formatBRT(parseISO(e.created_at), "dd/MM 'às' HH:mm")}
                </p>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
