import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink, Loader2, Copy } from "lucide-react";
import { toast } from "sonner";
import { ReportContent } from "./ReportContent";
import { getPublicSiteUrl } from "@/lib/publicUrl";

export default function PesquisaMercadoView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase.from("market_research_reports").select("*").eq("id", id).maybeSingle();
      if (!cancelled) {
        setReport(data);
        setLoading(false);
      }
    };
    load();
    const interval = setInterval(() => {
      if (report?.status === "generating" || !report) load();
    }, 8000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [id, report?.status]);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!report) return <div className="container py-8">Relatório não encontrado</div>;

  const publicUrl = report.public_slug ? `${getPublicSiteUrl()}/pesquisa-mercado/${report.public_slug}` : null;

  return (
    <div className="container mx-auto py-8 max-w-5xl">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
      </Button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{report.job_title} · {report.seniority}</h1>
          <p className="text-sm text-muted-foreground">{[report.location?.city, report.location?.state].filter(Boolean).join(", ")}</p>
        </div>
        <Badge variant={report.status === "ready" ? "default" : report.status === "failed" ? "destructive" : "secondary"}>
          {report.status === "generating" ? "Gerando..." : report.status}
        </Badge>
      </div>

      {report.status === "generating" && (
        <Card className="p-8 text-center">
          <Loader2 className="h-10 w-10 mx-auto animate-spin text-primary mb-4" />
          <h3 className="font-semibold mb-2">Gerando relatório premium...</h3>
          <p className="text-sm text-muted-foreground">Claude + Perplexity + dados internos. Atualiza automaticamente. Tempo médio: 3-6 minutos.</p>
        </Card>
      )}

      {report.status === "failed" && (
        <Card className="p-6 border-destructive">
          <h3 className="font-semibold text-destructive mb-2">Erro na geração</h3>
          <p className="text-sm">{report.error_message || "Erro desconhecido."}</p>
        </Card>
      )}

      {report.status === "ready" && (
        <>
          {publicUrl && (
            <Card className="p-4 mb-6 flex items-center justify-between bg-muted/30">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Link público (white-label)</p>
                <p className="text-sm truncate">{publicUrl}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(publicUrl); toast.success("Link copiado!"); }}>
                  <Copy className="h-3 w-3" />
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href={publicUrl} target="_blank" rel="noreferrer"><ExternalLink className="h-3 w-3" /></a>
                </Button>
              </div>
            </Card>
          )}
          <ReportContent report={report} />
          <div className="mt-6 text-xs text-muted-foreground">
            Créditos consumidos: {Number(report.credits_consumed || 0).toFixed(1)} · Views: {report.view_count || 0}
          </div>
        </>
      )}
    </div>
  );
}
