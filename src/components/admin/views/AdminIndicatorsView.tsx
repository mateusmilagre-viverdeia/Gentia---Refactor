import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, DollarSign, Users, Settings, Lightbulb } from 'lucide-react';
import { IndicatorsDetail } from '@/hooks/useAdminDashboard';

const PERSPECTIVES = [
  { key: 'financeira', label: 'Financeira', icon: DollarSign, color: 'bg-blue-100 text-blue-700' },
  { key: 'clientes', label: 'Clientes', icon: Users, color: 'bg-purple-100 text-purple-700' },
  { key: 'processos', label: 'Processos Internos', icon: Settings, color: 'bg-green-100 text-green-700' },
  { key: 'aprendizado', label: 'Aprendizado e Crescimento', icon: Lightbulb, color: 'bg-orange-100 text-orange-700' },
];

interface AdminIndicatorsViewProps {
  indicators: IndicatorsDetail | null;
}

export function AdminIndicatorsView({ indicators }: AdminIndicatorsViewProps) {
  if (!indicators) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Indicadores estratégicos ainda não foram definidos.</p>
        </CardContent>
      </Card>
    );
  }

  const selectedStep1 = indicators.selected_step1 || {};
  const finalSelection = indicators.final_selection || [];

  return (
    <div className="space-y-6">
      {/* Segment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Segmento de Negócio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Badge variant="outline" className="text-base px-4 py-2">
            {indicators.segment || 'Não definido'}
          </Badge>
        </CardContent>
      </Card>

      {/* Final Selection (KPIs) */}
      {finalSelection.length > 0 && (
        <Card className="border-2 border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle>KPIs Finais Selecionados ({finalSelection.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {finalSelection.map((indicator: string, index: number) => (
                <Badge key={index} variant="default" className="px-3 py-1">
                  {indicator}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selection by Perspective */}
      <div className="grid md:grid-cols-2 gap-4">
        {PERSPECTIVES.map(({ key, label, icon: Icon, color }) => {
          const perspectiveIndicators = selectedStep1[key] || [];
          
          return (
            <Card key={key}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <div className={`p-2 rounded-lg ${color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  {label}
                  <Badge variant="secondary" className="ml-auto">
                    {perspectiveIndicators.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {perspectiveIndicators.length > 0 ? (
                  <ul className="space-y-2">
                    {perspectiveIndicators.map((indicator: string, index: number) => (
                      <li key={index} className="text-sm flex gap-2">
                        <span className="text-muted-foreground">{index + 1}.</span>
                        <span>{indicator}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Nenhum indicador selecionado</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Stage Info */}
      <div className="text-sm text-muted-foreground">
        Estágio atual: {indicators.stage || 1}
      </div>
    </div>
  );
}
