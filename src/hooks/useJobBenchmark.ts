import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface JobReference {
  source: string;
  url: string;
  title: string;
  company?: string;
  highlights: {
    responsibilities?: string[];
    requirements?: string[];
    benefits?: string[];
    salary_range?: string;
    culture_points?: string[];
  };
}

interface BenchmarkInsights {
  common_requirements: string[];
  differentiators: string[];
  market_benefits: string[];
  suggested_improvements: string[];
}

interface BenchmarkData {
  success: boolean;
  references: JobReference[];
  insights: BenchmarkInsights;
  cached: boolean;
  error?: string;
}

export function useJobBenchmark() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<BenchmarkData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchBenchmark = useCallback(async (
    jobTitle: string,
    options?: {
      industry?: string;
      location?: string;
      accountId?: string;
    }
  ) => {
    if (!jobTitle || jobTitle.length < 3) {
      toast.warning('Informe o título do cargo para buscar referências');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: result, error: fnError } = await supabase.functions.invoke('job-benchmark-search', {
        body: {
          type: 'job_description',
          jobTitle,
          industry: options?.industry,
          location: options?.location,
          accountId: options?.accountId,
        },
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (!result.success) {
        throw new Error(result.error || 'Falha ao buscar referências');
      }

      setData(result);
      
      if (result.cached) {
        toast.info('Referências do cache (7 dias)', {
          description: `${result.references.length} vagas encontradas`,
        });
      } else {
        toast.success(`${result.references.length} referências de mercado encontradas!`);
      }

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(message);
      
      if (message.includes('Firecrawl connector')) {
        toast.error('Firecrawl não configurado', {
          description: 'Configure o conector Firecrawl nas configurações.',
        });
      } else {
        toast.error('Erro ao buscar referências', { description: message });
      }
      
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearBenchmark = useCallback(() => {
    setData(null);
    setError(null);
  }, []);

  return {
    loading,
    data,
    error,
    fetchBenchmark,
    clearBenchmark,
    hasData: !!data?.references?.length,
  };
}
