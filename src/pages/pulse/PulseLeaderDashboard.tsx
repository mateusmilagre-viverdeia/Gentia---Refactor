import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { usePulseLeader } from '@/hooks/usePulseLeader';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Users,
  Trophy,
  TrendingUp,
  TrendingDown,
  Minus,
  Flame,
  Target,
  Medal,
  Crown,
  ChevronRight,
  BarChart3,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

export default function PulseLeaderDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [accountId, setAccountId] = useState<string | null>(null);
  const [isLeader, setIsLeader] = useState<boolean | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const leader = usePulseLeader(accountId, user?.id || null);

  // Check access
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

          // Check if user is a leader or admin
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

          // Check if leads any team
          const { data: ledTeams } = await supabase
            .from('pulse_teams')
            .select('id')
            .eq('account_id', profile.account_id)
            .eq('leader_user_id', user.id)
            .eq('is_active', true)
            .limit(1);

          const isPulseLeader = pulseProfile?.role === 'leader' || pulseProfile?.role === 'admin_rh';
          const isAccountAdmin = accountMember?.role === 'owner' || accountMember?.role === 'admin' || accountMember?.role === 'admin_rh';
          const hasTeams = (ledTeams?.length || 0) > 0;

          setIsLeader(isPulseLeader || isAccountAdmin || hasTeams);
        }
      } catch (error) {
        console.error('Error checking access:', error);
        setIsLeader(false);
      } finally {
        setLoadingAuth(false);
      }
    }

    checkAccess();
  }, [user?.id]);

  // Fetch data
  useEffect(() => {
    if (accountId && isLeader) {
      leader.fetchAll();
    }
  }, [accountId, isLeader]);

  // When teams are loaded, select first one
  useEffect(() => {
    if (leader.teams.length > 0 && leader.selectedTeamId) {
      leader.selectTeam(leader.selectedTeamId);
    }
  }, [leader.teams, leader.selectedTeamId]);

  const TrendIcon = ({ value }: { value: number }) => {
    if (value > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (value < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="h-5 w-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-slate-400" />;
    if (rank === 3) return <Medal className="h-5 w-5 text-amber-600" />;
    return <span className="font-bold text-muted-foreground">{rank}</span>;
  };

  if (loadingAuth) {
    return (
      <AppLayout title="Meu Time">
        <div className="container mx-auto py-6 space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
          </div>
          <Skeleton className="h-[400px]" />
        </div>
      </AppLayout>
    );
  }

  if (!isLeader) {
    return (
      <AppLayout title="Área do Líder">
        <div className="container mx-auto py-6">
          <Card className="max-w-lg mx-auto">
            <CardHeader className="text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <CardTitle>Área do Líder</CardTitle>
              <CardDescription>
                Esta área é exclusiva para líderes de equipe.
                Você será redirecionado ao Pulse.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button onClick={() => navigate('/retencao/pulse')}>
                Ir para o Pulse
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const selectedTeam = leader.teams.find(t => t.id === leader.selectedTeamId);

  return (
    <AppLayout title="Meu Time">
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Meu Time</h1>
            <p className="text-muted-foreground">
              Acompanhe o engajamento e desempenho da sua equipe.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {leader.teams.length > 1 && (
              <Select
                value={leader.selectedTeamId || ''}
                onValueChange={(value) => leader.selectTeam(value)}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Selecione o time" />
                </SelectTrigger>
                <SelectContent>
                  {leader.teams.map(team => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button variant="outline" onClick={() => navigate('/retencao/pulse/dashboard')}>
              <BarChart3 className="h-4 w-4 mr-2" />
              Dashboard Geral
            </Button>
          </div>
        </div>

        {/* Team Selector for single team */}
        {leader.teams.length === 1 && selectedTeam && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="flex items-center gap-4 py-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-lg">{selectedTeam.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {leader.teamMembers.length} membro{leader.teamMembers.length !== 1 ? 's' : ''}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Team vs Company Comparison */}
        {leader.teamComparison.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            {leader.teamComparison.map(comp => (
              <Card key={comp.metric}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {comp.metric}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-3xl font-bold">{comp.team_value}%</div>
                      <div className="text-xs text-muted-foreground">Seu time</div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1">
                        <TrendIcon value={comp.diff} />
                        <span className={comp.diff > 0 ? 'text-green-500' : comp.diff < 0 ? 'text-red-500' : 'text-muted-foreground'}>
                          {comp.diff > 0 ? '+' : ''}{comp.diff}%
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        vs empresa ({comp.company_avg}%)
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="members" className="space-y-4">
          <TabsList>
            <TabsTrigger value="members" className="gap-2">
              <Users className="h-4 w-4" />
              Membros
            </TabsTrigger>
            <TabsTrigger value="trends" className="gap-2">
              <Target className="h-4 w-4" />
              Evolução
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="gap-2">
              <Trophy className="h-4 w-4" />
              Ranking
            </TabsTrigger>
          </TabsList>

          {/* Members Tab */}
          <TabsContent value="members">
            <Card>
              <CardHeader>
                <CardTitle>Membros do Time</CardTitle>
                <CardDescription>
                  Acompanhe a participação individual
                </CardDescription>
              </CardHeader>
              <CardContent>
                {leader.loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
                  </div>
                ) : leader.teamMembers.length > 0 ? (
                  <div className="space-y-3">
                    {leader.teamMembers.map(member => (
                      <div
                        key={member.id}
                        className="flex items-center gap-4 p-4 rounded-lg border"
                      >
                        <Avatar>
                          <AvatarFallback>
                            {member.display_name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">{member.display_name}</div>
                          {member.email && (
                            <div className="text-xs text-muted-foreground truncate">
                              {member.email}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="text-center">
                            <div className="flex items-center gap-1 text-orange-500">
                              <Flame className="h-4 w-4" />
                              <span className="font-semibold">{member.current_streak}</span>
                            </div>
                            <div className="text-xs text-muted-foreground">streak</div>
                          </div>
                          <div className="text-center">
                            <div className="font-semibold">{member.total_responses}</div>
                            <div className="text-xs text-muted-foreground">respostas</div>
                          </div>
                          {member.avg_score !== null && (
                            <div className="text-center">
                              <div className="font-semibold">
                                {Math.round(member.avg_score * 20)}%
                              </div>
                              <div className="text-xs text-muted-foreground">média</div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum membro encontrado neste time.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Trends Tab */}
          <TabsContent value="trends">
            <Card>
              <CardHeader>
                <CardTitle>Evolução do Time</CardTitle>
                <CardDescription>Últimos 14 dias</CardDescription>
              </CardHeader>
              <CardContent>
                {leader.loading ? (
                  <Skeleton className="h-[300px]" />
                ) : leader.teamMetrics.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={leader.teamMetrics}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis domain={[0, 100]} className="text-xs" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="engagement"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--primary))' }}
                        name="Engajamento"
                      />
                      <Line
                        type="monotone"
                        dataKey="participation"
                        stroke="hsl(var(--chart-2))"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={{ fill: 'hsl(var(--chart-2))' }}
                        name="Participação"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    Nenhum dado disponível ainda
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Leaderboard Tab */}
          <TabsContent value="leaderboard">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  Ranking da Empresa
                </CardTitle>
                <CardDescription>
                  Top 20 colaboradores mais engajados
                </CardDescription>
              </CardHeader>
              <CardContent>
                {leader.loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-14" />)}
                  </div>
                ) : leader.leaderboard.length > 0 ? (
                  <div className="space-y-2">
                    {leader.leaderboard.map((entry, idx) => (
                      <div
                        key={entry.user_id}
                        className={`flex items-center gap-4 p-3 rounded-lg border ${
                          idx < 3 ? 'bg-accent/50' : ''
                        }`}
                      >
                        <div className="w-8 text-center">
                          {getRankIcon(entry.rank)}
                        </div>
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>
                            {entry.display_name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">{entry.display_name}</div>
                          {entry.team_name && (
                            <div className="text-xs text-muted-foreground">
                              {entry.team_name}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1 text-orange-500">
                            <Flame className="h-4 w-4" />
                            <span>{entry.current_streak}</span>
                          </div>
                          <Badge variant="secondary">
                            Nível {entry.current_level}
                          </Badge>
                          <div className="font-bold text-primary">
                            {entry.total_points.toLocaleString()} pts
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum dado de ranking disponível.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
