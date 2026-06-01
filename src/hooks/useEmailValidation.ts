import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ValidateResponse {
  total: number;
  valid: number;
  invalid: number;
  skipped: number;
  credits_used: number;
  results: Array<{ id?: string; email: string; status: string; score: number; skipped?: boolean }>;
}

export function useEmailValidation() {
  const [isValidating, setIsValidating] = useState(false);

  const validateResults = async (huntingResultIds: string[]): Promise<ValidateResponse | null> => {
    if (huntingResultIds.length === 0) {
      toast.info('Nenhum email para validar');
      return null;
    }
    setIsValidating(true);
    try {
      const { data, error } = await supabase.functions.invoke('hunting-validate-email', {
        body: { hunting_result_ids: huntingResultIds },
      });
      if (error) throw error;
      const resp = data as ValidateResponse;
      toast.success(
        `Validação concluída: ${resp.valid} válidos · ${resp.invalid} inválidos · ${resp.skipped} pulados (já recentes)`
      );
      return resp;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao validar emails';
      if (msg.includes('NEVERBOUNCE_API_KEY')) {
        toast.error('Configure a NEVERBOUNCE_API_KEY no backend para usar a validação.');
      } else {
        toast.error(msg);
      }
      return null;
    } finally {
      setIsValidating(false);
    }
  };

  return { isValidating, validateResults };
}
