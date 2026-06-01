import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useEPRole } from "@/hooks/useEPRole";
import { useEPPartnerFinancials } from "@/hooks/useEPPartnerFinancials";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, Download, FileBarChart } from "lucide-react";
import { FinancialSummaryCards } from "@/components/partner/FinancialSummaryCards";
import { FinancialChart } from "@/components/partner/FinancialChart";
import { FinancialHistoryTable } from "@/components/partner/FinancialHistoryTable";
import { generateFinancialReportPDF } from "@/utils/generateRoyaltiesReport";
import { toast } from "sonner";

export default function SocioFinanceiro() {
  const navigate = useNavigate();
  const { isEPPartner, isSuperAdmin, loading: roleLoading } = useEPRole();
  const { 
    royalties, 
    directSales, 
    monthlyData, 
    summary, 
    loading, 
    error, 
    refresh 
  } = useEPPartnerFinancials();

  useEffect(() => {
    if (!roleLoading && !isEPPartner && !isSuperAdmin) {
      navigate('/');
    }
  }, [roleLoading, isEPPartner, isSuperAdmin, navigate]);

  const handleExport = () => {
    try {
      generateFinancialReportPDF(
        { monthlyData, summary, royalties, directSales },
        { title: 'RELATÓRIO FINANCEIRO - ENCONTRO DE CONTAS' }
      );
      toast.success("Relatório exportado com sucesso!");
    } catch (err) {
      console.error('Error exporting report:', err);
      toast.error("Erro ao exportar relatório");
    }
  };

  const breadcrumb = [
    { label: "Sócio EP", href: "/socio/dashboard" },
    { label: "Financeiro" }
  ];

  if (roleLoading || loading) {
    return (
      <AppLayout title="Financeiro" breadcrumb={breadcrumb}>
        <div className="p-6 space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
          <Skeleton className="h-[350px]" />
          <Skeleton className="h-64" />
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout title="Financeiro" breadcrumb={breadcrumb}>
        <div className="p-6">
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Erro</CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Financeiro" breadcrumb={breadcrumb}>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <FileBarChart className="h-6 w-6 text-primary" />
              Relatório Financeiro
            </h1>
            <p className="text-muted-foreground">
              Acompanhe seus royalties, comissões e encontro de contas
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleExport}
              disabled={monthlyData.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar PDF
            </Button>
            <Button variant="outline" size="sm" onClick={refresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <FinancialSummaryCards summary={summary} />

        {/* Chart */}
        <FinancialChart monthlyData={monthlyData} />

        {/* History Table */}
        <FinancialHistoryTable monthlyData={monthlyData} />
      </div>
    </AppLayout>
  );
}
