import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminBilling, OrgBillingData } from '@/hooks/useAdminBilling';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { StripeWebhookDiagnostics } from '@/components/admin/StripeWebhookDiagnostics';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { 
  DollarSign, 
  Users, 
  TrendingDown, 
  Clock, 
  AlertTriangle,
  Ban,
  XCircle,
  RefreshCw,
  Search,
  ExternalLink,
  PlayCircle,
  Loader2,
  ShieldAlert,
  Webhook,
  Shield,
  CreditCard,
  Gift,
  TimerOff,
  Handshake
} from 'lucide-react';
import { formatBRT } from "@/lib/datetime";


const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  active: { label: 'Ativo', color: 'bg-green-500/10 text-green-500 border-green-500/20', icon: <DollarSign className="h-3 w-3" /> },
  trialing: { label: 'Trial', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20', icon: <PlayCircle className="h-3 w-3" /> },
  past_due: { label: 'Inadimplente', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20', icon: <AlertTriangle className="h-3 w-3" /> },
  blocked: { label: 'Bloqueado', color: 'bg-red-500/10 text-red-500 border-red-500/20', icon: <Ban className="h-3 w-3" /> },
  canceled: { label: 'Cancelado', color: 'bg-muted text-muted-foreground border-muted', icon: <XCircle className="h-3 w-3" /> },
  pending: { label: 'Pendente', color: 'bg-orange-500/10 text-orange-500 border-orange-500/20', icon: <Clock className="h-3 w-3" /> },
};

export default function AdminBilling() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { orgs, metrics, isLoading, error, refresh } = useAdminBilling();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  
  // Grant dialog state
  const [selectedOrgForGrant, setSelectedOrgForGrant] = useState<{ id: string; name: string } | null>(null);
  const [grantDialogOpen, setGrantDialogOpen] = useState(false);
  const [grantReason, setGrantReason] = useState('');
  const [grantExpiresAt, setGrantExpiresAt] = useState('');
  const [isCreatingGrant, setIsCreatingGrant] = useState(false);

  const resetGrantForm = () => {
    setSelectedOrgForGrant(null);
    setGrantReason('');
    setGrantExpiresAt('');
  };

  const handleCreateQuickGrant = async () => {
    if (!selectedOrgForGrant || !grantReason.trim() || !grantExpiresAt || !user) return;
    
    setIsCreatingGrant(true);
    try {
      const { error } = await supabase.from('admin_grants').insert({
        org_id: selectedOrgForGrant.id,
        reason: grantReason.trim(),
        expires_at: new Date(grantExpiresAt).toISOString(),
        created_by: user.id,
      });
      
      if (error) throw error;
      toast.success(`Acesso liberado para ${selectedOrgForGrant.name}`);
      setGrantDialogOpen(false);
      resetGrantForm();
    } catch (err) {
      console.error('Erro ao criar grant:', err);
      toast.error('Erro ao liberar acesso');
    } finally {
      setIsCreatingGrant(false);
    }
  };

  // Check if user is super admin
  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        setCheckingAdmin(false);
        return;
      }
      
      const { data } = await supabase.rpc('is_super_admin', { _user_id: user.id });
      setIsSuperAdmin(data === true);
      setCheckingAdmin(false);
    };
    
    checkAdmin();
  }, [user]);

  if (authLoading || isLoading || checkingAdmin) {
    return (
      <AppLayout title="Billing" breadcrumb={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Billing" }]}>
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!isSuperAdmin) {
    return (
      <AppLayout title="Billing" breadcrumb={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Billing" }]}>
        <Card className="max-w-md mx-auto mt-12">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <ShieldAlert className="h-8 w-8 text-destructive" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">Acesso Restrito</h2>
              <p className="text-muted-foreground">
                Esta página é exclusiva para administradores.
              </p>
            </div>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  const filteredOrgs = orgs.filter(org => {
    const matchesSearch = org.org_name.toLowerCase().includes(searchTerm.toLowerCase());
    if (statusFilter === 'all') return matchesSearch;
    if (statusFilter === 'with_grant') return matchesSearch && !!org.active_grant;
    if (statusFilter === 'trial_expired') {
      return matchesSearch && org.trial_end && new Date(org.trial_end) < new Date() && org.status !== 'active';
    }
    return matchesSearch && org.status === statusFilter;
  });

  const getSourceBadge = (org: OrgBillingData) => {
    if (org.status === 'active' && org.stripe_subscription_id) {
      return <Badge variant="success" className="gap-1"><CreditCard className="h-3 w-3" />Stripe</Badge>;
    }
    if (org.active_grant) {
      return <Badge variant="info" className="gap-1"><Gift className="h-3 w-3" />Grant</Badge>;
    }
    if (org.status === 'trialing' && org.trial_end && new Date(org.trial_end) > new Date()) {
      return <Badge variant="warning" className="gap-1"><PlayCircle className="h-3 w-3" />Trial</Badge>;
    }
    if (org.trial_end && new Date(org.trial_end) < new Date() && org.status !== 'active') {
      return <Badge variant="destructive" className="gap-1"><TimerOff className="h-3 w-3" />Trial Expirado</Badge>;
    }
    return <Badge variant="secondary" className="gap-1">Sem acesso</Badge>;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return formatBRT(new Date(dateStr), 'dd/MM/yyyy');
  };

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <Badge variant="outline" className={`${config.color} gap-1`}>
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  return (
    <AppLayout title="Billing Dashboard" breadcrumb={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Billing" }]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Billing Dashboard</h1>
            <p className="text-muted-foreground">Métricas de receita e status das organizações</p>
          </div>
          <Button onClick={refresh} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
        </div>

        {error && (
          <div className="rounded-lg bg-destructive/10 p-4 text-destructive">
            {error}
          </div>
        )}

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="webhooks" className="gap-2">
              <Webhook className="h-4 w-4" />
              Webhooks
            </TabsTrigger>
          </TabsList>

          <TabsContent value="webhooks" className="space-y-4">
            <StripeWebhookDiagnostics />
          </TabsContent>

          <TabsContent value="overview" className="space-y-6">

        {/* Metrics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">MRR</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{formatCurrency(metrics.mrr)}</div>
              <p className="text-xs text-muted-foreground">
                Receita Mensal Recorrente
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Assinantes Ativos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.activeSubscribers}</div>
              <p className="text-xs text-muted-foreground">
                +{metrics.trialing} em trial
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Churn Rate</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">{metrics.churnRate}%</div>
              <p className="text-xs text-muted-foreground">
                {metrics.canceled} cancelados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Média Seats/Org</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.avgSeatsPerOrg}</div>
              <p className="text-xs text-muted-foreground">
                Seats adicionais por org
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Status Summary */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4 lg:grid-cols-8">
          <Card className="border-green-500/20 bg-green-500/5">
            <CardContent className="pt-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-500">{metrics.activeSubscribers}</div>
                <p className="text-xs text-muted-foreground">Ativos</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-blue-500/20 bg-blue-500/5">
            <CardContent className="pt-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-500">{metrics.trialing}</div>
                <p className="text-xs text-muted-foreground">Trial</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-purple-500/20 bg-purple-500/5">
            <CardContent className="pt-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-500">{metrics.trialExpired}</div>
                <p className="text-xs text-muted-foreground">Trial Expirado</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-cyan-500/20 bg-cyan-500/5">
            <CardContent className="pt-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-cyan-500">{metrics.withGrants}</div>
                <p className="text-xs text-muted-foreground">Com Grant</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-yellow-500/20 bg-yellow-500/5">
            <CardContent className="pt-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-500">{metrics.pastDue}</div>
                <p className="text-xs text-muted-foreground">Inadimplentes</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-red-500/20 bg-red-500/5">
            <CardContent className="pt-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-500">{metrics.blocked}</div>
                <p className="text-xs text-muted-foreground">Bloqueados</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-muted bg-muted/20">
            <CardContent className="pt-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-muted-foreground">{metrics.canceled}</div>
                <p className="text-xs text-muted-foreground">Cancelados</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-orange-500/20 bg-orange-500/5">
            <CardContent className="pt-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-500">{metrics.pendingOrgs}</div>
                <p className="text-xs text-muted-foreground">Pendentes</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar organização..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="trialing">Trial</SelectItem>
              <SelectItem value="past_due">Inadimplentes</SelectItem>
              <SelectItem value="blocked">Bloqueados</SelectItem>
              <SelectItem value="canceled">Cancelados</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
              <SelectItem value="trial_expired">Trial Expirado ({metrics.trialExpired})</SelectItem>
              <SelectItem value="with_grant">Com Grant Ativo ({metrics.withGrants})</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Organizations Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left text-sm font-medium">Organização</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Fonte</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Grant</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Membros</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Trial Fim</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Próxima Cobrança</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Criado em</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrgs.map((org) => (
                    <tr key={org.org_id} className="border-b hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="font-medium">{org.org_name}</div>
                        {org.stripe_customer_id && (
                          <div className="text-xs text-muted-foreground">
                            {org.stripe_customer_id.slice(0, 20)}...
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">{getStatusBadge(org.status)}</td>
                      <td className="px-4 py-3">{getSourceBadge(org)}</td>
                      <td className="px-4 py-3">
                        {org.active_grant ? (
                          <div className="flex flex-col gap-0.5">
                            <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 gap-1 w-fit">
                              <Shield className="h-3 w-3" />
                              Liberado
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              até {formatDate(org.active_grant.expires_at)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">{org.member_count}</td>
                      <td className="px-4 py-3">
                        {org.trial_end ? (
                          <span className={new Date(org.trial_end) < new Date() ? 'text-muted-foreground' : 'text-blue-500'}>
                            {formatDate(org.trial_end)}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3">{formatDate(org.current_period_end)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(org.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedOrgForGrant({ id: org.org_id, name: org.org_name });
                              setGrantDialogOpen(true);
                            }}
                            title={org.active_grant ? "Renovar Acesso" : "Liberar Acesso"}
                          >
                            <Shield className={`h-4 w-4 ${org.active_grant ? 'text-yellow-500' : 'text-green-500'}`} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/admin/company/${org.org_id}`)}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredOrgs.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                        Nenhuma organização encontrada
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialog para criar grant rápido */}
      <Dialog open={grantDialogOpen} onOpenChange={(open) => {
        setGrantDialogOpen(open);
        if (!open) resetGrantForm();
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Liberar Acesso</DialogTitle>
            <DialogDescription>
              Conceda acesso temporário para: <strong>{selectedOrgForGrant?.name}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Data de Expiração</Label>
              <Input
                type="date"
                value={grantExpiresAt}
                onChange={(e) => setGrantExpiresAt(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="space-y-2">
              <Label>Motivo</Label>
              <Textarea
                placeholder="Descreva o motivo da liberação..."
                value={grantReason}
                onChange={(e) => setGrantReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGrantDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateQuickGrant} 
              disabled={isCreatingGrant || !grantReason.trim() || !grantExpiresAt}
            >
              {isCreatingGrant ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Shield className="mr-2 h-4 w-4" />}
              Liberar Acesso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
