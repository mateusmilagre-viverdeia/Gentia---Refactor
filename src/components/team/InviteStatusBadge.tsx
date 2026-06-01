import { Badge } from '@/components/ui/badge';
import { Clock, CreditCard, Mail, CheckCircle, XCircle } from 'lucide-react';
import type { InviteStatus } from '@/types/account.types';

interface InviteStatusBadgeProps {
  status?: InviteStatus;
  className?: string;
}

const statusConfig: Record<InviteStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
  pending: {
    label: 'Pendente',
    variant: 'secondary',
    icon: <Clock className="h-3 w-3" />,
  },
  awaiting_payment: {
    label: 'Aguardando Pagamento',
    variant: 'outline',
    icon: <CreditCard className="h-3 w-3" />,
  },
  paid_ready_to_send: {
    label: 'Pago - Enviando',
    variant: 'secondary',
    icon: <Mail className="h-3 w-3" />,
  },
  sent: {
    label: 'Enviado',
    variant: 'default',
    icon: <Mail className="h-3 w-3" />,
  },
  accepted: {
    label: 'Aceito',
    variant: 'default',
    icon: <CheckCircle className="h-3 w-3" />,
  },
  expired: {
    label: 'Expirado',
    variant: 'destructive',
    icon: <XCircle className="h-3 w-3" />,
  },
  cancelled: {
    label: 'Cancelado',
    variant: 'destructive',
    icon: <XCircle className="h-3 w-3" />,
  },
};

export function InviteStatusBadge({ status, className }: InviteStatusBadgeProps) {
  // Default to 'pending' for backwards compatibility with old invites
  const effectiveStatus = status || 'pending';
  const config = statusConfig[effectiveStatus] || statusConfig.pending;

  return (
    <Badge variant={config.variant} className={className}>
      <span className="flex items-center gap-1">
        {config.icon}
        {config.label}
      </span>
    </Badge>
  );
}