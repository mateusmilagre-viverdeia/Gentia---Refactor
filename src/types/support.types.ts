export type TicketStatus = 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent';
export type TicketCategory = 'general' | 'technical' | 'billing' | 'feature_request' | 'bug';

export interface SupportTicket {
  id: string;
  account_id: string;
  created_by: string;
  assigned_to: string | null;
  title: string;
  description: string | null;
  conversation_context: Record<string, unknown> | null;
  page_context: string | null;
  category: TicketCategory;
  status: TicketStatus;
  priority: TicketPriority;
  first_response_at: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  sla_due_at: string | null;
  satisfaction_rating: number | null;
  satisfaction_comment: string | null;
  rated_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  creator?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  };
  assignee?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  };
  account?: {
    id: string;
    name: string;
  };
  messages_count?: number;
}

export interface SupportTicketMessage {
  id: string;
  ticket_id: string;
  author_id: string;
  content: string;
  is_internal: boolean;
  created_at: string;
  // Joined data
  author?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  };
}

export interface CreateTicketInput {
  title: string;
  description?: string;
  category?: TicketCategory;
  priority?: TicketPriority;
  conversationContext?: Record<string, unknown>;
  pageContext?: string;
}

export interface UpdateTicketInput {
  status?: TicketStatus;
  priority?: TicketPriority;
  assigned_to?: string | null;
  category?: TicketCategory;
}

export interface TicketFilters {
  status?: TicketStatus | 'all';
  priority?: TicketPriority | 'all';
  assigned_to?: string | 'all' | 'unassigned';
  category?: TicketCategory | 'all';
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface TicketMetrics {
  total: number;
  byStatus: Record<TicketStatus, number>;
  byPriority: Record<TicketPriority, number>;
  avgFirstResponseTime: number | null; // in minutes
  avgResolutionTime: number | null; // in minutes
  slaComplianceRate: number; // percentage
  avgSatisfactionRating: number | null;
  satisfactionCount: number;
}

export const statusLabels: Record<TicketStatus, string> = {
  open: 'Aberto',
  in_progress: 'Em Atendimento',
  waiting_customer: 'Aguardando Cliente',
  resolved: 'Resolvido',
  closed: 'Fechado',
};

export const statusColors: Record<TicketStatus, string> = {
  open: 'bg-blue-500',
  in_progress: 'bg-amber-500',
  waiting_customer: 'bg-purple-500',
  resolved: 'bg-green-500',
  closed: 'bg-gray-500',
};

export const priorityLabels: Record<TicketPriority, string> = {
  low: 'Baixa',
  normal: 'Normal',
  high: 'Alta',
  urgent: 'Urgente',
};

export const priorityColors: Record<TicketPriority, string> = {
  low: 'bg-gray-400',
  normal: 'bg-blue-400',
  high: 'bg-orange-500',
  urgent: 'bg-red-500',
};

export const categoryLabels: Record<TicketCategory, string> = {
  general: 'Geral',
  technical: 'Técnico',
  billing: 'Financeiro',
  feature_request: 'Sugestão',
  bug: 'Bug',
};

// SLA times in minutes
export const SLA_FIRST_RESPONSE: Record<TicketPriority, number> = {
  urgent: 60, // 1 hour
  high: 240, // 4 hours
  normal: 1440, // 24 hours
  low: 2880, // 48 hours
};

export const SLA_RESOLUTION: Record<TicketPriority, number> = {
  urgent: 240, // 4 hours
  high: 1440, // 24 hours
  normal: 4320, // 72 hours
  low: 10080, // 1 week
};
