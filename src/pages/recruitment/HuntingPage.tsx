import { useEffect, useState } from 'react';
import { useHuntingSearch } from '@/hooks/useHuntingSearch';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import {
  HuntingSearchDialog,
  HuntingResultsList,
  HuntingSearchCard,
  HuntingProfileUrlAnalyzer,
} from '@/components/recruitment/hunting';
import type { ExistingSearchData } from '@/components/recruitment/hunting/HuntingSearchDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Search,
  Plus,
  Users,
  CheckCircle2,
  XCircle,
  TrendingUp,
  RefreshCw,
} from 'lucide-react';

export default function HuntingPage() {
  const { currentOrganization } = useOrganization();
  const {
    isLoading,
    searches,
    results,
    fetchSearches,
    fetchResults,
    createSearch,
    scrapeProfile,
    importResults,
    discardResults,
    refineSearch,
  } = useHuntingSearch();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSearchId, setSelectedSearchId] = useState<string | null>(null);
  const [refineData, setRefineData] = useState<ExistingSearchData | undefined>(undefined);

  // Fetch jobs for the search dialog
  const { data: jobs = [] } = useQuery({
    queryKey: ['recruitment-jobs-simple', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return [];
      const { data } = await supabase
        .from('recruitment_jobs')
        .select('id, title')
        .eq('account_id', currentOrganization.id)
        .eq('status', 'published')
        .order('title');
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

  // Auto-select first search if none selected
  useEffect(() => {
    if (!selectedSearchId && searches.length > 0) {
      setSelectedSearchId(searches[0].id);
    }
  }, [searches, selectedSearchId]);

  const handleSearch = async (params: Parameters<typeof createSearch>[0] & { existingSearchId?: string }) => {
    if (params.existingSearchId) {
      await refineSearch(params.existingSearchId, params);
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

  // Stats
  const totalSearches = searches.length;
  const totalResults = searches.reduce((acc, s) => acc + s.results_count, 0);
  const importedCount = results.filter((r) => r.status === 'imported').length;
  const discardedCount = results.filter((r) => r.status === 'discarded').length;

  const selectedSearch = searches.find((s) => s.id === selectedSearchId);

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Search className="h-6 w-6" />
            Hunting de Candidatos
          </h1>
          <p className="text-muted-foreground mt-1">
            Busque candidatos proativamente em LinkedIn, GitHub e portfólios públicos
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Busca
        </Button>
      </div>


      {/* Quick URL profile analyzer */}
      <HuntingProfileUrlAnalyzer jobs={jobs} />

      {/* Stats */}
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

      {/* Main Content */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Searches List */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Buscas</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              {searches.length === 0 ? (
                <div className="text-center py-8">
                  <Search className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Nenhuma busca realizada ainda
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => setIsDialogOpen(true)}
                  >
                    Fazer primeira busca
                  </Button>
                </div>
              ) : (
                <div className="space-y-2 pr-4">
                  {searches.map((search) => (
                    <HuntingSearchCard
                      key={search.id}
                      search={search}
                      onSelect={setSelectedSearchId}
                      isSelected={selectedSearchId === search.id}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="lg:col-span-2">
          {selectedSearch ? (
            <Tabs defaultValue="pending">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">{selectedSearch.query}</h2>
                    <p className="text-sm text-muted-foreground">
                      {selectedSearch.results_count} resultados encontrados
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleRefineSearch}>
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                    Refinar Busca
                  </Button>
                </div>
                <TabsList>
                  <TabsTrigger value="pending">
                    Pendentes ({results.filter((r) => r.status === 'pending' || r.status === 'reviewed').length})
                  </TabsTrigger>
                  <TabsTrigger value="imported">
                    Importados ({results.filter((r) => r.status === 'imported').length})
                  </TabsTrigger>
                  <TabsTrigger value="discarded">
                    Descartados ({results.filter((r) => r.status === 'discarded').length})
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="pending" className="mt-0">
                <HuntingResultsList
                  results={results.filter((r) => r.status === 'pending' || r.status === 'reviewed')}
                  accountId={currentOrganization?.id || ''}
                  onScrapeProfile={scrapeProfile}
                  onImportSelected={(ids) => importResults(ids, selectedSearch.job_id || undefined)}
                  onDiscardSelected={discardResults}
                  isLoading={isLoading}
                />
              </TabsContent>

              <TabsContent value="imported" className="mt-0">
                <HuntingResultsList
                  results={results.filter((r) => r.status === 'imported')}
                  accountId={currentOrganization?.id || ''}
                  onScrapeProfile={scrapeProfile}
                  onImportSelected={(ids) => importResults(ids)}
                  onDiscardSelected={discardResults}
                  isLoading={isLoading}
                />
              </TabsContent>

              <TabsContent value="discarded" className="mt-0">
                <HuntingResultsList
                  results={results.filter((r) => r.status === 'discarded')}
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
                <Search className="h-16 w-16 mx-auto text-muted-foreground/20 mb-4" />
                <h3 className="text-lg font-medium mb-2">Selecione uma busca</h3>
                <p className="text-muted-foreground mb-4">
                  Clique em uma busca na lista à esquerda para ver os resultados
                </p>
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Busca
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Search Dialog */}
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
    </div>
  );
}
