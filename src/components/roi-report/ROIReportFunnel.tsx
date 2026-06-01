interface Props {
  funnel: any[];
}

export function ROIReportFunnel({ funnel }: Props) {
  if (!funnel?.length) return null;
  const normalized = funnel.map((f: any) => ({
    ...f,
    count: Number.isFinite(Number(f.count)) ? Number(f.count) : 0,
    conversion_rate: Number.isFinite(Number(f.conversion_rate)) ? Number(f.conversion_rate) : null,
  }));
  const maxFunnel = Math.max(...normalized.map((f: any) => f.count), 1);

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold sm:text-2xl">Funil do processo</h2>
      <div className="space-y-3">
        {normalized.map((f: any, i: number) => {
          const pct = (f.count / maxFunnel) * 100;
          const width = f.count > 0 ? Math.max(pct, 10) : 0;
          return (
            <div key={`${f.stage}-${i}`} className="grid gap-2 sm:grid-cols-[10rem_1fr_5rem] sm:items-center">
              <div className="break-words text-sm text-muted-foreground">{f.stage || `Etapa ${i + 1}`}</div>
              <div className="h-8 overflow-hidden rounded bg-muted">
                <div
                  className="flex h-full items-center justify-end bg-primary px-3 text-sm font-medium text-primary-foreground transition-all"
                  style={{ width: `${width}%` }}
                >
                  {f.count > 0 ? f.count : ""}
                </div>
              </div>
              <div className="text-xs text-muted-foreground sm:text-right">
                {i === 0 ? "base" : f.conversion_rate !== null ? `${(f.conversion_rate * 100).toFixed(0)}%` : "—"}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
