import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ApproachData {
  id: string;
  message: string;
  phone_number: string | null;
  email: string | null;
  email_subject: string | null;
  candidate_name: string;
  channel: 'whatsapp' | 'email';
  status: string;
}

interface GenerateApproachParams {
  huntingResultId: string;
  accountId: string;
}

interface SendApproachParams {
  approachId: string;
  message: string;
  phone: string;
}

export function useHuntingApproach() {
  const queryClient = useQueryClient();
  const [currentApproach, setCurrentApproach] = useState<ApproachData | null>(null);

  // Generate approach mutation
  const generateMutation = useMutation({
    mutationFn: async ({ huntingResultId, accountId }: GenerateApproachParams) => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Não autenticado');
      }

      const { data, error } = await supabase.functions.invoke('hunting-generate-approach', {
        body: {
          hunting_result_id: huntingResultId,
          account_id: accountId,
        },
      });

      if (error) {
        console.error('Error generating approach:', error);
        throw new Error(error.message || 'Erro ao gerar abordagem');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Erro desconhecido');
      }

      return data.approach as ApproachData;
    },
    onSuccess: (approach) => {
      setCurrentApproach(approach);
    },
    onError: (error: Error) => {
      console.error('Generate approach error:', error);
      if (error.message.includes('429') || error.message.includes('Limite')) {
        toast.error('Limite de IA atingido. Tente novamente mais tarde.');
      } else {
        toast.error(error.message || 'Erro ao gerar mensagem de abordagem');
      }
    },
  });

  // Send approach via WhatsApp
  const sendMutation = useMutation({
    mutationFn: async ({ approachId, message, phone }: SendApproachParams) => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Não autenticado');
      }

      // Normalize phone to E.164
      const normalizedPhone = normalizePhoneE164(phone);

      // First, update the approach with the sent message
      const { error: updateError } = await supabase
        .from('recruitment_hunting_approaches')
        .update({
          message_sent: message,
          phone_number: normalizedPhone,
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: session.user.id,
        })
        .eq('id', approachId);

      if (updateError) {
        throw new Error('Erro ao salvar abordagem');
      }

      // Send via WhatsApp
      const { data: sendResult, error: sendError } = await supabase.functions.invoke('whatsapp-send', {
        body: {
          toPhoneE164: normalizedPhone,
          message: message,
          provider: 'zapi',
        },
      });

      if (sendError || !sendResult?.success) {
        // Mark as failed
        await supabase
          .from('recruitment_hunting_approaches')
          .update({
            status: 'failed',
            error_message: sendError?.message || sendResult?.error || 'Erro ao enviar',
          })
          .eq('id', approachId);

        throw new Error(sendError?.message || sendResult?.error || 'Erro ao enviar WhatsApp');
      }

      // Mark as sent
      await supabase
        .from('recruitment_hunting_approaches')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
        .eq('id', approachId);

      return { success: true };
    },
    onSuccess: () => {
      toast.success('Mensagem enviada com sucesso!');
      setCurrentApproach(null);
      queryClient.invalidateQueries({ queryKey: ['hunting-results'] });
    },
    onError: (error: Error) => {
      console.error('Send approach error:', error);
      toast.error(error.message || 'Erro ao enviar mensagem');
    },
  });

  // Regenerate approach (delete old, create new)
  const regenerateApproach = async (huntingResultId: string, accountId: string): Promise<string> => {
    // Delete current approach if exists
    if (currentApproach?.id) {
      await supabase
        .from('recruitment_hunting_approaches')
        .delete()
        .eq('id', currentApproach.id);
    }

    // Generate new
    const newApproach = await generateMutation.mutateAsync({ huntingResultId, accountId });
    return newApproach.message;
  };

  return {
    currentApproach,
    setCurrentApproach,
    generateApproach: generateMutation.mutateAsync,
    isGenerating: generateMutation.isPending,
    sendApproach: sendMutation.mutateAsync,
    isSending: sendMutation.isPending,
    regenerateApproach,
    clearApproach: () => setCurrentApproach(null),
  };
}

// Helper to normalize phone to E.164 format
function normalizePhoneE164(phone: string): string {
  // Remove all non-digits
  let digits = phone.replace(/\D/g, '');
  
  // If starts with 0, remove it (Brazilian convention)
  if (digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  
  // If no country code, assume Brazil (+55)
  if (digits.length <= 11) {
    digits = '55' + digits;
  }
  
  // Add + prefix
  return '+' + digits;
}
