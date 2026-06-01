import { Badge } from "@/components/ui/badge";
import { 
  Type, 
  Circle, 
  Users, 
  Bot, 
  Briefcase, 
  MapPin, 
  Calendar,
  ExternalLink
} from "lucide-react";

import { Link } from "react-router-dom";
import { formatBRT } from "@/lib/datetime";

interface Job {
  id: string;
  title: string;
  status: "draft" | "active" | "paused" | "closed";
  department: string;
  location: string;
  employmentType: string;
  agentId?: string;
  agentName?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface JobDetailsSidebarProps {
  job: Job;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: "Rascunho", className: "bg-muted text-muted-foreground" },
  active: { label: "Ativo", className: "bg-green-500/10 text-green-600 border-green-500/20" },
  paused: { label: "Pausado", className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
  closed: { label: "Fechado", className: "bg-red-500/10 text-red-600 border-red-500/20" },
};

export function JobDetailsSidebar({ job }: JobDetailsSidebarProps) {
  const status = statusConfig[job.status];

  return (
    <div className="w-64 shrink-0">
      <div className="border rounded-lg p-4 space-y-4">
        <h3 className="font-semibold text-sm">Detalhes da vaga</h3>

        <div className="space-y-3">
          {/* Title */}
          <div className="flex items-start gap-3">
            <Type className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Título</p>
              <p className="text-sm font-medium">{job.title}</p>
            </div>
          </div>

          {/* Status */}
          <div className="flex items-start gap-3">
            <Circle className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <Badge variant="outline" className={status.className}>
                {status.label}
              </Badge>
            </div>
          </div>

          {/* Department */}
          <div className="flex items-start gap-3">
            <Users className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Departamento</p>
              <p className="text-sm">{job.department}</p>
            </div>
          </div>

          {/* Agent */}
          {job.agentName && job.agentId && (
            <div className="flex items-start gap-3">
              <Bot className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Agente</p>
                <Link 
                  to={`/atracao-contratacao/recrutamento/agents/${job.agentId}`}
                  className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                >
                  {job.agentName}
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </div>
          )}

          {/* Employment Type */}
          <div className="flex items-start gap-3">
            <Briefcase className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Tipo de contrato</p>
              <p className="text-sm">{job.employmentType}</p>
            </div>
          </div>

          {/* Location */}
          <div className="flex items-start gap-3">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Localização</p>
              <p className="text-sm">{job.location}</p>
            </div>
          </div>

          {/* Created At */}
          <div className="flex items-start gap-3">
            <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Criada em</p>
              <p className="text-sm">{formatBRT(job.createdAt, "d 'de' MMMM, yyyy")}</p>
            </div>
          </div>

          {/* Updated At */}
          <div className="flex items-start gap-3">
            <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Última atualização</p>
              <p className="text-sm">{formatBRT(job.updatedAt, "d 'de' MMMM, yyyy")}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
