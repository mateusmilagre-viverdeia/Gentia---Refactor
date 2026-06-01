import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ProjectDemandRow } from "@/types/resource-planning.types";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";

export function ResourceRecommendations(props: {
  totalCapacity: number;
  demandRows: ProjectDemandRow[];
  overloadedCount: number;
}) {
  const totalDemand = props.demandRows.reduce((s, r) => s + (r.finalHours || 0), 0);
  const gap = totalDemand - props.totalCapacity;

  const highPriorityNoManual = props.demandRows
    .filter((r) => r.priority === 1)
    .filter((r) => r.manualHours === null);

  const hasCritical = gap > 0 || props.overloadedCount > 0;
  const hasAny = hasCritical || highPriorityNoManual.length > 0;

  if (!hasAny) {
    return (
      <Alert>
        <CheckCircle2 className="h-4 w-4" />
        <AlertTitle>Sem alertas</AlertTitle>
        <AlertDescription>Capacidade e demanda parecem equilibradas para esta semana.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-3">
      {gap > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Demanda acima da capacidade</AlertTitle>
          <AlertDescription>
            Gap estimado de <strong>{gap.toFixed(1)}h</strong> (demanda {totalDemand.toFixed(1)}h vs capacidade {props.totalCapacity.toFixed(1)}h).
          </AlertDescription>
        </Alert>
      )}

      {props.overloadedCount > 0 && (
        <Alert className={cn("border", "border-destructive/30")}>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Consultores sobrecarregados</AlertTitle>
          <AlertDescription>
            <Badge variant="destructive">{props.overloadedCount}</Badge> consultor(es) acima de 80% na média das últimas 4 semanas.
          </AlertDescription>
        </Alert>
      )}

      {highPriorityNoManual.length > 0 && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Prioridade alta sem ajuste manual</AlertTitle>
          <AlertDescription>
  		    {highPriorityNoManual.length} projeto(s) com prioridade alta ainda usando sugestão automática.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
