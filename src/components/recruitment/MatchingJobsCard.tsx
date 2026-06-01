import React, { useState, useEffect } from 'react';
import { Sparkles, Briefcase, ExternalLink, Loader2, RefreshCw, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useSemanticSearch } from '@/hooks/useSemanticSearch';
import { cn } from '@/lib/utils';

interface MatchingJobsCardProps {
  candidateId: string;
  accountId: string;
  className?: string;
  onJobClick?: (jobId: string) => void;
}

interface MatchingJob {
  id: string;
  title: string;
  department?: string;
  location?: string;
  employment_type?: string;
  status: string;
  similarity_score: number;
}

export function MatchingJobsCard({
  candidateId,
  accountId,
  className,
  onJobClick,
}: MatchingJobsCardProps) {
  const [matchingJobs, setMatchingJobs] = useState<MatchingJob[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const { findMatchingJobs } = useSemanticSearch({ accountId });

  const loadMatchingJobs = async () => {
    setIsLoading(true);
    try {
      const results = await findMatchingJobs(candidateId, {
        limit: 5,
        threshold: 0.5,
      });
      setMatchingJobs(results);
      setHasLoaded(true);
    } catch (error) {
      console.error('Error loading matching jobs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadClick = () => {
    if (!hasLoaded) {
      loadMatchingJobs();
    }
  };

  const getSimilarityColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600 bg-green-50';
    if (score >= 0.6) return 'text-amber-600 bg-amber-50';
    return 'text-muted-foreground bg-muted';
  };

  const getEmploymentTypeLabel = (type?: string) => {
    const labels: Record<string, string> = {
      full_time: 'Integral',
      part_time: 'Parcial',
      contract: 'Contrato',
      internship: 'Estágio',
      temporary: 'Temporário',
    };
    return type ? labels[type] || type : null;
  };

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Briefcase className="h-4 w-4" />
          Vagas Compatíveis
          <Badge variant="secondary" className="text-xs ml-auto">
            <Sparkles className="h-3 w-3 mr-1" />
            IA
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasLoaded && !isLoading ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-3">
              Encontre vagas abertas que combinam com o perfil deste candidato
            </p>
            <Button variant="outline" size="sm" onClick={handleLoadClick}>
              <Sparkles className="h-4 w-4 mr-1" />
              Buscar Vagas
            </Button>
          </div>
        ) : isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-1" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-5 w-12" />
              </div>
            ))}
          </div>
        ) : matchingJobs.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-2">
              Nenhuma vaga compatível encontrada
            </p>
            <p className="text-xs text-muted-foreground">
              Certifique-se de que o candidato e as vagas têm embeddings gerados
            </p>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={loadMatchingJobs}
              className="mt-2"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Tentar novamente
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {matchingJobs.map((job) => (
              <div
                key={job.id}
                className="flex items-start gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer group"
                onClick={() => onJobClick?.(job.id)}
              >
                <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center shrink-0">
                  <Briefcase className="h-5 w-5 text-primary" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {job.title}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {job.department && <span>{job.department}</span>}
                    {job.department && job.location && <span>•</span>}
                    {job.location && <span>{job.location}</span>}
                  </div>
                  {getEmploymentTypeLabel(job.employment_type) && (
                    <Badge variant="outline" className="text-xs mt-1">
                      {getEmploymentTypeLabel(job.employment_type)}
                    </Badge>
                  )}
                </div>

                <div className="flex flex-col items-end gap-1">
                  <Badge 
                    variant="secondary" 
                    className={cn('text-xs', getSimilarityColor(job.similarity_score))}
                  >
                    {Math.round(job.similarity_score * 100)}%
                  </Badge>
                  {job.status === 'open' && (
                    <Badge variant="outline" className="text-xs text-green-600">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Aberta
                    </Badge>
                  )}
                </div>
              </div>
            ))}

            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-2"
              onClick={loadMatchingJobs}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Atualizar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
