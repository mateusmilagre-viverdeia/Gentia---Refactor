import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface CultureCodeShare {
  id: string;
  account_id: string;
  file_id: string;
  token: string;
  expires_at: string;
  created_by: string | null;
  created_at: string | null;
  is_active: boolean | null;
  view_count: number | null;
}

// Generate a random token
function generateToken(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

export function useCultureCodeShare(fileId?: string) {
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);

  const accountId = currentOrganization?.id;

  // Fetch active shares for a file
  const { data: shares, isLoading } = useQuery({
    queryKey: ["culture-code-shares", accountId, fileId],
    queryFn: async () => {
      if (!accountId || !fileId) return [];

      const { data, error } = await supabase
        .from("culture_code_shares")
        .select("*")
        .eq("account_id", accountId)
        .eq("file_id", fileId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as CultureCodeShare[];
    },
    enabled: !!accountId && !!fileId,
  });

  // Create share link mutation
  const createShareMutation = useMutation({
    mutationFn: async ({ expiresInDays = 7 }: { expiresInDays?: number }) => {
      if (!accountId || !user || !fileId) {
        throw new Error("Dados necessários não encontrados");
      }

      setCreating(true);

      const token = generateToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);

      const { data, error } = await supabase
        .from("culture_code_shares")
        .insert({
          account_id: accountId,
          file_id: fileId,
          token,
          expires_at: expiresAt.toISOString(),
          created_by: user.id,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data as CultureCodeShare;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["culture-code-shares", accountId, fileId] });
      toast.success("Link de compartilhamento criado!");
    },
    onError: (error) => {
      console.error("Create share error:", error);
      toast.error("Erro ao criar link. Tente novamente.");
    },
    onSettled: () => {
      setCreating(false);
    },
  });

  // Deactivate share link
  const deactivateShareMutation = useMutation({
    mutationFn: async (shareId: string) => {
      const { error } = await supabase
        .from("culture_code_shares")
        .update({ is_active: false })
        .eq("id", shareId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["culture-code-shares", accountId, fileId] });
      toast.success("Link desativado com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao desativar link.");
    },
  });

  // Get full share URL
  const getShareUrl = (token: string) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/cultura/compartilhado/${token}`;
  };

  return {
    shares,
    isLoading,
    creating,
    createShare: createShareMutation.mutate,
    deactivateShare: deactivateShareMutation.mutate,
    getShareUrl,
  };
}

// Hook for public access (without auth)
export function usePublicCultureCodeShare(token: string) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["public-culture-share", token],
    queryFn: async () => {
      // Fetch share info
      const { data: share, error: shareError } = await supabase
        .from("culture_code_shares")
        .select(`
          *,
          culture_code_files (
            id,
            file_path,
            file_name,
            file_size
          ),
          companies:account_id (
            name
          )
        `)
        .eq("token", token)
        .eq("is_active", true)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

      if (shareError) throw shareError;
      if (!share) throw new Error("Link não encontrado ou expirado");

      // Increment view count
      await supabase.rpc("increment_share_view_count", { share_token: token });

      // Get public URL for the file
      const fileData = share.culture_code_files as unknown as {
        id: string;
        file_path: string;
        file_name: string;
        file_size: number;
      };

      const { data: urlData } = supabase.storage
        .from("culture-files")
        .getPublicUrl(fileData.file_path);

      return {
        share,
        file: fileData,
        fileUrl: urlData.publicUrl,
        companyName: (share.companies as unknown as { name: string })?.name || "Empresa",
      };
    },
    enabled: !!token,
    retry: false,
  });

  return {
    data,
    isLoading,
    error,
  };
}
