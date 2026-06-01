import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Users, Trash2, Play, Eye, BarChart3, LayoutDashboard, Send } from "lucide-react";
import { useDISCAssessment } from "@/hooks/useDISCAssessment";
import { DISCSession, DISC_DIMENSIONS } from "@/types/disc.types";
import { DISCAssessmentFlow } from "@/components/retencao/disc/DISCAssessmentFlow";
import { DISCResultView } from "@/components/retencao/disc/DISCResultView";
import { UserSelect } from "@/components/shared/UserSelect";
import { useAccountMembers } from "@/hooks/useAccountMembers";
import { useAssessmentInvitations } from "@/hooks/useAssessmentInvitations";
import { useCanInviteAssessment } from "@/hooks/useCanInviteAssessment";
import { AssessmentInviteModal, PendingInvitationCard } from "@/components/retencao/shared";
import { formatBRT } from "@/lib/datetime";


type ViewMode = 'list' | 'assessment' | 'result';

export default function AssessmentDISC() {
  const navigate = useNavigate();
  const {
    sessions,
    isLoadingSessions,
    createSession,
    deleteSession
  } = useDISCAssessment();

  const { members } = useAccountMembers();
  const { canInvite } = useCanInviteAssessment();
  const { 
    myPendingInvitations, 
    acceptInvitation, 
    declineInvitation 
  } = useAssessmentInvitations('disc');

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedSession, setSelectedSession] = useState<DISCSession | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  
  // Form state
  const [selectedUserId, setSelectedUserId] = useState('');
  const [participantName, setParticipantName] = useState('');
  const [participantEmail, setParticipantEmail] = useState('');

  const handleUserSelect = (userId: string, userName: string) => {
    setSelectedUserId(userId);
    setParticipantName(userName);
    const member = members.find((m) => m.user_id === userId);
    if (member) {
      setParticipantEmail(member.email);
    }
  };

  const handleCreateSession = async () => {
    if (!participantName.trim()) return;

    const session = await createSession.mutateAsync({
      participant_name: participantName.trim(),
      participant_email: participantEmail.trim() || undefined
    });

    setShowCreateDialog(false);
    setSelectedUserId('');
    setParticipantName('');
    setParticipantEmail('');
    setSelectedSession(session);
    setViewMode('assessment');
  };

  const handleStartAssessment = (session: DISCSession) => {
    setSelectedSession(session);
    setViewMode('assessment');
  };

  const handleViewResult = (session: DISCSession) => {
    setSelectedSession(session);
    setViewMode('result');
  };

  const handleAssessmentComplete = () => {
    setViewMode('result');
  };

  const handleBack = () => {
    setViewMode('list');
    setSelectedSession(null);
  };

  const handleDeleteClick = (sessionId: string) => {
    setSessionToDelete(sessionId);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (sessionToDelete) {
      await deleteSession.mutateAsync(sessionToDelete);
      setShowDeleteDialog(false);
      setSessionToDelete(null);
    }
  };

  const handleAcceptInvitation = async (invitationId: string) => {
    await acceptInvitation.mutateAsync(invitationId);
    // Automatically create a session for the user
    setShowCreateDialog(true);
  };

  const handleDeclineInvitation = async (invitationId: string) => {
    await declineInvitation.mutateAsync(invitationId);
  };

  const getStatusBadge = (status: DISCSession['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pendente</Badge>;
      case 'in_progress':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-600">Em andamento</Badge>;
      case 'completed':
        return <Badge className="bg-green-500">Concluído</Badge>;
    }
  };

  // Render assessment flow
  if (viewMode === 'assessment' && selectedSession) {
    return (
      <DISCAssessmentFlow
        session={selectedSession}
        onComplete={handleAssessmentComplete}
        onBack={handleBack}
      />
    );
  }

  // Render result view
  if (viewMode === 'result' && selectedSession) {
    return (
      <DISCResultView
        session={selectedSession}
        onBack={handleBack}
      />
    );
  }

  // Render list view
  return (
    <AppLayout
      title="Assessment DISC"
      breadcrumb={[
        { label: "Retenção", href: "/retencao" },
        { label: "Assessment DISC" }
      ]}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              {(['D', 'I', 'S', 'C'] as const).map((dim) => (
                <div
                  key={dim}
                  className={`w-8 h-8 rounded-full ${DISC_DIMENSIONS[dim].bgColor} flex items-center justify-center text-white font-bold text-sm`}
                >
                  {dim}
                </div>
              ))}
            </div>
            <div className="text-sm text-muted-foreground">
              Dominância • Influência • Estabilidade • Conformidade
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate('/retencao/assessment-disc/team-dashboard')}>
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Dashboard por Time
            </Button>
            {canInvite && (
              <Button variant="outline" onClick={() => setShowInviteModal(true)}>
                <Send className="mr-2 h-4 w-4" />
                Convidar Usuários
              </Button>
            )}
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Assessment
            </Button>
          </div>
        </div>

        {/* Pending Invitation Card */}
        {myPendingInvitations.length > 0 && (
          <PendingInvitationCard
            invitation={myPendingInvitations[0]}
            onAccept={() => handleAcceptInvitation(myPendingInvitations[0].id)}
            onDecline={() => handleDeclineInvitation(myPendingInvitations[0].id)}
            isAccepting={acceptInvitation.isPending}
            isDeclining={declineInvitation.isPending}
          />
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{sessions.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Concluídos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {sessions.filter(s => s.status === 'completed').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Em andamento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {sessions.filter(s => s.status === 'in_progress').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pendentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-muted-foreground">
                {sessions.filter(s => s.status === 'pending').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sessions List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Assessments
            </CardTitle>
            <CardDescription>
              Gerencie os assessments DISC da sua equipe
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingSessions ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando...
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-12">
                <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhum assessment ainda</h3>
                <p className="text-muted-foreground mb-4">
                  Crie o primeiro assessment DISC para sua equipe
                </p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Assessment
                </Button>
              </div>
            ) : (
              <div className="divide-y">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className="py-4 flex items-center justify-between hover:bg-muted/50 -mx-4 px-4 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{session.participant_name}</span>
                        {getStatusBadge(session.status)}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {session.participant_email && (
                          <span className="mr-4">{session.participant_email}</span>
                        )}
                        <span>
                          Criado em {formatBRT(new Date(session.created_at), "dd/MM/yyyy 'às' HH:mm")}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {session.status === 'completed' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewResult(session)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Ver Resultado
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStartAssessment(session)}
                        >
                          <Play className="mr-2 h-4 w-4" />
                          {session.status === 'pending' ? 'Iniciar' : 'Continuar'}
                        </Button>
                      )}
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDeleteClick(session.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Assessment DISC</DialogTitle>
            <DialogDescription>
              Selecione um usuário cadastrado para criar um novo assessment
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Participante *</Label>
              <UserSelect
                value={selectedUserId}
                onChange={handleUserSelect}
                placeholder="Selecione um participante"
              />
            </div>
            
            {participantName && (
              <div className="p-3 bg-muted rounded-lg text-sm">
                <p><strong>Nome:</strong> {participantName}</p>
                {participantEmail && <p><strong>Email:</strong> {participantEmail}</p>}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreateSession}
              disabled={!participantName.trim() || createSession.isPending}
            >
              {createSession.isPending ? 'Criando...' : 'Criar e Iniciar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Assessment?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O assessment e todos os dados relacionados serão excluídos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Invite Modal */}
      <AssessmentInviteModal
        open={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        assessmentType="disc"
      />
    </AppLayout>
  );
}
