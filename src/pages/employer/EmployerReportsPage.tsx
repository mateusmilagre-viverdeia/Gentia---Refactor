import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/hooks/useAccount";
import { EmployerLayout } from "@/components/layout/EmployerLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileText, ExternalLink, Send } from "lucide-react";
import { toast } from "sonner";
import { parseISO } from "date-fns";
import { formatBRT } from "@/lib/datetime";

export default function EmployerReportsPage() {
  const { account } = useAccount();
  const linkedClientId = (account as any)?.employer_linked_client_id;
  const linkedAgencyId = (account as any)?.employer_linked_agency_id;
  const [requesting, setRequesting] = useState(false);

  const { data: linkedClient } = useQuery({
    queryKey: ["employer-report-client", linkedClientId, linkedAgencyId],
    enabled: !!linkedClientId && !!linkedAgencyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clientes_consultoria")
        .select("razao_social, nome_fantasia")
        .eq("id", linkedClientId)
        .eq("account_id", linkedAgencyId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: reports = [], isLoading, isError } = useQuery({
    queryKey: ["employer-reports", linkedClientId, linkedAgencyId],
    enabled: !!linkedClientId && !!linkedAgencyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("process_roi_reports")
        .select("id, public_token, generated_at, views, last_viewed_at, report_data")
        .eq("account_id", linkedAgencyId)
        .eq("client_id", linkedClientId)
        .order("generated_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const requestReport = async () => {
    if (!linkedAgencyId || !account) return;
    setRequesting(true);
    try {
      const { data: admins, error: adminsError } = await supabase
        .from("account_members")
        .select("user_id, role")
        .eq("account_id", linkedAgencyId)
        .eq("is_active", true)
        .in("role", ["owner", "admin", "admin_rh"]);
      if (adminsError) throw adminsError;

      const targets = (admins || []).map((m) => m.user_id);
      const clientName = linkedClient?.nome_fantasia || linkedClient?.razao_social || account.name;
      if (targets.length === 0) {
        toast.error("Não foi possível localizar responsáveis da consultoria");
        return;
      }

      const { error } = await supabase.from("notifications").insert(
        targets.map((uid) => ({
          user_id: uid,
          account_id: linkedAgencyId,
          org_id: linkedAgencyId,
          type: "roi_report_requested",
          title: "📩 Cliente solicitou relatório de processo",
          message: `${clientName} solicitou um relatório de processo pelo Portal Employer. Acesse a área do cliente para revisar relatórios disponíveis ou gerar um novo relatório de ROI.`,
          entity_type: "roi_request",
          target_url: "/atracao-contratacao/recrutamento/clientes",
          link: "/atracao-contratacao/recrutamento/clientes",
          priority: "normal",
        }))
      );
      if (error) throw error;
      toast.success("Solicitação enviada", {
        description: "A consultoria foi notificada e retornará com o relatório do processo.",
      });
    } catch (e: any) {
      toast.error(e?.message || "Falha ao solicitar relatório");
    } finally {
      setRequesting(false);
    }
  };

  return (
    <EmployerLayout>
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Relatórios</h1>
            <p className="text-sm text-muted-foreground">Relatórios de ROI dos seus processos seletivos</p>
          </div>
          <Button onClick={requestReport} variant="outline" disabled={requesting}>
            <Send className="h-4 w-4 mr-2" /> {requesting ? "Enviando..." : "Solicitar relatório de processo"}
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-20" />)}
          </div>
        ) : isError ? (
          <Alert><AlertDescription>Não foi possível carregar os relatórios agora. Tente novamente em instantes.</AlertDescription></Alert>
        ) : reports.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Nenhum relatório disponível ainda.</p>
              <p className="mt-1 text-sm text-muted-foreground">Quando a consultoria gerar relatórios de ROI dos processos, eles aparecerão nesta lista.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {reports.map((r: any) => {
              const meta = r.report_data?.meta || {};
              return (
                <Card key={r.id}>
                  <CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium">{meta.job_title || meta.process_name || "Relatório de processo"}</p>
                      <p className="text-xs text-muted-foreground">
                        Gerado em {formatBRT(parseISO(r.generated_at), "dd/MM/yyyy")} · {r.views || 0} visualizações
                        {r.last_viewed_at ? ` · última em ${formatBRT(parseISO(r.last_viewed_at), "dd/MM/yyyy")}` : ""}
                      </p>
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <a href={`/report/${r.public_token}`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3.5 w-3.5 mr-1" /> Abrir
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </EmployerLayout>
  );
}
