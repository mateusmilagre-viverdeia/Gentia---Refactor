import React from 'react';

import { 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Send, 
  Eye,
  MoreHorizontal,
  Sparkles
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { Proposal } from '@/hooks/useProposals';
import { formatBRT } from "@/lib/datetime";

interface ProposalStatusCardProps {
  proposal: Proposal & {
    recruitment_applications?: {
      id: string;
      recruitment_candidates?: { id: string; first_name: string | null; last_name: string | null; email: string };
      recruitment_jobs?: { id: string; title: string };
    };
    recruitment_proposal_templates?: { id: string; name: string; type: string };
  };
  onView?: () => void;
  onEdit?: () => void;
  onSend?: () => void;
  onWithdraw?: () => void;
  onDelete?: () => void;
  compact?: boolean;
  className?: string;
}

const STATUS_CONFIG: Record<string, { 
  label: string; 
  icon: React.ElementType; 
  color: string;
  bgColor: string;
}> = {
  draft: { label: 'Rascunho', icon: FileText, color: 'text-muted-foreground', bgColor: 'bg-muted' },
  pending_approval: { label: 'Aguardando', icon: Clock, color: 'text-amber-600', bgColor: 'bg-amber-50' },
  approved: { label: 'Aprovada', icon: CheckCircle, color: 'text-blue-600', bgColor: 'bg-blue-50' },
  sent: { label: 'Enviada', icon: Send, color: 'text-primary', bgColor: 'bg-primary/10' },
  viewed: { label: 'Visualizada', icon: Eye, color: 'text-purple-600', bgColor: 'bg-purple-50' },
  accepted: { label: 'Aceita', icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-50' },
  rejected: { label: 'Recusada', icon: XCircle, color: 'text-destructive', bgColor: 'bg-destructive/10' },
  negotiating: { label: 'Negociando', icon: Sparkles, color: 'text-amber-600', bgColor: 'bg-amber-50' },
  expired: { label: 'Expirada', icon: Clock, color: 'text-muted-foreground', bgColor: 'bg-muted' },
  withdrawn: { label: 'Retirada', icon: XCircle, color: 'text-muted-foreground', bgColor: 'bg-muted' },
};

export function ProposalStatusCard({
  proposal,
  onView,
  onEdit,
  onSend,
  onWithdraw,
  onDelete,
  compact = false,
  className,
}: ProposalStatusCardProps) {
  const statusConfig = STATUS_CONFIG[proposal.status] || STATUS_CONFIG.draft;
  const StatusIcon = statusConfig.icon;

  const formatCurrency = (value: number | null | undefined, currency: string) => {
    if (!value) return '-';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency,
    }).format(value);
  };

  // Handle both array and single object for nested data
  const candidateData = Array.isArray(proposal.recruitment_applications?.recruitment_candidates)
    ? proposal.recruitment_applications.recruitment_candidates[0]
    : proposal.recruitment_applications?.recruitment_candidates;
  const jobData = Array.isArray(proposal.recruitment_applications?.recruitment_jobs)
    ? proposal.recruitment_applications.recruitment_jobs[0]
    : proposal.recruitment_applications?.recruitment_jobs;
  const candidateName = [candidateData?.first_name, candidateData?.last_name].filter(Boolean).join(" ") || "Candidato";

  if (compact) {
    return (
      <div 
        className={cn(
          'flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer',
          className
        )}
        onClick={onView}
      >
        <div className="flex items-center gap-3">
          <div className={cn('p-2 rounded-full', statusConfig.bgColor)}>
            <StatusIcon className={cn('h-4 w-4', statusConfig.color)} />
          </div>
          <div>
            <p className="text-sm font-medium">
              {candidateName}
            </p>
            <p className="text-xs text-muted-foreground">
              {jobData?.title || 'Vaga'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={cn('text-xs', statusConfig.color)}>
            {statusConfig.label}
          </Badge>
          <span className="text-sm font-medium">
            {formatCurrency(proposal.salary_offered, proposal.currency)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <Card className={cn('', className)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className={cn('p-2 rounded-full', statusConfig.bgColor)}>
              <StatusIcon className={cn('h-5 w-5', statusConfig.color)} />
            </div>
            <div>
              <h4 className="font-medium">
                {candidateName}
              </h4>
              <p className="text-sm text-muted-foreground">
                {jobData?.title || 'Vaga'}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className={cn('text-xs', statusConfig.color)}>
                  {statusConfig.label}
                </Badge>
                {proposal.recruitment_proposal_templates && (
                  <Badge variant="secondary" className="text-xs">
                    {proposal.recruitment_proposal_templates.name}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onView && (
                <DropdownMenuItem onClick={onView}>
                  <Eye className="h-4 w-4 mr-2" />
                  Visualizar
                </DropdownMenuItem>
              )}
              {onEdit && proposal.status === 'draft' && (
                <DropdownMenuItem onClick={onEdit}>
                  <FileText className="h-4 w-4 mr-2" />
                  Editar
                </DropdownMenuItem>
              )}
              {onSend && ['draft', 'approved'].includes(proposal.status) && (
                <DropdownMenuItem onClick={onSend}>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar
                </DropdownMenuItem>
              )}
              {onWithdraw && ['sent', 'viewed'].includes(proposal.status) && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onWithdraw} className="text-destructive">
                    <XCircle className="h-4 w-4 mr-2" />
                    Retirar Proposta
                  </DropdownMenuItem>
                </>
              )}
              {onDelete && proposal.status === 'draft' && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onDelete} className="text-destructive">
                    <XCircle className="h-4 w-4 mr-2" />
                    Excluir
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-4 pt-3 border-t grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Salário</span>
            <p className="font-medium">
              {formatCurrency(proposal.salary_offered, proposal.currency)}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Início</span>
            <p className="font-medium">
              {proposal.start_date 
                ? formatBRT(new Date(proposal.start_date + 'T12:00:00'), 'dd/MM/yyyy')
                : '-'
              }
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Válida até</span>
            <p className="font-medium">
              {proposal.valid_until 
                ? formatBRT(new Date(proposal.valid_until + 'T12:00:00'), 'dd/MM/yyyy')
                : '-'
              }
            </p>
          </div>
        </div>

        {/* Timeline */}
        <div className="mt-4 pt-3 border-t">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>
              Criada em {formatBRT(new Date(proposal.created_at), 'dd/MM/yyyy HH:mm')}
            </span>
            {proposal.sent_at && (
              <>
                <span>•</span>
                <span>
                  Enviada em {formatBRT(new Date(proposal.sent_at), 'dd/MM/yyyy HH:mm')}
                </span>
              </>
            )}
            {proposal.viewed_at && (
              <>
                <span>•</span>
                <span>
                  Vista em {formatBRT(new Date(proposal.viewed_at), 'dd/MM/yyyy HH:mm')}
                </span>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
