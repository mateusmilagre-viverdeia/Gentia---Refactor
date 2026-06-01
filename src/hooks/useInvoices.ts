import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface InvoiceLine {
  description: string | null;
  amount: number;
  quantity: number | null;
}

export interface Invoice {
  id: string;
  number: string | null;
  status: string | null;
  amount_due: number;
  amount_paid: number;
  currency: string;
  created: number;
  period_start: number | null;
  period_end: number | null;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
  receipt_url?: string | null;
  description: string | null;
  lines: InvoiceLine[];
  type?: 'invoice' | 'payment';
}

interface UseInvoicesReturn {
  invoices: Invoice[];
  loading: boolean;
  error: string | null;
  fetchInvoices: () => Promise<void>;
}

export function useInvoices(accountId: string | null): UseInvoicesReturn {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInvoices = useCallback(async () => {
    if (!accountId) {
      setInvoices([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fnError } = await supabase.functions.invoke('list-invoices', {
        body: { account_id: accountId, limit: 50 }
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      setInvoices(data?.invoices || []);
    } catch (err) {
      console.error('Error fetching invoices:', err);
      setError('Erro ao carregar faturas');
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  return {
    invoices,
    loading,
    error,
    fetchInvoices,
  };
}
