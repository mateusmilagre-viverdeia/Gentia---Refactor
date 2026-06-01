import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { usePulseAdmin } from '@/hooks/usePulseAdmin';
import { usePulseTeams } from '@/hooks/usePulseTeams';
import { usePulseUserProfiles } from '@/hooks/usePulseUserProfiles';
import { usePulseScheduleRules } from '@/hooks/usePulseScheduleRules';
import { usePulseGamificationRules } from '@/hooks/usePulseGamificationRules';
import { usePulseNotificationChannels } from '@/hooks/usePulseNotificationChannels';
import { usePulseCultureQuestions } from '@/hooks/usePulseCultureQuestions';
import { AppLayout } from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Settings, HelpCircle, Calendar, ListTodo, Zap, ShieldAlert, Users, UserCog, Clock, Trophy, Smile, Bell } from 'lucide-react';
import {
  PulseAdminDrivers,
  PulseAdminPillars,
  PulseAdminValues,
  PulseAdminQuestions,
  PulseAdminSchedule,
  PulseAdminActions,
  PulseAdminTeams,
  PulseAdminUsers,
  PulseAdminScheduleRules,
  PulseAdminGamification,
  PulseAdminEmojiSets,
  PulseAdminNotifications,
  PulseAdminCultureSync,
} from '@/components/pulse/admin';
import { ManualPulseGenerator } from '@/components/pulse/admin/ManualPulseGenerator';

export default function PulseAdmin() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [accountId, setAccountId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [activeTab, setActiveTab] = useState('config');
  const [availableLeaders, setAvailableLeaders] = useState<any[]>([]);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  
  const admin = usePulseAdmin(accountId);
  const teamsHook = usePulseTeams(accountId);
  const userProfilesHook = usePulseUserProfiles(accountId);
  const scheduleRulesHook = usePulseScheduleRules(accountId);
  const gamificationHook = usePulseGamificationRules(accountId);
  const notificationsHook = usePulseNotificationChannels(accountId);
  const cultureQuestionsHook = usePulseCultureQuestions(accountId);

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

  // Fetch all data when accountId is available
  useEffect(() => {
    if (accountId && isAdmin) {
      admin.fetchAll();
      teamsHook.fetchTeams();
      userProfilesHook.fetchUserProfiles();
      scheduleRulesHook.fetchRules();
      gamificationHook.fetchRules();
      notificationsHook.fetchChannels();
      cultureQuestionsHook.fetchQuestions();
      fetchAvailableLeaders();
    }
  }, [accountId, isAdmin]);

  const fetchAvailableLeaders = useCallback(async () => {
    if (!accountId) return;
    const { data } = await supabase
      .from('account_members')
      .select('user_id, profiles!inner(id, first_name, last_name, email)')
      .eq('account_id', accountId);
    setAvailableLeaders((data || []).map((m: any) => m.profiles));
  }, [accountId]);

  const refreshAvailableUsers = useCallback(async () => {
    const users = await userProfilesHook.fetchAvailableUsers();
    setAvailableUsers(users);
  }, [userProfilesHook.fetchAvailableUsers]);

  if (loadingAuth) {
    return (
      <AppLayout title="Administração do Pulse">
        <div className="container mx-auto py-6 space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-[600px] w-full" />
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
                Você não tem permissão para acessar a administração do Pulse.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <button onClick={() => navigate('/retencao/pulse')} className="text-primary hover:underline">
                Voltar para o Pulse
              </button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Administração do Pulse">
      <div className="container mx-auto py-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Administração do Pulse</h1>
          <p className="text-muted-foreground">Configure drivers, equipes, usuários, perguntas e regras.</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="config" className="gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Config</span>
            </TabsTrigger>
            <TabsTrigger value="teams" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Equipes</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <UserCog className="h-4 w-4" />
              <span className="hidden sm:inline">Usuários</span>
            </TabsTrigger>
            <TabsTrigger value="questions" className="gap-2">
              <HelpCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Perguntas</span>
            </TabsTrigger>
            <TabsTrigger value="emoji-sets" className="gap-2">
              <Smile className="h-4 w-4" />
              <span className="hidden sm:inline">Respostas</span>
            </TabsTrigger>
            <TabsTrigger value="schedule" className="gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Agenda</span>
            </TabsTrigger>
            <TabsTrigger value="rules" className="gap-2">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Regras</span>
            </TabsTrigger>
            <TabsTrigger value="gamification" className="gap-2">
              <Trophy className="h-4 w-4" />
              <span className="hidden sm:inline">Pontos</span>
            </TabsTrigger>
            <TabsTrigger value="actions" className="gap-2">
              <ListTodo className="h-4 w-4" />
              <span className="hidden sm:inline">Ações</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Notificações</span>
            </TabsTrigger>
            <TabsTrigger value="ai" className="gap-2">
              <Zap className="h-4 w-4" />
              <span className="hidden sm:inline">IA</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="config" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <PulseAdminDrivers drivers={admin.drivers} loading={admin.loading} onToggle={admin.toggleDriver} onRefresh={admin.fetchDrivers} />
              <PulseAdminPillars pillars={admin.pillars} loading={admin.loading} />
            </div>
            <PulseAdminCultureSync
              questionsCount={cultureQuestionsHook.stats.total}
              byPillar={cultureQuestionsHook.stats.byPillar}
              loading={cultureQuestionsHook.loading}
              syncing={cultureQuestionsHook.syncing}
              lastSyncResult={cultureQuestionsHook.lastSyncResult}
              onSync={cultureQuestionsHook.syncQuestions}
              onRefresh={cultureQuestionsHook.fetchQuestions}
              onNavigateToQuestions={() => setActiveTab('questions')}
            />
            <PulseAdminValues values={admin.companyValues} loading={admin.loading} onCreate={admin.createCompanyValue} onUpdate={admin.updateCompanyValue} onDelete={admin.deleteCompanyValue} onRefresh={admin.fetchCompanyValues} onImportFromCulture={admin.importValuesFromCulture} />
          </TabsContent>

          <TabsContent value="teams">
            <PulseAdminTeams teams={teamsHook.teams} availableLeaders={availableLeaders} loading={teamsHook.loading} onCreate={teamsHook.createTeam} onUpdate={teamsHook.updateTeam} onDelete={teamsHook.deleteTeam} onToggle={teamsHook.toggleTeamActive} onRefresh={teamsHook.fetchTeams} />
          </TabsContent>

          <TabsContent value="users">
            <PulseAdminUsers userProfiles={userProfilesHook.userProfiles} teams={teamsHook.teams} availableUsers={availableUsers} loading={userProfilesHook.loading} onCreate={userProfilesHook.createUserProfile} onBulkCreate={userProfilesHook.bulkCreateUserProfiles} onChangeRole={userProfilesHook.changeUserRole} onAssignTeam={userProfilesHook.assignToTeam} onToggle={userProfilesHook.toggleUserActive} onDelete={userProfilesHook.deleteUserProfile} onRefresh={userProfilesHook.fetchUserProfiles} onRefreshAvailable={refreshAvailableUsers} />
          </TabsContent>

          <TabsContent value="questions">
            <PulseAdminQuestions questions={admin.questions} drivers={admin.drivers} emojiSets={admin.emojiSets} loading={admin.loading} onCreate={admin.createQuestion} onUpdate={admin.updateQuestion} onToggle={admin.toggleQuestion} onDelete={admin.deleteQuestion} onRefresh={admin.fetchQuestions} />
          </TabsContent>

          <TabsContent value="emoji-sets">
            <PulseAdminEmojiSets emojiSets={admin.emojiSets} loading={admin.loading} onCreate={admin.createEmojiSet} onUpdate={admin.updateEmojiSet} onDelete={admin.deleteEmojiSet} onRefresh={admin.fetchEmojiSets} />
          </TabsContent>

          <TabsContent value="schedule" className="space-y-6">
            {accountId && <ManualPulseGenerator accountId={accountId} />}
            <PulseAdminSchedule assignments={admin.assignments} loading={admin.loading} onGenerate={admin.generateDailyPulse} onRefresh={admin.fetchAssignments} />
          </TabsContent>

          <TabsContent value="rules">
            <PulseAdminScheduleRules rules={scheduleRulesHook.rules} drivers={admin.drivers} loading={scheduleRulesHook.loading} onUpdate={scheduleRulesHook.updateRules} onReset={scheduleRulesHook.resetToDefaults} onRefresh={scheduleRulesHook.fetchRules} />
          </TabsContent>

          <TabsContent value="gamification">
            <PulseAdminGamification rules={gamificationHook.rules} loading={gamificationHook.loading} onToggle={gamificationHook.toggleRule} onUpdatePoints={gamificationHook.updatePoints} onRefresh={gamificationHook.fetchRules} />
          </TabsContent>

          <TabsContent value="actions">
            <PulseAdminActions actions={admin.adminActions} pillars={admin.pillars} drivers={admin.drivers} loading={admin.loading} onCreate={admin.createAdminAction} onUpdate={admin.updateAdminAction} onDelete={admin.deleteAdminAction} onRefresh={admin.fetchAdminActions} />
          </TabsContent>

          <TabsContent value="notifications">
            {/* Canais + métricas/logs de entrega */}
            <PulseAdminNotifications
              channels={notificationsHook.channels}
              loading={notificationsHook.loading}
              onCreate={notificationsHook.createChannel}
              onUpdate={notificationsHook.updateChannel}
              onDelete={notificationsHook.deleteChannel}
              onToggle={notificationsHook.toggleChannel}
              onTest={notificationsHook.testChannel}
              onRefresh={notificationsHook.fetchChannels}
            />
          </TabsContent>

          <TabsContent value="ai">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Zap className="h-5 w-5 text-primary" />Geração com IA</CardTitle>
                <CardDescription>Use inteligência artificial para gerar novas perguntas.</CardDescription>
              </CardHeader>
              <CardContent>
                <PulseAIGenerate drivers={admin.drivers} loading={admin.loading} onGenerate={admin.generateQuestionsWithAI} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

function PulseAIGenerate({ drivers, loading, onGenerate }: { drivers: any[]; loading: boolean; onGenerate: (keys: string[], count: number, culture: boolean) => Promise<{ success: boolean; count: number }> }) {
  const [selectedDrivers, setSelectedDrivers] = useState<string[]>([]);
  const [questionsPerDriver, setQuestionsPerDriver] = useState(3);
  const [includeCulture, setIncludeCulture] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<{ success: boolean; count: number } | null>(null);

  const activeDrivers = drivers.filter(d => d.is_active);
  const handleGenerate = async () => {
    if (selectedDrivers.length === 0) return;
    setGenerating(true);
    setResult(null);
    const res = await onGenerate(selectedDrivers, questionsPerDriver, includeCulture);
    setResult(res);
    setGenerating(false);
  };
  const toggleDriver = (key: string) => setSelectedDrivers(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);

  return (
    <div className="space-y-6">
      <div>
        <label className="text-sm font-medium mb-2 block">Selecione os Drivers</label>
        <div className="flex flex-wrap gap-2">
          {activeDrivers.map(driver => (
            <button key={driver.key} onClick={() => toggleDriver(driver.key)} className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${selectedDrivers.includes(driver.key) ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border hover:border-primary/50'}`}>{driver.name}</button>
          ))}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium mb-2 block">Perguntas por Driver</label>
          <select value={questionsPerDriver} onChange={e => setQuestionsPerDriver(Number(e.target.value))} className="w-full rounded-md border border-input bg-background px-3 py-2">
            {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} pergunta{n > 1 ? 's' : ''}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2 pt-6">
          <input type="checkbox" id="includeCulture" checked={includeCulture} onChange={e => setIncludeCulture(e.target.checked)} className="rounded border-input" />
          <label htmlFor="includeCulture" className="text-sm">Incluir perguntas de cultura/valores</label>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button onClick={handleGenerate} disabled={generating || loading || selectedDrivers.length === 0} className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
          {generating ? <><span className="animate-spin">⏳</span>Gerando...</> : <><Zap className="h-4 w-4" />Gerar Perguntas</>}
        </button>
        {result && <span className={`text-sm ${result.success ? 'text-green-600' : 'text-destructive'}`}>{result.success ? `✓ ${result.count} perguntas geradas` : 'Erro ao gerar'}</span>}
      </div>
    </div>
  );
}
