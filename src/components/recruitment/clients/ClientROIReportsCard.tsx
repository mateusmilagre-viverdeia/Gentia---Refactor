import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, FileText, Eye, Clock, Copy } from "lucide-react";
import { useROIReportsForClient } from "@/hooks/useROIReport";
import { parseISO } from "date-fns";
import { toast } from "sonner";
import { formatBRT } from "@/lib/datetime";

interface Props {
  clientId: string;
}

export function ClientROIReportsCard({ clientId }: Props) {
  const { data: reports = [], isLoading } = useROIReportsForClient(clientId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4" /> Relatórios de processo
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : reports.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum relatório gerado ainda.</p>
        ) : (
          <div className="space-y-2">
            {reports.map((r: any) => {
              const meta = (r.report_data as any)?.meta || {};
              const reportUrl = `${window.location.origin}/report/${r.public_token}`;
              return (
                <div key={r.id} className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{meta.job_title || "Vaga"}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>Gerado em {formatBRT(parseISO(r.generated_at), "dd/MM/yyyy")}</span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {r.last_viewed_at ? `Última visualização em ${formatBRT(parseISO(r.last_viewed_at), "dd/MM/yyyy")}` : "Ainda não visualizado"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="gap-1 text-[10px]">
                      <Eye className="h-3 w-3" /> {r.views || 0}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`/report/${r.public_token}`, "_blank")}
                    >
                      <ExternalLink className="h-3.5 w-3.5 mr-1" /> Abrir
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard?.writeText(reportUrl);
                        toast.success("Link do relatório copiado");
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
