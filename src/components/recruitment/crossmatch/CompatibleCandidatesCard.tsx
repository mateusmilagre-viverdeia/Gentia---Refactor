import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

interface Props {
  jobId: string;
  accountId: string;
}

export function CompatibleCandidatesCard({ jobId, accountId }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["compatible-cross-match", jobId, accountId],
    queryFn: async () => {
      if (!jobId || !accountId) return { count: 0, avgScore: 0 };
      const { data, error } = await supabase
        .from("recruitment_cross_match_suggestions")
        .select("match_score, status")
        .eq("account_id", accountId)
        .eq("suggested_job_id", jobId)
        .eq("status", "pending");
      if (error) throw error;
      const list = data || [];
      const avg = list.length > 0 ? Math.round(list.reduce((s, r: any) => s + (r.match_score || 0), 0) / list.length) : 0;
      return { count: list.length, avgScore: avg };
    },
    enabled: !!jobId && !!accountId,
  });

  if (isLoading) return null;
  if (!data || data.count === 0) return null;

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
      <CardContent className="p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold">
              {data.count} candidato{data.count > 1 ? "s" : ""} compatíve{data.count > 1 ? "is" : "l"} no banco
            </p>
            <p className="text-xs text-muted-foreground">
              Score médio: {data.avgScore}% — sugestões aguardando revisão
            </p>
          </div>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link to={`/atracao-contratacao/recrutamento/hunting?tab=crossmatch&jobId=${jobId}`}>
            Ver sugestões
            <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
