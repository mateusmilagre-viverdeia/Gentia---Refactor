
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Clock, Building2, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SupportTicket } from '@/types/support.types';
import { statusLabels, statusColors, priorityLabels, priorityColors } from '@/types/support.types';
import { formatBRTRelative } from "@/lib/datetime";

interface TicketCardProps {
  ticket: SupportTicket;
  onClick?: () => void;
  showAccount?: boolean;
}

export function TicketCard({ ticket, onClick, showAccount = false }: TicketCardProps) {
  const creatorName = ticket.creator
    ? `${ticket.creator.first_name || ''} ${ticket.creator.last_name || ''}`.trim() || ticket.creator.email
    : 'Usuário';

  const creatorInitials = creatorName
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const isOverdue = ticket.sla_due_at && new Date(ticket.sla_due_at) < new Date() && !ticket.resolved_at;

  return (
    <Card 
      className={cn(
        'cursor-pointer transition-all hover:shadow-md hover:border-primary/50',
        isOverdue && 'border-red-500/50'
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Badge 
                variant="secondary" 
                className={cn('text-xs text-white', statusColors[ticket.status])}
              >
                {statusLabels[ticket.status]}
              </Badge>
              <Badge 
                variant="outline" 
                className={cn('text-xs', priorityColors[ticket.priority], 'text-white')}
              >
                {priorityLabels[ticket.priority]}
              </Badge>
              {isOverdue && (
                <Badge variant="destructive" className="text-xs">
                  SLA Vencido
                </Badge>
              )}
            </div>

            <h3 className="font-medium text-sm line-clamp-2 mb-2">
              {ticket.title}
            </h3>

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Avatar className="h-5 w-5">
                  <AvatarFallback className="text-[10px]">{creatorInitials}</AvatarFallback>
                </Avatar>
                <span className="truncate max-w-[100px]">{creatorName}</span>
              </div>

              {showAccount && ticket.account && (
                <div className="flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  <span className="truncate max-w-[100px]">{ticket.account.name}</span>
                </div>
              )}

              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>
                  {formatBRTRelative(new Date(ticket.created_at))}
                </span>
              </div>
            </div>
          </div>

          {ticket.assignee && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <User className="h-3 w-3" />
              <span className="truncate max-w-[80px]">
                {ticket.assignee.first_name || ticket.assignee.email}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
