import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { History, Briefcase, CheckCircle2, XCircle, LogOut, Ban } from "lucide-react";
import { formatBRTRelative } from "@/lib/datetime";


interface CandidateProcessHistoryProps {
  candidateId: string;
  accountId: string;
}

const statusConfig: Record<string, { label: string; icon: any; color: string }> = {
  hired: { label: "Contratado", icon: CheckCircle2, color: "text-green-600" },
  shortlisted: { label: "Shortlistado", icon: CheckCircle2, color: "text-blue-600" },
  rejected: { label: "Reprovado", icon: XCircle, color: "text-red-500" },
  withdrew: { label: "Desistiu", icon: LogOut, color: "text-amber-500" },
  job_cancelled: { label: "Vaga Cancelada", icon: Ban, color: "text-muted-foreground" },
  unknown: { label: "Desconhecido", icon: Briefcase, color: "text-muted-foreground" },
};

export function CandidateProcessHistory({ candidateId, accountId }: CandidateProcessHistoryProps) {
  const { data: history, isLoading } = useQuery({
    queryKey: ["candidate-process-history", candidateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("candidate_process_history")
        .select("*")
        .eq("candidate_id", candidateId)
        .eq("account_id", accountId)
        .order("participated_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!history || history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <History className="h-4 w-4" />
            Histórico de Processos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum histórico de processos registrado.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <History className="h-4 w-4" />
          Histórico de Processos
          <Badge variant="secondary" className="ml-auto text-xs">
            {history.length} processo(s)
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {history.map((entry: any) => {
            const config = statusConfig[entry.final_status] || statusConfig.unknown;
            const StatusIcon = config.icon;

            return (
              <div
                key={entry.id}
                className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30"
              >
                <StatusIcon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${config.color}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{entry.job_title}</span>
                    <Badge variant="outline" className="text-xs">
                      {config.label}
                    </Badge>
                    {entry.was_shortlisted && (
                      <Badge className="text-xs bg-blue-100 text-blue-700">
                        Shortlistado
                      </Badge>
                    )}
                    {entry.qualification_score && (
                      <Badge variant="secondary" className="text-xs">
                        Score: {entry.qualification_score}
                      </Badge>
                    )}
                  </div>
                  {entry.feedback_notes && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {entry.feedback_notes}
                    </p>
                  )}
                  {entry.rejection_reason && (
                    <p className="text-xs text-red-500 mt-1">
                      Motivo: {entry.rejection_reason}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {entry.participated_at
                      ? formatBRTRelative(new Date(entry.participated_at))
                      : "Data não registrada"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
