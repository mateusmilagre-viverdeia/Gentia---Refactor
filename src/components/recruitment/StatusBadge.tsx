import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusType =
  | "draft" | "active" | "paused" | "closed"
  | "lead" | "qualified" | "interview" | "offer" | "hired" | "rejected"
  | "applied" | "screening" | "pending" | "in_progress" | "completed" | "cancelled"
  | "sent" | "approved" | "n/a"
  | "structured" | "conversational"
  | "abandoned" | "failed_technical" | "partial" | "archived" | "invite_pending" | "stalled"
  | "new" | "disc" | "cultural_fit" | "technical" | "evaluation" | "desqualificado";

const statusConfig: Record<StatusType, { label: string; className: string }> = {
  // Job Status
  draft: { label: "Rascunho", className: "bg-muted text-muted-foreground" },
  active: { label: "Ativa", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  paused: { label: "Pausada", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  closed: { label: "Fechada", className: "bg-destructive/10 text-destructive" },

  // Candidate Stages
  lead: { label: "Lead", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  qualified: { label: "Qualificado", className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  interview: { label: "Entrevista", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  offer: { label: "Proposta", className: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400" },
  hired: { label: "Contratado", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  rejected: { label: "Rejeitado", className: "bg-destructive/10 text-destructive" },

  // Application pipeline (PT-BR, em ordem progressiva)
  new: { label: "Novo", className: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300" },
  applied: { label: "Aplicado", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  screening: { label: "Triagem", className: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400" },
  disc: { label: "Fit Comportamental", className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  cultural_fit: { label: "Fit Cultural", className: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-400" },
  technical: { label: "Entrevista Técnica", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  evaluation: { label: "Em Avaliação", className: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  desqualificado: { label: "Desqualificado", className: "bg-destructive/10 text-destructive" },

  // Interview Status
  sent: { label: "Enviado", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  pending: { label: "Pendente", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  in_progress: { label: "Em andamento", className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  completed: { label: "Concluída", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  cancelled: { label: "Cancelada", className: "bg-muted text-muted-foreground" },

  // Evaluation
  approved: { label: "Aprovado", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  "n/a": { label: "N/A", className: "bg-muted text-muted-foreground" },

  // Agent Types
  structured: { label: "Estruturado", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  conversational: { label: "Conversacional", className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },

  // Interview lifecycle (voice)
  abandoned: { label: "Abandonada", className: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  failed_technical: { label: "Falha técnica", className: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400" },
  partial: { label: "Parcial", className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" },
  archived: { label: "Arquivada", className: "bg-muted text-muted-foreground" },
  invite_pending: { label: "Convite não entregue", className: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400" },
  stalled: { label: "Parada", className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" },
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export const StatusBadge = ({ status, className }: StatusBadgeProps) => {
  const normalizedStatus = status.toLowerCase().replace(/\s+/g, "_") as StatusType;
  const config = statusConfig[normalizedStatus] || { 
    label: status, 
    className: "bg-muted text-muted-foreground" 
  };

  return (
    <Badge 
      variant="secondary" 
      className={cn("font-medium", config.className, className)}
    >
      {config.label}
    </Badge>
  );
};
