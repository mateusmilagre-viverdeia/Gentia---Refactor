import { useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { toast } from '@/hooks/use-toast';

export function useCulturePulseAutoSync(pillarName: string) {
  const { currentAccount } = useOrganization();
  const hasSynced = useRef(false);

  const triggerSync = useCallback(async () => {
    if (hasSynced.current || !currentAccount?.id) return;
    hasSynced.current = true;

    try {
      const { data, error } = await supabase.functions.invoke(
        'generate-culture-pulse-questions',
        { body: { account_id: currentAccount.id } }
      );

      if (error) {
        console.error('Auto-sync culture questions error:', error);
        return;
      }

      if (data?.success && data.new_count > 0) {
        toast({
          title: `${pillarName} sincronizado`,
          description: `${data.new_count} nova(s) pergunta(s) de cultura gerada(s). Ative-as no Pulse Admin.`,
        });
      }
    } catch (err) {
      console.error('Auto-sync culture questions failed:', err);
    }
  }, [currentAccount?.id, pillarName]);

  return { triggerSync };
}
