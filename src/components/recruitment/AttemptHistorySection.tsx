import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { Badge } from "@/components/ui/badge";
import { Clock, History, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { formatBRT } from "@/lib/datetime";

interface AttemptHistorySectionProps {
  candidateId: string | null;
  jobId: string | null;
}

interface AttemptRecord {
  id: string;
  session_type: string;
  attempt_number: number;
  score: number | null;
  status: string | null;
  completed_naturally: boolean | null;
  recommendation: string | null;
  summary: Record<string, any>;
  started_at: string | null;
  completed_at: string | null;
  archived_at: string | null;
}

const SESSION_TYPE_LABELS: Record<string, string> = {
  cultural: "Fit Cultural",
  disc: "Fit Comportamental (DISC)",
  technical: "Fit Técnico",
};

export function AttemptHistorySection({ candidateId, jobId }: AttemptHistorySectionProps) {
  const { data: attempts = [], isLoading } = useQuery({
    queryKey: ["attempt-history", candidateId, jobId],
    queryFn: async () => {
      if (!candidateId || !jobId) return [];
      const { data, error } = await supabase
        .from("interview_attempt_history")
        .select("*")
        .eq("candidate_id", candidateId)
        .eq("job_id", jobId)
        .order("session_type", { ascending: true })
        .order("attempt_number", { ascending: true });

      if (error) throw error;
      return (data || []) as AttemptRecord[];
    },
    enabled: !!candidateId && !!jobId,
  });

  if (isLoading || attempts.length === 0) return null;

  // Group by session type
  const grouped = attempts.reduce<Record<string, AttemptRecord[]>>((acc, a) => {
    if (!acc[a.session_type]) acc[a.session_type] = [];
    acc[a.session_type].push(a);
    return acc;
  }, {});

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <History className="h-4 w-4 text-primary" />
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Histórico de Tentativas
        </h4>
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
          {attempts.length} anterior{attempts.length !== 1 ? "es" : ""}
        </Badge>
      </div>

      <div className="space-y-2">
        {Object.entries(grouped).map(([type, records]) => (
          <div key={type} className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">
              {SESSION_TYPE_LABELS[type] || type}
            </p>
            {records.map((attempt) => {
              const scoreVal = attempt.score != null ? Number(attempt.score) : null;
              const isCompleted = attempt.status === "completed";
              const wasAborted = attempt.completed_naturally === false;
              const dateStr = attempt.completed_at || attempt.archived_at;

              return (
                <div
                  key={attempt.id}
                  className="flex items-center justify-between gap-3 px-3 py-2 rounded-md border bg-muted/20 text-sm"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {wasAborted ? (
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    ) : isCompleted && scoreVal != null && scoreVal >= 50 ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                    )}
                    <span className="text-xs truncate">
                      Tentativa {attempt.attempt_number}
                    </span>
                    {wasAborted && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0 text-amber-600 border-amber-300">
                        Abortada
                      </Badge>
                    )}
                    {attempt.recommendation && (
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1 py-0 ${
                          attempt.recommendation === "recommended"
                            ? "text-green-600 border-green-300"
                            : attempt.recommendation === "not_recommended"
                            ? "text-red-600 border-red-300"
                            : "text-amber-600 border-amber-300"
                        }`}
                      >
                        {attempt.recommendation === "recommended"
                          ? "Recomendado"
                          : attempt.recommendation === "not_recommended"
                          ? "Não recomendado"
                          : "Condicional"}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {scoreVal != null && (
                      <span
                        className={`text-xs font-bold ${
                          scoreVal >= 70
                            ? "text-green-600"
                            : scoreVal >= 50
                            ? "text-amber-600"
                            : "text-red-600"
                        }`}
                      >
                        {scoreVal.toFixed(0)}%
                      </span>
                    )}
                    {dateStr && (
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatBRT(new Date(dateStr), "dd/MM/yy")}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
