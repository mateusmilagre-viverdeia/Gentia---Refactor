import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Props { report: any }

const fmtBRL = (n?: number) =>
  typeof n === "number"
    ? n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })
    : "—";

export function ReportContent({ report }: Props) {
  const summary = report.executive_summary || {};
  const comp = report.compensation_block || {};
  const tal = report.talent_intelligence_block || {};
  const cmp = report.competitive_block || {};
  const dia = report.diagnosis_block || {};
  const cit = report.citations || [];
  const sq = comp.salary_quartiles || {};

  return (
    <div className="space-y-6">
      {/* Executive Summary */}
      {(summary.headline || summary.bullets) && (
        <Card className="p-6 bg-gradient-to-br from-primary/5 to-transparent">
          <h2 className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Sumário Executivo</h2>
          {summary.headline && <h3 className="text-xl font-bold mb-4">{summary.headline}</h3>}
          {summary.bullets?.length > 0 && (
            <ul className="space-y-2">
              {summary.bullets.map((b: string, i: number) => (
                <li key={i} className="flex gap-2 text-sm"><span className="text-primary">•</span>{b}</li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {/* Compensation */}
      <Card className="p-6">
        <h2 className="text-lg font-bold mb-3">💰 Pacote de Remuneração</h2>
        {comp.narrative && <p className="text-sm mb-4 text-muted-foreground">{comp.narrative}</p>}
        {sq.median && (
          <div className="grid grid-cols-5 gap-2 mb-4 text-center">
            {[
              ["Mín", sq.min], ["P25", sq.p25], ["Mediana", sq.median], ["P75", sq.p75], ["Máx", sq.max]
            ].map(([label, val]: any) => (
              <div key={label} className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">{label}</div>
                <div className="font-bold">{fmtBRL(val)}</div>
              </div>
            ))}
          </div>
        )}
        {comp.benefits?.length > 0 && (
          <div className="mt-4">
            <h4 className="font-semibold text-sm mb-2">Benefícios típicos</h4>
            <div className="flex flex-wrap gap-2">
              {comp.benefits.map((b: any, i: number) => (
                <Badge key={i} variant="secondary">{b.name}{b.adoption_pct ? ` · ${b.adoption_pct}%` : ""}</Badge>
              ))}
            </div>
          </div>
        )}
        {comp.key_insights?.length > 0 && (
          <ul className="mt-4 space-y-1 text-sm">
            {comp.key_insights.map((i: string, k: number) => <li key={k}>→ {i}</li>)}
          </ul>
        )}
      </Card>

      {/* Talent Intelligence */}
      <Card className="p-6">
        <h2 className="text-lg font-bold mb-3">🎯 Inteligência de Talentos</h2>
        {tal.narrative && <p className="text-sm mb-4 text-muted-foreground">{tal.narrative}</p>}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">Pool estimado</div>
            <div className="font-bold">{tal.pool_size_estimate?.value?.toLocaleString("pt-BR") || "—"}</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">Escassez (1-10)</div>
            <div className="font-bold">{tal.scarcity_index?.score || "—"}</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">Tempo médio fechamento</div>
            <div className="font-bold">{tal.avg_time_to_fill_days ? `${tal.avg_time_to_fill_days} dias` : "—"}</div>
          </div>
        </div>
        {tal.key_insights?.length > 0 && (
          <ul className="space-y-1 text-sm">{tal.key_insights.map((i: string, k: number) => <li key={k}>→ {i}</li>)}</ul>
        )}
      </Card>

      {/* Competitive */}
      <Card className="p-6">
        <h2 className="text-lg font-bold mb-3">⚔️ Análise Competitiva</h2>
        {cmp.narrative && <p className="text-sm mb-4 text-muted-foreground">{cmp.narrative}</p>}
        {cmp.competitors?.length > 0 && (
          <div className="space-y-3">
            {cmp.competitors.map((c: any, i: number) => (
              <div key={i} className="border-l-2 border-primary pl-3">
                <h4 className="font-semibold">{c.name}</h4>
                <p className="text-sm text-muted-foreground">{c.evp}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Diagnosis */}
      <Card className="p-6 bg-gradient-to-br from-amber-500/5 to-transparent">
        <h2 className="text-lg font-bold mb-3">🩺 Diagnóstico & Recomendações</h2>
        {dia.executive_assessment && <p className="text-sm mb-4 whitespace-pre-line">{dia.executive_assessment}</p>}
        {dia.closing_risk && (
          <div className="mb-4">
            <strong className="text-sm">Risco de não-fechamento: </strong>
            <Badge variant={dia.closing_risk.level === "high" ? "destructive" : "secondary"}>{dia.closing_risk.level}</Badge>
          </div>
        )}
        {dia.prioritized_actions?.length > 0 && (
          <div>
            <h4 className="font-semibold text-sm mb-2">Ações priorizadas</h4>
            <ol className="space-y-2 text-sm list-decimal list-inside">
              {dia.prioritized_actions.map((a: any, i: number) => (
                <li key={i}>
                  <strong>{a.action}</strong> <Badge variant="outline" className="ml-1 text-xs">impacto {a.impact} · esforço {a.effort}</Badge>
                  {a.why && <p className="text-muted-foreground ml-6 text-xs">{a.why}</p>}
                </li>
              ))}
            </ol>
          </div>
        )}
      </Card>

      {/* Citations */}
      {cit.length > 0 && (
        <Card className="p-6">
          <h3 className="font-semibold text-sm mb-2">Fontes</h3>
          <ol className="space-y-1 text-xs text-muted-foreground">
            {cit.map((c: any) => (
              <li key={c.index}>[{c.index}] <a href={c.url} target="_blank" rel="noreferrer" className="underline">{c.url}</a></li>
            ))}
          </ol>
        </Card>
      )}
    </div>
  );
}
