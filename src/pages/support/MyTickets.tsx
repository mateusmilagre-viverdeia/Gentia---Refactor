import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, Search, Ticket } from 'lucide-react';
import { useSupportTickets } from '@/hooks/useSupportTickets';
import { TicketMetricCards } from '@/components/support/TicketMetricCards';
import { TicketCard } from '@/components/support/TicketCard';
import { TicketFilters } from '@/components/support/TicketFilters';
import { CreateTicketDialog } from '@/components/support/CreateTicketDialog';

export default function MyTickets() {
  const navigate = useNavigate();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { 
    tickets, 
    loading, 
    metrics, 
    filters, 
    setFilters 
  } = useSupportTickets({ mode: 'user' });

  const filteredTickets = tickets.filter(ticket =>
    ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ticket.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppLayout title="Meus Chamados">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10">
              <Ticket className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Meus Chamados</h1>
              <p className="text-muted-foreground">
                Abra e acompanhe seus tickets de suporte
              </p>
            </div>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Chamado
          </Button>
        </div>

        {/* Metrics */}
        <TicketMetricCards metrics={metrics} />

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar chamados..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <TicketFilters filters={filters} onFiltersChange={setFilters} />
        </div>

        {/* Tickets List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="text-center py-12">
            <Ticket className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum chamado encontrado</h3>
            <p className="text-muted-foreground mb-4">
              {tickets.length === 0
                ? 'Você ainda não abriu nenhum chamado de suporte'
                : 'Nenhum chamado corresponde aos filtros selecionados'}
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Abrir Primeiro Chamado
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredTickets.map((ticket) => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                onClick={() => navigate(`/suporte/chamado/${ticket.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      <CreateTicketDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />
    </AppLayout>
  );
}
