import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, ExternalLink, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatBRT } from "@/lib/datetime";

interface ReportViewsTrackerProps {
  jobId: string;
}

export function ReportViewsTracker({ jobId }: ReportViewsTrackerProps) {
  const { data: reports = [] } = useQuery({
    queryKey: ["shortlist-reports-views", jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shortlist_relatorios")
        .select("id, titulo, token_publico, visualizacoes, created_at, updated_at")
        .eq("vaga_id", jobId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  if (reports.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Relatórios Gerados
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {reports.map((r: any) => (
          <div key={r.id} className="flex items-center justify-between p-2 rounded-lg border text-sm">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-medium truncate">{r.titulo}</span>
              <Badge variant="secondary" className="text-[10px] gap-1 shrink-0">
                <Eye className="h-3 w-3" />
                {r.visualizacoes || 0} visualizações
              </Badge>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-muted-foreground">
                {formatBRT(r.created_at, "dd/MM/yyyy")}
              </span>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => window.open(`${window.location.origin}/relatorio/${r.token_publico}`, "_blank")}
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
