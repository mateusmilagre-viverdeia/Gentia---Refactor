import React, { useEffect, useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAdminRoyalties } from "@/hooks/useAdminRoyalties";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Plus, 
  MoreHorizontal, 
  Check,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Download,
  Filter,
  X
} from "lucide-react";
import { RegisterSaleModal } from "@/components/partner/admin/RegisterSaleModal";
import { toast } from "sonner";

import { generateRoyaltiesReportPDF, generateSalesReportPDF } from "@/utils/generateRoyaltiesReport";
import { supabase } from "@/integrations/supabase/client";
import { formatBRT } from "@/lib/datetime";

export default function AdminRoyalties() {
  const navigate = useNavigate();
  const { isSuperAdmin, loading: adminLoading } = useSuperAdmin();
  const { 
    royalties, 
    directSales, 
    balances, 
    totals,
    loading, 
    error, 
    fetchAll,
    markRoyaltyAsPaid,
    markSaleAsPaid,
    creditSaleToRoyalties
  } = useAdminRoyalties();
  
  const [registerSaleModalOpen, setRegisterSaleModalOpen] = useState(false);
  
  // Filters
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedPartner, setSelectedPartner] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  
  // Partners for filter dropdown
  const [partners, setPartners] = useState<{id: string; name: string}[]>([]);

  useEffect(() => {
    if (!adminLoading && !isSuperAdmin) {
      navigate("/");
    }
  }, [isSuperAdmin, adminLoading, navigate]);

  useEffect(() => {
    fetchAll();
    
    // Load partners for filter
    const loadPartners = async () => {
      const { data } = await supabase
        .from('ep_partners')
        .select('id, name')
        .order('name');
      if (data) setPartners(data);
    };
    loadPartners();
  }, [fetchAll]);

  // Filter royalties
  const filteredRoyalties = useMemo(() => {
    return royalties.filter(r => {
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
      
      // Partner filter
      if (selectedPartner !== "all" && r.partner_id !== selectedPartner) return false;
      
      // Status filter
      if (selectedStatus !== "all" && r.status !== selectedStatus) return false;
      
      return true;
    });
  }, [royalties, selectedMonth, selectedYear, selectedPartner, selectedStatus]);

  // Filter sales
  const filteredSales = useMemo(() => {
    return directSales.filter(s => {
      if (selectedPartner !== "all" && s.partner_id !== selectedPartner) return false;
      if (selectedStatus !== "all" && s.status !== selectedStatus) return false;
      return true;
    });
  }, [directSales, selectedPartner, selectedStatus]);

  const clearFilters = () => {
    setSelectedMonth("all");
    setSelectedYear(new Date().getFullYear().toString());
    setSelectedPartner("all");
    setSelectedStatus("all");
  };

  const hasActiveFilters = selectedMonth !== "all" || selectedYear !== new Date().getFullYear().toString() || selectedPartner !== "all" || selectedStatus !== "all";

  // Calculate filtered totals
  const filteredTotals = useMemo(() => {
    const pending = filteredRoyalties
      .filter(r => r.status === 'pending')
      .reduce((acc, r) => acc + r.royalty_amount, 0);
    const paid = filteredRoyalties
      .filter(r => r.status === 'paid')
      .reduce((acc, r) => acc + r.royalty_amount, 0);
    return { total: pending + paid, pending, paid };
  }, [filteredRoyalties]);

  const handleMarkRoyaltyPaid = async (royaltyId: string) => {
    const result = await markRoyaltyAsPaid(royaltyId);
    if (result.success) {
      toast.success("Royalty marcado como pago");
    } else {
      toast.error(result.error || "Erro ao marcar como pago");
    }
  };

  const handleMarkSalePaid = async (saleId: string) => {
    const result = await markSaleAsPaid(saleId);
    if (result.success) {
      toast.success("Comissão marcada como paga");
    } else {
      toast.error(result.error || "Erro ao marcar como pago");
    }
  };

  const handleCreditSale = async (saleId: string) => {
    const result = await creditSaleToRoyalties(saleId);
    if (result.success) {
      toast.success("Venda creditada nos royalties");
    } else {
      toast.error(result.error || "Erro ao creditar venda");
    }
  };

  const handleExportRoyalties = () => {
    const partnerName = selectedPartner !== "all" 
      ? partners.find(p => p.id === selectedPartner)?.name 
      : undefined;
    
    const period = selectedMonth !== "all" && selectedYear !== "all"
      ? `${selectedMonth}/${selectedYear}`
      : selectedYear !== "all" ? selectedYear : undefined;

    generateRoyaltiesReportPDF(
      { 
        royalties: filteredRoyalties, 
        totals: filteredTotals 
      },
      {
        title: 'RELATÓRIO DE ROYALTIES',
        partnerName,
        period,
      }
    );
    toast.success("Relatório exportado com sucesso!");
  };

  const handleExportSales = () => {
    const partnerName = selectedPartner !== "all" 
      ? partners.find(p => p.id === selectedPartner)?.name 
      : undefined;

    const salesTotals = {
      totalAmount: filteredSales.reduce((acc, s) => acc + s.total_amount, 0),
      partnerShare: filteredSales.reduce((acc, s) => acc + s.partner_share_amount, 0),
      epShare: filteredSales.reduce((acc, s) => acc + s.ep_share_amount, 0),
    };

    generateSalesReportPDF(
      { sales: filteredSales, totals: salesTotals },
      { title: 'RELATÓRIO DE VENDAS DIRETAS', partnerName }
    );
    toast.success("Relatório exportado com sucesso!");
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const breadcrumb = [
    { label: "Admin", href: "/admin/dashboard" },
    { label: "Royalties" }
  ];

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

  if (adminLoading || loading) {
    return (
      <AppLayout title="Royalties" breadcrumb={breadcrumb}>
        <div className="p-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="h-96" />
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
              <CardTitle className="text-destructive">Erro ao carregar dados</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{error}</p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Royalties" breadcrumb={breadcrumb}>
      <div className="p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Royalties Pendentes</CardTitle>
              <ArrowUpRight className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(totals.pendingRoyalties)}
              </div>
              <p className="text-xs text-muted-foreground">A receber dos sócios</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Comissões Pendentes</CardTitle>
              <ArrowDownRight className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(totals.pendingCommissions)}
              </div>
              <p className="text-xs text-muted-foreground">A pagar aos sócios (85%)</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saldo Líquido</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${totals.netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(totals.netBalance)}
              </div>
              <p className="text-xs text-muted-foreground">
                {totals.netBalance >= 0 ? 'EP a receber' : 'EP a pagar'}
              </p>
            </CardContent>
          </Card>
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

              <Select value={selectedPartner} onValueChange={setSelectedPartner}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Sócio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os sócios</SelectItem>
                  {partners.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="paid">Pago</SelectItem>
                  <SelectItem value="credited">Creditado</SelectItem>
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Limpar
                </Button>
              )}

              <div className="ml-auto flex items-center gap-2">
                <Button onClick={() => setRegisterSaleModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Registrar Venda
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="royalties">
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="royalties">Royalties ({filteredRoyalties.length})</TabsTrigger>
              <TabsTrigger value="sales">Vendas Diretas ({filteredSales.length})</TabsTrigger>
              <TabsTrigger value="balance">Balanço por Sócio</TabsTrigger>
            </TabsList>
          </div>

          {/* Royalties Tab */}
          <TabsContent value="royalties">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between py-3">
                <CardTitle className="text-base font-medium">
                  Royalties - Total: {formatCurrency(filteredTotals.total)}
                </CardTitle>
                <Button variant="outline" size="sm" onClick={handleExportRoyalties}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar PDF
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Período</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Valor Base</TableHead>
                      <TableHead>Royalty (15%)</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRoyalties.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <p className="text-muted-foreground">Nenhum royalty encontrado</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRoyalties.map((royalty) => (
                        <TableRow key={royalty.id}>
                          <TableCell>
                            {formatBRT(new Date(royalty.period_start), "MMM yyyy")}
                          </TableCell>
                          <TableCell>{royalty.company?.name || "-"}</TableCell>
                          <TableCell>{formatCurrency(royalty.total_client_amount)}</TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(royalty.royalty_amount)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={royalty.status === 'paid' ? 'default' : 'secondary'}>
                              {royalty.status === 'paid' ? 'Pago' : 'Pendente'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {royalty.status === 'pending' && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleMarkRoyaltyPaid(royalty.id)}>
                                    <Check className="h-4 w-4 mr-2" />
                                    Marcar como Pago
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Direct Sales Tab */}
          <TabsContent value="sales">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between py-3">
                <CardTitle className="text-base font-medium">Vendas Diretas</CardTitle>
                <Button variant="outline" size="sm" onClick={handleExportSales}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar PDF
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Sócio</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Valor Total</TableHead>
                      <TableHead>Comissão (85%)</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSales.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <p className="text-muted-foreground">Nenhuma venda direta encontrada</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredSales.map((sale) => (
                        <TableRow key={sale.id}>
                          <TableCell>
                            {formatBRT(new Date(sale.sale_date), "dd/MM/yyyy")}
                          </TableCell>
                          <TableCell>{sale.partner?.name || "-"}</TableCell>
                          <TableCell>{sale.description || "-"}</TableCell>
                          <TableCell>{formatCurrency(sale.total_amount)}</TableCell>
                          <TableCell className="font-medium text-red-600">
                            {formatCurrency(sale.partner_share_amount)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              sale.status === 'paid' ? 'default' : 
                              sale.status === 'credited' ? 'outline' : 
                              'secondary'
                            }>
                              {sale.status === 'paid' ? 'Pago' : 
                               sale.status === 'credited' ? 'Creditado' : 
                               'Pendente'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {sale.status === 'pending' && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleCreditSale(sale.id)}>
                                    <DollarSign className="h-4 w-4 mr-2" />
                                    Creditar em Royalties
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleMarkSalePaid(sale.id)}>
                                    <Check className="h-4 w-4 mr-2" />
                                    Marcar como Pago
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Balance Tab */}
          <TabsContent value="balance">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sócio</TableHead>
                      <TableHead>Royalties Pendentes</TableHead>
                      <TableHead>Comissões Pendentes</TableHead>
                      <TableHead>Saldo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {balances.filter(b => b.totalRoyaltiesPending > 0 || b.totalCommissionsPending > 0).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8">
                          <p className="text-muted-foreground">Nenhum saldo pendente</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      balances
                        .filter(b => b.totalRoyaltiesPending > 0 || b.totalCommissionsPending > 0)
                        .map((balance) => (
                          <TableRow key={balance.partnerId}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{balance.partnerName}</p>
                                <p className="text-sm text-muted-foreground">{balance.partnerEmail}</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-green-600">
                              {formatCurrency(balance.totalRoyaltiesPending)}
                            </TableCell>
                            <TableCell className="text-red-600">
                              {formatCurrency(balance.totalCommissionsPending)}
                            </TableCell>
                            <TableCell>
                              <span className={`font-medium ${balance.netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency(Math.abs(balance.netBalance))}
                              </span>
                              <span className="text-xs text-muted-foreground ml-2">
                                {balance.netBalance >= 0 ? '(sócio deve)' : '(EP deve)'}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modal */}
      <RegisterSaleModal 
        open={registerSaleModalOpen} 
        onOpenChange={setRegisterSaleModalOpen}
        onSuccess={fetchAll}
      />
    </AppLayout>
  );
}
