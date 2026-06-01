import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, Store, Users, Unlock, TrendingUp } from "lucide-react";
import { 
  useMarketplaceSearch, 
  useMarketplaceUnlock,
  type MarketplaceFilters as FiltersType,
  type RevealedData
} from "@/hooks/useMarketplace";
import { useCredits } from "@/hooks/useCredits";
import { 
  MarketplaceCandidateCard, 
  MarketplaceFilters,
  MyUnlocksTab 
} from "@/components/recruitment/marketplace";

export default function TalentPoolPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("search");
  const [filters, setFilters] = useState<FiltersType>({ limit: 20, offset: 0 });
  const [revealedDataMap, setRevealedDataMap] = useState<Record<string, RevealedData>>({});

  const { data: searchResults, isLoading: isSearching } = useMarketplaceSearch(filters);
  const unlock = useMarketplaceUnlock();
  const { getBalance } = useCredits();

  const marketplaceBalance = getBalance("marketplace");

  const handleUnlock = async (poolId: string) => {
    const result = await unlock.mutateAsync(poolId);
    if (result.revealed_data) {
      setRevealedDataMap(prev => ({
        ...prev,
        [poolId]: result.revealed_data
      }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("/atracao-contratacao/recrutamento")}
        className="mb-2"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Store className="h-6 w-6 text-primary" />
            Talent Pool
          </h1>
          <p className="text-muted-foreground mt-1">
            Candidatos pré-qualificados de outras empresas disponíveis para contato
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Saldo Marketplace</p>
          <p className="text-2xl font-bold text-primary">{marketplaceBalance}</p>
          <p className="text-xs text-muted-foreground">créditos</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{searchResults?.total || 0}</p>
                <p className="text-sm text-muted-foreground">Candidatos disponíveis</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
                <Unlock className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">8</p>
                <p className="text-sm text-muted-foreground">Créditos por desbloqueio</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/30">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">Fit Cultural</p>
                <p className="text-sm text-muted-foreground">Candidatos já avaliados</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="search">Buscar Candidatos</TabsTrigger>
          <TabsTrigger value="unlocked">Meus Desbloqueados</TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Filters Sidebar */}
            <div className="lg:col-span-1">
              <Card>
                <CardContent className="pt-6">
                  <MarketplaceFilters 
                    filters={filters} 
                    onFiltersChange={setFilters} 
                  />
                </CardContent>
              </Card>
            </div>

            {/* Results */}
            <div className="lg:col-span-3">
              {isSearching ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : searchResults?.candidates && searchResults.candidates.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Mostrando {searchResults.candidates.length} de {searchResults.total} candidatos
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {searchResults.candidates.map((candidate) => (
                      <MarketplaceCandidateCard
                        key={candidate.id}
                        candidate={candidate}
                        onUnlock={handleUnlock}
                        isUnlocking={unlock.isPending}
                        revealedData={revealedDataMap[candidate.id]}
                        creditCost={8}
                      />
                    ))}
                  </div>

                  {/* Pagination */}
                  {searchResults.total > (filters.limit || 20) && (
                    <div className="flex items-center justify-center gap-2 pt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!filters.offset || filters.offset === 0}
                        onClick={() => setFilters(prev => ({
                          ...prev,
                          offset: Math.max(0, (prev.offset || 0) - (prev.limit || 20))
                        }))}
                      >
                        Anterior
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        Página {Math.floor((filters.offset || 0) / (filters.limit || 20)) + 1} de{" "}
                        {Math.ceil(searchResults.total / (filters.limit || 20))}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={(filters.offset || 0) + (filters.limit || 20) >= searchResults.total}
                        onClick={() => setFilters(prev => ({
                          ...prev,
                          offset: (prev.offset || 0) + (prev.limit || 20)
                        }))}
                      >
                        Próxima
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-12">
                    <div className="text-center text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium mb-2">Nenhum candidato encontrado</p>
                      <p className="text-sm">
                        Ajuste os filtros para encontrar candidatos que combinam com sua empresa.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="unlocked" className="mt-6">
          <MyUnlocksTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
