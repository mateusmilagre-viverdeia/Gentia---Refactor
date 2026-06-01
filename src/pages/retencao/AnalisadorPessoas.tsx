import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ArrowLeft, Trash2, Save } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { usePeopleAnalysis } from "@/hooks/usePeopleAnalysis";
import {
  AnalysisSelector,
  AnalysisForm,
  PeopleTable,
  AnalysisLegend,
  PeopleAnalysisFilters,
} from "@/components/retencao/analisador";
import { VersionHistoryPanel } from "@/components/retencao/analisador/VersionHistoryPanel";
import { PageGamificationBanner } from "@/components/gamification";

export default function AnalisadorPessoas() {
  const navigate = useNavigate();
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  const {
    analyses,
    selectedAnalysis,
    setSelectedAnalysis,
    filteredMembers,
    loading,
    canAccess,
    createAnalysis,
    deleteAnalysis,
    addMember,
    updateMember,
    deleteMember,
    setRating,
    getRating,
    getMemberTotal,
    versionHistory,
    saveVersionSnapshot,
    restoreVersion,
    // Filter-related
    filterOptions,
    selectedTeamId,
    setSelectedTeamId,
    selectedFunctionId,
    setSelectedFunctionId,
  } = usePeopleAnalysis();

  // Redirect if user doesn't have access
  if (!loading && !canAccess) {
    return <Navigate to="/" replace />;
  }

  const handleCreateAnalysis = async (
    name: string, 
    description: string, 
    values: { label: string }[]
  ) => {
    await createAnalysis(name, description, values);
  };

  if (loading) {
    return (
      <AppLayout title="Analisador de Pessoas">
        <div className="p-6 space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Analisador de Pessoas">
      <div className="p-6 space-y-6">
        <PageGamificationBanner journeyId="retencao" stepId="analisador" />
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            
            <AnalysisSelector
              analyses={analyses}
              selectedAnalysis={selectedAnalysis}
              onSelect={setSelectedAnalysis}
              onCreateNew={() => setShowCreateForm(true)}
            />
          </div>

          {selectedAnalysis && (
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={saveVersionSnapshot}
              >
                <Save className="h-4 w-4 mr-2" />
                Salvar Versão
              </Button>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir Análise
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir Análise?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação não pode ser desfeita. Todos os dados desta análise serão perdidos.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteAnalysis(selectedAnalysis.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>

        {/* Legend */}
        <AnalysisLegend />

        {/* Filters - Show only when there's an analysis selected */}
        {selectedAnalysis && (filterOptions.teams.length > 0 || filterOptions.functions.length > 0) && (
          <PeopleAnalysisFilters
            teams={filterOptions.teams}
            functions={filterOptions.functions}
            selectedTeamId={selectedTeamId}
            selectedFunctionId={selectedFunctionId}
            onTeamChange={setSelectedTeamId}
            onFunctionChange={setSelectedFunctionId}
            isLoading={loading}
          />
        )}

        {/* Main Content */}
        {analyses.length === 0 ? (
          <Card>
            <CardHeader className="text-center">
              <CardTitle>Nenhuma Análise Criada</CardTitle>
              <CardDescription>
                Crie sua primeira análise para avaliar o alinhamento cultural da equipe.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Button onClick={() => setShowCreateForm(true)}>
                Criar Primeira Análise
              </Button>
            </CardContent>
          </Card>
        ) : selectedAnalysis ? (
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{selectedAnalysis.name}</CardTitle>
                  {selectedAnalysis.description && (
                    <CardDescription>{selectedAnalysis.description}</CardDescription>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  {selectedAnalysis.values_snapshot?.length || 0} valores configurados
                  {filteredMembers.length > 0 && (
                    <span className="ml-2">• {filteredMembers.length} pessoas</span>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <PeopleTable
                analysis={selectedAnalysis}
                members={filteredMembers}
                getRating={getRating}
                setRating={setRating}
                getMemberTotal={getMemberTotal}
                onAddMember={addMember}
                onUpdateMember={updateMember}
                onDeleteMember={deleteMember}
              />
              
              <VersionHistoryPanel 
                versionHistory={versionHistory}
                onRestore={restoreVersion}
              />
            </CardContent>
          </Card>
        ) : null}

        {/* Create Form Modal */}
        <AnalysisForm
          open={showCreateForm}
          onOpenChange={setShowCreateForm}
          onSubmit={handleCreateAnalysis}
        />
      </div>
    </AppLayout>
  );
}
