import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCultureBenchmark } from "@/hooks/useCultureBenchmark";
import { CheckCircle2, AlertTriangle, Lightbulb } from "lucide-react";

interface CultureBenchmarkInsightsCardProps {
  accountId: string | null;
  segment?: string;
}

export function CultureBenchmarkInsightsCard({ 
  accountId, 
  segment 
}: CultureBenchmarkInsightsCardProps) {
  const { insights, isLoading } = useCultureBenchmark(accountId, segment);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-6">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </CardContent>
      </Card>
    );
  }

  const hasInsights = 
    insights.strengths.length > 0 || 
    insights.opportunities.length > 0 || 
    insights.recommendations.length > 0;

  if (!hasInsights) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Insights e Recomendações</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm text-center py-8">
            Colete mais respostas de cultura para gerar insights personalizados
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Insights e Recomendações</CardTitle>
        <p className="text-sm text-muted-foreground">
          Análise baseada na comparação com o mercado
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Strengths */}
        {insights.strengths.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <h4 className="font-medium text-green-800">Pontos Fortes</h4>
            </div>
            <ul className="space-y-2 pl-7">
              {insights.strengths.map((strength, index) => (
                <li 
                  key={index} 
                  className="text-sm text-muted-foreground list-disc"
                >
                  {strength}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Opportunities */}
        {insights.opportunities.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <h4 className="font-medium text-amber-800">Oportunidades de Melhoria</h4>
            </div>
            <ul className="space-y-2 pl-7">
              {insights.opportunities.map((opportunity, index) => (
                <li 
                  key={index} 
                  className="text-sm text-muted-foreground list-disc"
                >
                  {opportunity}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommendations */}
        {insights.recommendations.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-blue-600" />
              <h4 className="font-medium text-blue-800">Recomendações</h4>
            </div>
            <ul className="space-y-2 pl-7">
              {insights.recommendations.map((recommendation, index) => (
                <li 
                  key={index} 
                  className="text-sm text-muted-foreground list-disc"
                >
                  {recommendation}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
