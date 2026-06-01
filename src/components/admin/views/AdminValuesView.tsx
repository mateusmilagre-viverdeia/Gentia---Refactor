import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heart, ThumbsUp, ThumbsDown } from 'lucide-react';
import { ValuesDetail } from '@/hooks/useAdminDashboard';

interface AdminValuesViewProps {
  values: ValuesDetail | null;
}

export function AdminValuesView({ values }: AdminValuesViewProps) {
  if (!values || !values.final_values || values.final_values.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Valores ainda não foram definidos.</p>
        </CardContent>
      </Card>
    );
  }

  const behaviors = values.behaviors || [];

  return (
    <div className="space-y-6">
      {/* Final Values */}
      <Card className="border-2 border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            Valores Organizacionais ({values.final_values.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {values.final_values.map((value, index) => (
              <Badge 
                key={value.value_id} 
                variant="default"
                className="text-base px-4 py-2"
              >
                {index + 1}. {value.label}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Behaviors per Value */}
      {behaviors.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Comportamentos por Valor</h3>
          
          {behaviors.map((behavior, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="text-base">{behavior.value_label}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  {/* DOs */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <ThumbsUp className="h-4 w-4 text-green-600" />
                      <span className="font-medium text-green-700">Como vivemos</span>
                    </div>
                    {behavior.do_selected && behavior.do_selected.length > 0 ? (
                      <ul className="space-y-2">
                        {behavior.do_selected.map((item: string, i: number) => (
                          <li key={i} className="text-sm flex gap-2">
                            <span className="text-green-600">✓</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">Nenhum comportamento selecionado</p>
                    )}
                  </div>

                  {/* DON'Ts */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <ThumbsDown className="h-4 w-4 text-red-600" />
                      <span className="font-medium text-red-700">Como não vivemos</span>
                    </div>
                    {behavior.dont_selected && behavior.dont_selected.length > 0 ? (
                      <ul className="space-y-2">
                        {behavior.dont_selected.map((item: string, i: number) => (
                          <li key={i} className="text-sm flex gap-2">
                            <span className="text-red-600">✗</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">Nenhum comportamento selecionado</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Stage Info */}
      <div className="text-sm text-muted-foreground">
        Estágio atual: {values.session?.stage || 1}
      </div>
    </div>
  );
}
