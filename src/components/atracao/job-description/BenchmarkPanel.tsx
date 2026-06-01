import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  BarChart3, 
  ChevronDown, 
  ChevronRight, 
  ExternalLink, 
  Lightbulb, 
  Plus, 
  TrendingUp,
  Building2,
  CheckCircle2,
  Gift,
  Loader2,
  X,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface JobReference {
  source: string;
  url: string;
  title: string;
  company?: string;
  highlights: {
    responsibilities?: string[];
    requirements?: string[];
    benefits?: string[];
    salary_range?: string;
    culture_points?: string[];
  };
}

interface BenchmarkInsights {
  common_requirements: string[];
  differentiators: string[];
  market_benefits: string[];
  suggested_improvements: string[];
}

interface BenchmarkPanelProps {
  data: {
    references: JobReference[];
    insights: BenchmarkInsights;
    cached: boolean;
  } | null;
  loading: boolean;
  onFetchBenchmark: () => void;
  onApplySuggestion?: (type: 'requirement' | 'benefit' | 'responsibility', value: string) => void;
  onClose?: () => void;
  disabled?: boolean;
}

export function BenchmarkPanel({
  data,
  loading,
  onFetchBenchmark,
  onApplySuggestion,
  onClose,
  disabled,
}: BenchmarkPanelProps) {
  const [expandedRef, setExpandedRef] = useState<number | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>('insights');

  if (!data && !loading) {
    return (
      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Benchmark de Mercado
          </CardTitle>
          <CardDescription className="text-sm">
            Busque referências de vagas similares para comparar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={onFetchBenchmark} 
            disabled={disabled || loading}
            className="w-full gap-2"
            variant="outline"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Buscar Referências
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm">Buscando referências de mercado...</p>
            <p className="text-xs">Isso pode levar alguns segundos</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const { references, insights, cached } = data;

  return (
    <Card className="relative">
      {onClose && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 h-6 w-6"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      )}

      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Referências de Mercado
          </CardTitle>
          {cached && (
            <Badge variant="secondary" className="text-xs">
              Cache
            </Badge>
          )}
        </div>
        <CardDescription className="text-sm">
          {references.length} vagas analisadas
        </CardDescription>
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea className="h-[500px]">
          <div className="p-4 space-y-4">
            {/* Insights Section */}
            <Collapsible
              open={expandedSection === 'insights'}
              onOpenChange={(open) => setExpandedSection(open ? 'insights' : null)}
            >
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-2 h-auto">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-yellow-500" />
                    <span className="font-medium">Insights do Mercado</span>
                  </div>
                  {expandedSection === 'insights' ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 pt-2">
                {/* Common Requirements */}
                {insights.common_requirements.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Requisitos Comuns
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {insights.common_requirements.slice(0, 5).map((req, i) => (
                        <Badge
                          key={i}
                          variant="outline"
                          className="text-xs cursor-pointer hover:bg-muted transition-colors"
                          onClick={() => onApplySuggestion?.('requirement', req)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          {req}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Market Benefits */}
                {insights.market_benefits.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      <Gift className="h-3 w-3" />
                      Benefícios Populares
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {insights.market_benefits.slice(0, 5).map((ben, i) => (
                        <Badge
                          key={i}
                          variant="outline"
                          className="text-xs cursor-pointer hover:bg-muted transition-colors"
                          onClick={() => onApplySuggestion?.('benefit', ben)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          {ben}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Differentiators */}
                {insights.differentiators.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      Diferenciais (poucas vagas oferecem)
                    </p>
                    <div className="space-y-1">
                      {insights.differentiators.slice(0, 3).map((diff, i) => (
                        <p key={i} className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1">
                          💡 {diff}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggested Improvements */}
                {insights.suggested_improvements.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      🎯 Sugestões para sua vaga
                    </p>
                    <div className="space-y-1">
                      {insights.suggested_improvements.map((sug, i) => (
                        <p key={i} className="text-xs text-foreground bg-primary/5 rounded px-2 py-1.5">
                          {sug}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>

            {/* References Section */}
            <Collapsible
              open={expandedSection === 'references'}
              onOpenChange={(open) => setExpandedSection(open ? 'references' : null)}
            >
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-2 h-auto">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    <span className="font-medium">Vagas Encontradas ({references.length})</span>
                  </div>
                  {expandedSection === 'references' ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 pt-2">
                {references.map((ref, index) => (
                  <Collapsible
                    key={index}
                    open={expandedRef === index}
                    onOpenChange={(open) => setExpandedRef(open ? index : null)}
                  >
                    <CollapsibleTrigger asChild>
                      <div className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{ref.title}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {ref.company && <span>{ref.company}</span>}
                            <Badge variant="outline" className="text-[10px] px-1.5">
                              {ref.source}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <a
                            href={ref.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                          {expandedRef === index ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pl-4 space-y-2 pb-2">
                      {ref.highlights.requirements && ref.highlights.requirements.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Requisitos:</p>
                          <ul className="text-xs space-y-0.5">
                            {ref.highlights.requirements.slice(0, 4).map((r, i) => (
                              <li key={i} className="flex items-start gap-1">
                                <span className="text-muted-foreground">•</span>
                                <span className="text-muted-foreground">{r}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {ref.highlights.benefits && ref.highlights.benefits.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Benefícios:</p>
                          <ul className="text-xs space-y-0.5">
                            {ref.highlights.benefits.slice(0, 4).map((b, i) => (
                            <li key={i} className="flex items-start gap-1">
                                <span className="text-primary">✓</span>
                                <span className="text-muted-foreground">{b}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {ref.highlights.salary_range && (
                        <p className="text-xs text-muted-foreground">
                          💰 {ref.highlights.salary_range}
                        </p>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </CollapsibleContent>
            </Collapsible>

            {/* Refresh Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={onFetchBenchmark}
              disabled={loading}
              className="w-full text-xs"
            >
              <Sparkles className="h-3 w-3 mr-1" />
              Atualizar Referências
            </Button>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
