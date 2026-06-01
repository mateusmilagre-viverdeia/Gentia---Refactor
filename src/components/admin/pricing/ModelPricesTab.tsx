import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Lock, Cpu, ExternalLink } from "lucide-react";
import { usePlatformCreditConfig } from "@/hooks/usePricingAdmin";
import {
  ALL_MODELS,
  REALTIME_AUDIO_MODELS,
  TOKEN_MODELS,
  DURATION_MODELS,
  usdPerMinute,
  type ModelPricing,
  type ModelCategory,
} from "@/lib/pricingCalculator";

const CATEGORY_LABEL: Record<ModelCategory, string> = {
  realtime_audio: "Áudio em tempo real",
  text: "Texto (LLM)",
  embedding: "Embeddings",
  whisper: "Transcrição (Whisper)",
  duration: "Áudio (fallback por duração)",
};

function ModelTable({ title, models, usdToBrl, margin }: { title: string; models: ModelPricing[]; usdToBrl: number; margin: number }) {
  const marginMul = 1 + margin / 100;
  const unitLabel = (m: ModelPricing) =>
    m.category === 'duration' || m.category === 'whisper' ? 'USD/min' : 'USD/1M tokens';

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
              <TableHead>Unidade</TableHead>
              <TableHead className="text-right">Custo/min (BRL c/ margem)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {models.map((m) => {
              const usdMin = usdPerMinute(m);
              const brlMin = usdMin * usdToBrl * marginMul;
              return (
                <TableRow key={`${m.category}-${m.model}`}>
                  <TableCell className="font-mono text-xs">{m.model}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">{CATEGORY_LABEL[m.category]}</Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">${m.inputUsdPer1M.toFixed(4)}</TableCell>
                  <TableCell className="text-right tabular-nums">${m.outputUsdPer1M.toFixed(4)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{unitLabel(m)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {usdMin > 0 ? `R$ ${brlMin.toFixed(4)}` : <span className="text-muted-foreground">—</span>}
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

export function ModelPricesTab() {
  const { data: config, isLoading } = usePlatformCreditConfig();

  if (isLoading || !config) return <Skeleton className="h-96" />;

  const usdToBrl = Number(config.usd_to_brl);
  const margin = Number(config.margin_percent);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cpu className="h-4 w-4" /> Modelos LLM (somente leitura)
        </CardTitle>
        <CardDescription>
          Preços oficiais por token cobrados pelos provedores (OpenAI, Google, Anthropic, Perplexity).
          A cotação USD→BRL e a margem aplicada vêm da aba <strong>Conversão</strong>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <Lock className="h-4 w-4" />
          <AlertDescription className="text-sm">
            Estes preços são <strong>hardcoded</strong> em <code className="text-xs">supabase/functions/_shared/ai-credit-consumption.ts</code> e em
            <code className="text-xs"> src/lib/pricingCalculator.ts</code>. Mudanças apenas via PR/code review — um erro de digitação aqui afetaria a cobrança de
            todas as contas. Os provedores não expõem API pública de preços; a atualização é manual quando OpenAI/Google publicam novos valores.
            <a
              href="https://platform.openai.com/docs/pricing"
              target="_blank"
              rel="noreferrer"
              className="ml-1 inline-flex items-center gap-1 text-primary hover:underline"
            >
              Tabela oficial OpenAI <ExternalLink className="h-3 w-3" />
            </a>
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 rounded-lg border bg-muted/40 p-4 text-sm">
          <div><span className="text-muted-foreground">USD→BRL (editável):</span> <strong>R$ {usdToBrl.toFixed(2)}</strong></div>
          <div><span className="text-muted-foreground">Margem (editável):</span> <strong>{margin}%</strong></div>
          <div><span className="text-muted-foreground">Modelos cadastrados:</span> <strong>{ALL_MODELS.length}</strong></div>
        </div>

        <ModelTable title="Áudio em tempo real (entrevistas de voz)" models={REALTIME_AUDIO_MODELS} usdToBrl={usdToBrl} margin={margin} />
        <ModelTable title="Texto e Embeddings" models={TOKEN_MODELS} usdToBrl={usdToBrl} margin={margin} />
        <ModelTable title="Fallback por duração (quando tokens não estão disponíveis)" models={DURATION_MODELS} usdToBrl={usdToBrl} margin={margin} />
      </CardContent>
    </Card>
  );
}
