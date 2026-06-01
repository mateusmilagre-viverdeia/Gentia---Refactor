import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLicenseReports } from "@/hooks/useLicenseReports";
import { 
  BarChart3, 
  TrendingUp, 
  PieChart, 
  Download,
  RefreshCw,
  Check,
  Eye,
  EyeOff,
  Calendar
} from "lucide-react";
import { subDays, subMonths } from "date-fns";
import { toast } from "sonner";
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  BarChart,
  Bar,
  PieChart as RechartsPie,
  Pie,
  Cell
} from "recharts";
import { formatBRT } from "@/lib/datetime";

const COLORS = {
  full: '#22c55e',
  view_only: '#f59e0b',
  disabled: '#ef4444',
};

const ACCESS_LABELS = {
  full: 'Completo',
  view_only: 'Visualização',
  disabled: 'Desabilitado',
};

type PeriodFilter = '7d' | '30d' | '90d' | '6m' | '1y';

export function LicenseUsageReport() {
  const [activeTab, setActiveTab] = useState("distribuicao");
  const [period, setPeriod] = useState<PeriodFilter>('30d');
  const [generating, setGenerating] = useState(false);
  
  const { 
    distribution,
    moduleStats, 
    changeTrends,
    loading,
    loadCurrentDistribution,
    loadModuleStats,
    loadChangeTrends,
    generateSnapshot,
  } = useLicenseReports();

  useEffect(() => {
    loadCurrentDistribution();
    loadModuleStats();
  }, [loadCurrentDistribution, loadModuleStats]);

  useEffect(() => {
    const { start, end } = getDateRange(period);
    loadChangeTrends(start, end);
  }, [period, loadChangeTrends]);

  const getDateRange = (p: PeriodFilter) => {
    const end = new Date();
    let start: Date;

    switch (p) {
      case '7d':
        start = subDays(end, 7);
        break;
      case '30d':
        start = subDays(end, 30);
        break;
      case '90d':
        start = subDays(end, 90);
        break;
      case '6m':
        start = subMonths(end, 6);
        break;
      case '1y':
        start = subMonths(end, 12);
        break;
      default:
        start = subDays(end, 30);
    }

    return { start, end };
  };

  const handleGenerateSnapshot = async () => {
    setGenerating(true);
    const success = await generateSnapshot();
    setGenerating(false);

    if (success) {
      toast.success("Snapshot gerado com sucesso!");
    } else {
      toast.error("Erro ao gerar snapshot");
    }
  };

  const totalLicenses = distribution.reduce((acc, d) => acc + d.count, 0);

  const pieData = distribution.map(d => ({
    name: ACCESS_LABELS[d.accessLevel],
    value: d.count,
    color: COLORS[d.accessLevel],
  }));

  const trendChartData = changeTrends.map(t => ({
    date: formatBRT(new Date(t.date), 'dd/MM'),
    Criações: t.creates,
    Atualizações: t.updates,
    Templates: t.templateApplied,
    Total: t.total,
  }));

  const moduleChartData = moduleStats.slice(0, 10).map(m => ({
    name: m.moduleName || m.moduleSlug,
    Completo: m.fullCount,
    Visualização: m.viewOnlyCount,
    Desabilitado: m.disabledCount,
  }));

  if (loading && distribution.length === 0) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total de Licenças</CardDescription>
            <CardTitle className="text-3xl">{totalLicenses}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              configurações ativas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Check className="h-3 w-3 text-green-600" />
              Acesso Completo
            </CardDescription>
            <CardTitle className="text-3xl text-green-600">
              {distribution.find(d => d.accessLevel === 'full')?.count || 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress 
              value={distribution.find(d => d.accessLevel === 'full')?.percentage || 0} 
              className="h-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Eye className="h-3 w-3 text-amber-600" />
              Visualização
            </CardDescription>
            <CardTitle className="text-3xl text-amber-600">
              {distribution.find(d => d.accessLevel === 'view_only')?.count || 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress 
              value={distribution.find(d => d.accessLevel === 'view_only')?.percentage || 0} 
              className="h-2 [&>div]:bg-amber-500"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <EyeOff className="h-3 w-3 text-red-600" />
              Desabilitado
            </CardDescription>
            <CardTitle className="text-3xl text-red-600">
              {distribution.find(d => d.accessLevel === 'disabled')?.count || 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress 
              value={distribution.find(d => d.accessLevel === 'disabled')?.percentage || 0} 
              className="h-2 [&>div]:bg-red-500"
            />
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="distribuicao" className="gap-2">
              <PieChart className="h-4 w-4" />
              Distribuição
            </TabsTrigger>
            <TabsTrigger value="modulos" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Por Módulo
            </TabsTrigger>
            <TabsTrigger value="tendencias" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Tendências
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <Select value={period} onValueChange={(v) => setPeriod(v as PeriodFilter)}>
              <SelectTrigger className="w-32">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">7 dias</SelectItem>
                <SelectItem value="30d">30 dias</SelectItem>
                <SelectItem value="90d">90 dias</SelectItem>
                <SelectItem value="6m">6 meses</SelectItem>
                <SelectItem value="1y">1 ano</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              size="sm"
              onClick={handleGenerateSnapshot}
              disabled={generating}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
              Gerar Snapshot
            </Button>
          </div>
        </div>

        <TabsContent value="distribuicao">
          <Card>
            <CardHeader>
              <CardTitle>Distribuição de Acesso</CardTitle>
              <CardDescription>
                Visão geral da distribuição de níveis de acesso
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-8">
                <div className="w-64 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>

                <div className="flex-1 space-y-4">
                  {distribution.map((d) => (
                    <div key={d.accessLevel} className="flex items-center gap-4">
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: COLORS[d.accessLevel] }}
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">{ACCESS_LABELS[d.accessLevel]}</span>
                          <span className="text-sm text-muted-foreground">
                            {d.count} ({d.percentage.toFixed(1)}%)
                          </span>
                        </div>
                        <Progress 
                          value={d.percentage} 
                          className="h-2"
                          style={{ 
                            '--progress-color': COLORS[d.accessLevel] 
                          } as React.CSSProperties}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="modulos">
          <Card>
            <CardHeader>
              <CardTitle>Uso por Módulo</CardTitle>
              <CardDescription>
                Distribuição de acessos por módulo do sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={moduleChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={150} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Completo" stackId="a" fill={COLORS.full} />
                    <Bar dataKey="Visualização" stackId="a" fill={COLORS.view_only} />
                    <Bar dataKey="Desabilitado" stackId="a" fill={COLORS.disabled} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Módulo</TableHead>
                      <TableHead className="text-center">Completo</TableHead>
                      <TableHead className="text-center">Visualização</TableHead>
                      <TableHead className="text-center">Desabilitado</TableHead>
                      <TableHead className="text-center">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {moduleStats.map((m) => (
                      <TableRow key={m.moduleSlug}>
                        <TableCell className="font-medium">
                          {m.moduleName || m.moduleSlug}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                            {m.fullCount}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                            {m.viewOnlyCount}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                            {m.disabledCount}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground">
                          {m.totalAccounts}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tendencias">
          <Card>
            <CardHeader>
              <CardTitle>Tendências de Alterações</CardTitle>
              <CardDescription>
                Histórico de alterações de licenças no período selecionado
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="Total" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="Criações" 
                      stroke="#22c55e" 
                      strokeWidth={1}
                      dot={false}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="Atualizações" 
                      stroke="#f59e0b" 
                      strokeWidth={1}
                      dot={false}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="Templates" 
                      stroke="#8b5cf6" 
                      strokeWidth={1}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-4 gap-4 mt-6">
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <div className="text-2xl font-bold text-blue-600">
                    {changeTrends.reduce((acc, t) => acc + t.total, 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">Total de Alterações</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <div className="text-2xl font-bold text-green-600">
                    {changeTrends.reduce((acc, t) => acc + t.creates, 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">Criações</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <div className="text-2xl font-bold text-amber-600">
                    {changeTrends.reduce((acc, t) => acc + t.updates, 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">Atualizações</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <div className="text-2xl font-bold text-purple-600">
                    {changeTrends.reduce((acc, t) => acc + t.templateApplied, 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">Templates Aplicados</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
