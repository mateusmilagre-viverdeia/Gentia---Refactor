import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface CultureCodeTemplate {
  id: string;
  title: string;
  description: string | null;
  file_path: string;
  file_name: string;
  file_size: number | null;
  uploaded_by: string | null;
  created_at: string | null;
}

export function useCultureCodeTemplates() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["culture-code-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("culture_code_templates")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as CultureCodeTemplate[];
    },
  });

  const getFileUrl = (filePath: string) => {
    const { data } = supabase.storage
      .from("culture-templates")
      .getPublicUrl(filePath);
    return data.publicUrl;
  };

  const uploadMutation = useMutation({
    mutationFn: async ({ file, title, description }: { file: File; title: string; description?: string }) => {
      if (!user) throw new Error("Usuário não encontrado");

      setUploading(true);

      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const filePath = `templates/${timestamp}-${sanitizedName}`;

      const { error: uploadError } = await supabase.storage
        .from("culture-templates")
        .upload(filePath, file, {
          contentType: "application/pdf",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data, error: insertError } = await supabase
        .from("culture_code_templates")
        .insert({
          title,
          description: description || null,
          file_path: filePath,
          file_name: file.name,
          file_size: file.size,
          uploaded_by: user.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["culture-code-templates"] });
      toast.success("Modelo enviado com sucesso!");
    },
    onError: (error) => {
      console.error("Upload error:", error);
      toast.error("Erro ao enviar modelo. Tente novamente.");
    },
    onSettled: () => {
      setUploading(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (template: CultureCodeTemplate) => {
      const { error: storageError } = await supabase.storage
        .from("culture-templates")
        .remove([template.file_path]);

      if (storageError) console.warn("Storage delete error:", storageError);

      const { error: dbError } = await supabase
        .from("culture_code_templates")
        .delete()
        .eq("id", template.id);

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["culture-code-templates"] });
      toast.success("Modelo excluído com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao excluir modelo.");
    },
  });

  return {
    templates,
    isLoading,
    uploading,
    getFileUrl,
    uploadTemplate: uploadMutation.mutate,
    deleteTemplate: deleteMutation.mutate,
  };
}
