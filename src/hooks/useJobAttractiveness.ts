import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AttractivenessBreakdown {
  salary: number;
  benefits: number;
  description: number;
  selling: number;
  culture: number;
  flexibility: number;
  responsiveness: number;
}

export interface JobAttractiveness {
  score: number;
  breakdown: AttractivenessBreakdown;
  suggestions: string[];
  calculatedAt: string | null;
}

/**
 * Hook to fetch job attractiveness score
 */
export function useJobAttractiveness(jobId: string | undefined) {
  return useQuery({
    queryKey: ["job-attractiveness", jobId],
    queryFn: async (): Promise<JobAttractiveness | null> => {
      if (!jobId) return null;

      const { data, error } = await supabase
        .from("recruitment_jobs")
        .select("attractiveness_score, attractiveness_breakdown, attractiveness_suggestions, attractiveness_calculated_at")
        .eq("id", jobId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return {
        score: (data as any).attractiveness_score || 0,
        breakdown: (data as any).attractiveness_breakdown || {},
        suggestions: (data as any).attractiveness_suggestions || [],
        calculatedAt: (data as any).attractiveness_calculated_at,
      };
    },
    enabled: !!jobId,
  });
}

/**
 * Hook to recalculate job attractiveness score
 */
export function useCalculateJobAttractiveness() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ jobId, accountId }: { jobId: string; accountId: string }) => {
      const { data, error } = await supabase.functions.invoke("calculate-job-attractiveness", {
        body: { jobId, accountId },
      });

      if (error) throw error;
      return data as JobAttractiveness;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["job-attractiveness", variables.jobId] });
      queryClient.invalidateQueries({ queryKey: ["recruitment-jobs"] });
      toast.success(`Score de atratividade atualizado: ${data.score}/100`);
    },
    onError: (error) => {
      console.error("Error calculating attractiveness:", error);
      toast.error("Erro ao calcular score de atratividade");
    },
  });
}

/**
 * Get score color based on value
 */
export function getAttractivenessColor(score: number): string {
  if (score >= 80) return "text-chart-2"; // Green
  if (score >= 50) return "text-chart-4"; // Yellow
  return "text-destructive"; // Red
}

/**
 * Get score badge variant
 */
export function getAttractivenessVariant(score: number): "default" | "secondary" | "destructive" {
  if (score >= 80) return "default";
  if (score >= 50) return "secondary";
  return "destructive";
}

/**
 * Get category label in Portuguese
 */
export function getCategoryLabel(category: keyof AttractivenessBreakdown): string {
  const labels: Record<keyof AttractivenessBreakdown, string> = {
    salary: "Faixa Salarial",
    benefits: "Benefícios",
    description: "Descrição",
    selling: "Pitch de Venda",
    culture: "Cultura",
    flexibility: "Flexibilidade",
    responsiveness: "Tempo de Resposta",
  };
  return labels[category];
}

/**
 * Get max score for each category
 */
export function getCategoryMaxScore(category: keyof AttractivenessBreakdown): number {
  const maxScores: Record<keyof AttractivenessBreakdown, number> = {
    salary: 20,
    benefits: 15,
    description: 20,
    selling: 15,
    culture: 15,
    flexibility: 10,
    responsiveness: 5,
  };
  return maxScores[category];
}
