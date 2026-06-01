import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, CheckCircle2, XCircle, Loader2, FlaskConical } from "lucide-react";
import {
  useAutoRechargeSimulation,
  type AutoRechargeScenario,
} from "@/hooks/useAutoRechargeSimulation";
import { useOrganization } from "@/contexts/OrganizationContext";

const SCENARIOS: { value: AutoRechargeScenario; label: string; description: string }[] = [
  {
    value: "preventive_recharge",
    label: "Recarga preventiva",
    description: "Força saldo baixo e tenta consumir — recarga deve disparar ANTES de bloquear.",
  },
  {
    value: "concurrent_mutex",
    label: "Mutex de concorrência",
    description: "Dispara 3 recargas simultâneas — só 1 deve cobrar o Stripe.",
  },
  {
    value: "add_credits_fix",
    label: "Fix do add_credits (p_metadata)",
    description: "Valida que créditos entram com invoice_id no metadata após cobrança.",
  },
  {
    value: "payment_failure",
    label: "Falha de pagamento",
    description: "Anexa cartão recusado temporariamente e valida que falha é registrada.",
  },
  {
    value: "full_flow",
    label: "Todos os cenários",
    description: "Roda os 4 cenários em sequência.",
  },
];

export function AutoRechargeSimulatorTab() {
  const { currentAccount } = useOrganization();
  const [scenario, setScenario] = useState<AutoRechargeScenario>("preventive_recharge");
  const [orgId, setOrgId] = useState(currentAccount?.id ?? "");
  const sim = useAutoRechargeSimulation();

  const result = sim.data;

  return (
    <div className="space-y-4">
      <Alert variant="default" className="border-yellow-500/40 bg-yellow-50 dark:bg-yellow-950/20">
        <AlertTriangle className="h-4 w-4 text-yellow-600" />
        <AlertTitle>Simulação só roda em Stripe Test Mode</AlertTitle>
        <AlertDescription className="text-sm">
          A função verifica que <code>STRIPE_SECRET_KEY</code> começa com <code>sk_test_</code> antes de
          executar. Nenhum cartão real é cobrado. O saldo da org é restaurado ao final.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4" /> Simular Recarga Automática
          </CardTitle>
          <CardDescription>
            Rode cenários ponta-a-ponta para validar o fluxo de recarga automática (mutex, fix de
            metadata, falha de pagamento, recarga preventiva).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="scenario">Cenário</Label>
              <Select value={scenario} onValueChange={(v) => setScenario(v as AutoRechargeScenario)}>
                <SelectTrigger id="scenario">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCENARIOS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {SCENARIOS.find((s) => s.value === scenario)?.description}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="org">Org ID (account_id)</Label>
              <Input
                id="org"
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
                placeholder="uuid da org"
              />
              <p className="text-xs text-muted-foreground">
                Padrão: sua org atual. Use uma org de teste com recarga ativa.
              </p>
            </div>
          </div>

          <Button
            onClick={() => sim.mutate({ scenario, org_id: orgId })}
            disabled={!orgId || sim.isPending}
            size="lg"
          >
            {sim.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Executando...
              </>
            ) : (
              <>
                <FlaskConical className="h-4 w-4 mr-2" /> Executar simulação
              </>
            )}
          </Button>

          {sim.error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{(sim.error as Error).message}</AlertDescription>
            </Alert>
          )}

          {result && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2">
                {result.success ? (
                  <Badge className="bg-green-600 hover:bg-green-700">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Sucesso
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <XCircle className="h-3 w-3 mr-1" /> Falhou
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  {result.duration_ms} ms · {result.steps.length} steps · {result.stripeCharges?.length ?? 0} cobranças
                </span>
              </div>

              {result.error && (
                <Alert variant="destructive">
                  <AlertDescription>{result.error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                {result.steps.map((s, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-3 p-3 rounded-md border ${
                      s.ok ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900" : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900"
                    }`}
                  >
                    {s.ok ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{s.name}</p>
                      {s.error && <p className="text-xs text-red-600 mt-1">{s.error}</p>}
                      {s.data !== undefined && (
                        <pre className="text-xs bg-muted/50 p-2 rounded mt-1 overflow-x-auto max-h-40">
                          {JSON.stringify(s.data, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {result.stripeCharges && result.stripeCharges.length > 0 && (
                <div className="border rounded-md p-3 space-y-1">
                  <p className="text-sm font-medium">Cobranças Stripe</p>
                  {result.stripeCharges.map((c, i) => (
                    <p key={i} className="text-xs font-mono">
                      {c.invoiceId} · {c.amount} créditos · {c.status}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
