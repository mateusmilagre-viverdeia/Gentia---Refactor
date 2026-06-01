import { useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, ExternalLink, Download, RefreshCw } from 'lucide-react';
import { useAccount } from '@/hooks/useAccount';
import { useInvoices } from '@/hooks/useInvoices';
import { formatBRT } from "@/lib/datetime";


export default function Faturas() {
  const { account, loading: accountLoading } = useAccount();
  const { invoices, loading, error, fetchInvoices } = useInvoices(account?.id || null);

  useEffect(() => {
    if (account?.id) {
      fetchInvoices();
    }
  }, [account?.id, fetchInvoices]);

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Pago</Badge>;
      case 'open':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Em aberto</Badge>;
      case 'draft':
        return <Badge variant="secondary">Rascunho</Badge>;
      case 'uncollectible':
        return <Badge variant="destructive">Não cobrável</Badge>;
      case 'void':
        return <Badge variant="outline">Cancelado</Badge>;
      default:
        return <Badge variant="outline">{status || 'Desconhecido'}</Badge>;
    }
  };

  const breadcrumb = [
    { label: 'Home', href: '/' },
    { label: 'Conta' },
    { label: 'Faturas' }
  ];

  if (accountLoading) {
    return (
      <AppLayout title="Faturas" breadcrumb={breadcrumb}>
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Faturas" breadcrumb={breadcrumb}>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Histórico de Faturas
                </CardTitle>
                <CardDescription>
                  Visualize todas as faturas da sua assinatura
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={fetchInvoices} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading && invoices.length === 0 ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>{error}</p>
                <Button variant="outline" className="mt-4" onClick={fetchInvoices}>
                  Tentar novamente
                </Button>
              </div>
            ) : invoices.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma fatura encontrada</p>
              </div>
            ) : (
              <div className="space-y-4">
                {invoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-muted rounded-lg">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {invoice.number || (invoice.type === 'payment' ? 'Pagamento avulso' : `Fatura ${invoice.id.slice(-8)}`)}
                          </span>
                          {getStatusBadge(invoice.status)}
                          {invoice.type === 'payment' && (
                            <Badge variant="outline" className="text-xs">Assentos</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {formatBRT(new Date(invoice.created * 1000), "dd 'de' MMMM 'de' yyyy")}
                        </p>
                        {invoice.lines.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {invoice.lines.map(l => l.description).filter(Boolean).join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-semibold">
                          {formatCurrency(invoice.amount_paid || invoice.amount_due, invoice.currency)}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {invoice.hosted_invoice_url && (
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                          >
                            <a href={invoice.hosted_invoice_url} target="_blank" rel="noopener noreferrer" title="Ver fatura">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        {invoice.invoice_pdf && (
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                          >
                            <a href={invoice.invoice_pdf} target="_blank" rel="noopener noreferrer" title="Baixar PDF">
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        {invoice.receipt_url && (
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                          >
                            <a href={invoice.receipt_url} target="_blank" rel="noopener noreferrer" title="Ver recibo">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
