import { ReactNode } from "react";
import { CheckCircle2, AlertCircle, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ExecutiveSummarySectionProps {
  title: string;
  icon: ReactNode;
  isComplete: boolean;
  onNavigate?: () => void;
  children: ReactNode;
}

export function ExecutiveSummarySection({
  title,
  icon,
  isComplete,
  onNavigate,
  children,
}: ExecutiveSummarySectionProps) {
  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-xl">{icon}</span>
          <h2 className="text-lg font-semibold">{title}</h2>
          {isComplete ? (
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          ) : (
            <AlertCircle className="h-5 w-5 text-amber-500" />
          )}
        </div>
        {onNavigate && !isComplete && (
          <Button variant="ghost" size="sm" onClick={onNavigate} className="text-xs">
            Preencher <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
      <div className="pl-9">
        {isComplete ? (
          children
        ) : (
          <p className="text-muted-foreground italic text-sm">
            Este pilar ainda não foi preenchido.
          </p>
        )}
      </div>
    </section>
  );
}
