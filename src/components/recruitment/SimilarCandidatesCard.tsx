import React, { useState, useEffect } from 'react';
import { Sparkles, Users, ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useSemanticSearch } from '@/hooks/useSemanticSearch';
import { cn } from '@/lib/utils';

interface SimilarCandidatesCardProps {
  candidateId: string;
  candidateName: string;
  accountId: string;
  className?: string;
  onCandidateClick?: (candidateId: string) => void;
}

interface SimilarCandidate {
  id: string;
  name: string;
  email: string;
  similarity_score: number;
  tags?: string[];
  recruitment_applications?: Array<{
    job_id: string;
    stage: string;
    recruitment_jobs?: {
      title: string;
    };
  }>;
}

export function SimilarCandidatesCard({
  candidateId,
  candidateName,
  accountId,
  className,
  onCandidateClick,
}: SimilarCandidatesCardProps) {
  const [similarCandidates, setSimilarCandidates] = useState<SimilarCandidate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const { searchCandidates } = useSemanticSearch({ accountId });

  const loadSimilarCandidates = async () => {
    setIsLoading(true);
    try {
      // Search for candidates similar to this one
      // We use the candidate name as a proxy for their profile
      const results = await searchCandidates(
        `candidato similar a ${candidateName}`,
        {
          excludeCandidateIds: [candidateId],
          limit: 5,
          threshold: 0.5,
        }
      );
      setSimilarCandidates(results);
      setHasLoaded(true);
    } catch (error) {
      console.error('Error loading similar candidates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Don't auto-load, wait for user interaction
  const handleLoadClick = () => {
    if (!hasLoaded) {
      loadSimilarCandidates();
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getSimilarityColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600 bg-green-50';
    if (score >= 0.6) return 'text-amber-600 bg-amber-50';
    return 'text-muted-foreground bg-muted';
  };

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Users className="h-4 w-4" />
          Candidatos Similares
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
              Encontre candidatos com perfil similar usando busca semântica
            </p>
            <Button variant="outline" size="sm" onClick={handleLoadClick}>
              <Sparkles className="h-4 w-4 mr-1" />
              Buscar Similares
            </Button>
          </div>
        ) : isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-24 mb-1" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-5 w-12" />
              </div>
            ))}
          </div>
        ) : similarCandidates.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-2">
              Nenhum candidato similar encontrado
            </p>
            <p className="text-xs text-muted-foreground">
              Isso pode significar que não há embeddings gerados ainda
            </p>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={loadSimilarCandidates}
              className="mt-2"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Tentar novamente
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {similarCandidates.map((candidate) => (
              <div
                key={candidate.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer group"
                onClick={() => onCandidateClick?.(candidate.id)}
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">
                    {getInitials(candidate.name)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {candidate.name}
                  </p>
                  {candidate.recruitment_applications?.[0]?.recruitment_jobs && (
                    <p className="text-xs text-muted-foreground truncate">
                      {candidate.recruitment_applications[0].recruitment_jobs.title}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Badge 
                    variant="secondary" 
                    className={cn('text-xs', getSimilarityColor(candidate.similarity_score))}
                  >
                    {Math.round(candidate.similarity_score * 100)}%
                  </Badge>
                  <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ))}

            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-2"
              onClick={loadSimilarCandidates}
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
