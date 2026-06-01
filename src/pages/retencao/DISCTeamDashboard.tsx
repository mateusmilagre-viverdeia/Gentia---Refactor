import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Users, ArrowLeft, TrendingUp, AlertTriangle, Target, Lightbulb, Building2 } from 'lucide-react';
import { useDISCTeamDashboard } from '@/hooks/useDISCTeamDashboard';

import {
  DISCTeamRadarChart,
  DISCProfileDistribution,
  DISCTeamStrengths,
  DISCTeamRisks,
  DISCTeamGaps,
  DISCLeaderRecommendations,
  DISCTeamMemberList,
  DISCTeamFilters
} from '@/components/retencao/disc/team';
import { formatBRT } from "@/lib/datetime";

export default function DISCTeamDashboard() {
  const navigate = useNavigate();
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [selectedLeaderId, setSelectedLeaderId] = useState<string | null>(null);
  
  const {
    teams,
    leaders,
    isLoadingTeams,
    selectedTeamData,
    teamAnalysis,
    isLoadingTeamData,
    allAccountData,
    allAccountAnalysis,
    isLoadingAllData,
    leaderFilteredData,
    leaderFilteredAnalysis,
    isLoadingLeaderData
  } = useDISCTeamDashboard(selectedTeamId, selectedLeaderId);

  // Determine which data to display based on filters
  const displayData = selectedTeamId 
    ? selectedTeamData 
    : selectedLeaderId 
      ? leaderFilteredData 
      : allAccountData;
  
  const displayAnalysis = selectedTeamId 
    ? teamAnalysis 
    : selectedLeaderId 
      ? leaderFilteredAnalysis 
      : allAccountAnalysis;
  
  const isLoading = selectedTeamId 
    ? isLoadingTeamData 
    : selectedLeaderId 
      ? isLoadingLeaderData 
      : isLoadingAllData;

  const handleViewResult = (sessionId: string) => {
    navigate(`/retencao/assessment-disc?view=${sessionId}`);
  };

  return (
    <AppLayout
      title="Dashboard DISC EP+ por Time"
      breadcrumb={[
        { label: "Retenção", href: "/retencao" },
        { label: "Assessment DISC", href: "/retencao/assessment-disc" },
        { label: "Dashboard por Time" }
      ]}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/retencao/assessment-disc')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Users className="h-6 w-6" />
                {displayData?.teamName || 'Dashboard DISC por Time'}
              </h1>
              {displayData?.lastAssessmentDate && (
                <p className="text-sm text-muted-foreground">
                  Última atualização: {formatBRT(new Date(displayData.lastAssessmentDate), "dd/MM/yyyy 'às' HH:mm")}
                </p>
              )}
            </div>
          </div>

          {/* Team Filters */}
          <DISCTeamFilters
            teams={teams}
            leaders={leaders}
            selectedTeamId={selectedTeamId}
            selectedLeaderId={selectedLeaderId}
            onTeamChange={setSelectedTeamId}
            onLeaderChange={setSelectedLeaderId}
            isLoading={isLoadingTeams}
          />
        </div>

        {/* Loading State */}
        {(isLoading || isLoadingTeams) && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* No Data State */}
        {!isLoading && !isLoadingTeams && displayData?.memberCount === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum assessment concluído</h3>
              <p className="text-muted-foreground mb-4">
                {selectedTeamId
                  ? 'Este time ainda não possui assessments DISC concluídos.'
                  : 'Ainda não há assessments DISC concluídos na empresa.'}
              </p>
              <Button onClick={() => navigate('/retencao/assessment-disc')}>
                Criar Assessments
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Dashboard Content */}
        {!isLoading && displayData && displayData.memberCount > 0 && displayAnalysis && (
          <div className="space-y-6">
            {/* Stats Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Membros Avaliados</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{displayData.memberCount}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Perfil Dominante</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {Object.entries(displayData.profileDistribution)
                      .sort(([, a], [, b]) => b - a)[0]?.[0] || '-'}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Forças Identificadas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{displayAnalysis.strengths.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Lacunas de Perfil</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-600">{displayAnalysis.gaps.length}</div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row */}
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Padrão Comportamental do Time
                  </CardTitle>
                  <CardDescription>
                    Média dos scores DISC de todos os membros
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DISCTeamRadarChart aggregation={displayData} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Distribuição de Perfis
                  </CardTitle>
                  <CardDescription>
                    Quantidade de pessoas por perfil primário
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DISCProfileDistribution aggregation={displayData} />
                </CardContent>
              </Card>
            </div>

            {/* Analysis Row */}
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-600">
                    <TrendingUp className="h-5 w-5" />
                    Forças do Time
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <DISCTeamStrengths analysis={displayAnalysis} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-amber-600">
                    <AlertTriangle className="h-5 w-5" />
                    Riscos Comportamentais
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <DISCTeamRisks analysis={displayAnalysis} />
                </CardContent>
              </Card>
            </div>

            {/* Gaps */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Lacunas de Perfil
                </CardTitle>
                <CardDescription>
                  Perfis sub-representados que podem impactar o time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DISCTeamGaps analysis={displayAnalysis} />
              </CardContent>
            </Card>

            {/* Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" />
                  Recomendações para o Líder
                </CardTitle>
                <CardDescription>
                  Ações práticas baseadas na composição comportamental do time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DISCLeaderRecommendations analysis={displayAnalysis} />
              </CardContent>
            </Card>

            {/* Members List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Membros do Time
                </CardTitle>
                <CardDescription>
                  Perfis individuais e resultados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DISCTeamMemberList 
                  members={displayData.members}
                  onViewResult={handleViewResult}
                />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
