import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { ReportContent } from "./ReportContent";

export default function PublicMarketReportPage() {
  const { slug } = useParams();
  const [report, setReport] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/market-research-public?slug=${slug}`;
    fetch(url)
      .then(async (r) => {
        if (!r.ok) {
          const e = await r.json().catch(() => ({}));
          throw new Error(e.error || "Não encontrado");
        }
        return r.json();
      })
      .then(setReport)
      .catch((e) => setError(e.message));
  }, [slug]);

  if (error) return <div className="container py-12 text-center">{error}</div>;
  if (!report) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const branding = report.branding || {};
  const primary = branding.primary_color || "#3B82F6";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b" style={{ borderTopWidth: 4, borderTopColor: primary }}>
        <div className="container mx-auto py-6 flex items-center justify-between max-w-5xl">
          <div>
            {branding.consultancy_name && <p className="text-xs text-muted-foreground">Por {branding.consultancy_name}</p>}
            <h1 className="text-xl font-bold">Pesquisa de Mercado · {report.job_title}</h1>
            {branding.client_name && <p className="text-sm text-muted-foreground">Preparado para {branding.client_name}</p>}
          </div>
          {branding.logo_url && <img src={branding.logo_url} alt="" className="h-10" />}
        </div>
      </header>
      <main className="container mx-auto py-8 max-w-5xl">
        <Card className="p-4 mb-6 text-sm text-muted-foreground">
          <strong>{report.seniority}</strong> · {[report.location?.city, report.location?.state].filter(Boolean).join(", ")} · {report.location?.work_model || ""} · Gerado em {new Date(report.generation_completed_at).toLocaleDateString("pt-BR")}
        </Card>
        <ReportContent report={report} />
        <footer className="mt-12 pt-6 border-t text-center text-xs text-muted-foreground">
          Relatório gerado por inteligência artificial · Powered by GENTIA · Validade 90 dias
        </footer>
      </main>
    </div>
  );
}
