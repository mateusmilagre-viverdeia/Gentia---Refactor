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
      // Lookup portal access by token
      const { data: accessData, error: accessError } = await supabase
        .from("portal_clientes_acesso")
        .select("*")
        .eq("token_acesso", token)
        .eq("ativo", true)
        .single();

      if (accessError || !accessData) {
        setError("Acesso inválido ou expirado");
        setIsLoading(false);
        return;
      }

      const access = accessData as PortalAccess;

      // Fetch client data
      const { data: clientData, error: clientError } = await supabase
        .from("clientes_consultoria")
        .select("id, razao_social, nome_fantasia, logo_url, status")
        .eq("id", access.cliente_id)
        .single();

      if (clientError || !clientData) {
        setError("Cliente não encontrado");
        setIsLoading(false);
        return;
      }

      // Fetch contact data if available
      let contact: PortalContact | null = null;
      if (access.contato_id) {
        const { data: contactData } = await supabase
          .from("clientes_contatos")
          .select("id, nome, cargo, email")
          .eq("id", access.contato_id)
          .single();
        contact = contactData as PortalContact | null;
      }

      // Update ultimo_acesso
      await supabase
        .from("portal_clientes_acesso")
        .update({ ultimo_acesso: new Date().toISOString() })
        .eq("id", access.id);

      setData({
        access,
        client: clientData as PortalClient,
        contact,
        accountId: access.account_id,
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
