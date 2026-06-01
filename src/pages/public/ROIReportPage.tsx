import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ROIReportHeader } from "@/components/roi-report/ROIReportHeader";
import { ROIReportCover } from "@/components/roi-report/ROIReportCover";
import { ROIReportSummary } from "@/components/roi-report/ROIReportSummary";
import { ROIReportKPIs } from "@/components/roi-report/ROIReportKPIs";
import { ROIReportFunnel } from "@/components/roi-report/ROIReportFunnel";
import { ROIReportHired } from "@/components/roi-report/ROIReportHired";
import { ROIReportInsights } from "@/components/roi-report/ROIReportInsights";
import { ROIReportFooter } from "@/components/roi-report/ROIReportFooter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function ROIReportPage() {
  const { public_token } = useParams<{ public_token: string }>();

  const { data: report, isLoading } = useQuery({
    queryKey: ["public-roi-report", public_token],
    enabled: !!public_token,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_roi_report_by_token" as any, {
        _public_token: public_token!,
      });
      if (error) throw error;
      return Array.isArray(data) ? data[0] : data;
    },
  });

  useEffect(() => {
    if (!public_token || !report?.id) return;
    supabase.rpc("increment_roi_report_view" as any, { _public_token: public_token }).then(() => {});
  }, [public_token, report?.id]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md space-y-5 rounded-lg border bg-card p-6 text-center shadow-sm">
          <div className="space-y-2">
            <p className="text-lg font-semibold">Preparando relatório...</p>
            <p className="text-sm text-muted-foreground">Carregando dados do processo seletivo.</p>
          </div>
          <div className="space-y-3">
            <Skeleton className="mx-auto h-3 w-48" />
            <Skeleton className="h-20 w-full" />
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-lg space-y-4 rounded-lg border bg-card p-6 text-center shadow-sm">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold">Relatório não encontrado</h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              O link pode estar incorreto, expirado ou indisponível. Solicite um novo acesso à consultoria responsável pelo processo.
            </p>
          </div>
          <Button asChild variant="outline">
            <a href="/">Voltar para a página inicial</a>
          </Button>
        </div>
      </div>
    );
  }

  const data = (report.report_data as any) || {};
  const meta = data.meta || {};

  return (
    <div className="min-h-screen bg-background">
      <ROIReportHeader meta={meta} />
      <main className="mx-auto max-w-5xl space-y-12 px-4 py-8 sm:space-y-16 sm:px-6 sm:py-12">
        <ROIReportCover meta={meta} />
        <ROIReportSummary text={data.executive_summary} />
        <ROIReportKPIs kpis={data.kpis || {}} />
        <ROIReportFunnel funnel={data.funnel || []} />
        <ROIReportHired hired={data.hired_candidate} />
        <ROIReportInsights insights={data.insights || []} />
        <ROIReportFooter meta={meta} consultancyName={meta.consultancy_name} />
      </main>
    </div>
  );
}
