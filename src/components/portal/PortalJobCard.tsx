import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Eye, Star } from "lucide-react";
import { parseISO } from "date-fns";
import { PortalJobFunnelBar } from "./PortalJobFunnelBar";
import { PortalJobNextStepCard } from "./PortalJobNextStepCard";
import { PortalSLABar, getRemainingPct } from "./PortalSLABar";
import { usePortalJobFunnel } from "@/hooks/usePortalJobFunnel";
import { cn } from "@/lib/utils";
import { formatBRT } from "@/lib/datetime";

interface PortalJobCardProps {
  job: any;
  token: string;
  onViewShortlist: () => void;
}

function getStatusBadge(job: any, shortlistCount: number) {
  if (job.status === "filled" || job.status === "closed") {
    return {
      label: "Vaga fechada",
      className: "bg-gray-100 text-gray-500 border-gray-200",
      pulse: false,
      icon: null as any,
    };
  }
  if (shortlistCount >= 3) {
    return {
      label: "Shortlist pronta",
      className: "bg-green-50 border-green-200 text-green-700",
      pulse: false,
      icon: Star,
    };
  }
  if (shortlistCount > 0) {
    return {
      label: "Aguardando aprovação",
      className: "bg-amber-50 border-amber-200 text-amber-700",
      pulse: false,
      icon: null as any,
    };
  }
  return {
    label: "Em andamento",
    className: "bg-blue-50 border-blue-200 text-blue-700",
    pulse: true,
    icon: null as any,
  };
}

function deriveNextStepStatus(
  job: any,
  shortlistCount: number,
  slaPercentRemaining: number,
): string {
  if (job.status === "filled" || job.status === "closed") return "filled";
  if (shortlistCount > 0) return "shortlist_ready";
  if (slaPercentRemaining < 20) return "sla_warning";
  return "in_progress";
}

export function PortalJobCard({ job, token, onViewShortlist }: PortalJobCardProps) {
  const { data: counts } = usePortalJobFunnel(token, job.id);
  const shortlistCount = counts?.shortlist ?? 0;

  const statusBadge = getStatusBadge(job, shortlistCount);
  const slaPercentRemaining = job.created_at
    ? getRemainingPct(job.created_at, job.prazo_entrega_dias)
    : 100;
  const nextStepStatus = deriveNextStepStatus(job, shortlistCount, slaPercentRemaining);
  const StatusIcon = statusBadge.icon;

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-semibold">{job.title}</h3>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
                  statusBadge.className,
                )}
              >
                {statusBadge.pulse && (
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-400" />
                  </span>
                )}
                {StatusIcon && <StatusIcon className="h-3 w-3" />}
                {statusBadge.label}
              </span>
            </div>
            {job.created_at && (
              <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                Aberta em {formatBRT(parseISO(job.created_at), "dd/MM/yyyy")}
              </div>
            )}
          </div>

          <Button size="sm" onClick={onViewShortlist} className="gap-2 shrink-0">
            <Eye className="h-4 w-4" />
            Ver shortlist
          </Button>
        </div>

        {/* Funnel ao vivo */}
        <PortalJobFunnelBar token={token} jobId={job.id} />

        {/* Próximo passo */}
        <PortalJobNextStepCard
          status={nextStepStatus}
          shortlistCount={shortlistCount}
          estimatedDate={job.data_limite_entrega ? formatBRT(parseISO(job.data_limite_entrega), "dd/MM/yyyy") : null}
          slaPercentRemaining={slaPercentRemaining}
          onViewShortlist={onViewShortlist}
        />

        {/* SLA */}
        {job.created_at && (
          <PortalSLABar
            createdAt={job.created_at}
            prazoEntregaDias={job.prazo_entrega_dias}
          />
        )}
      </CardContent>
    </Card>
  );
}
