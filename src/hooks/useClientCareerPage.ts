import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ClientCareerPage {
  id: string;
  account_id: string;
  client_id: string;
  slug: string;
  is_active: boolean;
  logo_url: string | null;
  cover_image_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  company_description: string | null;
  custom_domain: string | null;
  custom_domain_verified: boolean;
  custom_domain_cname: string | null;
  meta_title: string | null;
  meta_description: string | null;
  total_views: number;
  total_applications: number;
  created_at: string;
  updated_at: string;
}

export function useClientCareerPage(clientId: string | undefined) {
  return useQuery({
    queryKey: ["client-career-page", clientId],
    queryFn: async () => {
      if (!clientId) return null;
      const { data, error } = await supabase
        .from("client_career_pages")
        .select("*")
        .eq("client_id", clientId)
        .maybeSingle();
      if (error) throw error;
      return data as ClientCareerPage | null;
    },
    enabled: !!clientId,
  });
}

export function useEnsureClientCareerPage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ clientId, accountId, clientName }: { clientId: string; accountId: string; clientName: string }) => {
      const { data: existing } = await supabase
        .from("client_career_pages")
        .select("*")
        .eq("client_id", clientId)
        .maybeSingle();
      if (existing) return existing as ClientCareerPage;

      const { data: slugData, error: slugErr } = await supabase
        .rpc("generate_client_career_slug", { _client_name: clientName });
      if (slugErr) throw slugErr;

      const { data, error } = await supabase
        .from("client_career_pages")
        .insert({
          account_id: accountId,
          client_id: clientId,
          slug: slugData as string,
          is_active: false,
        })
        .select("*")
        .single();
      if (error) throw error;
      return data as ClientCareerPage;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["client-career-page", vars.clientId] });
    },
  });
}

export function useUpdateClientCareerPage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ClientCareerPage> }) => {
      const { data, error } = await supabase
        .from("client_career_pages")
        .update(updates)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw error;
      return data as ClientCareerPage;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["client-career-page", data.client_id] });
      qc.invalidateQueries({ queryKey: ["all-client-career-pages"] });
      toast.success("Página atualizada");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao atualizar"),
  });
}

const ASSET_RULES = {
  logo: {
    types: ["image/png", "image/svg+xml", "image/jpeg", "image/webp"],
    maxBytes: 2 * 1024 * 1024,
    label: "Logo deve ser PNG, SVG, JPG ou WEBP de até 2MB",
  },
  cover: {
    types: ["image/jpeg", "image/png", "image/webp"],
    maxBytes: 5 * 1024 * 1024,
    label: "Capa deve ser JPG, PNG ou WEBP de até 5MB",
  },
};

export function useUploadCareerAsset() {
  return useMutation({
    mutationFn: async ({ accountId, file, kind }: { accountId: string; file: File; kind: "logo" | "cover" }) => {
      const rule = ASSET_RULES[kind];
      if (!rule.types.includes(file.type)) {
        throw new Error(rule.label);
      }
      if (file.size > rule.maxBytes) {
        throw new Error(rule.label);
      }
      const ext = file.name.split(".").pop() || "png";
      const path = `${accountId}/${kind}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("client-career-assets")
        .upload(path, file, { upsert: false });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("client-career-assets").getPublicUrl(path);
      return urlData.publicUrl;
    },
    onError: (e: any) => toast.error(e.message || "Erro no upload"),
  });
}

export function useVerifyCareerDomain() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ pageId, customDomain }: { pageId: string; customDomain: string }) => {
      const { data, error } = await supabase.functions.invoke("careers-verify-domain", {
        body: { page_id: pageId, custom_domain: customDomain },
      });
      if (error) throw error;
      return data as { verified: boolean; target_cname: string; resolved_cname: string | null };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["client-career-page"] });
      if (data.verified) toast.success("Domínio verificado!");
      else toast.error(`DNS aponta para "${data.resolved_cname || "nada"}". Esperado: ${data.target_cname}`);
    },
    onError: (e: any) => toast.error(e.message || "Erro ao verificar"),
  });
}

export function useAllClientCareerPages(accountId: string | undefined) {
  return useQuery({
    queryKey: ["all-client-career-pages", accountId],
    queryFn: async () => {
      if (!accountId) return {} as Record<string, ClientCareerPage>;
      const { data, error } = await supabase
        .from("client_career_pages")
        .select("*")
        .eq("account_id", accountId);
      if (error) throw error;
      const map: Record<string, ClientCareerPage> = {};
      (data || []).forEach((p: any) => { map[p.client_id] = p; });
      return map;
    },
    enabled: !!accountId,
  });
}
