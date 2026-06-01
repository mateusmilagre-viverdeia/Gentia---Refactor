import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClipboardList, Clock, Calendar, Users } from 'lucide-react';
import type { UniqueAbilityAIAnalysis } from '@/types/unique-ability.types';

interface ActionPlanSectionProps {
  actionPlan: UniqueAbilityAIAnalysis['actionPlan'];
}

export function ActionPlanSection({ actionPlan }: ActionPlanSectionProps) {
  if (!actionPlan) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          Plano de Ação
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Immediate actions */}
        {actionPlan.immediate && actionPlan.immediate.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Clock className="h-4 w-4" />
              Essa Semana
            </div>
            <ul className="space-y-1 pl-6">
              {actionPlan.immediate.map((action, index) => (
                <li key={index} className="text-sm list-disc">
                  {action}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Short-term actions */}
        {actionPlan.shortTerm && actionPlan.shortTerm.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Calendar className="h-4 w-4" />
              Esse Mês
            </div>
            <ul className="space-y-1 pl-6">
              {actionPlan.shortTerm.map((action, index) => (
                <li key={index} className="text-sm list-disc">
                  {action}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Delegation actions */}
        {actionPlan.delegation && actionPlan.delegation.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Users className="h-4 w-4" />
              Para Delegar
            </div>
            <ul className="space-y-1 pl-6">
              {actionPlan.delegation.map((action, index) => (
                <li key={index} className="text-sm list-disc">
                  {action}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
