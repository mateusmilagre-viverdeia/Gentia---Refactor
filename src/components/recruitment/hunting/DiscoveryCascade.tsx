import { CheckCircle2, XCircle, MinusCircle, AlertCircle, Ban, Database } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

export type CascadeStep = {
  step: string;
  status: "ok" | "no_match" | "error" | "skipped" | "limit_reached" | "cache_hit";
  source?: string;
  email?: string | null;
  phone?: string | null;
  cost_credits?: number;
  detail?: string;
};

const STEP_LABELS: Record<string, string> = {
  override: "Manual",
  cache: "Cache",
  apollo: "Apollo",
  firecrawl_search: "Busca web (Firecrawl)",
  firecrawl_scrape: "Site da empresa (Firecrawl)",
  ai_extract: "Extração IA",
  heuristic: "Heurística",
};

function StatusIcon({ status }: { status: CascadeStep["status"] }) {
  if (status === "ok" || status === "cache_hit") return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
  if (status === "no_match") return <MinusCircle className="h-3.5 w-3.5 text-muted-foreground" />;
  if (status === "skipped") return <MinusCircle className="h-3.5 w-3.5 text-muted-foreground/60" />;
  if (status === "error") return <AlertCircle className="h-3.5 w-3.5 text-amber-500" />;
  if (status === "limit_reached") return <Ban className="h-3.5 w-3.5 text-orange-500" />;
  return <XCircle className="h-3.5 w-3.5 text-destructive" />;
}

interface Props {
  cascade?: CascadeStep[] | null;
  totalCost?: number;
  fromCache?: boolean;
}

export function DiscoveryCascade({ cascade, totalCost, fromCache }: Props) {
  if (!cascade || cascade.length === 0) return null;

  const successfulSteps = cascade.filter((s) => s.status === "ok" || s.status === "cache_hit").length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border/50 rounded-md px-2 py-1 bg-muted/30 hover:bg-muted/60 transition-colors">
          <Database className="h-3 w-3" />
          <span>Cascata: {successfulSteps}/{cascade.length} etapas</span>
          {fromCache && <Badge variant="outline" className="h-4 px-1 text-[10px]">cache</Badge>}
          {typeof totalCost === "number" && totalCost > 0 && (
            <span className="text-[10px] text-muted-foreground/80">· {totalCost.toFixed(2)} cr</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-3">
        <p className="text-xs font-semibold mb-2">Cascata de descoberta de contato</p>
        <ul className="space-y-1.5">
          {cascade.map((s, i) => (
            <li key={i} className="flex items-start gap-2 text-xs">
              <StatusIcon status={s.status} />
              <div className="flex-1 min-w-0">
                <div className="font-medium">{STEP_LABELS[s.step] ?? s.step}</div>
                {s.email && <div className="text-muted-foreground truncate">📧 {s.email}</div>}
                {s.phone && <div className="text-muted-foreground truncate">📱 {s.phone}</div>}
                {s.detail && <div className="text-muted-foreground/80 text-[11px]">{s.detail}</div>}
                {s.source && !s.email && !s.phone && <div className="text-muted-foreground/80 text-[11px] truncate">{s.source}</div>}
              </div>
              {typeof s.cost_credits === "number" && s.cost_credits > 0 && (
                <span className="text-[10px] text-muted-foreground/70 shrink-0">{s.cost_credits} cr</span>
              )}
            </li>
          ))}
        </ul>
        {typeof totalCost === "number" && (
          <p className="text-[11px] text-muted-foreground mt-2 pt-2 border-t">
            Custo total desta descoberta: <span className="font-medium">{totalCost.toFixed(2)} créditos</span>
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}
