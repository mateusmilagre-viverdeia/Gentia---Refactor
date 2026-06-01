import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Sparkles, TrendingUp, AlertTriangle, CheckCircle2, Filter, Building2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';

import { cn } from '@/lib/utils';
import type { RecommendationCategory, RecommendationStatus, SuggestedTool } from '@/types/recommendations.types';
import type { Json } from '@/integrations/supabase/types';
import { formatBRT } from "@/lib/datetime";

interface RecommendationWithCompany {
  id: string;
  account_id: string;
  title: string;
  category: RecommendationCategory;
  priority: 'high' | 'medium' | 'low';
  status: RecommendationStatus;
  created_at: string;
  companies: { id: string; name: string } | null;
}

const categoryInfo: Record<RecommendationCategory, { label: string; color: string }> = {
  health_improvement: { label: 'Saúde', color: 'text-green-600' },
  next_action: { label: 'Ação', color: 'text-blue-600' },
  risk_mitigation: { label: 'Risco', color: 'text-red-600' },
  quick_win: { label: 'Quick Win', color: 'text-yellow-600' },
  best_practice: { label: 'Prática', color: 'text-purple-600' },
};

const priorityInfo: Record<string, { label: string; color: string; bgColor: string }> = {
  high: { label: 'Alta', color: 'text-red-700', bgColor: 'bg-red-100' },
  medium: { label: 'Média', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  low: { label: 'Baixa', color: 'text-green-700', bgColor: 'bg-green-100' },
};

function parseSuggestedTools(tools: Json | null): SuggestedTool[] {
  if (!tools || !Array.isArray(tools)) return [];
  return tools
    .filter((t): t is Record<string, Json | undefined> => 
      typeof t === 'object' && t !== null && !Array.isArray(t)
    )
    .filter(t => 
      typeof t.id === 'string' && 
      typeof t.name === 'string' && 
      typeof t.route === 'string'
    )
    .map(t => ({
      id: t.id as string,
      name: t.name as string,
      route: t.route as string,
      pillar: typeof t.pillar === 'string' ? t.pillar : undefined,
      icon: typeof t.icon === 'string' ? t.icon : undefined,
    }));
}

export function HeadCSRecommendationsOverview() {
  const navigate = useNavigate();
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [categoryFilter, setCategoryFilter] = useState<RecommendationCategory | 'all'>('all');

  // Fetch all recommendations with company names
  const { data: recommendations = [], isLoading } = useQuery({
    queryKey: ['headcs-recommendations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_recommendations')
        .select(`
          id,
          account_id,
          title,
          category,
          priority,
          status,
          created_at,
          companies:account_id (id, name)
        `)
        .in('status', ['pending', 'accepted'])
        .order('priority', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as RecommendationWithCompany[];
    },
  });

  // Fetch aggregated metrics
  const { data: metrics } = useQuery({
    queryKey: ['headcs-recommendation-metrics'],
    queryFn: async () => {
      const { data: allRecs, error } = await supabase
        .from('project_recommendations')
        .select('status, priority');

      if (error) throw error;

      const total = allRecs?.length || 0;
      const pending = allRecs?.filter(r => r.status === 'pending').length || 0;
      const accepted = allRecs?.filter(r => r.status === 'accepted').length || 0;
      const completed = allRecs?.filter(r => r.status === 'completed').length || 0;
      const dismissed = allRecs?.filter(r => r.status === 'dismissed').length || 0;
      const highPriority = allRecs?.filter(r => r.priority === 'high' && r.status === 'pending').length || 0;

      const acceptanceRate = total > 0 
        ? Math.round(((accepted + completed) / (accepted + completed + dismissed)) * 100) || 0
        : 0;

      return {
        total,
        pending,
        accepted,
        completed,
        highPriority,
        acceptanceRate,
      };
    },
  });

  // Filter recommendations
  const filteredRecommendations = recommendations.filter(rec => {
    if (priorityFilter !== 'all' && rec.priority !== priorityFilter) return false;
    if (categoryFilter !== 'all' && rec.category !== categoryFilter) return false;
    return true;
  });

  // Count unique projects
  const uniqueProjects = new Set(recommendations.map(r => r.account_id)).size;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Pendentes
            </CardDescription>
            <CardTitle className="text-3xl">{metrics?.pending || 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              em {uniqueProjects} projetos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Alta Prioridade
            </CardDescription>
            <CardTitle className="text-3xl text-red-600">{metrics?.highPriority || 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              requerem atenção imediata
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Taxa de Aceitação
            </CardDescription>
            <CardTitle className="text-3xl">{metrics?.acceptanceRate || 0}%</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              aceitas vs descartadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-blue-500" />
              Concluídas
            </CardDescription>
            <CardTitle className="text-3xl">{metrics?.completed || 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              implementadas com sucesso
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Recomendações AI - Todos os Projetos
              </CardTitle>
              <CardDescription>
                Visão consolidada das recomendações pendentes e em andamento
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select 
                value={priorityFilter} 
                onValueChange={(v) => setPriorityFilter(v as typeof priorityFilter)}
              >
                <SelectTrigger className="w-[140px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Prioridade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="low">Baixa</SelectItem>
                </SelectContent>
              </Select>

              <Select 
                value={categoryFilter} 
                onValueChange={(v) => setCategoryFilter(v as RecommendationCategory | 'all')}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Categorias</SelectItem>
                  <SelectItem value="health_improvement">Saúde</SelectItem>
                  <SelectItem value="next_action">Próxima Ação</SelectItem>
                  <SelectItem value="risk_mitigation">Risco</SelectItem>
                  <SelectItem value="quick_win">Quick Win</SelectItem>
                  <SelectItem value="best_practice">Melhor Prática</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredRecommendations.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="font-medium">Nenhuma recomendação encontrada</p>
              <p className="text-sm mt-1">
                Ajuste os filtros ou aguarde novas recomendações serem geradas.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecommendations.map((rec) => {
                  const catInfo = categoryInfo[rec.category];
                  const priInfo = priorityInfo[rec.priority];

                  return (
                    <TableRow key={rec.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{rec.companies?.name || 'Projeto'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[250px] truncate">
                        {rec.title}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("text-xs", catInfo.color)}>
                          {catInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("text-xs", priInfo.color, priInfo.bgColor)}>
                          {priInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={rec.status === 'accepted' ? 'default' : 'secondary'}>
                          {rec.status === 'pending' ? 'Pendente' : 'Em Andamento'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatBRT(new Date(rec.created_at), "dd/MM/yy")}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/consultor/projeto/${rec.account_id}`)}
                        >
                          Ver Projeto
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
