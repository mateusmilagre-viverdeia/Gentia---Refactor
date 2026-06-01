import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { History, CreditCard, ExternalLink } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { formatBRT } from "@/lib/datetime";

interface SeatsEvent {
  id: string;
  event_type: string;
  created_at: string;
  payload: {
    seats_added?: number;
    new_total_seats?: number;
    amount_paid?: number;
    pro_rata_amount?: number;
    invoice_url?: string;
    invoice_id?: string;
  } | null;
}

interface SeatsHistoryProps {
  accountId: string;
}

export function SeatsHistory({ accountId }: SeatsHistoryProps) {
  const [events, setEvents] = useState<SeatsEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('billing_events')
          .select('*')
          .eq('org_id', accountId)
          .in('event_type', ['seats_purchased', 'seats_upgraded', 'invoice.paid', 'checkout.session.completed'])
          .order('created_at', { ascending: false })
          .limit(20);

        if (error) {
          console.error('Error fetching billing events:', error);
          return;
        }

        // Type cast the data to match our interface
        const typedEvents: SeatsEvent[] = (data || []).map(event => ({
          id: event.id,
          event_type: event.event_type,
          created_at: event.created_at || new Date().toISOString(),
          payload: event.payload as SeatsEvent['payload'],
        }));

        setEvents(typedEvents);
      } catch (err) {
        console.error('Error fetching seats history:', err);
      } finally {
        setLoading(false);
      }
    };

    if (accountId) {
      fetchHistory();
    }
  }, [accountId]);

  const getEventLabel = (eventType: string) => {
    switch (eventType) {
      case 'seats_purchased':
        return 'Assentos comprados';
      case 'seats_upgraded':
        return 'Assentos adicionados';
      case 'invoice.paid':
        return 'Fatura paga';
      case 'checkout.session.completed':
        return 'Checkout concluído';
      default:
        return eventType;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount / 100);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-5 w-5" />
            Histórico de Compras
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="h-5 w-5" />
          Histórico de Compras de Assentos
        </CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CreditCard className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>Nenhuma compra de assento registrada</p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-lg">
                    <CreditCard className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {getEventLabel(event.event_type)}
                      </span>
                      {event.payload?.seats_added && (
                        <Badge variant="secondary" className="text-xs">
                          +{event.payload.seats_added} assento{event.payload.seats_added > 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatBRT(new Date(event.created_at), "dd/MM/yyyy 'às' HH:mm")}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  {(event.payload?.amount_paid || event.payload?.pro_rata_amount) && (
                    <span className="font-semibold text-sm">
                      {formatCurrency(event.payload.amount_paid || event.payload.pro_rata_amount || 0)}
                    </span>
                  )}
                  {event.payload?.invoice_url && (
                    <Button variant="ghost" size="icon" asChild className="h-8 w-8">
                      <a href={event.payload.invoice_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
