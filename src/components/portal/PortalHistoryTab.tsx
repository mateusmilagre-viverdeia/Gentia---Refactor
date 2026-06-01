import { useMemo, useState } from "react";
import {
  Briefcase,
  UserCheck,
  UserX,
  FileText,
  Trophy,
  ArrowRight,
  Bell,
  AlertTriangle,
  MessageSquare,
} from "lucide-react";
import { parseISO, subDays } from "date-fns";
import { usePortalActivityLog } from "@/hooks/usePortalActivityLog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatBRT } from "@/lib/datetime";

interface PortalHistoryTabProps {
  token: string;
}

const EVENT_META: Record<string, { label: string; icon: React.ReactNode }> = {
  shortlist_ready: { label: "Shortlist pronta", icon: <Trophy className="h-4 w-4 text-amber-600" /> },
  candidate_advanced: { label: "Candidato avançou de etapa", icon: <ArrowRight className="h-4 w-4 text-blue-600" /> },
  candidate_hired: { label: "Candidato contratado", icon: <UserCheck className="h-4 w-4 text-green-600" /> },
  candidate_approved: { label: "Candidato aprovado", icon: <UserCheck className="h-4 w-4 text-green-600" /> },
  candidate_rejected: { label: "Candidato recusado", icon: <UserX className="h-4 w-4 text-red-500" /> },
  stage_update: { label: "Atualização de etapa", icon: <ArrowRight className="h-4 w-4 text-blue-600" /> },
  sla_warning: { label: "Alerta de prazo", icon: <AlertTriangle className="h-4 w-4 text-orange-600" /> },
  feedback_requested: { label: "Feedback solicitado", icon: <MessageSquare className="h-4 w-4 text-primary" /> },
  job_opened: { label: "Vaga aberta", icon: <Briefcase className="h-4 w-4" /> },
};

function getMeta(eventType: string) {
  return EVENT_META[eventType] || { label: eventType, icon: <Bell className="h-4 w-4" /> };
}

function describeEvent(event: any): string {
  const data = event.event_data || {};
  if (data.job_title) return data.job_title;
  if (data.candidate_name) return data.candidate_name;
  if (data.message) return data.message;
  return "";
}

export function PortalHistoryTab({ token }: PortalHistoryTabProps) {
  const { data: events = [], isLoading } = usePortalActivityLog(token, 100);
  const [periodFilter, setPeriodFilter] = useState<string>("all");
  const [jobFilter, setJobFilter] = useState<string>("all");

  // Distinct jobs derived from events
  const jobOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const ev of events) {
      const jobId = (ev as any).job_id;
      const title = (ev.event_data as any)?.job_title;
      if (jobId && title && !map.has(jobId)) {
        map.set(jobId, title);
      }
    }
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
  }, [events]);

  const filteredEvents = useMemo(() => {
    let result = events;

    // Period filter
    if (periodFilter !== "all") {
      const days = parseInt(periodFilter, 10);
      const cutoff = subDays(new Date(), days);
      result = result.filter((ev) => {
        if (!ev.created_at) return false;
        return parseISO(ev.created_at) >= cutoff;
      });
    }

    // Job filter
    if (jobFilter !== "all") {
      result = result.filter((ev) => (ev as any).job_id === jobFilter);
    }

    return result;
  }, [events, periodFilter, jobFilter]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-muted animate-pulse rounded" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Select value={periodFilter} onValueChange={setPeriodFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todo o período</SelectItem>
            <SelectItem value="7">Últimos 7 dias</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
          </SelectContent>
        </Select>

        <Select value={jobFilter} onValueChange={setJobFilter}>
          <SelectTrigger className="w-full sm:w-[220px]">
            <SelectValue placeholder="Vaga" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as vagas</SelectItem>
            {jobOptions.map((j) => (
              <SelectItem key={j.id} value={j.id}>
                {j.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Timeline or empty state */}
      {filteredEvents.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">Nenhum evento registrado</h3>
          <p className="text-muted-foreground">
            {events.length === 0
              ? "O histórico de interações aparecerá aqui."
              : "Nenhum evento corresponde aos filtros selecionados."}
          </p>
        </div>
      ) : (
        <div className="space-y-0">
          {filteredEvents.map((event, i) => {
            const meta = getMeta(event.event_type);
            const description = describeEvent(event);
            return (
              <div key={event.id} className="flex gap-4 pb-6 last:pb-0">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    {meta.icon}
                  </div>
                  {i < filteredEvents.length - 1 && <div className="w-px flex-1 bg-border mt-2" />}
                </div>
                <div className="flex-1 pt-1">
                  <p className="font-medium text-sm">{meta.label}</p>
                  {description && (
                    <p className="text-sm text-muted-foreground">{description}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {event.created_at
                      ? formatBRT(parseISO(event.created_at), "dd/MM/yyyy 'às' HH:mm")
                      : "—"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
