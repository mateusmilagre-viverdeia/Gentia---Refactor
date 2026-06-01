import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, FileText, Settings, ShieldAlert } from 'lucide-react';
import { usePulseSurveys } from '@/hooks/usePulseSurveys';
import { usePulseAdmin } from '@/hooks/usePulseAdmin';
import { usePulseTeams } from '@/hooks/usePulseTeams';
import { PulseSurveyList, PulseSurveyForm } from '@/components/pulse/surveys';
import type { PulseSurvey, CreatePulseSurveyData } from '@/types/pulseSurvey.types';

type ViewMode = 'list' | 'form' | 'dashboard';

export default function PulseSurveys() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [accountId, setAccountId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingSurvey, setEditingSurvey] = useState<PulseSurvey | null>(null);
  const [deleteDialogId, setDeleteDialogId] = useState<string | null>(null);
  
  const {
    surveys,
    isLoadingSurveys,
    createSurvey,
    updateSurvey,
    deleteSurvey,
    publishSurvey,
    pauseSurvey,
    resumeSurvey,
    closeSurvey,
    duplicateSurvey,
    isCreating,
    isUpdating,
  } = usePulseSurveys(accountId);
  
  const admin = usePulseAdmin(accountId);
  const teamsHook = usePulseTeams(accountId);

  // Fetch account_id and check admin status
  useEffect(() => {
    async function checkAccess() {
      if (!user?.id) return;
      
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('account_id')
          .eq('id', user.id)
          .single();
        
        if (profile?.account_id) {
          setAccountId(profile.account_id);
          
          const { data: pulseProfile } = await supabase
            .from('pulse_user_profiles')
            .select('role')
            .eq('user_id', user.id)
            .eq('account_id', profile.account_id)
            .eq('is_active', true)
            .single();
          
          const { data: accountMember } = await supabase
            .from('account_members')
            .select('role')
            .eq('user_id', user.id)
            .eq('account_id', profile.account_id)
            .single();
          
          const isPulseAdmin = pulseProfile?.role === 'admin_rh';
          const isAccountAdmin = accountMember?.role === 'owner' || accountMember?.role === 'admin' || accountMember?.role === 'admin_rh';
          
          setIsAdmin(isPulseAdmin || isAccountAdmin);
        }
      } catch (error) {
        console.error('Error checking access:', error);
        setIsAdmin(false);
      } finally {
        setLoadingAuth(false);
      }
    }
    
    checkAccess();
  }, [user?.id]);

  // Fetch required data for form
  useEffect(() => {
    if (accountId && isAdmin) {
      admin.fetchDrivers();
      admin.fetchQuestions();
      teamsHook.fetchTeams();
    }
  }, [accountId, isAdmin]);

  const handleCreateNew = () => {
    setEditingSurvey(null);
    setViewMode('form');
  };

  const handleEdit = (survey: PulseSurvey) => {
    setEditingSurvey(survey);
    setViewMode('form');
  };

  const handleDuplicate = async (survey: PulseSurvey) => {
    const newSurvey = await duplicateSurvey(survey.id);
    setEditingSurvey(newSurvey);
    setViewMode('form');
  };

  const handleSave = async (data: CreatePulseSurveyData) => {
    if (editingSurvey?.id) {
      await updateSurvey({ id: editingSurvey.id, ...data });
    } else {
      await createSurvey(data);
    }
    setViewMode('list');
    setEditingSurvey(null);
  };

  const handleBack = () => {
    setViewMode('list');
    setEditingSurvey(null);
  };

  const handleDelete = async () => {
    if (deleteDialogId) {
      await deleteSurvey(deleteDialogId);
      setDeleteDialogId(null);
    }
  };

  const handleViewResults = (survey: PulseSurvey) => {
    // Navigate to existing pulse dashboard with survey context
    navigate('/retencao/pulse/dashboard');
  };

  if (loadingAuth) {
    return (
      <AppLayout
        title="Pesquisas Pulse"
        breadcrumb={[
          { label: "Home", href: "/" },
          { label: "Retenção", href: "/retencao" },
          { label: "Pulse", href: "/retencao/pulse/hub" },
          { label: "Pesquisas" },
        ]}
      >
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </AppLayout>
    );
  }

  if (!isAdmin) {
    return (
      <AppLayout title="Acesso Restrito">
        <div className="container mx-auto py-6">
          <Card className="max-w-lg mx-auto">
            <CardHeader className="text-center">
              <ShieldAlert className="h-12 w-12 mx-auto text-destructive mb-4" />
              <CardTitle>Acesso Restrito</CardTitle>
              <CardDescription>
                Você não tem permissão para gerenciar pesquisas Pulse.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <button onClick={() => navigate('/retencao/pulse/hub')} className="text-primary hover:underline">
                Voltar para o Pulse Hub
              </button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const teams = teamsHook.teams.map(t => ({ id: t.id, name: t.name }));

  return (
    <AppLayout
      title="Pesquisas Pulse"
      breadcrumb={[
        { label: "Home", href: "/" },
        { label: "Retenção", href: "/retencao" },
        { label: "Pulse", href: "/retencao/pulse/hub" },
        { label: "Pesquisas" },
      ]}
    >
      <div className="space-y-6">
        {viewMode === 'list' && (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-semibold mb-2">Pesquisas Pulse</h1>
                <p className="text-muted-foreground">
                  Crie e gerencie pesquisas de engajamento contínuo
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={() => navigate('/retencao/pulse/admin')}>
                  <Settings className="h-4 w-4 mr-2" />
                  Configurações
                </Button>
                <Button onClick={handleCreateNew}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Pesquisa
                </Button>
              </div>
            </div>

            {isLoadingSurveys ? (
              <div className="text-center py-12 text-muted-foreground">Carregando...</div>
            ) : surveys.length === 0 ? (
              <div className="text-center py-16">
                <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                <h2 className="text-xl font-medium mb-2">Nenhuma pesquisa Pulse ainda</h2>
                <p className="text-muted-foreground mb-6">
                  Crie sua primeira pesquisa para coletar feedback contínuo da equipe
                </p>
                <Button onClick={handleCreateNew}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Pesquisa Pulse
                </Button>
              </div>
            ) : (
              <PulseSurveyList
                surveys={surveys}
                onEdit={handleEdit}
                onDelete={(id) => setDeleteDialogId(id)}
                onPublish={publishSurvey}
                onPause={pauseSurvey}
                onResume={resumeSurvey}
                onClose={closeSurvey}
                onViewResults={handleViewResults}
                onDuplicate={handleDuplicate}
              />
            )}
          </>
        )}

        {viewMode === 'form' && (
          <PulseSurveyForm
            initialData={editingSurvey || undefined}
            drivers={admin.drivers}
            teams={teams}
            questions={admin.questions}
            onSave={handleSave}
            onCancel={handleBack}
            isSaving={isCreating || isUpdating}
          />
        )}
      </div>

      <AlertDialog open={!!deleteDialogId} onOpenChange={() => setDeleteDialogId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir pesquisa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todas as respostas serão perdidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
