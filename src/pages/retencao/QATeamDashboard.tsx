import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Mountain, Users, TrendingUp, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { QAResult, QA_PROFILES, QA_DIMENSIONS, QAProfile } from "@/types/qa.types";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";

export default function QATeamDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Fetch account ID
  const { data: accountId } = useQuery({
    queryKey: ['user-account-id', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('id', user.id)
        .single();
      return data?.account_id ?? null;
    },
    enabled: !!user?.id
  });

  // Fetch all completed QA results for the account
  const { data: results = [], isLoading } = useQuery({
    queryKey: ['qa-team-results', accountId],
    queryFn: async () => {
      if (!accountId) return [];

      const { data: sessions } = await supabase
        .from('qa_sessions')
        .select('id')
        .eq('account_id', accountId)
        .eq('status', 'completed');

      if (!sessions?.length) return [];

      const sessionIds = sessions.map(s => s.id);
      const { data: results, error } = await supabase
        .from('qa_results')
        .select('*')
        .in('session_id', sessionIds);

      if (error) throw error;
      return results as QAResult[];
    },
    enabled: !!accountId
  });

  // Calculate statistics
  const profileCounts = results.reduce((acc, r) => {
    acc[r.profile] = (acc[r.profile] || 0) + 1;
    return acc;
  }, {} as Record<QAProfile, number>);

  const avgQA = results.length > 0
    ? Math.round(results.reduce((sum, r) => sum + r.qa_total, 0) / results.length)
    : 0;

  const avgDimensions = results.length > 0
    ? {
        C: Math.round(results.reduce((sum, r) => sum + r.c_score, 0) / results.length),
        R: Math.round(results.reduce((sum, r) => sum + r.r_score, 0) / results.length),
        A: Math.round(results.reduce((sum, r) => sum + r.a_score, 0) / results.length),
        D: Math.round(results.reduce((sum, r) => sum + r.d_score, 0) / results.length),
      }
    : { C: 0, R: 0, A: 0, D: 0 };

  const pieData = Object.entries(profileCounts).map(([profile, count]) => ({
    name: QA_PROFILES[profile as QAProfile].name,
    value: count,
    color: profile === 'alpinista' ? '#10b981' : profile === 'campista' ? '#f59e0b' : '#ef4444',
    emoji: QA_PROFILES[profile as QAProfile].emoji
  }));

  const dimensionData = [
    { name: 'Controle', value: avgDimensions.C, fill: '#3b82f6' },
    { name: 'Responsabilidade', value: avgDimensions.R, fill: '#22c55e' },
    { name: 'Alcance', value: avgDimensions.A, fill: '#f59e0b' },
    { name: 'Duração', value: avgDimensions.D, fill: '#ef4444' },
  ];

  const desistentesCount = profileCounts.desistente || 0;
  const riskPercentage = results.length > 0 ? Math.round((desistentesCount / results.length) * 100) : 0;

  return (
    <AppLayout
      title="Dashboard QA"
      breadcrumb={[
        { label: "Retenção", href: "/retencao" },
        { label: "Teste QA", href: "/retencao/assessment-qa" },
        { label: "Dashboard" }
      ]}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/retencao/assessment-qa')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-primary/10">
            <Mountain className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Dashboard QA da Equipe</h1>
            <p className="text-muted-foreground">
              Visão consolidada do Quociente de Adversidade da organização
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{results.length}</p>
                  <p className="text-sm text-muted-foreground">Testes Realizados</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{avgQA}</p>
                  <p className="text-sm text-muted-foreground">QA Médio</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-green-500/10">
                  <span className="text-2xl">🧗</span>
                </div>
                <div>
                  <p className="text-2xl font-bold">{profileCounts.alpinista || 0}</p>
                  <p className="text-sm text-muted-foreground">Alpinistas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={riskPercentage > 30 ? 'border-red-500/50' : ''}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-red-500/10">
                  <AlertTriangle className="h-6 w-6 text-red-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{riskPercentage}%</p>
                  <p className="text-sm text-muted-foreground">Risco (Desistentes)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Profile Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Distribuição de Perfis</CardTitle>
              <CardDescription>Proporção de cada perfil na equipe</CardDescription>
            </CardHeader>
            <CardContent>
              {results.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  Nenhum dado disponível
                </div>
              )}
              <div className="flex justify-center gap-4 mt-4">
                {Object.entries(QA_PROFILES).map(([key, profile]) => (
                  <div key={key} className="flex items-center gap-2 text-sm">
                    <span>{profile.emoji}</span>
                    <span>{profile.name}</span>
                    <Badge variant="outline">{profileCounts[key as QAProfile] || 0}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Dimension Averages */}
          <Card>
            <CardHeader>
              <CardTitle>Média por Dimensão</CardTitle>
              <CardDescription>Scores médios CRAD da equipe</CardDescription>
            </CardHeader>
            <CardContent>
              {results.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dimensionData} layout="vertical">
                      <XAxis type="number" domain={[0, 50]} />
                      <YAxis type="category" dataKey="name" width={100} />
                      <Tooltip />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  Nenhum dado disponível
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Dimension Details */}
        <Card>
          <CardHeader>
            <CardTitle>Análise por Dimensão</CardTitle>
            <CardDescription>Detalhamento das dimensões CRAD</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(QA_DIMENSIONS).map(([key, dim]) => {
                const score = avgDimensions[key as keyof typeof avgDimensions];
                const percentage = (score / 50) * 100;
                
                return (
                  <div key={key} className={`p-4 rounded-lg border ${dim.borderColor} bg-card`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-2xl font-bold ${dim.color}`}>{key}</span>
                      <span className="text-lg font-semibold">{score}</span>
                    </div>
                    <p className="text-sm font-medium mb-2">{dim.name}</p>
                    <Progress value={percentage} className="h-2 mb-2" />
                    <p className="text-xs text-muted-foreground">{dim.description}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Insights */}
        {results.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {riskPercentage > 30 && (
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                    <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-red-600">Atenção ao Risco de Turnover</h4>
                      <p className="text-sm text-muted-foreground">
                        {riskPercentage}% da equipe apresenta perfil "Desistente". 
                        Considere ações de desenvolvimento de resiliência e suporte.
                      </p>
                    </div>
                  </div>
                )}

                {(profileCounts.alpinista || 0) > results.length / 2 && (
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                    <TrendingUp className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-green-600">Equipe Resiliente</h4>
                      <p className="text-sm text-muted-foreground">
                        Mais da metade da equipe apresenta perfil "Alpinista". 
                        Isso indica alta capacidade de lidar com adversidades.
                      </p>
                    </div>
                  </div>
                )}

                {Object.values(avgDimensions).some(v => v < 25) && (
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
                    <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-amber-600">Dimensão a Desenvolver</h4>
                      <p className="text-sm text-muted-foreground">
                        Uma ou mais dimensões CRAD estão abaixo da média. 
                        Considere programas de desenvolvimento focados nessas áreas.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
