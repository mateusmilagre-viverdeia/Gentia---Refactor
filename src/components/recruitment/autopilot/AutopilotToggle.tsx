import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Zap } from "lucide-react";
import { toast } from "sonner";

interface AutopilotToggleProps {
  jobId: string;
}

export function AutopilotToggle({ jobId }: AutopilotToggleProps) {
  const queryClient = useQueryClient();

  const { data: isAutopilot, isLoading } = useQuery({
    queryKey: ["job-autopilot", jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recruitment_jobs")
        .select("autopilot_enabled")
        .eq("id", jobId)
        .single();
      if (error) throw error;
      return data?.autopilot_enabled ?? true;
    },
  });

  const mutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const { error } = await supabase
        .from("recruitment_jobs")
        .update({ autopilot_enabled: enabled })
        .eq("id", jobId);
      if (error) throw error;
    },
    onSuccess: (_, enabled) => {
      queryClient.invalidateQueries({ queryKey: ["job-autopilot", jobId] });
      queryClient.invalidateQueries({ queryKey: ["recruitment-job", jobId] });
      toast.success(enabled ? "Autopilot ativado" : "Autopilot desativado");
    },
    onError: () => toast.error("Erro ao alterar autopilot"),
  });

  if (isLoading) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-md">
            <Zap className={`h-3.5 w-3.5 ${isAutopilot ? "text-amber-500" : "text-muted-foreground"}`} />
            <span className="text-xs font-medium">Autopilot</span>
            <Switch
              checked={isAutopilot}
              onCheckedChange={(checked) => mutation.mutate(checked)}
              className="scale-90"
              disabled={mutation.isPending}
            />
            {isAutopilot && (
              <Badge variant="default" className="text-[9px] px-1.5 py-0 bg-amber-500/10 text-amber-600 border-amber-500/20">
                ON
              </Badge>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs max-w-[250px]">
            {isAutopilot
              ? "Candidatos avançam automaticamente entre etapas com base nos thresholds configurados."
              : "Candidatos precisam ser avançados manualmente pelo recrutador."}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
