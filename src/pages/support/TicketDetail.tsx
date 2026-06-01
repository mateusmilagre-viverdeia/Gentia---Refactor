import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  Clock,
  Loader2,
  MessageSquare,
  Send,
  Star,
  Building2,
  Lock,
} from 'lucide-react';
import { useSupportTickets } from '@/hooks/useSupportTickets';
import { useEPRole } from '@/hooks/useEPRole';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import type { SupportTicket, SupportTicketMessage, TicketStatus, TicketPriority } from '@/types/support.types';
import { 
  statusLabels, 
  statusColors, 
  priorityLabels, 
  priorityColors,
  categoryLabels,
} from '@/types/support.types';
import { formatBRT, formatBRTRelative } from "@/lib/datetime";

export default function TicketDetail() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isEPTeam } = useEPRole();

  const { 
    tickets, 
    loading, 
    updateTicket, 
    addMessage, 
    rateResolution,
    getTicketMessages 
  } = useSupportTickets({ mode: isEPTeam ? 'admin' : 'user' });

  const [messages, setMessages] = useState<SupportTicketMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [rating, setRating] = useState<number>(0);
  const [ratingComment, setRatingComment] = useState('');
  const [isRating, setIsRating] = useState(false);

  const ticket = tickets.find(t => t.id === ticketId);

  useEffect(() => {
    if (ticketId) {
      getTicketMessages(ticketId).then(setMessages);
    }
  }, [ticketId, getTicketMessages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !ticketId) return;
    
    setIsSending(true);
    const success = await addMessage(ticketId, newMessage.trim(), isInternal);
    
    if (success) {
      setNewMessage('');
      const updatedMessages = await getTicketMessages(ticketId);
      setMessages(updatedMessages);
    }
    setIsSending(false);
  };

  const handleStatusChange = async (status: TicketStatus) => {
    if (!ticketId) return;
    await updateTicket(ticketId, { status });
  };

  const handlePriorityChange = async (priority: TicketPriority) => {
    if (!ticketId) return;
    await updateTicket(ticketId, { priority });
  };

  const handleRateSubmit = async () => {
    if (!ticketId || rating === 0) return;
    
    setIsRating(true);
    await rateResolution(ticketId, rating, ratingComment.trim() || undefined);
    setIsRating(false);
  };

  if (loading) {
    return (
      <AppLayout title="Carregando...">
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!ticket) {
    return (
      <AppLayout title="Chamado não encontrado">
        <div className="text-center py-24">
          <h2 className="text-xl font-semibold mb-2">Chamado não encontrado</h2>
          <p className="text-muted-foreground mb-4">
            O chamado solicitado não existe ou você não tem permissão para visualizá-lo.
          </p>
          <Button onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
      </AppLayout>
    );
  }

  const canModify = isEPTeam || ticket.created_by === user?.id;
  const showRating = ticket.status === 'resolved' && !ticket.satisfaction_rating && ticket.created_by === user?.id;

  return (
    <AppLayout 
      title={`Chamado #${ticket.id.slice(0, 8)}`}
    >
      <div className="space-y-6">
        {/* Back button */}
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Ticket Header */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-xl mb-2">{ticket.title}</CardTitle>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={cn('text-white', statusColors[ticket.status])}>
                        {statusLabels[ticket.status]}
                      </Badge>
                      <Badge variant="outline" className={cn('text-white', priorityColors[ticket.priority])}>
                        {priorityLabels[ticket.priority]}
                      </Badge>
                      <Badge variant="secondary">
                        {categoryLabels[ticket.category]}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {ticket.description && (
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {ticket.description}
                  </p>
                )}
                {ticket.page_context && (
                  <p className="text-xs text-muted-foreground mt-4">
                    Página: {ticket.page_context}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Messages Thread */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MessageSquare className="h-5 w-5" />
                  Conversa
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {messages.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhuma mensagem ainda
                  </p>
                ) : (
                  messages.map((msg) => {
                    const authorName = msg.author
                      ? `${msg.author.first_name || ''} ${msg.author.last_name || ''}`.trim() || msg.author.email
                      : 'Usuário';
                    const initials = authorName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
                    const isOwn = msg.author_id === user?.id;

                    return (
                      <div key={msg.id} className={cn('flex gap-3', isOwn && 'flex-row-reverse')}>
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                        </Avatar>
                        <div className={cn(
                          'max-w-[80%] rounded-lg p-3',
                          isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted',
                          msg.is_internal && 'border-2 border-dashed border-amber-500'
                        )}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium">{authorName}</span>
                            {msg.is_internal && (
                              <Badge variant="outline" className="text-[10px] py-0 h-4">
                                <Lock className="h-2 w-2 mr-1" />
                                Interno
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          <p className={cn(
                            'text-[10px] mt-1',
                            isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
                          )}>
                            {formatBRT(new Date(msg.created_at), "dd/MM 'às' HH:mm")}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}

                <Separator className="my-4" />

                {/* New Message Input */}
                <div className="space-y-3">
                  <Textarea
                    placeholder="Digite sua mensagem..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    rows={3}
                  />
                  <div className="flex items-center justify-between">
                    {isEPTeam && (
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={isInternal}
                          onChange={(e) => setIsInternal(e.target.checked)}
                          className="rounded"
                        />
                        <Lock className="h-3 w-3" />
                        Nota interna (só EP vê)
                      </label>
                    )}
                    <Button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || isSending}
                      className="ml-auto"
                    >
                      {isSending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      Enviar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Rating Section */}
            {showRating && (
              <Card className="border-primary/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Star className="h-5 w-5 text-yellow-500" />
                    Avalie o Atendimento
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Como foi sua experiência com este chamado?
                  </p>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setRating(star)}
                        className="p-1 hover:scale-110 transition-transform"
                      >
                        <Star
                          className={cn(
                            'h-8 w-8',
                            star <= rating
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-muted-foreground'
                          )}
                        />
                      </button>
                    ))}
                  </div>
                  <Textarea
                    placeholder="Deixe um comentário (opcional)..."
                    value={ratingComment}
                    onChange={(e) => setRatingComment(e.target.value)}
                    rows={2}
                  />
                  <Button
                    onClick={handleRateSubmit}
                    disabled={rating === 0 || isRating}
                  >
                    {isRating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Enviar Avaliação
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Status Management (EP Only) */}
            {isEPTeam && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Gerenciar</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">Status</label>
                    <Select value={ticket.status} onValueChange={handleStatusChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(statusLabels).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">Prioridade</label>
                    <Select value={ticket.priority} onValueChange={handlePriorityChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(priorityLabels).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Detalhes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {ticket.account && (
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>{ticket.account.name}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>
                    Aberto {formatBRTRelative(new Date(ticket.created_at))}
                  </span>
                </div>
                {ticket.first_response_at && (
                  <div className="text-xs text-muted-foreground">
                    Primeira resposta: {formatBRT(new Date(ticket.first_response_at), "dd/MM/yyyy 'às' HH:mm")}
                  </div>
                )}
                {ticket.resolved_at && (
                  <div className="text-xs text-muted-foreground">
                    Resolvido: {formatBRT(new Date(ticket.resolved_at), "dd/MM/yyyy 'às' HH:mm")}
                  </div>
                )}
                {ticket.sla_due_at && !ticket.resolved_at && (
                  <div className={cn(
                    'text-xs',
                    new Date(ticket.sla_due_at) < new Date() ? 'text-red-500 font-medium' : 'text-muted-foreground'
                  )}>
                    SLA: {formatBRT(new Date(ticket.sla_due_at), "dd/MM/yyyy 'às' HH:mm")}
                    {new Date(ticket.sla_due_at) < new Date() && ' (Vencido)'}
                  </div>
                )}
                {ticket.satisfaction_rating && (
                  <div className="flex items-center gap-1 pt-2 border-t">
                    <span className="text-muted-foreground">Avaliação:</span>
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={cn(
                            'h-4 w-4',
                            star <= ticket.satisfaction_rating!
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-muted-foreground'
                          )}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
