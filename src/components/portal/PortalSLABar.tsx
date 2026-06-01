import { differenceInBusinessDays, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

interface PortalSLABarProps {
  createdAt: string;
  prazoEntregaDias?: number | null;
}

export function getRemainingPct(createdAt: string, prazoEntregaDias?: number | null): number {
  const totalDays = prazoEntregaDias || 15;
  let elapsed = 0;
  try {
    elapsed = Math.max(0, differenceInBusinessDays(new Date(), parseISO(createdAt)));
  } catch {
    elapsed = 0;
  }
  const remaining = Math.max(0, totalDays - elapsed);
  return Math.max(0, Math.min(100, (remaining / totalDays) * 100));
}

export function PortalSLABar({ createdAt, prazoEntregaDias }: PortalSLABarProps) {
  const totalDays = prazoEntregaDias || 15;
  let elapsed = 0;
  try {
    elapsed = Math.max(0, differenceInBusinessDays(new Date(), parseISO(createdAt)));
  } catch {
    elapsed = 0;
  }
  const remaining = Math.max(0, totalDays - elapsed);
  const pct = Math.min(100, (elapsed / totalDays) * 100);
  const remainingPct = 100 - pct;

  const colorClass =
    remainingPct > 40 ? "bg-green-500" : remainingPct >= 20 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="space-y-1">
      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
        <div
          className={cn("h-full transition-all", colorClass)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[11px] text-muted-foreground tabular-nums">
        {remaining} {remaining === 1 ? "dia útil restante" : "dias úteis restantes"} de {totalDays} acordados
      </p>
    </div>
  );
}
