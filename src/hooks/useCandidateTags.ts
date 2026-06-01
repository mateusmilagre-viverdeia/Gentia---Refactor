import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { toast } from "sonner";

export function useCandidateTags() {
  const { currentAccount } = useOrganization();
  const queryClient = useQueryClient();

  // Fetch all unique tags from the organization
  const { data: allTags = [], isLoading: isLoadingTags } = useQuery({
    queryKey: ["candidate-tags", currentAccount?.id],
    queryFn: async () => {
      if (!currentAccount?.id) return [];

      const { data, error } = await supabase
        .from("recruitment_candidates")
        .select("tags")
        .eq("account_id", currentAccount.id);

      if (error) throw error;

      const uniqueTags = new Set<string>();
      data?.forEach((c) => c.tags?.forEach((t: string) => uniqueTags.add(t)));
      return Array.from(uniqueTags).sort();
    },
    enabled: !!currentAccount?.id,
  });

  // Add tag to candidate
  const addTag = useMutation({
    mutationFn: async ({ candidateId, tag }: { candidateId: string; tag: string }) => {
      const { data: current, error: fetchError } = await supabase
        .from("recruitment_candidates")
        .select("tags")
        .eq("id", candidateId)
        .single();

      if (fetchError) throw fetchError;

      const currentTags = current?.tags || [];
      if (currentTags.includes(tag)) return; // Tag already exists

      const newTags = [...currentTags, tag];

      const { error: updateError } = await supabase
        .from("recruitment_candidates")
        .update({ tags: newTags })
        .eq("id", candidateId);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recruitment-candidates"] });
      queryClient.invalidateQueries({ queryKey: ["candidate-tags"] });
      toast.success("Tag adicionada");
    },
    onError: () => {
      toast.error("Erro ao adicionar tag");
    },
  });

  // Remove tag from candidate
  const removeTag = useMutation({
    mutationFn: async ({ candidateId, tag }: { candidateId: string; tag: string }) => {
      const { data: current, error: fetchError } = await supabase
        .from("recruitment_candidates")
        .select("tags")
        .eq("id", candidateId)
        .single();

      if (fetchError) throw fetchError;

      const currentTags = current?.tags || [];
      const newTags = currentTags.filter((t: string) => t !== tag);

      const { error: updateError } = await supabase
        .from("recruitment_candidates")
        .update({ tags: newTags })
        .eq("id", candidateId);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recruitment-candidates"] });
      queryClient.invalidateQueries({ queryKey: ["candidate-tags"] });
      toast.success("Tag removida");
    },
    onError: () => {
      toast.error("Erro ao remover tag");
    },
  });

  // Get tag suggestions based on prefix
  const getTagSuggestions = (prefix: string): string[] => {
    if (!prefix) return allTags.slice(0, 10);
    const lower = prefix.toLowerCase();
    return allTags.filter((tag) => tag.toLowerCase().includes(lower)).slice(0, 10);
  };

  return {
    allTags,
    isLoadingTags,
    addTag,
    removeTag,
    getTagSuggestions,
  };
}

// Helper to get tag category and color
export function getTagCategory(tag: string): { category: string; color: string } {
  const lower = tag.toLowerCase();
  
  // Skills técnicas
  const techSkills = ["react", "typescript", "javascript", "python", "java", "node", "aws", "docker", "kubernetes", "sql", "mongodb", "go", "rust", "c++", "php", "ruby", "angular", "vue", "next", "graphql", "api", "backend", "frontend", "fullstack", "devops", "cloud"];
  if (techSkills.some((s) => lower.includes(s))) {
    return { category: "skill", color: "bg-blue-100 text-blue-800 border-blue-200" };
  }

  // Experiência
  const experience = ["junior", "júnior", "pleno", "sênior", "senior", "trainee", "estagiário", "estágio", "anos", "year", "lead", "líder", "gestor", "manager", "diretor", "coordenador"];
  if (experience.some((e) => lower.includes(e))) {
    return { category: "experience", color: "bg-green-100 text-green-800 border-green-200" };
  }

  // Localização
  const location = ["remoto", "remote", "híbrido", "hybrid", "presencial", "são paulo", "rio", "belo horizonte", "curitiba", "porto alegre", "brasil", "internacional"];
  if (location.some((l) => lower.includes(l))) {
    return { category: "location", color: "bg-orange-100 text-orange-800 border-orange-200" };
  }

  // Soft skills
  const softSkills = ["liderança", "comunicação", "proativo", "organizado", "criativo", "analítico", "colaborativo", "resiliente", "adaptável"];
  if (softSkills.some((s) => lower.includes(s))) {
    return { category: "soft", color: "bg-purple-100 text-purple-800 border-purple-200" };
  }

  // Default
  return { category: "other", color: "bg-gray-100 text-gray-800 border-gray-200" };
}
