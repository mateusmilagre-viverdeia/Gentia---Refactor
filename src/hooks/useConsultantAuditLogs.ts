import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ConsultantAccessLog {
  id: string;
  consultant_id: string;
  user_id: string;
  account_id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  // Joined data
  consultant?: {
    name: string;
    email: string;
  };
  company?: {
    name: string;
  };
}

interface UseConsultantAuditLogsOptions {
  consultantId?: string;
  accountId?: string;
  limit?: number;
}

export function useConsultantAuditLogs(options: UseConsultantAuditLogsOptions = {}) {
  const { user } = useAuth();
  const [logs, setLogs] = useState<ConsultantAccessLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { consultantId, accountId, limit = 100 } = options;

  const fetchLogs = useCallback(async () => {
    if (!user) {
      setLogs([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('consultant_access_logs')
        .select(`
          *,
          consultant:ep_consultants(name, email),
          company:companies(name)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (consultantId) {
        query = query.eq('consultant_id', consultantId);
      }

      if (accountId) {
        query = query.eq('account_id', accountId);
      }

      const { data, error: queryError } = await query;

      if (queryError) throw queryError;

      setLogs((data || []) as ConsultantAccessLog[]);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      setError('Erro ao carregar logs de auditoria');
    } finally {
      setLoading(false);
    }
  }, [user, consultantId, accountId, limit]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return {
    logs,
    loading,
    error,
    refetch: fetchLogs
  };
}
