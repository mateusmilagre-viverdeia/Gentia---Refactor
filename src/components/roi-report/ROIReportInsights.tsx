interface Props {
  insights: any[];
}

export function ROIReportInsights({ insights }: Props) {
  if (!insights?.length) return null;
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold sm:text-2xl">Insights do processo</h2>
      <div className="grid gap-4 md:grid-cols-3">
        {insights.slice(0, 3).map((ins: any, i: number) => (
          <div key={i} className="rounded-lg border bg-card p-4">
            <h3 className="mb-2 break-words font-semibold">{ins.titulo || ins.title || `Insight ${i + 1}`}</h3>
            <p className="break-words text-sm leading-relaxed text-muted-foreground">{ins.descricao || ins.description || "Insight não informado."}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
