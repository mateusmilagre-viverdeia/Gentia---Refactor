import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getTranslatedErrorMessage } from "@/utils/translateAuthError";

export interface AuthenticatedFetchResult<T = unknown> {
  data: T | null;
  error: string | null;
}

/**
 * Invokes a Supabase edge function with authentication and rate limit handling.
 * @param functionName Name of the edge function to invoke
 * @param body Request body to send
 * @returns Response data or null if error
 */
export async function invokeAuthenticatedFunction<T = unknown>(
  functionName: string,
  body: Record<string, unknown>
): Promise<AuthenticatedFetchResult<T>> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      toast.error("Você precisa estar logado para usar esta funcionalidade.");
      return { data: null, error: "Usuário não autenticado" };
    }

    const { data, error } = await supabase.functions.invoke(functionName, {
      body,
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    });

    if (error) {
      console.error(`Error invoking ${functionName}:`, error);
      
      // Try to extract the JSON body from FunctionsHttpError
      let bodyError: string | null = null;
      if (error.context && typeof error.context === 'object') {
        try {
          const response = (error as any).context;
          if (response instanceof Response) {
            const bodyText = await response.json().catch(() => null);
            if (bodyText?.error) {
              bodyError = bodyText.error;
            }
          }
        } catch {
          // ignore parsing errors
        }
      }

      if (bodyError) {
        return { data: null, error: getTranslatedErrorMessage(bodyError) };
      }
      
      // Check for rate limit error
      if (error.message?.includes('429') || error.message?.includes('rate_limit')) {
        toast.error("Limite diário de IA atingido. Tente novamente amanhã.");
        return { data: null, error: "rate_limit_exceeded" };
      }
      
      // Check for auth error
      if (error.message?.includes('401') || error.message?.includes('unauthorized')) {
        toast.error("Sessão expirada. Por favor, faça login novamente.");
        return { data: null, error: "unauthorized" };
      }
      
      // Check for payment required
      if (error.message?.includes('402')) {
        toast.error("Créditos de IA esgotados.");
        return { data: null, error: "payment_required" };
      }
      
      return { data: null, error: getTranslatedErrorMessage(error.message) };
    }

    // Check if response contains error status in body
    if (data?.error) {
      if (data.error === 'rate_limit_exceeded' || data.message?.includes('50 chamadas')) {
        toast.error("Limite diário de IA atingido. Tente novamente amanhã.");
        return { data: null, error: "rate_limit_exceeded" };
      }
      
      if (data.error === 'unauthorized') {
        toast.error("Sessão expirada. Por favor, faça login novamente.");
        return { data: null, error: "unauthorized" };
      }
      
      return { data: null, error: getTranslatedErrorMessage(data.message || data.error) };
    }

    return { data: data as T, error: null };
  } catch (err) {
    console.error(`Exception invoking ${functionName}:`, err);
    return { data: null, error: getTranslatedErrorMessage(err, "Erro desconhecido") };
  }
}
