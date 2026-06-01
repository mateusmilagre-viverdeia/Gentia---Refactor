import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type WhatsAppStatus =
  | { attempted: false; sent: false; skipped_reason: string }
  | { attempted: true; sent: true }
  | { attempted: true; sent: false; error: string };

function inviteToastFromWhatsAppStatus(whatsapp: unknown) {
  const w = whatsapp as Partial<WhatsAppStatus> | undefined;

  if (!w) return "Convite enviado com sucesso!";
  if (w.attempted === true && w.sent === true) return "Convite enviado por e-mail e WhatsApp!";
  if (w.attempted === false && w.sent === false && w.skipped_reason === "no_phone") {
    return "Convite enviado por e-mail (sem telefone para WhatsApp).";
  }
  if (w.attempted === true && w.sent === false) {
    return "Convite enviado por e-mail; WhatsApp não pôde ser enviado.";
  }
  return "Convite enviado com sucesso!";
}

interface SendInviteParams {
  candidate_id: string;
  job_id: string;
  agent_id?: string;
  custom_message?: string;
  language?: "pt" | "en" | "es";
}

interface ResendInviteParams {
  session_id: string;
  candidate_id: string;
  job_id: string;
}

export function useInterviewInvite() {
  const queryClient = useQueryClient();

  const sendInvite = useMutation({
    mutationFn: async (params: SendInviteParams) => {
      // Pre-check credits before sending invite
      const { data: session } = await supabase.auth.getSession();
      if (session?.session) {
        const memberResult = await supabase.from('account_members').select('account_id').eq('user_id', session.session.user.id).limit(1).single();
        const accountId = memberResult.data?.account_id;
        
        if (accountId) {
          const { data: creditCheck } = await supabase.rpc('check_credits', {
            p_account_id: accountId,
            p_credit_type: 'ai_interview',
            p_required: 5,
          });
          
          const result = creditCheck as Record<string, unknown> | null;
          if (result && result.has_credits === false) {
            throw new Error("Créditos de IA & Entrevista insuficientes. Solicite mais créditos ao administrador.");
          }
        }
      }

      const { data, error } = await supabase.functions.invoke("send-interview-invite", {
        body: params,
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["culture-interview-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["recruitment-interviews"] });
      toast.success(inviteToastFromWhatsAppStatus(data?.whatsapp));
    },
    onError: (error: Error) => {
      console.error("Error sending invite:", error);
      toast.error(`Erro ao enviar convite: ${error.message}`);
    },
  });

  const resendInvite = useMutation({
    mutationFn: async (params: ResendInviteParams) => {
      const { data, error } = await supabase.functions.invoke("send-interview-invite", {
        body: {
          ...params,
          is_resend: true,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["culture-interview-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["recruitment-interviews"] });
      // Mantém copy curto mas informativo para o usuário.
      toast.success(
        inviteToastFromWhatsAppStatus(data?.whatsapp)
          .replace("Convite enviado", "Convite reenviado")
          .replace("enviado", "reenviado")
      );
    },
    onError: (error: Error) => {
      console.error("Error resending invite:", error);
      toast.error(`Erro ao reenviar convite: ${error.message}`);
    },
  });

  return {
    sendInvite,
    resendInvite,
    isSending: sendInvite.isPending,
    isResending: resendInvite.isPending,
  };
}
