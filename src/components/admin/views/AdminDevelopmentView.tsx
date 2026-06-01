import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GraduationCap } from 'lucide-react';
import { DevelopmentDetail } from '@/hooks/useAdminDashboard';

interface AdminDevelopmentViewProps {
  development: DevelopmentDetail | null;
}

export function AdminDevelopmentView({ development }: AdminDevelopmentViewProps) {
  if (!development || !development.selections || development.selections.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Rituais de desenvolvimento ainda não foram definidos.</p>
        </CardContent>
      </Card>
    );
  }

  // Get final selections (phase 3)
  const finalSelections = development.selections.filter(s => s.phase === 3);
  
  // Group by category
  const grouped = finalSelections.reduce((acc, selection) => {
    const key = selection.category_label || selection.category;
    if (!acc[key]) acc[key] = [];
    acc[key].push(selection);
    return acc;
  }, {} as Record<string, typeof finalSelections>);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card className="border-2 border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Rituais de Desenvolvimento Selecionados ({finalSelections.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {finalSelections.map((selection, index) => (
              <Badge key={selection.item_id} variant="default" className="px-3 py-1">
                {selection.label}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* By Category */}
      {Object.keys(grouped).length > 0 && (
        <div className="grid md:grid-cols-2 gap-4">
          {Object.entries(grouped).map(([category, items]) => (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  {category}
                  <Badge variant="secondary">{items.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {items.map((item, index) => (
                    <li key={item.item_id} className="text-sm flex gap-2">
                      <span className="text-muted-foreground">{index + 1}.</span>
                      <span>{item.label}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Selection History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Histórico de Seleção</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">
                Fase 1 - Seleção Inicial (até 20)
              </p>
              <p className="text-sm">
                {development.selections.filter(s => s.phase === 1).length} rituais selecionados
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">
                Fase 2 - Refinamento (até 10)
              </p>
              <p className="text-sm">
                {development.selections.filter(s => s.phase === 2).length} rituais selecionados
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">
                Fase 3 - Seleção Final (até 5)
              </p>
              <p className="text-sm">
                {finalSelections.length} rituais selecionados
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stage Info */}
      <div className="text-sm text-muted-foreground">
        Estágio atual: {development.session?.stage || 1}
      </div>
    </div>
  );
}
