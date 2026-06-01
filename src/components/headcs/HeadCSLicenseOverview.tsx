import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useLicenseHistory } from "@/hooks/useLicenseHistory";
import { useLicenseTemplates } from "@/hooks/useLicenseTemplates";
import { AccessLevel } from "@/hooks/useAccountLicensedModules";
import { 
  Shield, 
  Search, 
  ArrowRight, 
  Check, 
  Eye, 
  EyeOff, 
  Clock, 
  FileText,
  History as HistoryIcon,
  BarChart3,
  CalendarClock
} from "lucide-react";

import { LicenseTemplateManager } from "../consultor/LicenseTemplateManager";
import { LicenseHistoryPanel } from "../consultor/LicenseHistoryPanel";
import { ExpiringLicensesAlert } from "./ExpiringLicensesAlert";
import { LicenseUsageReport } from "./LicenseUsageReport";
import { formatBRT } from "@/lib/datetime";

interface Project {
  id: string;
  name: string;
  [key: string]: any;
}

interface HeadCSLicenseOverviewProps {
  projects: Project[];
}

interface AccountLicenseSummary {
  accountId: string;
  accountName: string;
  fullCount: number;
  viewOnlyCount: number;
  disabledCount: number;
  totalModules: number;
  lastChange?: {
    changedAt: string;
    changedBy: string;
  };
}

const ACCESS_LEVEL_CONFIG: Record<AccessLevel, { label: string; icon: React.ReactNode; color: string }> = {
  full: { 
    label: 'Completo', 
    icon: <Check className="h-3 w-3" />,
    color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
  },
  view_only: { 
    label: 'Visualização', 
    icon: <Eye className="h-3 w-3" />,
    color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
  },
  disabled: { 
    label: 'Desabilitado', 
    icon: <EyeOff className="h-3 w-3" />,
    color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
  },
};

export function HeadCSLicenseOverview({ projects }: HeadCSLicenseOverviewProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [summaries, setSummaries] = useState<AccountLicenseSummary[]>([]);
  const [activeTab, setActiveTab] = useState("visao-geral");
  
  const { history, loading: historyLoading, loadHistory } = useLicenseHistory();
  const { templates, loading: templatesLoading, loadTemplates } = useLicenseTemplates();

  useEffect(() => {
    loadSummaries();
    loadHistory(50);
    loadTemplates();
  }, [projects]);

  const loadSummaries = async () => {
    setLoading(true);
    try {
      // Get all licenses for all projects
      const accountIds = projects.map(p => p.id);
      
      if (accountIds.length === 0) {
        setSummaries([]);
        setLoading(false);
        return;
      }

      const client = supabase as any;

      // Get licenses
      const { data: licenses, error: licensesError } = await client
        .from('account_licensed_modules')
        .select('account_id, access_level')
        .in('account_id', accountIds);

      if (licensesError) {
        console.error('Error loading licenses:', licensesError);
      }

      // Get total modules count
      const { data: modules, error: modulesError } = await client
        .from('modules')
        .select('slug');

      const totalModules = modules?.length || 0;

      // Get latest changes
      const { data: latestChanges, error: changesError } = await client
        .from('license_change_history')
        .select('account_id, changed_at, changed_by')
        .in('account_id', accountIds)
        .order('changed_at', { ascending: false });

      // Get profile names for changers
      const changerIds = [...new Set((latestChanges || []).map((c: any) => c.changed_by))] as string[];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', changerIds);

      const profileMap = new Map<string, string>();
      (profiles || []).forEach((p: any) => {
        profileMap.set(p.id, p.full_name || 'Usuário');
      });

      // Group by account
      const accountLicenses = new Map<string, AccessLevel[]>();
      (licenses || []).forEach((l: any) => {
        const existing = accountLicenses.get(l.account_id) || [];
        existing.push(l.access_level as AccessLevel);
        accountLicenses.set(l.account_id, existing);
      });

      // Get latest change per account
      const latestChangeMap = new Map<string, { changedAt: string; changedBy: string }>();
      (latestChanges || []).forEach((c: any) => {
        if (!latestChangeMap.has(c.account_id)) {
          latestChangeMap.set(c.account_id, {
            changedAt: c.changed_at,
            changedBy: profileMap.get(c.changed_by) || 'Usuário',
          });
        }
      });

      // Build summaries
      const summaryList: AccountLicenseSummary[] = projects.map(project => {
        const licenses = accountLicenses.get(project.id) || [];
        
        // Count by access level
        const fullCount = totalModules - licenses.filter(l => l !== 'full').length;
        const viewOnlyCount = licenses.filter(l => l === 'view_only').length;
        const disabledCount = licenses.filter(l => l === 'disabled').length;

        return {
          accountId: project.id,
          accountName: project.name,
          fullCount: fullCount,
          viewOnlyCount,
          disabledCount,
          totalModules,
          lastChange: latestChangeMap.get(project.id),
        };
      });

      setSummaries(summaryList);
    } catch (err) {
      console.error('Error loading summaries:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredSummaries = summaries.filter(s => 
    s.accountName.toLowerCase().includes(search.toLowerCase())
  );

  const hasRestrictions = (summary: AccountLicenseSummary) => 
    summary.viewOnlyCount > 0 || summary.disabledCount > 0;

  const restrictedCount = summaries.filter(hasRestrictions).length;

  if (loading) {
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
      {/* Expiring Licenses Alert */}
      <ExpiringLicensesAlert 
        compact 
        onViewDetails={() => setActiveTab("expiracoes")} 
      />

      {/* Metric Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total de Clientes</CardDescription>
            <CardTitle className="text-3xl">{summaries.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              empresas licenciadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Acesso Completo</CardDescription>
            <CardTitle className="text-3xl text-green-600">
              {summaries.length - restrictedCount}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              sem restrições de módulos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Com Restrições</CardDescription>
            <CardTitle className="text-3xl text-amber-600">{restrictedCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              clientes com módulos limitados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="visao-geral" className="gap-2">
            <Shield className="h-4 w-4" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="expiracoes" className="gap-2">
            <CalendarClock className="h-4 w-4" />
            Expirações
          </TabsTrigger>
          <TabsTrigger value="relatorios" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Relatórios
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <FileText className="h-4 w-4" />
            Templates ({templates.length})
          </TabsTrigger>
          <TabsTrigger value="historico" className="gap-2">
            <HistoryIcon className="h-4 w-4" />
            Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="visao-geral" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Licenciamento por Cliente</CardTitle>
                  <CardDescription>
                    Visualize e gerencie os módulos de cada cliente
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar cliente..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-center">Completo</TableHead>
                    <TableHead className="text-center">Visualização</TableHead>
                    <TableHead className="text-center">Desabilitado</TableHead>
                    <TableHead>Última Alteração</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSummaries.map((summary) => (
                    <TableRow key={summary.accountId}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{summary.accountName}</span>
                          {!hasRestrictions(summary) && (
                            <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                              Completo
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={ACCESS_LEVEL_CONFIG.full.color}>
                          {summary.fullCount}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={summary.viewOnlyCount > 0 ? ACCESS_LEVEL_CONFIG.view_only.color : 'text-muted-foreground'}>
                          {summary.viewOnlyCount}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={summary.disabledCount > 0 ? ACCESS_LEVEL_CONFIG.disabled.color : 'text-muted-foreground'}>
                          {summary.disabledCount}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {summary.lastChange ? (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>
                              {formatBRT(new Date(summary.lastChange.changedAt), "dd/MM/yy")}
                            </span>
                            <span className="text-xs">
                              por {summary.lastChange.changedBy.split(' ')[0]}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/consultor/projeto/${summary.accountId}?tab=modulos`)}
                        >
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}

                  {filteredSummaries.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        {search ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expiracoes">
          <ExpiringLicensesAlert />
        </TabsContent>

        <TabsContent value="relatorios">
          <LicenseUsageReport />
        </TabsContent>

        <TabsContent value="templates">
          <LicenseTemplateManager />
        </TabsContent>

        <TabsContent value="historico">
          <LicenseHistoryPanel showAllAccounts />
        </TabsContent>
      </Tabs>
    </div>
  );
}
