import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusType = 
  | "draft" | "active" | "paused" | "closed" 
  | "lead" | "qualified" | "interview" | "offer" | "hired" | "rejected"
  | "applied" | "screening" | "pending" | "in_progress" | "completed" | "cancelled"
  | "sent" | "approved" | "n/a"
  | "structured" | "conversational";

const statusConfig: Record<StatusType, { label: string; className: string }> = {
  // Job Status
  draft: { label: "Rascunho", className: "bg-muted text-muted-foreground" },
  active: { label: "Ativa", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  paused: { label: "Pausada", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  closed: { label: "Fechada", className: "bg-destructive/10 text-destructive" },

  // Candidate Stages
  lead: { label: "Lead", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  qualified: { label: "Qualified", className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  interview: { label: "Interview", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  offer: { label: "Offer", className: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400" },
  hired: { label: "Hired", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  rejected: { label: "Rejected", className: "bg-destructive/10 text-destructive" },

  // Application Status
  applied: { label: "Applied", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  screening: { label: "Screening", className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },

  // Interview Status
  sent: { label: "Sent", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  pending: { label: "Pending", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  in_progress: { label: "In Progress", className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  completed: { label: "Completed", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  cancelled: { label: "Cancelled", className: "bg-muted text-muted-foreground" },

  // Evaluation
  approved: { label: "Approved", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  "n/a": { label: "N/A", className: "bg-muted text-muted-foreground" },

  // Agent Types
  structured: { label: "Structured", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  conversational: { label: "Conversational", className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
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
