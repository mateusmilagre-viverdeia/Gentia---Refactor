import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, CheckCircle2, ListChecks } from "lucide-react";
import { useCreditCosts } from "@/hooks/usePricingAdmin";
import { useFeatureLLMMapping } from "@/hooks/useFeatureLLMMapping";

export function LLMMappingAuditCard() {
  const { data: costs, isLoading: l1 } = useCreditCosts();
  const { data: mapping, isLoading: l2 } = useFeatureLLMMapping();

  const audit = useMemo(() => {
    const mapByKey = new Map<string, string>();
    (mapping ?? []).forEach((m: any) => mapByKey.set(m.feature_key, m.model_id));
    const active = (costs ?? []).filter((c: any) => c.is_active);
    const mapped: string[] = [];
    const operational: string[] = [];
    const missing: string[] = [];
    for (const c of active) {
      const m = mapByKey.get(c.feature_key);
      if (!m) missing.push(c.feature_key);
      else if (m === "no_llm") operational.push(c.feature_key);
      else mapped.push(c.feature_key);
    }
    return { active: active.length, mapped, operational, missing };
  }, [costs, mapping]);

  if (l1 || l2) return <Skeleton className="h-32" />;

  const allClean = audit.missing.length === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ListChecks className="h-4 w-4" />
          Auditoria de Mapeamento Feature → LLM
        </CardTitle>
        <CardDescription>
          Confere se toda feature ativa em <code>recruitment_credit_costs</code> tem um modelo definido (ou está marcada como operacional).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Badge variant="default" className="gap-1"><CheckCircle2 className="h-3 w-3" />{audit.mapped.length} de IA mapeadas</Badge>
          <Badge variant="secondary">{audit.operational.length} operacionais</Badge>
          {audit.missing.length > 0 && (
            <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />{audit.missing.length} sem mapeamento</Badge>
          )}
          <Badge variant="outline">{audit.active} total</Badge>
        </div>
        {allClean ? (
          <Alert className="border-green-500/30">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription>Tudo certo — todas as features ativas estão mapeadas.</AlertDescription>
          </Alert>
        ) : (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Features pendentes:</strong> {audit.missing.join(", ")}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
