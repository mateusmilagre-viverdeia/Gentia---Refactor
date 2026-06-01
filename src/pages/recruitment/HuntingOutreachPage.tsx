import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { RecruitmentLayout } from "@/components/layout/RecruitmentLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, MessageCircle, Target, Kanban, Database, Sparkles, PanelLeftClose, PanelLeftOpen, RefreshCw, Loader2, Upload } from "lucide-react";
import { JobICPEditor } from "@/components/recruitment/hunting/JobICPEditor";
import { HuntingMultiJobDashboard } from "@/components/recruitment/hunting/HuntingMultiJobDashboard";
import { HuntingPipelineKanban } from "@/components/recruitment/hunting/HuntingPipelineKanban";
import { HuntingTalentPool } from "@/components/recruitment/hunting/HuntingTalentPool";
import { HuntingNotifications } from "@/components/recruitment/hunting/HuntingNotifications";
import { TalentBankMetrics } from "@/components/recruitment/hunting/TalentBankMetrics";
import { CrossMatchSuggestions } from "@/components/recruitment/hunting/CrossMatchSuggestions";
import { HuntingQAChecklistCard } from "@/components/recruitment/hunting/HuntingQAChecklistCard";
import { CrossMatchTab } from "@/components/recruitment/crossmatch/CrossMatchTab";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { formatBRTRelative } from "@/lib/datetime";

// Hunting imports
import { useHuntingSearch } from "@/hooks/useHuntingSearch";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import {
  HuntingSearchDialog,
  HuntingResultsList,
  HuntingSearchCard,
  AutonomousSearchDialog,
} from "@/components/recruitment/hunting";
import { EvabootCsvImport } from "@/components/recruitment/hunting/EvabootCsvImport";
import type { ExistingSearchData } from "@/components/recruitment/hunting/HuntingSearchDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Users,
  CheckCircle2,
  TrendingUp,
  Play,
  Pause,
  BarChart3,
  Send,
  Clock,
  AlertCircle,
  Zap,
  Bot,
} from "lucide-react";

// Outreach imports
import { useOutreachCampaigns, OutreachCampaign } from "@/hooks/useOutreachCampaigns";
import { OutreachCampaignWizard } from "@/components/recruitment/outreach/OutreachCampaignWizard";
import { OutreachCampaignDashboard } from "@/components/recruitment/outreach/OutreachCampaignDashboard";


const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ComponentType<{ className?: string }> }> = {
  draft: { label: "Rascunho", variant: "outline", icon: Clock },
  scheduled: { label: "Agendada", variant: "secondary", icon: Clock },
  running: { label: "Em Execução", variant: "default", icon: Play },
  paused: { label: "Pausada", variant: "secondary", icon: Pause },
  completed: { label: "Concluída", variant: "default", icon: CheckCircle2 },
  cancelled: { label: "Cancelada", variant: "destructive", icon: AlertCircle },
};

// Hunting Tab Content
function HuntingContent() {
  const { currentOrganization } = useOrganization();
  const {
    isLoading,
    searches,
    results,
    smartSearchProgress,
    fetchSearches,
    fetchResults,
    createSearch,
    smartSearch,
    stopSmartSearch,
    scrapeProfile,
    importResults,
    discardResults,
    deleteSearch,
    rerunSearch,
    searchMore,
    refineSearch,
    cancelSearch,
  } = useHuntingSearch();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAutonomousOpen, setIsAutonomousOpen] = useState(false);
  const [isEvabootImportOpen, setIsEvabootImportOpen] = useState(false);
  const [selectedSearchId, setSelectedSearchId] = useState<string | null>(null);
  const [isSearchPanelOpen, setIsSearchPanelOpen] = useState(true);
  const [refineData, setRefineData] = useState<ExistingSearchData | undefined>(undefined);

  const { data: jobs = [] } = useQuery({
    queryKey: ["recruitment-jobs-hunting", currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return [];
      const { data } = await supabase
        .from("recruitment_jobs")
        .select(`
          id, 
          title, 
          location,
          job_description_id,
          job_descriptions (
            required_skills,
            desired_skills
          )
        `)
        .eq("account_id", currentOrganization.id)
        .in("status", ["active", "published"])
        .order("title");
      return data || [];
    },
    enabled: !!currentOrganization?.id,
  });

  useEffect(() => {
    fetchSearches();
  }, [fetchSearches]);

  useEffect(() => {
    if (selectedSearchId) {
      fetchResults(selectedSearchId);
    }
  }, [selectedSearchId, fetchResults]);

  useEffect(() => {
    if (!selectedSearchId && searches.length > 0) {
      setSelectedSearchId(searches[0].id);
    }
  }, [searches, selectedSearchId]);

  const handleSearch = async (params: Parameters<typeof createSearch>[0] & { existingSearchId?: string; desiredCount?: number; minScore?: number }) => {
    if (params.existingSearchId) {
      await refineSearch(params.existingSearchId, params);
      return;
    }
    // Use smart search by default
    if (params.desiredCount && params.minScore) {
      const result = await smartSearch({ ...params });
      if (result?.search_id) {
        setSelectedSearchId(result.search_id);
      }
      return;
    }
    const result = await createSearch(params);
    if (result?.search_id) {
      setSelectedSearchId(result.search_id);
    }
  };

  const handleRefineSearch = () => {
    if (!selectedSearch) return;
    const filters = (selectedSearch.filters || {}) as any;
    setRefineData({
      id: selectedSearch.id,
      query: selectedSearch.query,
      sources: selectedSearch.sources,
      jobId: selectedSearch.job_id || undefined,
      maxResults: (selectedSearch as any).desired_count || selectedSearch.results_count || 10,
      desiredCount: (selectedSearch as any).desired_count,
      minScore: (selectedSearch as any).min_score,
      filters: {
        location: filters.location,
        seniority: filters.seniority,
        skills: filters.skills,
        niceToHaveSkills: filters.niceToHaveSkills,
        targetCompanies: filters.targetCompanies,
        negativeKeywords: filters.negativeKeywords,
        experienceMin: filters.experienceMin,
        experienceMax: filters.experienceMax,
        industry: filters.industry,
      },
    });
    setIsDialogOpen(true);
  };

  const totalSearches = searches.length;
  const totalResults = searches.reduce((acc, s) => acc + s.results_count, 0);
  const importedCount = results.filter((r) => r.status === "imported").length;

  const selectedSearch = searches.find((s) => s.id === selectedSearchId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Search className="h-5 w-5" />
            Hunting de Candidatos
          </h2>
          <p className="text-muted-foreground">
            Busque candidatos proativamente em LinkedIn, GitHub e portfólios públicos
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsAutonomousOpen(true)}>
            <Bot className="h-4 w-4 mr-2" />
            Busca Autônoma
          </Button>
          <Button variant="outline" onClick={() => setIsEvabootImportOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Importar Evaboot
          </Button>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Busca
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Search className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalSearches}</p>
                <p className="text-xs text-muted-foreground">Buscas realizadas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalResults}</p>
                <p className="text-xs text-muted-foreground">Perfis encontrados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{importedCount}</p>
                <p className="text-xs text-muted-foreground">Importados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {totalResults > 0 ? Math.round((importedCount / totalResults) * 100) : 0}%
                </p>
                <p className="text-xs text-muted-foreground">Taxa conversão</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4">
        {/* Collapsible search panel */}
        <div className={`shrink-0 transition-all duration-300 ease-in-out ${isSearchPanelOpen ? 'w-72' : 'w-10'}`}>
          {isSearchPanelOpen ? (
            <Card className="h-[560px] flex flex-col">
              <CardHeader className="pb-2 px-3 pt-3 flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-semibold">Buscas</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setIsSearchPanelOpen(false)}
                  title="Recolher painel"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="px-2 pb-2 flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                  {searches.length === 0 ? (
                    <div className="text-center py-6 px-2">
                      <Search className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                      <p className="text-xs text-muted-foreground">
                        Nenhuma busca ainda
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2 text-xs h-7"
                        onClick={() => setIsDialogOpen(true)}
                      >
                        Primeira busca
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-1.5 pr-2">
                      {searches.map((search) => (
                        <HuntingSearchCard
                          key={search.id}
                          search={search}
                          onSelect={setSelectedSearchId}
                          isSelected={selectedSearchId === search.id}
                          onDelete={async (id) => {
                            const ok = await deleteSearch(id);
                            if (ok && selectedSearchId === id) {
                              setSelectedSearchId(searches.find(s => s.id !== id)?.id || null);
                            }
                            return ok;
                          }}
                          onRerun={async (id) => {
                            const result = await rerunSearch(id);
                            if (result?.search_id) setSelectedSearchId(result.search_id);
                            return result;
                          }}
                          onSearchMore={searchMore}
                          onCancel={cancelSearch}
                        />
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          ) : (
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10"
              onClick={() => setIsSearchPanelOpen(true)}
              title="Expandir buscas"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Results panel - fills remaining space */}
        <div className="flex-1 min-w-0">
          {selectedSearch ? (
            <Tabs defaultValue="pending">
              {/* Smart search stepper progress */}
              {smartSearchProgress?.isRunning && smartSearchProgress.searchId === selectedSearchId && (
                <div className="mb-4 p-4 rounded-lg border border-primary/30 bg-primary/5 space-y-3">
                  {/* Stepper */}
                  <div className="flex items-center gap-1">
                    {[
                      { label: 'Buscando', active: true },
                      { label: 'Enriquecendo', active: smartSearchProgress.qualifiedCount > 0 },
                      { label: 'Pontuando', active: smartSearchProgress.qualifiedCount > 0 },
                      { label: 'Concluído', active: false },
                    ].map((step, i) => (
                      <div key={step.label} className="flex items-center gap-1 flex-1">
                        <div className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap ${
                          step.active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                        }`}>
                          {step.active && i < 3 ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : step.active ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : null}
                          {step.label}
                        </div>
                        {i < 3 && <div className={`flex-1 h-0.5 ${step.active ? 'bg-primary' : 'bg-muted'}`} />}
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <span className="text-sm font-medium">
                        {smartSearchProgress.qualifiedCount}/{smartSearchProgress.desiredCount} qualificados
                      </span>
                      {(selectedSearch as any)?.evaboot_status === 'running' && (
                        <Badge variant="outline" className="text-xs gap-1">
                          <Zap className="h-3 w-3" />
                          Evaboot ativo
                        </Badge>
                      )}
                    </div>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={stopSmartSearch}>
                      Parar busca
                    </Button>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (smartSearchProgress.qualifiedCount / smartSearchProgress.desiredCount) * 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {smartSearchProgress && !smartSearchProgress.isRunning && smartSearchProgress.searchId === selectedSearchId && smartSearchProgress.qualifiedCount > 0 && (
                <div className="mb-4 p-3 rounded-lg border border-green-500/30 bg-green-500/5">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-700 dark:text-green-400">
                      {smartSearchProgress.qualifiedCount}/{smartSearchProgress.desiredCount} candidatos qualificados encontrados ✓
                    </span>
                    {(selectedSearch as any)?.evaboot_status === 'completed' && (
                      <Badge variant="outline" className="text-xs text-green-600">
                        + Evaboot
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div>
                    <h3 className="text-lg font-semibold">{selectedSearch.query}</h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedSearch.results_count} resultados encontrados
                      {(selectedSearch as any).qualified_count > 0 && ` · ${(selectedSearch as any).qualified_count} qualificados`}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleRefineSearch}>
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                    Refinar Busca
                  </Button>
                </div>
                <TabsList>
                  <TabsTrigger value="pending">
                    Pendentes ({results.filter((r) => r.status === "pending" || r.status === "reviewed").length})
                  </TabsTrigger>
                  <TabsTrigger value="imported">
                    Importados ({results.filter((r) => r.status === "imported").length})
                  </TabsTrigger>
                  <TabsTrigger value="discarded">
                    Descartados ({results.filter((r) => r.status === "discarded").length})
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="pending" className="mt-0">
                <HuntingResultsList
                  results={results.filter((r) => r.status === "pending" || r.status === "reviewed")}
                  accountId={currentOrganization?.id || ''}
                  onScrapeProfile={scrapeProfile}
                  onImportSelected={(ids) => importResults(ids, selectedSearch.job_id || undefined)}
                  onDiscardSelected={discardResults}
                  isLoading={isLoading}
                />
              </TabsContent>

              <TabsContent value="imported" className="mt-0">
                <HuntingResultsList
                  results={results.filter((r) => r.status === "imported")}
                  accountId={currentOrganization?.id || ''}
                  onScrapeProfile={scrapeProfile}
                  onImportSelected={(ids) => importResults(ids)}
                  onDiscardSelected={discardResults}
                  isLoading={isLoading}
                />
              </TabsContent>

              <TabsContent value="discarded" className="mt-0">
                <HuntingResultsList
                  results={results.filter((r) => r.status === "discarded")}
                  accountId={currentOrganization?.id || ''}
                  onScrapeProfile={scrapeProfile}
                  onImportSelected={(ids) => importResults(ids)}
                  onDiscardSelected={discardResults}
                  isLoading={isLoading}
                />
              </TabsContent>
            </Tabs>
          ) : (
            <Card>
              <CardContent className="py-16 text-center">
                <Search className="h-12 w-12 mx-auto text-muted-foreground/20 mb-3" />
                <h3 className="text-base font-medium mb-1">Selecione uma busca</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {searches.length > 0 
                    ? "Clique em uma busca no painel ao lado para ver os resultados"
                    : "Crie sua primeira busca para começar a encontrar candidatos"
                  }
                </p>
                <Button onClick={() => setIsDialogOpen(true)} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Busca
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <HuntingSearchDialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setRefineData(undefined);
        }}
        onSearch={handleSearch}
        jobs={jobs}
        isLoading={isLoading}
        existingSearch={refineData}
      />

      <AutonomousSearchDialog
        open={isAutonomousOpen}
        onOpenChange={setIsAutonomousOpen}
        jobs={jobs}
        onSearchComplete={(searchId) => {
          setSelectedSearchId(searchId);
          fetchSearches();
          fetchResults(searchId);
        }}
      />

      <EvabootCsvImport
        open={isEvabootImportOpen}
        onOpenChange={setIsEvabootImportOpen}
        searches={searches}
        jobs={jobs}
        onImportComplete={() => {
          fetchSearches();
          if (selectedSearchId) fetchResults(selectedSearchId);
        }}
      />
    </div>
  );
}

// Outreach Tab Content
function OutreachContent() {
  const { campaigns, isLoading, startCampaign, pauseCampaign, resumeCampaign } = useOutreachCampaigns();
  const [showWizard, setShowWizard] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<OutreachCampaign | null>(null);
  const [activeTab, setActiveTab] = useState("all");

  const filteredCampaigns = campaigns.filter(c => {
    if (activeTab === "all") return true;
    if (activeTab === "active") return c.status === "running" || c.status === "scheduled";
    if (activeTab === "draft") return c.status === "draft";
    if (activeTab === "completed") return c.status === "completed" || c.status === "cancelled";
    return true;
  });

  const stats = {
    total: campaigns.length,
    active: campaigns.filter(c => c.status === "running").length,
    totalSent: campaigns.reduce((acc, c) => acc + c.contacts_sent, 0),
    totalResponses: campaigns.reduce((acc, c) => acc + c.responses_received, 0),
    totalInterested: campaigns.reduce((acc, c) => acc + c.interested_count, 0),
  };

  const responseRate = stats.totalSent > 0 ? ((stats.totalResponses / stats.totalSent) * 100).toFixed(1) : "0";

  if (selectedCampaign) {
    return (
      <OutreachCampaignDashboard 
        campaign={selectedCampaign} 
        onBack={() => setSelectedCampaign(null)} 
      />
    );
  }

  if (showWizard) {
    return <OutreachCampaignWizard onClose={() => setShowWizard(false)} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Outreach IA
          </h2>
          <p className="text-muted-foreground">
            Campanhas automatizadas de prospecção via WhatsApp com IA
          </p>
        </div>
        <Button onClick={() => setShowWizard(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Campanha
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-2xl font-bold">{stats.active}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Campanhas Ativas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Send className="h-4 w-4 text-blue-500" />
              <span className="text-2xl font-bold">{stats.totalSent}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Mensagens Enviadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-green-500" />
              <span className="text-2xl font-bold">{stats.totalResponses}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Respostas Recebidas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-orange-500" />
              <span className="text-2xl font-bold">{responseRate}%</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Taxa de Resposta</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span className="text-2xl font-bold">{stats.totalInterested}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Interessados</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">Todas ({campaigns.length})</TabsTrigger>
          <TabsTrigger value="active">Ativas ({campaigns.filter(c => c.status === "running" || c.status === "scheduled").length})</TabsTrigger>
          <TabsTrigger value="draft">Rascunhos ({campaigns.filter(c => c.status === "draft").length})</TabsTrigger>
          <TabsTrigger value="completed">Finalizadas ({campaigns.filter(c => c.status === "completed" || c.status === "cancelled").length})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              Carregando campanhas...
            </div>
          ) : filteredCampaigns.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhuma campanha encontrada</h3>
                <p className="text-muted-foreground mb-4">
                  Crie sua primeira campanha de outreach para começar a prospectar candidatos.
                </p>
                <Button onClick={() => setShowWizard(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Campanha
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredCampaigns.map((campaign) => {
                const status = statusConfig[campaign.status] || statusConfig.draft;
                const StatusIcon = status.icon;
                
                return (
                  <Card 
                    key={campaign.id} 
                    className="cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => setSelectedCampaign(campaign)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold">{campaign.name}</h3>
                            <Badge variant={status.variant} className="gap-1">
                              <StatusIcon className="h-3 w-3" />
                              {status.label}
                            </Badge>
                          </div>
                          {campaign.description && (
                            <p className="text-sm text-muted-foreground mb-2 line-clamp-1">
                              {campaign.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            {campaign.recruitment_jobs && (
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {campaign.recruitment_jobs.title}
                              </span>
                            )}
                            <span>
                              Criada {formatBRTRelative(new Date(campaign.created_at))}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-6 text-sm">
                          <div className="text-center">
                            <div className="font-semibold">{campaign.contacts_sent}</div>
                            <div className="text-xs text-muted-foreground">Enviadas</div>
                          </div>
                          <div className="text-center">
                            <div className="font-semibold">{campaign.responses_received}</div>
                            <div className="text-xs text-muted-foreground">Respostas</div>
                          </div>
                          <div className="text-center">
                            <div className="font-semibold text-emerald-600">{campaign.interested_count}</div>
                            <div className="text-xs text-muted-foreground">Interessados</div>
                          </div>
                          
                          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                            {campaign.status === "draft" && (
                              <Button 
                                size="sm" 
                                onClick={() => startCampaign(campaign.id)}
                              >
                                <Play className="h-4 w-4 mr-1" />
                                Iniciar
                              </Button>
                            )}
                            {campaign.status === "running" && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => pauseCampaign(campaign.id)}
                              >
                                <Pause className="h-4 w-4 mr-1" />
                                Pausar
                              </Button>
                            )}
                            {campaign.status === "paused" && (
                              <Button 
                                size="sm"
                                onClick={() => resumeCampaign(campaign.id)}
                              >
                                <Play className="h-4 w-4 mr-1" />
                                Retomar
                              </Button>
                            )}
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => setSelectedCampaign(campaign)}
                            >
                              <BarChart3 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function HuntingOutreachPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabParam || "hunting");
  const [icpJobId, setIcpJobId] = useState<string | null>(null);

  useEffect(() => {
    if (tabParam && ["hunting", "outreach", "icp", "dashboard", "pipeline", "talent-pool", "talent-bank"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  // Fetch jobs for ICP selector
  const { currentOrganization: orgForIcp } = useOrganization();
  const { data: icpJobs = [] } = useQuery({
    queryKey: ["recruitment-jobs-icp", orgForIcp?.id],
    queryFn: async () => {
      if (!orgForIcp?.id) return [];
      const { data } = await supabase
        .from("recruitment_jobs")
        .select("id, title")
        .eq("account_id", orgForIcp.id)
        .in("status", ["active", "published", "draft"])
        .order("title");
      return data || [];
    },
    enabled: !!orgForIcp?.id && activeTab === "icp",
  });

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams({ tab: value });
  };

  return (
    <RecruitmentLayout>
      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Search className="h-6 w-6" />
                Hunting & Outreach
              </h1>
              <p className="text-muted-foreground">
                Busca ativa e campanhas de prospecção de candidatos
              </p>
            </div>
            <HuntingNotifications />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList>
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="hunting" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Hunting
            </TabsTrigger>
            <TabsTrigger value="outreach" className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Outreach
            </TabsTrigger>
            <TabsTrigger value="icp" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              ICP
            </TabsTrigger>
            <TabsTrigger value="pipeline" className="flex items-center gap-2">
              <Kanban className="h-4 w-4" />
              Pipeline
            </TabsTrigger>
            <TabsTrigger value="talent-pool" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Talent Pool
            </TabsTrigger>
            <TabsTrigger value="talent-bank" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Banco de Talentos
            </TabsTrigger>
            <TabsTrigger value="cross-match" className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Cross-match
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-6">
            {orgForIcp?.id && <HuntingMultiJobDashboard accountId={orgForIcp.id} />}
          </TabsContent>

          <TabsContent value="hunting" className="mt-6 space-y-6">
            <HuntingQAChecklistCard />
            <HuntingContent />
          </TabsContent>

          <TabsContent value="outreach" className="mt-6">
            <OutreachContent />
          </TabsContent>

          <TabsContent value="icp" className="mt-6">
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  ICP - Perfil Ideal do Candidato
                </h2>
                <p className="text-muted-foreground">
                  Perfil gerado por IA que evolui com base nos candidatos aprovados
                </p>
              </div>

              {/* Job Selector */}
              <div className="max-w-sm">
                <Label className="text-sm font-medium">Selecione a vaga</Label>
                <Select
                  value={icpJobId || ''}
                  onValueChange={(v) => setIcpJobId(v)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Escolha uma vaga..." />
                  </SelectTrigger>
                  <SelectContent>
                    {icpJobs.map((j: any) => (
                      <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {icpJobId ? (
                <JobICPEditor 
                  jobId={icpJobId} 
                  jobTitle={icpJobs.find((j: any) => j.id === icpJobId)?.title}
                />
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Target className="h-12 w-12 mx-auto text-muted-foreground/20 mb-4" />
                    <h3 className="text-lg font-medium mb-2">Selecione uma vaga</h3>
                    <p className="text-muted-foreground">
                      Escolha uma vaga acima para visualizar ou gerar seu ICP
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="pipeline" className="mt-6">
            {orgForIcp?.id && <HuntingPipelineKanban accountId={orgForIcp.id} />}
          </TabsContent>

          <TabsContent value="talent-pool" className="mt-6">
            {orgForIcp?.id && <HuntingTalentPool accountId={orgForIcp.id} />}
          </TabsContent>

          <TabsContent value="talent-bank" className="mt-6">
            {orgForIcp?.id && (
              <div className="space-y-6">
                <CrossMatchSuggestions accountId={orgForIcp.id} />
                <TalentBankMetrics accountId={orgForIcp.id} />
              </div>
            )}
          </TabsContent>

          <TabsContent value="cross-match" className="mt-6">
            {orgForIcp?.id && <CrossMatchTab accountId={orgForIcp.id} />}
          </TabsContent>
        </Tabs>
      </div>
    </RecruitmentLayout>
  );
}
