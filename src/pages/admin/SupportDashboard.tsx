import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Search, Ticket, TrendingUp } from 'lucide-react';
import { useSupportTickets } from '@/hooks/useSupportTickets';
import { TicketMetricCards } from '@/components/support/TicketMetricCards';
import { TicketCard } from '@/components/support/TicketCard';
import { TicketFilters } from '@/components/support/TicketFilters';

export default function SupportDashboard() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  
  const { 
    tickets, 
    loading, 
    metrics, 
    filters, 
    setFilters 
  } = useSupportTickets({ mode: 'admin' });

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = 
      ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.account?.name.toLowerCase().includes(searchQuery.toLowerCase());

    if (activeTab === 'open') {
      return matchesSearch && ticket.status === 'open';
    }
    if (activeTab === 'in_progress') {
      return matchesSearch && ticket.status === 'in_progress';
    }
    if (activeTab === 'resolved') {
      return matchesSearch && (ticket.status === 'resolved' || ticket.status === 'closed');
    }
    if (activeTab === 'overdue') {
      return matchesSearch && ticket.sla_due_at && 
        new Date(ticket.sla_due_at) < new Date() && 
        !ticket.resolved_at;
    }
    return matchesSearch;
  });

  return (
    <AppLayout title="Central de Chamados">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10">
              <Ticket className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Central de Chamados</h1>
              <p className="text-muted-foreground">
                Gerencie todos os tickets de suporte
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={() => navigate('/admin/suporte/analytics')}>
            <TrendingUp className="h-4 w-4 mr-2" />
            Analytics
          </Button>
        </div>

        {/* Metrics */}
        <TicketMetricCards metrics={metrics} />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <TabsList>
              <TabsTrigger value="all">
                Todos ({tickets.length})
              </TabsTrigger>
              <TabsTrigger value="open">
                Abertos ({metrics.byStatus.open})
              </TabsTrigger>
              <TabsTrigger value="in_progress">
                Em Atendimento ({metrics.byStatus.in_progress})
              </TabsTrigger>
              <TabsTrigger value="resolved">
                Resolvidos ({metrics.byStatus.resolved + metrics.byStatus.closed})
              </TabsTrigger>
              <TabsTrigger value="overdue" className="text-red-500">
                SLA Vencido
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por título, empresa..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <TicketFilters filters={filters} onFiltersChange={setFilters} />
          </div>

          {/* Tickets List */}
          <TabsContent value={activeTab} className="mt-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="text-center py-12">
                <Ticket className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhum chamado encontrado</h3>
                <p className="text-muted-foreground">
                  {tickets.length === 0
                    ? 'Não há chamados de suporte no sistema'
                    : 'Nenhum chamado corresponde aos filtros selecionados'}
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredTickets.map((ticket) => (
                  <TicketCard
                    key={ticket.id}
                    ticket={ticket}
                    onClick={() => navigate(`/suporte/chamado/${ticket.id}`)}
                    showAccount
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
