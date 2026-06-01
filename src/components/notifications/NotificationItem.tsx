
import { Bell, Megaphone, AlertTriangle, CreditCard, CheckCircle, Clock, Users, Video, Briefcase, UserX } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Notification } from '@/hooks/useNotifications';
import { formatBRTRelative } from "@/lib/datetime";

interface NotificationItemProps {
  notification: Notification;
  isRead: boolean;
  onClick?: () => void;
  compact?: boolean;
}

const typeConfig: Record<string, { icon: typeof Bell; colorClass: string; label: string }> = {
  announcement: { icon: Megaphone, colorClass: 'text-blue-500', label: 'Comunicado' },
  action: { icon: CheckCircle, colorClass: 'text-green-500', label: 'Ação' },
  action_overdue: { icon: AlertTriangle, colorClass: 'text-amber-500', label: 'Ação Atrasada' },
  billing: { icon: CreditCard, colorClass: 'text-red-500', label: 'Cobrança' },
  pending: { icon: Clock, colorClass: 'text-purple-500', label: 'Pendência' },
  // Recruitment notification types
  recruitment_new_application: { icon: Users, colorClass: 'text-green-500', label: 'Nova Candidatura' },
  recruitment_pending_evaluation: { icon: Clock, colorClass: 'text-amber-500', label: 'Avaliação Pendente' },
  recruitment_interview_reminder: { icon: Video, colorClass: 'text-purple-500', label: 'Lembrete de Entrevista' },
  recruitment_stale_job: { icon: Briefcase, colorClass: 'text-blue-500', label: 'Vaga Parada' },
  recruitment_stale_candidate: { icon: UserX, colorClass: 'text-red-500', label: 'Candidato Parado' },
  recruitment_interview_completed: { icon: CheckCircle, colorClass: 'text-green-500', label: 'Entrevista Concluída' },
  default: { icon: Bell, colorClass: 'text-muted-foreground', label: 'Notificação' },
};

const priorityStyles: Record<string, string> = {
  low: '',
  normal: '',
  high: 'border-l-2 border-l-amber-500',
  urgent: 'border-l-2 border-l-red-500 bg-red-500/5',
};

export function NotificationItem({ notification, isRead, onClick, compact = false }: NotificationItemProps) {
  const config = typeConfig[notification.type] || typeConfig.default;
  const Icon = config.icon;
  const priorityClass = priorityStyles[notification.priority] || '';

  const timeAgo = formatBRTRelative(new Date(notification.created_at));

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left p-3 hover:bg-accent/50 transition-colors rounded-lg',
        priorityClass,
        !isRead && 'bg-accent/30',
        compact ? 'p-2' : 'p-3'
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn('mt-0.5', config.colorClass)}>
          <Icon className={compact ? 'h-4 w-4' : 'h-5 w-5'} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn(
              'font-medium truncate',
              compact ? 'text-sm' : 'text-sm',
              !isRead && 'text-foreground',
              isRead && 'text-muted-foreground'
            )}>
              {notification.title}
            </span>
            {!isRead && (
              <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
            )}
          </div>
          
          {notification.message && !compact && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
              {notification.message}
            </p>
          )}
          
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground">
              {timeAgo}
            </span>
            {notification.priority === 'urgent' && (
              <span className="text-xs text-red-500 font-medium">Urgente</span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
