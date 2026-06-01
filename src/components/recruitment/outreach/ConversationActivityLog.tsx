import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  MessageCircle,
  AlertTriangle,
  Archive,
} from 'lucide-react';
import { formatBRT } from "@/lib/datetime";

interface ConversationActivityLogProps {
  conversationId: string;
  accountId: string;
  candidateId?: string | null;
}

interface CommunicationLog {
  id: string;
  message_type: string;
  channel: string;
  recipient: string;
  body: string | null;
  status: string;
  provider: string | null;
  provider_message_id: string | null;
  error_code: string | null;
  error_message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

const STATUS_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  sent: CheckCircle2,
  completed: CheckCircle2,
  failed: XCircle,
  skipped: AlertTriangle,
  pending: Clock,
};

const STATUS_COLORS: Record<string, string> = {
  sent: 'text-green-600',
  completed: 'text-green-600',
  failed: 'text-red-600',
  skipped: 'text-yellow-600',
  pending: 'text-muted-foreground',
};

const STATUS_LABELS: Record<string, string> = {
  sent: 'Enviado',
  completed: 'Concluído',
  failed: 'Falhou',
  skipped: 'Ignorado',
  pending: 'Pendente',
};

export function ConversationActivityLog({
  conversationId,
  accountId,
  candidateId,
}: ConversationActivityLogProps) {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['conversation-activity-log', conversationId, accountId],
    queryFn: async () => {
      let query = supabase
        .from('recruitment_communications_log')
        .select('*')
        .eq('account_id', accountId)
        .order('created_at', { ascending: true });

      // Filter by conversation metadata or candidate
      if (candidateId) {
        query = query.eq('candidate_id', candidateId);
      }

      // Also filter by conversation_id in metadata
      query = query.contains('metadata', { conversation_id: conversationId });

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as CommunicationLog[];
    },
    enabled: !!conversationId && !!accountId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-muted-foreground">
          Carregando atividades...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Log de Atividades
        </CardTitle>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground">
            <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
            Nenhuma atividade registrada
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="relative pl-6">
              {/* Timeline line */}
              <div className="absolute left-2.5 top-2 bottom-2 w-px bg-border" />

              <div className="space-y-4">
                {logs.map((log) => {
                  const StatusIcon = STATUS_ICONS[log.status] || Clock;
                  const statusColor = STATUS_COLORS[log.status] || 'text-muted-foreground';
                  const stepNumber = (log.metadata as any)?.step_number;
                  const isEndLog = log.message_type === 'outreach_sequence_end';

                  return (
                    <div key={log.id} className="relative">
                      {/* Timeline dot */}
                      <div className={`absolute -left-3.5 mt-1.5 h-3 w-3 rounded-full border-2 border-background ${
                        log.status === 'sent' || log.status === 'completed' ? 'bg-green-500' :
                        log.status === 'failed' ? 'bg-red-500' :
                        'bg-muted-foreground'
                      }`} />

                      <div className="ml-2 rounded-lg border p-3 bg-card">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {isEndLog ? (
                              <Archive className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Send className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span className="text-sm font-medium">
                              {isEndLog ? 'Sequência finalizada' :
                               stepNumber ? `Step ${stepNumber}` : log.message_type}
                            </span>
                            {stepNumber && (
                              <Badge variant="outline" className="text-xs">
                                Dia {(log.metadata as any)?.day_offset || 0}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <StatusIcon className={`h-3.5 w-3.5 ${statusColor}`} />
                            <span className={`text-xs ${statusColor}`}>
                              {STATUS_LABELS[log.status] || log.status}
                            </span>
                          </div>
                        </div>

                        {log.body && (
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-3 whitespace-pre-wrap">
                            {log.body}
                          </p>
                        )}

                        {log.error_message && (
                          <p className="text-xs text-destructive mt-1">
                            Erro: {log.error_message}
                          </p>
                        )}

                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-muted-foreground">
                            {formatBRT(new Date(log.created_at), "dd/MM/yyyy 'às' HH:mm")}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {log.channel}
                          </Badge>
                          {log.provider_message_id && (
                            <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                              ID: {log.provider_message_id}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
