import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2,
  Target,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

interface AIEvolutionAnalysisProps {
  assessmentIds: string[];
  hasData: boolean;
}

interface AnalysisData {
  tendencia: string;
  pontos_positivos: string[];
  alertas: string[];
  plano_acao: string[];
  previsao: string;
}

export const AIEvolutionAnalysis = ({ assessmentIds, hasData }: AIEvolutionAnalysisProps) => {
  const [isOpen, setIsOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);

  const handleGenerateAnalysis = async () => {
    if (assessmentIds.length < 2) {
      toast.error('É necessário ter pelo menos 2 avaliações para gerar análise evolutiva');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-roip-evolution-analysis', {
        body: { assessmentIds }
      });

      if (error) throw error;
      
      setAnalysis(data.analysis);
      toast.success('Análise evolutiva gerada com sucesso!');
    } catch (error) {
      console.error('Error generating analysis:', error);
      toast.error('Erro ao gerar análise. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!hasData) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">
            Complete pelo menos 2 avaliações mensais para habilitar a análise evolutiva com IA.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Análise Evolutiva com IA
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateAnalysis}
                disabled={isLoading || assessmentIds.length < 2}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Gerar Análise
                  </>
                )}
              </Button>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="pt-0">
            {analysis ? (
              <div className="space-y-6">
                {/* Tendência Geral */}
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    <h4 className="font-semibold">Tendência Geral</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">{analysis.tendencia}</p>
                </div>

                {/* Pontos Positivos */}
                {analysis.pontos_positivos.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <h4 className="font-semibold">O que está funcionando</h4>
                    </div>
                    <ul className="space-y-2">
                      {analysis.pontos_positivos.map((ponto, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200">
                            ✓
                          </Badge>
                          <span>{ponto}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Alertas */}
                {analysis.alertas.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle className="h-5 w-5 text-orange-500" />
                      <h4 className="font-semibold">Alertas Críticos</h4>
                    </div>
                    <ul className="space-y-2">
                      {analysis.alertas.map((alerta, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-200">
                            !
                          </Badge>
                          <span>{alerta}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Plano de Ação */}
                {analysis.plano_acao.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Target className="h-5 w-5 text-blue-500" />
                      <h4 className="font-semibold">Plano de Ação Prioritário</h4>
                    </div>
                    <ol className="space-y-2">
                      {analysis.plano_acao.map((acao, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <Badge className="bg-blue-500 text-white">
                            {index + 1}
                          </Badge>
                          <span>{acao}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* Previsão */}
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <h4 className="font-semibold mb-2">📊 Previsão</h4>
                  <p className="text-sm text-muted-foreground">{analysis.previsao}</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>Clique em "Gerar Análise" para obter insights sobre a evolução dos seus diagnósticos.</p>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
