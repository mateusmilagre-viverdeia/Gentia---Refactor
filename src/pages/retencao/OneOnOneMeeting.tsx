import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  MoreVertical,
  CheckCircle2,
  XCircle,
  FileText,
  Loader2,
  History,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAccount } from '@/hooks/useAccount';
import { 
  useOneOnOneMeetings, 
  Meeting, 
  MeetingItem,
  MeetingItemType,
} from '@/hooks/useOneOnOneMeetings';
import { AgendaEditor } from '@/components/retencao/one-on-one';
import { toast } from 'sonner';
import { formatBRT } from "@/lib/datetime";

const statusConfig = {
  draft: { label: 'Rascunho', color: 'bg-muted text-muted-foreground' },
  scheduled: { label: 'Agendada', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  completed: { label: 'Concluída', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  cancelled: { label: 'Cancelada', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

function getInitials(firstName?: string | null, lastName?: string | null): string {
  const first = firstName?.[0] || '';
  const last = lastName?.[0] || '';
  return (first + last).toUpperCase() || '??';
}

export default function OneOnOneMeeting() {
  const { meetingId } = useParams<{ meetingId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { account } = useAccount();
  const { 
    completeMeeting, 
    cancelMeeting,
    fetchMeetingItems,
    addItem,
    updateItem,
    toggleItemComplete,
    deleteItem,
    updateMeeting,
  } = useOneOnOneMeetings();

  const [notes, setNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);

  // Fetch meeting details
  const { data: meeting, isLoading: isLoadingMeeting } = useQuery({
    queryKey: ['one-on-one-meeting', meetingId],
    queryFn: async () => {
      if (!meetingId) return null;
      
      const client = supabase as any;
      const { data, error } = await client
        .from('meetings_one_on_one')
        .select('*')
        .eq('id', meetingId)
        .single();

      if (error) throw error;

      // Fetch profiles
      const { data: profiles } = await client
        .from('profiles')
        .select('id, first_name, last_name, avatar_url')
        .in('id', [data.collaborator_id, data.manager_id]);

      const profileMap = new Map(
        (profiles || []).map((p: any) => [p.id, p])
      );

      return {
        ...data,
        collaborator: profileMap.get(data.collaborator_id),
        manager: profileMap.get(data.manager_id),
      } as Meeting;
    },
    enabled: !!meetingId,
  });

  // Fetch meeting items
  const { data: items = [], isLoading: isLoadingItems } = useQuery({
    queryKey: ['one-on-one-meeting-items', meetingId],
    queryFn: async () => {
      if (!meetingId) return [];
      return fetchMeetingItems(meetingId);
    },
    enabled: !!meetingId,
  });

  // Fetch previous meetings for context
  const { data: previousMeetings = [] } = useQuery({
    queryKey: ['one-on-one-previous-meetings', meeting?.collaborator_id, meetingId],
    queryFn: async () => {
      if (!meeting?.collaborator_id || !account?.id) return [];

      const client = supabase as any;
      const { data, error } = await client
        .from('meetings_one_on_one')
        .select('id, scheduled_at, status')
        .eq('account_id', account.id)
        .eq('collaborator_id', meeting.collaborator_id)
        .neq('id', meetingId)
        .order('scheduled_at', { ascending: false })
        .limit(5);

      if (error) return [];
      return data as Pick<Meeting, 'id' | 'scheduled_at' | 'status'>[];
    },
    enabled: !!meeting?.collaborator_id && !!account?.id,
  });

  // Set initial notes
  useEffect(() => {
    if (meeting?.notes) {
      setNotes(meeting.notes);
    }
  }, [meeting?.notes]);

  // Save notes with debounce
  const saveNotes = useCallback(async () => {
    if (!meetingId || notes === meeting?.notes) return;
    
    setIsSavingNotes(true);
    try {
      await updateMeeting({ id: meetingId, notes });
    } finally {
      setIsSavingNotes(false);
    }
  }, [meetingId, notes, meeting?.notes, updateMeeting]);

  // Handle adding item
  const handleAddItem = useCallback(async (type: MeetingItemType, content: string, dueDate?: string) => {
    if (!meetingId) return;
    
    const maxOrder = items.length > 0 ? Math.max(...items.map(i => i.order_index)) + 1 : 0;
    
    await addItem({
      meeting_id: meetingId,
      item_type: type,
      content,
      due_date: dueDate || null,
      order_index: maxOrder,
    });
    
    queryClient.invalidateQueries({ queryKey: ['one-on-one-meeting-items', meetingId] });
  }, [meetingId, items, addItem, queryClient]);

  // Handle complete meeting
  const handleComplete = async () => {
    if (!meetingId) return;
    await completeMeeting(meetingId);
    setShowCompleteDialog(false);
    queryClient.invalidateQueries({ queryKey: ['one-on-one-meeting', meetingId] });
  };

  // Handle cancel meeting
  const handleCancel = async () => {
    if (!meetingId) return;
    await cancelMeeting(meetingId);
    setShowCancelDialog(false);
    queryClient.invalidateQueries({ queryKey: ['one-on-one-meeting', meetingId] });
  };

  if (isLoadingMeeting) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="container max-w-4xl py-6">
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Reunião não encontrada</h2>
          <p className="text-muted-foreground mb-4">
            A reunião solicitada não existe ou você não tem permissão para acessá-la.
          </p>
          <Button onClick={() => navigate('/retencao/reunioes-1-1')}>
            Voltar para Reuniões
          </Button>
        </div>
      </div>
    );
  }

  const status = statusConfig[meeting.status as keyof typeof statusConfig] || statusConfig.scheduled;
  const isEditable = meeting.status === 'scheduled' || meeting.status === 'draft';
  const scheduledDate = new Date(meeting.scheduled_at);

  return (
    <div className="container max-w-4xl py-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/retencao/reunioes-1-1')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">Reunião 1:1</h1>
              <Badge className={cn("text-xs", status.color)}>
                {status.label}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {formatBRT(scheduledDate, "PPP")}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {formatBRT(scheduledDate, "HH:mm")} ({meeting.duration_minutes} min)
              </span>
            </div>
          </div>
        </div>

        {isEditable && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowCompleteDialog(true)}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Finalizar reunião
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => setShowCancelDialog(true)}
                className="text-destructive"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Cancelar reunião
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Agenda */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Pauta da Reunião
              </CardTitle>
              <CardDescription>
                Tópicos, ações e feedbacks desta reunião
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingItems ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <AgendaEditor
                  items={items}
                  onAddItem={handleAddItem}
                  onUpdateItem={(id, data) => {
                    updateItem({ id, ...data });
                    queryClient.invalidateQueries({ queryKey: ['one-on-one-meeting-items', meetingId] });
                  }}
                  onToggleComplete={(id, currentValue) => {
                    toggleItemComplete(id, currentValue);
                    queryClient.invalidateQueries({ queryKey: ['one-on-one-meeting-items', meetingId] });
                  }}
                  onDeleteItem={(id) => {
                    deleteItem(id);
                    queryClient.invalidateQueries({ queryKey: ['one-on-one-meeting-items', meetingId] });
                  }}
                  readOnly={!isEditable}
                />
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Anotações</CardTitle>
              <CardDescription>
                Observações gerais da reunião
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Adicione notas, insights ou contexto importante..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={saveNotes}
                className="min-h-[120px]"
                disabled={!isEditable}
              />
              {isSavingNotes && (
                <p className="text-xs text-muted-foreground mt-2">Salvando...</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Participants */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                Participantes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={meeting.collaborator?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {getInitials(meeting.collaborator?.first_name, meeting.collaborator?.last_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">
                    {meeting.collaborator?.first_name} {meeting.collaborator?.last_name}
                  </p>
                  <p className="text-xs text-muted-foreground">Colaborador</p>
                </div>
              </div>
              
              <Separator />
              
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={meeting.manager?.avatar_url || undefined} />
                  <AvatarFallback className="bg-secondary text-secondary-foreground">
                    {getInitials(meeting.manager?.first_name, meeting.manager?.last_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">
                    {meeting.manager?.first_name} {meeting.manager?.last_name}
                  </p>
                  <p className="text-xs text-muted-foreground">Gestor</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Previous meetings */}
          {previousMeetings.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <History className="h-4 w-4 text-primary" />
                  Histórico
                </CardTitle>
                <CardDescription>
                  Reuniões anteriores com este colaborador
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {previousMeetings.map((prev) => (
                    <button
                      key={prev.id}
                      onClick={() => navigate(`/retencao/reunioes-1-1/${prev.id}`)}
                      className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
                    >
                      <span className="text-sm">
                        {formatBRT(new Date(prev.scheduled_at), "dd/MM/yyyy")}
                      </span>
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-xs",
                          statusConfig[prev.status as keyof typeof statusConfig]?.color
                        )}
                      >
                        {statusConfig[prev.status as keyof typeof statusConfig]?.label}
                      </Badge>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          {isEditable && (
            <div className="flex flex-col gap-2">
              <Button onClick={() => setShowCompleteDialog(true)} className="w-full">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Finalizar Reunião
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Cancel Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar reunião?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá marcar a reunião como cancelada. Você pode reagendar uma nova reunião depois.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} className="bg-destructive text-destructive-foreground">
              Cancelar reunião
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Complete Dialog */}
      <AlertDialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalizar reunião?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso irá marcar a reunião como concluída. As ações pendentes permanecerão para acompanhamento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={handleComplete}>
              Finalizar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
