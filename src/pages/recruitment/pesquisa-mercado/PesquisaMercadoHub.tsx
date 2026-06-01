import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Plus, ExternalLink, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function PesquisaMercadoHub() {
  const { currentOrganization } = useOrganization();
  const navigate = useNavigate();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentOrganization?.id) return;
    (async () => {
      const { data, error } = await supabase
        .from("market_research_reports")
        .select("id, job_title, seniority, location, status, public_slug, created_at, view_count, credits_consumed")
        .eq("account_id", currentOrganization.id)
        .order("created_at", { ascending: false });
      if (error) toast.error("Erro ao carregar relatórios");
      setReports(data || []);
      setLoading(false);
    })();
  }, [currentOrganization?.id]);

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
      </Button>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <LineChart className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Pesquisa de Mercado</h1>
            <p className="text-sm text-muted-foreground">Relatórios premium de remuneração e talento por IA</p>
          </div>
        </div>
        <Button onClick={() => navigate("/atracao-contratacao/recrutamento/pesquisa-mercado/novo")}>
          <Plus className="h-4 w-4 mr-2" /> Novo relatório
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : reports.length === 0 ? (
        <Card className="p-12 text-center">
          <LineChart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">Nenhum relatório ainda</h3>
          <p className="text-sm text-muted-foreground mb-4">Crie seu primeiro report de pesquisa de mercado.</p>
          <Button onClick={() => navigate("/atracao-contratacao/recrutamento/pesquisa-mercado/novo")}>
            <Plus className="h-4 w-4 mr-2" /> Criar relatório
          </Button>
        </Card>
      ) : (
        <div className="grid gap-3">
          {reports.map((r) => (
            <Card key={r.id} className="p-4 flex items-center justify-between hover:shadow-md transition">
              <Link to={`/atracao-contratacao/recrutamento/pesquisa-mercado/${r.id}`} className="flex-1">
                <div className="flex items-center gap-3">
                  <div>
                    <h3 className="font-semibold">{r.job_title} · {r.seniority}</h3>
                    <p className="text-xs text-muted-foreground">
                      {[r.location?.city, r.location?.state].filter(Boolean).join(", ") || "—"} · {new Date(r.created_at).toLocaleDateString("pt-BR")} · {Number(r.credits_consumed || 0).toFixed(1)} créditos · {r.view_count || 0} views
                    </p>
                  </div>
                </div>
              </Link>
              <div className="flex items-center gap-2">
                <Badge variant={r.status === "ready" ? "default" : r.status === "failed" ? "destructive" : "secondary"}>
                  {r.status === "generating" ? "Gerando..." : r.status}
                </Badge>
                {r.status === "ready" && r.public_slug && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={`/pesquisa-mercado/${r.public_slug}`} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
