import { usePortalJobFunnel } from "@/hooks/usePortalJobFunnel";
import { Search, ListChecks, MessageCircle, Brain, Code, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

interface PortalJobFunnelBarProps {
  token: string;
  jobId: string;
  currentStage?: string | null;
}

const STAGES = [
  { key: "searching" as const, label: "Buscando", icon: Search },
  { key: "screening" as const, label: "Triagem", icon: ListChecks },
  { key: "cultural" as const, label: "Cultural", icon: MessageCircle },
  { key: "disc" as const, label: "DISC", icon: Brain },
  { key: "technical" as const, label: "Técnica", icon: Code },
  { key: "shortlist" as const, label: "Shortlist", icon: Trophy },
];

export function PortalJobFunnelBar({ token, jobId, currentStage }: PortalJobFunnelBarProps) {
  const { data: counts, isLoading } = usePortalJobFunnel(token, jobId);

  return (
    <div className="w-full">
      <div className="flex items-stretch gap-1 sm:gap-2">
        {STAGES.map((stage, idx) => {
          const Icon = stage.icon;
          const count = counts?.[stage.key] ?? 0;
          const isActive = currentStage === stage.key || (count > 0 && idx === STAGES.findIndex(s => (counts?.[s.key] ?? 0) > 0));
          const hasPassed = STAGES.slice(0, idx).some(s => (counts?.[s.key] ?? 0) > 0);

          return (
            <div
              key={stage.key}
              className={cn(
                "flex-1 rounded-md border p-2 text-center transition-all",
                isActive
                  ? "border-primary bg-primary/5 shadow-sm"
                  : hasPassed
                  ? "border-border bg-muted/30"
                  : "border-border bg-background"
              )}
            >
              <div className="flex flex-col items-center gap-1">
                <Icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-muted-foreground")} />
                <span className={cn("text-xs font-medium leading-none", isActive ? "text-foreground" : "text-muted-foreground")}>
                  {stage.label}
                </span>
                <span className={cn(
                  "text-lg font-bold tabular-nums leading-none mt-1",
                  isActive ? "text-primary" : count > 0 ? "text-foreground" : "text-muted-foreground/50"
                )}>
                  {isLoading ? "—" : count}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
