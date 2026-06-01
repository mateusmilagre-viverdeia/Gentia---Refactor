import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Mountain, Play, Eye, Trash2, Clock, CheckCircle2, Loader2, BarChart3, Send } from "lucide-react";
import { useQAAssessment } from "@/hooks/useQAAssessment";
import { QAIntroduction, QAAssessmentFlow, QAResultView } from "@/components/retencao/qa";
import { QASession, QAResult, QA_PROFILES } from "@/types/qa.types";

import { useNavigate } from "react-router-dom";
import { useAssessmentInvitations } from "@/hooks/useAssessmentInvitations";
import { useCanInviteAssessment } from "@/hooks/useCanInviteAssessment";
import { AssessmentInviteModal, PendingInvitationCard } from "@/components/retencao/shared";
import { formatBRT } from "@/lib/datetime";

type ViewMode = 'list' | 'intro' | 'assessment' | 'result';

export default function AssessmentQA() {
  const navigate = useNavigate();
  const {
    sessions,
    eventGroups,
    isLoadingSessions,
    isLoadingQuestions,
    createSession,
    startSession,
    submitResponses,
    deleteSession,
    fetchResult
  } = useQAAssessment();

  const { canInvite } = useCanInviteAssessment();
  const { 
    myPendingInvitations, 
    acceptInvitation, 
    declineInvitation 
  } = useAssessmentInvitations('qa');

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedSession, setSelectedSession] = useState<QASession | null>(null);
  const [selectedResult, setSelectedResult] = useState<QAResult | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [newParticipant, setNewParticipant] = useState({ name: '', email: '' });

  const handleCreateSession = async () => {
    if (!newParticipant.name.trim()) return;
    
    const session = await createSession.mutateAsync({
      participant_name: newParticipant.name,
      participant_email: newParticipant.email || undefined
    });
    
    setSelectedSession(session);
    setNewParticipant({ name: '', email: '' });
    setIsCreateDialogOpen(false);
    setViewMode('intro');
  };

  const handleStartAssessment = async () => {
    if (!selectedSession) return;
    await startSession.mutateAsync(selectedSession.id);
    setViewMode('assessment');
  };

  const handleCompleteAssessment = async (responses: { question_id: string; score: number }[]) => {
    if (!selectedSession) return;
    
    const result = await submitResponses.mutateAsync({
      sessionId: selectedSession.id,
      responses
    });
    
    // Fetch full result to display
    const fullResult = await fetchResult(selectedSession.id);
    if (fullResult) {
      setSelectedResult(fullResult);
      setViewMode('result');
    }
  };

  const handleViewResult = async (session: QASession) => {
    const result = await fetchResult(session.id);
    if (result) {
      setSelectedSession(session);
      setSelectedResult(result);
      setViewMode('result');
    }
  };

  const handleContinueSession = (session: QASession) => {
    setSelectedSession(session);
    if (session.status === 'pending') {
      setViewMode('intro');
    } else {
      setViewMode('assessment');
    }
  };

  const handleBack = () => {
    setSelectedSession(null);
    setSelectedResult(null);
    setViewMode('list');
  };

  const handleAcceptInvitation = async (invitationId: string) => {
    await acceptInvitation.mutateAsync(invitationId);
    setIsCreateDialogOpen(true);
  };

  const handleDeclineInvitation = async (invitationId: string) => {
    await declineInvitation.mutateAsync(invitationId);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" /> Concluído</Badge>;
      case 'in_progress':
        return <Badge variant="default" className="bg-amber-500"><Clock className="h-3 w-3 mr-1" /> Em andamento</Badge>;
      default:
        return <Badge variant="outline">Pendente</Badge>;
    }
  };

  // Render based on view mode
  if (viewMode === 'intro' && selectedSession) {
    return (
      <AppLayout
        title="Teste QA"
        breadcrumb={[
          { label: "Retenção", href: "/retencao" },
          { label: "Teste QA", href: "/retencao/assessment-qa" },
          { label: "Introdução" }
        ]}
      >
        <QAIntroduction
          participantName={selectedSession.participant_name}
          onStart={handleStartAssessment}
        />
      </AppLayout>
    );
  }

  if (viewMode === 'assessment' && selectedSession) {
    return (
      <AppLayout
        title="Teste QA"
        breadcrumb={[
          { label: "Retenção", href: "/retencao" },
          { label: "Teste QA", href: "/retencao/assessment-qa" },
          { label: selectedSession.participant_name }
        ]}
      >
        <QAAssessmentFlow
          eventGroups={eventGroups}
          onComplete={handleCompleteAssessment}
          isSubmitting={submitResponses.isPending}
        />
      </AppLayout>
    );
  }

  if (viewMode === 'result' && selectedSession && selectedResult) {
    return (
      <AppLayout
        title="Resultado QA"
        breadcrumb={[
          { label: "Retenção", href: "/retencao" },
          { label: "Teste QA", href: "/retencao/assessment-qa" },
          { label: "Resultado" }
        ]}
      >
        <QAResultView
          result={selectedResult}
          session={selectedSession}
          onBack={handleBack}
        />
      </AppLayout>
    );
  }

  // List view (default)
  return (
    <AppLayout
      title="Teste QA - Quociente de Adversidade"
      breadcrumb={[
        { label: "Retenção", href: "/retencao" },
        { label: "Teste QA" }
      ]}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-primary/10">
                <Mountain className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Teste QA - Quociente de Adversidade</h1>
                <p className="text-muted-foreground">
                  Avalie como colaboradores respondem a situações adversas no trabalho
                </p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/retencao/assessment-qa/team-dashboard')}>
              <BarChart3 className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
            {canInvite && (
              <Button variant="outline" onClick={() => setShowInviteModal(true)}>
                <Send className="mr-2 h-4 w-4" />
                Convidar Usuários
              </Button>
            )}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Teste
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Novo Teste QA</DialogTitle>
                  <DialogDescription>
                    Adicione as informações do participante para iniciar o teste.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome do Participante *</Label>
                    <Input
                      id="name"
                      value={newParticipant.name}
                      onChange={(e) => setNewParticipant(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Nome completo"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail (opcional)</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newParticipant.email}
                      onChange={(e) => setNewParticipant(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="email@exemplo.com"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleCreateSession}
                    disabled={!newParticipant.name.trim() || createSession.isPending}
                  >
                    {createSession.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Criar Teste
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
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

        {/* Info Card */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <Mountain className="h-8 w-8 text-primary flex-shrink-0" />
              <div>
                <h3 className="font-semibold mb-1">Sobre o Teste QA</h3>
                <p className="text-sm text-muted-foreground">
                  O Quociente de Adversidade (QA) avalia como pessoas respondem a situações adversas,
                  identificando padrões de resiliência e comportamento sob pressão. Os perfis identificados
                  (Alpinista, Campista, Desistente) ajudam a entender capacidade de superação e
                  potencial de desenvolvimento.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sessions Table */}
        <Card>
          <CardHeader>
            <CardTitle>Testes Realizados</CardTitle>
            <CardDescription>
              Gerencie os testes QA da sua organização
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingSessions || isLoadingQuestions ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-8">
                <Mountain className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhum teste ainda</h3>
                <p className="text-muted-foreground mb-4">
                  Crie o primeiro teste QA para começar a avaliar a resiliência da equipe.
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Primeiro Teste
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Participante</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Perfil</TableHead>
                    <TableHead>QA Total</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((session) => (
                    <SessionRow
                      key={session.id}
                      session={session}
                      onView={() => handleViewResult(session)}
                      onContinue={() => handleContinueSession(session)}
                      onDelete={() => deleteSession.mutate(session.id)}
                      fetchResult={fetchResult}
                    />
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
      {/* Invite Modal */}
      <AssessmentInviteModal
        open={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        assessmentType="qa"
      />
    </AppLayout>
  );
}

// Separate component for table row to handle async result fetching
function SessionRow({
  session,
  onView,
  onContinue,
  onDelete,
  fetchResult
}: {
  session: QASession;
  onView: () => void;
  onContinue: () => void;
  onDelete: () => void;
  fetchResult: (sessionId: string) => Promise<QAResult | null>;
}) {
  const [result, setResult] = useState<QAResult | null>(null);

  useEffect(() => {
    if (session.status === 'completed') {
      fetchResult(session.id).then(setResult);
    }
  }, [session.id, session.status, fetchResult]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" /> Concluído</Badge>;
      case 'in_progress':
        return <Badge variant="default" className="bg-amber-500"><Clock className="h-3 w-3 mr-1" /> Em andamento</Badge>;
      default:
        return <Badge variant="outline">Pendente</Badge>;
    }
  };

  return (
    <TableRow>
      <TableCell>
        <div>
          <div className="font-medium">{session.participant_name}</div>
          {session.participant_email && (
            <div className="text-sm text-muted-foreground">{session.participant_email}</div>
          )}
        </div>
      </TableCell>
      <TableCell>{getStatusBadge(session.status)}</TableCell>
      <TableCell>
        {result ? (
          <div className="flex items-center gap-2">
            <span>{QA_PROFILES[result.profile].emoji}</span>
            <span className={QA_PROFILES[result.profile].color}>
              {QA_PROFILES[result.profile].name}
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell>
        {result ? (
          <span className="font-semibold">{result.qa_total}</span>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell>
        {session.completed_at
          ? formatBRT(new Date(session.completed_at), "dd/MM/yyyy")
          : formatBRT(new Date(session.created_at), "dd/MM/yyyy")}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          {session.status === 'completed' ? (
            <Button variant="outline" size="sm" onClick={onView}>
              <Eye className="h-4 w-4" />
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={onContinue}>
              <Play className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onDelete}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
