import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Lock, Cpu, ExternalLink, AlertTriangle, CheckCircle2 } from "lucide-react";
import { usePlatformCreditConfig } from "@/hooks/usePricingAdmin";
import { useLLMPricingAlerts, useAckPricingAlert } from "@/hooks/useFeatureLLMMapping";
import {
  ALL_MODELS, REALTIME_AUDIO_MODELS, TOKEN_MODELS, DURATION_MODELS,
  usdPerMinute, daysSinceReview, type ModelPricing, type ModelCategory,
} from "@/lib/pricingCalculator";

const CATEGORY_LABEL: Record<ModelCategory, string> = {
  realtime_audio: "Áudio em tempo real",
  text: "Texto (LLM)",
  embedding: "Embeddings",
  whisper: "Transcrição",
  duration: "Fallback por duração",
};

const STALE_DAYS = 120;

function ModelTable({ title, models, usdToBrl, margin }: { title: string; models: ModelPricing[]; usdToBrl: number; margin: number }) {
  const marginMul = 1 + margin / 100;
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Modelo</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead className="text-right">Input</TableHead>
              <TableHead className="text-right">Output</TableHead>
              <TableHead className="text-right">R$/min c/ margem</TableHead>
              <TableHead>Revisado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {models.map(m => {
              const usdMin = usdPerMinute(m);
              const brlMin = usdMin * usdToBrl * marginMul;
              const days = daysSinceReview(m.lastReviewedAt);
              const stale = days !== null && days > STALE_DAYS;
              return (
                <TableRow key={`${m.category}-${m.model}`}>
                  <TableCell className="font-mono text-xs">{m.model}</TableCell>
                  <TableCell><Badge variant="secondary" className="text-xs">{CATEGORY_LABEL[m.category]}</Badge></TableCell>
                  <TableCell className="text-right tabular-nums">${m.inputUsdPer1M.toFixed(4)}</TableCell>
                  <TableCell className="text-right tabular-nums">${m.outputUsdPer1M.toFixed(4)}</TableCell>
                  <TableCell className="text-right tabular-nums">{usdMin > 0 ? `R$ ${brlMin.toFixed(4)}` : "—"}</TableCell>
                  <TableCell>
                    <Badge variant={stale ? "destructive" : "outline"} className="text-xs">
                      {m.lastReviewedAt || "—"} {days !== null && `(${days}d)`}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function LLMCostsTab() {
  const { data: config, isLoading } = usePlatformCreditConfig();
  const { data: alerts } = useLLMPricingAlerts(false);
  const ack = useAckPricingAlert();

  if (isLoading || !config) return <Skeleton className="h-96" />;
  const usdToBrl = Number(config.usd_to_brl);
  const margin = Number(config.margin_percent);
  const staleModels = ALL_MODELS.filter(m => {
    const d = daysSinceReview(m.lastReviewedAt);
    return d !== null && d > STALE_DAYS;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Cpu className="h-4 w-4" />Custos LLM (somente leitura)</CardTitle>
        <CardDescription>
          Preços oficiais dos provedores. Atualização <strong>manual via PR</strong> (provedores não expõem API de pricing).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {(alerts ?? []).length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">⚠ {alerts!.length} divergência(s) detectada(s) pelo monitor automático:</p>
                {alerts!.map(a => (
                  <div key={a.id} className="flex items-center justify-between text-sm border-l-2 border-destructive/40 pl-2">
                    <span>
                      <strong>{a.model}</strong> · {a.field}: provedor publicou <strong>${a.detected_value_usd.toFixed(4)}</strong> (no código: ${a.current_value_usd.toFixed(4)}, delta {a.delta_pct?.toFixed(1)}%)
                      {" — "}<a href={a.source_url} target="_blank" rel="noreferrer" className="underline">fonte</a>
                    </span>
                    <Button size="sm" variant="outline" onClick={() => ack.mutate(a.id)} disabled={ack.isPending}>
                      <CheckCircle2 className="h-3 w-3 mr-1" />Confirmar revisão
                    </Button>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground mt-1">
                  Correção do preço continua manual (via PR em <code className="text-xs">pricingCalculator.ts</code>). Confirmar aqui apenas marca o alerta como visto.
                </p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {staleModels.length > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>{staleModels.length} modelo(s) sem revisão há mais de {STALE_DAYS} dias.</strong> Conferir tabelas oficiais e atualizar <code className="text-xs">lastReviewedAt</code>.
            </AlertDescription>
          </Alert>
        )}

        <Alert>
          <Lock className="h-4 w-4" />
          <AlertDescription className="text-sm">
            Preços hardcoded em <code className="text-xs">src/lib/pricingCalculator.ts</code> e <code className="text-xs">supabase/functions/_shared/ai-credit-consumption.ts</code>.
            Mudanças via PR/code review. O cron <code className="text-xs">monitor-llm-pricing</code> compara semanalmente com as páginas oficiais e dispara alerta no Discord se houver divergência.
            <a href="https://platform.openai.com/docs/pricing" target="_blank" rel="noreferrer" className="ml-1 inline-flex items-center gap-1 text-primary hover:underline">
              OpenAI <ExternalLink className="h-3 w-3" />
            </a>
            <a href="https://ai.google.dev/pricing" target="_blank" rel="noreferrer" className="ml-1 inline-flex items-center gap-1 text-primary hover:underline">
              Google <ExternalLink className="h-3 w-3" />
            </a>
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 rounded-lg border bg-muted/40 p-4 text-sm">
          <div><span className="text-muted-foreground">USD→BRL:</span> <strong>R$ {usdToBrl.toFixed(2)}</strong></div>
          <div><span className="text-muted-foreground">Margem:</span> <strong>{margin}%</strong></div>
          <div><span className="text-muted-foreground">Modelos:</span> <strong>{ALL_MODELS.length}</strong></div>
        </div>

        <ModelTable title="Áudio em tempo real (entrevistas de voz)" models={REALTIME_AUDIO_MODELS} usdToBrl={usdToBrl} margin={margin} />
        <ModelTable title="Texto e Embeddings" models={TOKEN_MODELS} usdToBrl={usdToBrl} margin={margin} />
        <ModelTable title="Fallback por duração" models={DURATION_MODELS} usdToBrl={usdToBrl} margin={margin} />
      </CardContent>
    </Card>
  );
}
