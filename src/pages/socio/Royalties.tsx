import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useEPRole } from "@/hooks/useEPRole";
import { useEPPartner } from "@/hooks/useEPPartner";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Wallet, 
  Building2,
  Calendar,
  RefreshCw,
  TrendingUp,
  Clock,
  CheckCircle,
  Download,
  Filter,
  X
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { PartnerRoyalty } from "@/types/partner.types";
import { generateRoyaltiesReportPDF } from "@/utils/generateRoyaltiesReport";
import { toast } from "sonner";
import { formatBRT } from "@/lib/datetime";

export default function SocioRoyalties() {
  const navigate = useNavigate();
  const { isEPPartner, isSuperAdmin, loading: roleLoading } = useEPRole();
  const { partner, royalties, stats, loading, error, refresh } = useEPPartner();
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());

  useEffect(() => {
    if (!roleLoading && !isEPPartner && !isSuperAdmin) {
      navigate('/');
    }
  }, [roleLoading, isEPPartner, isSuperAdmin, navigate]);

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-500/10 text-green-700 border-green-200">Pago</Badge>;
      case 'invoiced':
        return <Badge className="bg-blue-500/10 text-blue-700 border-blue-200">Faturado</Badge>;
      case 'pending':
      default:
        return <Badge className="bg-amber-500/10 text-amber-700 border-amber-200">Pendente</Badge>;
    }
  };

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'invoiced':
        return <TrendingUp className="h-4 w-4 text-blue-500" />;
      case 'pending':
      default:
        return <Clock className="h-4 w-4 text-amber-500" />;
    }
  };

  // Filter royalties
  const filteredRoyalties = useMemo(() => {
    return royalties.filter(r => {
      // Status filter
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      
      // Month filter
      if (selectedMonth !== "all") {
        const month = new Date(r.period_start).getMonth() + 1;
        if (month.toString() !== selectedMonth) return false;
      }
      
      // Year filter
      if (selectedYear !== "all") {
        const year = new Date(r.period_start).getFullYear();
        if (year.toString() !== selectedYear) return false;
      }
      
      return true;
    });
  }, [royalties, statusFilter, selectedMonth, selectedYear]);

  // Calculate totals
  const totals = useMemo(() => {
    return filteredRoyalties.reduce((acc, r) => {
      acc.total += r.royalty_amount;
      if (r.status === 'pending') acc.pending += r.royalty_amount;
      if (r.status === 'paid') acc.paid += r.royalty_amount;
      return acc;
    }, { total: 0, pending: 0, paid: 0 });
  }, [filteredRoyalties]);

  const hasActiveFilters = statusFilter !== "all" || selectedMonth !== "all" || selectedYear !== new Date().getFullYear().toString();

  const clearFilters = () => {
    setStatusFilter("all");
    setSelectedMonth("all");
    setSelectedYear(new Date().getFullYear().toString());
  };

  const handleExport = () => {
    const period = selectedMonth !== "all" && selectedYear !== "all"
      ? `${months.find(m => m.value === selectedMonth)?.label || selectedMonth}/${selectedYear}`
      : selectedYear !== "all" ? selectedYear : undefined;

    generateRoyaltiesReportPDF(
      { royalties: filteredRoyalties, totals },
      {
        title: 'RELATÓRIO DE ROYALTIES',
        partnerName: partner?.name,
        period,
      }
    );
    toast.success("Relatório exportado com sucesso!");
  };

  // Generate years for filter (last 3 years)
  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return [currentYear, currentYear - 1, currentYear - 2].map(y => y.toString());
  }, []);

  const months = [
    { value: "1", label: "Janeiro" },
    { value: "2", label: "Fevereiro" },
    { value: "3", label: "Março" },
    { value: "4", label: "Abril" },
    { value: "5", label: "Maio" },
    { value: "6", label: "Junho" },
    { value: "7", label: "Julho" },
    { value: "8", label: "Agosto" },
    { value: "9", label: "Setembro" },
    { value: "10", label: "Outubro" },
    { value: "11", label: "Novembro" },
    { value: "12", label: "Dezembro" },
  ];

  const breadcrumb = [
    { label: "Sócio EP", href: "/socio/dashboard" },
    { label: "Royalties" }
  ];

  if (roleLoading || loading) {
    return (
      <AppLayout title="Royalties" breadcrumb={breadcrumb}>
        <div className="p-6 space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout title="Royalties" breadcrumb={breadcrumb}>
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
    <AppLayout title="Royalties" breadcrumb={breadcrumb}>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Histórico de Royalties</h1>
            <p className="text-muted-foreground">
              Acompanhe seus ganhos por cliente e período
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExport} disabled={filteredRoyalties.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Exportar PDF
            </Button>
            <Button variant="outline" size="sm" onClick={refresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filtros:</span>
              </div>
              
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Mês" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os meses</SelectItem>
                  {months.map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue placeholder="Ano" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {years.map(y => (
                    <SelectItem key={y} value={y}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendentes</SelectItem>
                  <SelectItem value="invoiced">Faturados</SelectItem>
                  <SelectItem value="paid">Pagos</SelectItem>
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Limpar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-xl font-bold">
                  R$ {totals.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pendente</p>
                <p className="text-xl font-bold">
                  R$ {totals.pending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pago</p>
                <p className="text-xl font-bold">
                  R$ {totals.paid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Royalties List */}
        {filteredRoyalties.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum royalty encontrado</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                {hasActiveFilters 
                  ? "Nenhum royalty encontrado com os filtros selecionados."
                  : "Os royalties são calculados mensalmente com base nos clientes ativos."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredRoyalties.map((royalty) => (
              <Card key={royalty.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-primary/10">
                        {getStatusIcon(royalty.status)}
                      </div>
                      <div>
                        <h3 className="font-medium flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          {royalty.company?.name || 'Empresa'}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {formatBRT(new Date(royalty.period_start), "MMMM yyyy")}
                          </span>
                          <span>•</span>
                          <span>{royalty.royalty_percentage}% de royalty</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-lg font-bold">
                          R$ {royalty.royalty_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Base: R$ {royalty.total_client_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      {getStatusBadge(royalty.status)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
