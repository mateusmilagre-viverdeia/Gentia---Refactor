import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PortalAccess {
  id: string;
  account_id: string;
  cliente_id: string;
  contato_id: string | null;
  email: string;
  token_acesso: string;
  ultimo_acesso: string | null;
  ativo: boolean;
}

export interface PortalClient {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  logo_url: string | null;
  status: string;
}

export interface PortalContact {
  id: string;
  nome: string;
  cargo: string | null;
  email: string | null;
}

export interface PortalAuthData {
  access: PortalAccess;
  client: PortalClient;
  contact: PortalContact | null;
  accountId: string;
}

export const usePortalAuth = (token: string | undefined) => {
  const [data, setData] = useState<PortalAuthData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const validate = useCallback(async () => {
    if (!token) {
      setError("Token não fornecido");
      setIsLoading(false);
      return;
    }

    try {
      // Valida o token e busca os dados no SERVIDOR (portal-data) — sem SELECT direto
      // às tabelas (que exigia acesso anônimo e vazava PII). O servidor escopa por token.
      const { data: result, error: fnError } = await supabase.functions.invoke("portal-data", {
        body: { token, resource: "auth" },
      });

      const r = result as {
        error?: string;
        access?: Omit<PortalAccess, "token_acesso" | "ultimo_acesso" | "ativo">;
        client?: PortalClient;
        contact?: PortalContact | null;
        accountId?: string;
      } | null;

      if (fnError || !r || r.error || !r.access || !r.client) {
        setError(r?.error || "Acesso inválido ou expirado");
        setIsLoading(false);
        return;
      }

      setData({
        access: { ...r.access, token_acesso: token, ultimo_acesso: null, ativo: true },
        client: r.client,
        contact: r.contact ?? null,
        accountId: r.accountId ?? r.access.account_id,
      });
    } catch (err) {
      setError("Erro ao validar acesso");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    validate();
  }, [validate]);

  return { data, isLoading, error };
};
