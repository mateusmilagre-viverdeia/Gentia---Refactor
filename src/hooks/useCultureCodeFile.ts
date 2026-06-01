import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface CultureCodeFile {
  id: string;
  account_id: string;
  file_path: string;
  file_name: string;
  file_size: number | null;
  uploaded_by: string | null;
  uploaded_at: string | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

export function useCultureCodeFile() {
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const accountId = currentOrganization?.id;

  // Fetch active file
  const { data: activeFile, isLoading } = useQuery({
    queryKey: ["culture-code-file", accountId],
    queryFn: async () => {
      if (!accountId) return null;

      const { data, error } = await supabase
        .from("culture_code_files")
        .select("*")
        .eq("account_id", accountId)
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;
      return data as CultureCodeFile | null;
    },
    enabled: !!accountId,
  });

  // Fetch all files history
  const { data: fileHistory } = useQuery({
    queryKey: ["culture-code-files-history", accountId],
    queryFn: async () => {
      if (!accountId) return [];

      const { data, error } = await supabase
        .from("culture_code_files")
        .select("*")
        .eq("account_id", accountId)
        .order("uploaded_at", { ascending: false });

      if (error) throw error;
      return data as CultureCodeFile[];
    },
    enabled: !!accountId,
  });

  // Get public URL for a file
  const getFileUrl = (filePath: string) => {
    const { data } = supabase.storage
      .from("culture-files")
      .getPublicUrl(filePath);
    return data.publicUrl;
  };

  // Upload file mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!accountId || !user) {
        throw new Error("Organização ou usuário não encontrado");
      }

      setUploading(true);

      // Create file path: accountId/timestamp-filename.pdf
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const filePath = `${accountId}/${timestamp}-${sanitizedName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("culture-files")
        .upload(filePath, file, {
          contentType: "application/pdf",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Deactivate previous active files
      await supabase
        .from("culture_code_files")
        .update({ is_active: false })
        .eq("account_id", accountId)
        .eq("is_active", true);

      // Insert new file record
      const { data, error: insertError } = await supabase
        .from("culture_code_files")
        .insert({
          account_id: accountId,
          file_path: filePath,
          file_name: file.name,
          file_size: file.size,
          uploaded_by: user.id,
          is_active: true,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["culture-code-file", accountId] });
      queryClient.invalidateQueries({ queryKey: ["culture-code-files-history", accountId] });
      toast.success("PDF enviado com sucesso!");
    },
    onError: (error) => {
      console.error("Upload error:", error);
      toast.error("Erro ao enviar PDF. Tente novamente.");
    },
    onSettled: () => {
      setUploading(false);
    },
  });

  // Set file as active
  const setActiveMutation = useMutation({
    mutationFn: async (fileId: string) => {
      if (!accountId) throw new Error("Organização não encontrada");

      // Deactivate all files
      await supabase
        .from("culture_code_files")
        .update({ is_active: false })
        .eq("account_id", accountId);

      // Activate selected file
      const { error } = await supabase
        .from("culture_code_files")
        .update({ is_active: true })
        .eq("id", fileId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["culture-code-file", accountId] });
      queryClient.invalidateQueries({ queryKey: ["culture-code-files-history", accountId] });
      toast.success("PDF ativado com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao ativar PDF.");
    },
  });

  // Delete file
  const deleteMutation = useMutation({
    mutationFn: async (file: CultureCodeFile) => {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("culture-files")
        .remove([file.file_path]);

      if (storageError) console.warn("Storage delete error:", storageError);

      // Delete from database
      const { error: dbError } = await supabase
        .from("culture_code_files")
        .delete()
        .eq("id", file.id);

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["culture-code-file", accountId] });
      queryClient.invalidateQueries({ queryKey: ["culture-code-files-history", accountId] });
      toast.success("PDF excluído com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao excluir PDF.");
    },
  });

  return {
    activeFile,
    fileHistory,
    isLoading,
    uploading,
    getFileUrl,
    uploadFile: uploadMutation.mutate,
    setActiveFile: setActiveMutation.mutate,
    deleteFile: deleteMutation.mutate,
  };
}
