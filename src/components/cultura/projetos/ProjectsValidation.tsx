import { useState, useCallback } from 'react';
import { useProjects } from '@/contexts/ProjectsContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useIndicatorsSession } from '@/hooks/useIndicatorsSession';
import { supabase } from '@/integrations/supabase/client';
import { PERSPECTIVES } from '@/types/projects.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ProjectsProgress } from './ProjectsProgress';
import { ChevronLeft, ChevronRight, Sparkles, RefreshCw, Check, X, Replace, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface ProjectAnalysis {
  project_name: string;
  classification: 'estrategico' | 'tatico' | 'operacional' | 'acao_pontual';
  justification: string;
  suggested_name: string;
  name_concept: string;
  alignment_score: number;
  replacement_suggestion?: {
    name: string;
    description: string;
    perspective: string;
  } | null;
}

const CLASSIFICATION_LABELS: Record<string, { label: string; variant: 'success' | 'warning' | 'destructive' | 'secondary' }> = {
  estrategico: { label: 'Estratégico', variant: 'success' },
  tatico: { label: 'Tático', variant: 'warning' },
  operacional: { label: 'Operacional', variant: 'destructive' },
  acao_pontual: { label: 'Ação Pontual', variant: 'destructive' },
};

export function ProjectsValidation() {
  const { projects, setStage, updateProject, deleteProject, addProject, segment, saving } = useProjects();
  const { currentAccount } = useOrganization();
  const { user } = useAuth();
  const { getAllSelectedIndicators } = useIndicatorsSession();

  const [analyses, setAnalyses] = useState<ProjectAnalysis[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [acceptedNames, setAcceptedNames] = useState<Set<string>>(new Set());
  const [replacedProjects, setReplacedProjects] = useState<Set<string>>(new Set());

  const runValidation = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Fetch company vision
      let vision = '';
      if (currentAccount?.id) {
        const { data: company } = await supabase
          .from('companies')
          .select('current_vision')
          .eq('id', currentAccount.id)
          .maybeSingle();
        vision = company?.current_vision || '';
      }

      const indicators = getAllSelectedIndicators();

      const { data: session } = await supabase.auth.getSession();
      if (!session?.session) {
        toast.error('Você precisa estar logado para usar esta funcionalidade.');
        return;
      }

      const { data, error } = await supabase.functions.invoke('validate-strategic-projects', {
        body: {
          projects: projects.map(p => ({
            id: p.id,
            name: p.project_name,
            perspective: p.perspective,
          })),
          vision,
          indicators,
          segment,
        },
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
        },
      });

      if (error) {
        if (error.message?.includes('429')) {
          toast.error('Limite diário de IA atingido. Tente novamente amanhã.');
          return;
        }
        throw error;
      }

      if (data?.analyses) {
        setAnalyses(data.analyses);
        setHasAnalyzed(true);
        setAcceptedNames(new Set());
        setReplacedProjects(new Set());
      }
    } catch (err) {
      console.error('Validation error:', err);
      toast.error('Erro ao validar projetos. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [projects, currentAccount, user, getAllSelectedIndicators, segment]);

  const handleAcceptName = async (projectName: string, suggestedName: string) => {
    const project = projects.find(p => p.project_name === projectName);
    if (!project) return;

    await updateProject(project.id, { project_name: suggestedName });
    setAcceptedNames(prev => new Set(prev).add(projectName));
  };

  const handleReplaceProject = async (projectName: string, replacement: NonNullable<ProjectAnalysis['replacement_suggestion']>) => {
    const project = projects.find(p => p.project_name === projectName);
    if (!project) return;

    await deleteProject(project.id);
    
    const perspectiveId = PERSPECTIVES.find(
      p => p.title.toLowerCase().includes(replacement.perspective.toLowerCase()) ||
           p.id === replacement.perspective
    )?.id || project.perspective;

    await addProject(replacement.name, perspectiveId, false);
    setReplacedProjects(prev => new Set(prev).add(projectName));
    toast.success(`Projeto substituído por "${replacement.name}"`);
  };

  const handleAdvance = () => {
    setStage(4);
  };

  const getClassBadge = (classification: string) => {
    const config = CLASSIFICATION_LABELS[classification] || { label: classification, variant: 'secondary' as const };
    return (
      <Badge variant={config.variant}>
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <ProjectsProgress stage={3} onStageClick={(s) => setStage(s)} />

      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Validação Estratégica</h1>
        <p className="text-muted-foreground">
          A IA analisa se seus projetos são realmente estratégicos, com base na visão da empresa e nos indicadores.
        </p>
      </div>

      {/* Analyze Button */}
      {!hasAnalyzed && !loading && (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center space-y-4">
            <Sparkles className="h-12 w-12 text-primary mx-auto" />
            <div>
              <h3 className="font-semibold text-lg">Analisar Projetos com IA</h3>
              <p className="text-sm text-muted-foreground mt-1">
                A IA irá classificar cada projeto, sugerir nomes estratégicos e recomendar substituições quando necessário.
              </p>
            </div>
            <Button onClick={runValidation} size="lg" className="bg-primary text-primary-foreground hover:bg-primary/85">
              <Sparkles className="mr-2 h-5 w-5" />
              Analisar {projects.length} Projetos
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg">
            <RefreshCw className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Analisando projetos estratégicos...</span>
          </div>
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      )}

      {/* Results */}
      {hasAnalyzed && !loading && (
        <>
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-sm">
              {analyses.filter(a => a.classification === 'estrategico').length} de {analyses.length} são estratégicos
            </Badge>
            <Button variant="outline" size="sm" onClick={runValidation} disabled={loading}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Re-analisar
            </Button>
          </div>

          <div className="space-y-4">
            {analyses.map((analysis, idx) => {
              const isReplaced = replacedProjects.has(analysis.project_name);
              const isNameAccepted = acceptedNames.has(analysis.project_name);

              if (isReplaced) {
                return (
                  <Card key={idx} className="opacity-50 border-border/30">
                    <CardContent className="p-4 text-center text-sm text-muted-foreground">
                      <span className="line-through">{analysis.project_name}</span>
                      <span className="ml-2">→ Substituído</span>
                    </CardContent>
                  </Card>
                );
              }

              return (
                <Card key={idx} className={`${
                  analysis.classification === 'estrategico' 
                    ? 'border-emerald-500/30' 
                    : analysis.classification === 'tatico' 
                      ? 'border-amber-500/30' 
                      : 'border-destructive/30'
                }`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <CardTitle className="text-base">{analysis.project_name}</CardTitle>
                        <div className="flex items-center gap-2">
                          {getClassBadge(analysis.classification)}
                          <Badge variant="outline" className="text-xs">
                            Alinhamento: {analysis.alignment_score}/5
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-0">
                    {/* Justification */}
                    <p className="text-sm text-muted-foreground">{analysis.justification}</p>

                    {/* Suggested Name */}
                    {analysis.suggested_name && analysis.suggested_name !== analysis.project_name && (
                      <div className="p-3 bg-muted/30 rounded-lg space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Sparkles className="h-4 w-4 text-primary" />
                          Nome sugerido: <span className="text-primary">{analysis.suggested_name}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{analysis.name_concept}</p>
                        {!isNameAccepted ? (
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAcceptName(analysis.project_name, analysis.suggested_name)}
                              disabled={saving}
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Aceitar nome
                            </Button>
                          </div>
                        ) : (
                          <Badge variant="success" className="text-xs">
                            <Check className="h-3 w-3 mr-1" />
                            Nome aceito
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Replacement Suggestion */}
                    {analysis.replacement_suggestion && analysis.classification !== 'estrategico' && (
                      <div className="p-3 bg-primary/5 rounded-lg border border-primary/20 space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Replace className="h-4 w-4 text-primary" />
                          Sugestão de substituição
                        </div>
                        <div>
                          <p className="text-sm font-medium">{analysis.replacement_suggestion.name}</p>
                          <p className="text-xs text-muted-foreground mt-1">{analysis.replacement_suggestion.description}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReplaceProject(analysis.project_name, analysis.replacement_suggestion!)}
                          disabled={saving}
                        >
                          <ArrowRight className="h-3 w-3 mr-1" />
                          Substituir projeto
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Navigation */}
      <div className="flex justify-between gap-3 pt-4">
        <Button onClick={() => setStage(2)} variant="outline" size="lg" disabled={saving}>
          <ChevronLeft className="mr-2 h-5 w-5" />
          Voltar
        </Button>

        <Button 
          onClick={handleAdvance} 
          size="lg" 
          className="bg-primary text-primary-foreground hover:bg-primary/85"
          disabled={saving}
        >
          {hasAnalyzed ? 'Avançar para Detalhamento' : 'Pular Validação'}
          <ChevronRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
