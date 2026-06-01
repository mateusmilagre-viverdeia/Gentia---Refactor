import { cn } from "@/lib/utils";
import type { ConsultantResourceRow, ResourceWeek } from "@/types/resource-planning.types";

function cellBg(utilizationPct: number) {
  // Use semantic tokens (no hard-coded colors).
  if (utilizationPct < 50) return "bg-muted";
  if (utilizationPct <= 80) return "bg-accent";
  return "bg-destructive/15";
}

export function ResourceWeeksHeatmap(props: {
  consultants: ConsultantResourceRow[];
  weeks: ResourceWeek[];
  getEffectiveCapacity?: (consultantId: string, weekIso: string) => number;
}) {
  if (!props.weeks.length || !props.consultants.length) {
    return <div className="text-sm text-muted-foreground">Sem dados para heatmap.</div>;
  }

  return (
    <div className="overflow-auto">
      <div className="min-w-[920px]">
        <div className="grid" style={{ gridTemplateColumns: `260px repeat(${props.weeks.length}, 52px)` }}>
          <div className="sticky left-0 bg-background z-10 text-xs font-medium text-muted-foreground py-2 px-2">Consultor</div>
          {props.weeks.map((w) => (
            <div key={w.iso} className="text-xs text-muted-foreground py-2 text-center">
              {w.label}
            </div>
          ))}

          {props.consultants.map((c) => (
            <div key={c.consultantId} className="contents">
              <div
                className="sticky left-0 bg-background z-10 border-t py-2 px-2 text-sm font-medium"
              >
                {c.consultantName}
              </div>
              {props.weeks.map((w) => (
                (() => {
                  const effective = props.getEffectiveCapacity
                    ? props.getEffectiveCapacity(c.consultantId, w.iso)
                    : c.weeklyCapacityHours;
                  return (
                <div
                  key={`${c.consultantId}-${w.iso}`}
                  className={cn("border-t flex items-center justify-center")}
                  title={`${c.consultantName} — ${w.iso}\nUtilização (média 4 sem): ${c.utilizationPct}%\nCapacidade (semana): ${effective}h`}
                >
                  <div className={cn("h-7 w-9 rounded", cellBg(c.utilizationPct))} />
                </div>
                  );
                })()
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
