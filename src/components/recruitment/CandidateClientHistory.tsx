import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Building2 } from "lucide-react";
import { formatBRT } from "@/lib/datetime";

interface CandidateClientHistoryProps {
  candidateId: string | null;
  currentJobId: string | null;
}

export function CandidateClientHistory({ candidateId, currentJobId }: CandidateClientHistoryProps) {
  const { data: history = [], isLoading } = useQuery({
    queryKey: ["candidate-client-history", candidateId, currentJobId],
    queryFn: async () => {
      if (!candidateId || !currentJobId) return [];

      // Get current job's cliente_id
      const { data: currentJob } = await supabase
        .from("recruitment_jobs")
        .select("cliente_id")
        .eq("id", currentJobId)
        .maybeSingle();

      if (!currentJob?.cliente_id) return [];

      // Get all applications of this candidate in jobs from the same client
      const { data: apps, error } = await supabase
        .from("recruitment_applications")
        .select("id, status, applied_at, job:recruitment_jobs!inner(id, title, cliente_id)")
        .eq("candidate_id", candidateId)
        .neq("job_id", currentJobId);

      if (error) throw error;

      // Filter to same client
      const sameClientApps = (apps || []).filter(
        (a: any) => a.job?.cliente_id === currentJob.cliente_id
      );

      // Get feedbacks for this candidate from same client
      const { data: feedbacks } = await supabase
        .from("portal_feedbacks")
        .select("id, decisao, motivo, created_at, vaga_id")
        .eq("candidato_id", candidateId)
        .eq("cliente_id", currentJob.cliente_id);

      return sameClientApps.map((app: any) => {
        const feedback = (feedbacks || []).find((f: any) => f.vaga_id === app.job?.id);
        return {
          jobTitle: app.job?.title || "Vaga",
          appliedAt: app.applied_at,
          status: app.status,
          clientDecision: feedback?.decisao || null,
          clientComment: feedback?.motivo || null,
        };
      });
    },
    enabled: !!candidateId && !!currentJobId,
  });

  if (isLoading || history.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4 text-primary" />
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Histórico com este Cliente
        </h4>
      </div>
      <div className="pl-6 space-y-2">
        {history.map((entry, i) => (
          <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded-md bg-muted/30">
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{entry.jobTitle}</p>
              <p className="text-xs text-muted-foreground">
                {formatBRT(entry.appliedAt, "dd/MM/yyyy")}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="secondary" className="text-[10px]">
                {entry.status}
              </Badge>
              {entry.clientDecision && (
                <Badge
                  variant={entry.clientDecision === "aprovado" ? "success" : entry.clientDecision === "rejeitado" ? "destructive" : "info"}
                  className="text-[10px]"
                >
                  {entry.clientDecision === "aprovado" ? "Aprovado" : entry.clientDecision === "rejeitado" ? "Rejeitado" : entry.clientDecision}
                </Badge>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
