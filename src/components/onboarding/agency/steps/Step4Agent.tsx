import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, SkipForward, Bot, Check, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useAgencyOnboarding } from "../AgencyOnboardingWizardContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  onComplete: () => void;
  onSkip: () => Promise<void>;
}

export function Step4Agent({ onComplete, onSkip }: Props) {
  const { currentAccount } = useOrganization();
  const { jobId, setAgentId } = useAgencyOnboarding();
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: agents = [], isLoading } = useQuery({
    queryKey: ["recruitment-agents", currentAccount?.id],
    enabled: !!currentAccount?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("recruitment_agents")
        .select("id, name, description, language, type")
        .eq("account_id", currentAccount!.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const handleSave = async () => {
    if (!selected) {
      toast.error("Selecione um agente");
      return;
    }
    if (!jobId) {
      setAgentId(selected);
      onComplete();
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("recruitment_jobs")
        .update({ agent_id: selected })
        .eq("id", jobId);
      if (error) throw error;
      setAgentId(selected);
      toast.success("Agente vinculado");
      onComplete();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao vincular agente");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold">Agente de IA</h3>
        <p className="text-sm text-muted-foreground">
          Escolha um agente para conduzir as entrevistas culturais.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : agents.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          Nenhum agente cadastrado ainda.
        </div>
      ) : (
        <div className="grid gap-2 max-h-[300px] overflow-y-auto">
          {agents.map((a: any) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setSelected(a.id)}
              className={cn(
                "flex items-start gap-3 rounded-lg border p-3 text-left transition-all hover:bg-muted/50",
                selected === a.id && "border-primary bg-primary/5"
              )}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">{a.name}</p>
                  {a.language && (
                    <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                      {a.language}
                    </span>
                  )}
                </div>
                {a.description && (
                  <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                    {a.description}
                  </p>
                )}
              </div>
              {selected === a.id && <Check className="h-5 w-5 text-primary shrink-0" />}
            </button>
          ))}
        </div>
      )}

      <a
        href="/atracao-contratacao/recrutamento"
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
      >
        <ExternalLink className="h-3 w-3" />
        Criar agente personalizado
      </a>

      <div className="flex justify-between pt-2">
        <Button variant="ghost" onClick={onSkip}>
          <SkipForward className="h-4 w-4" />
          Pular
        </Button>
        <Button onClick={handleSave} disabled={saving || !selected}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Selecionar e continuar
        </Button>
      </div>
    </div>
  );
}
