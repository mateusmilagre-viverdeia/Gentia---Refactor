interface Props {
  kpis: any;
}

function toNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function KpiCard({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="rounded-lg border bg-card p-4 text-center sm:p-6">
      <div className="break-words text-2xl font-bold text-primary sm:text-3xl">{value}</div>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export function ROIReportKPIs({ kpis }: Props) {
  const totalEvaluated = toNumber(kpis.total_evaluated);
  const totalDays = toNumber(kpis.total_days);
  const shortlistScore = toNumber(kpis.shortlist_score_avg);
  const npsAvg = toNumber(kpis.nps_avg);
  const responseRate = toNumber(kpis.response_rate);
  const npsValue = npsAvg !== null ? npsAvg.toFixed(1) : responseRate !== null ? `${responseRate.toFixed(0)}%` : "—";
  const npsLabel = npsAvg !== null ? "NPS médio" : "taxa de resposta";

  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-4">
      <KpiCard value={totalEvaluated ?? 0} label="candidatos avaliados" />
      <KpiCard value={totalDays !== null && totalDays > 0 ? `${totalDays} dias` : "Em andamento"} label="briefing à shortlist/contratação" />
      <KpiCard value={shortlistScore !== null ? shortlistScore.toFixed(1) : "—"} label="score médio shortlist" />
      <KpiCard value={npsValue} label={npsLabel} />
    </section>
  );
}
