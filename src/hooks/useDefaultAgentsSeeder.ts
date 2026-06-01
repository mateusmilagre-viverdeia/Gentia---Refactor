import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useValuesQuestionsForAgent } from "@/hooks/useValuesQuestionsForAgent";

interface AgentLite {
  id: string;
  name: string;
  is_active: boolean;
}

interface UseDefaultAgentsSeederArgs {
  accountId: string | null | undefined;
  agents: AgentLite[];
  isLoading: boolean;
}

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

const CANONICAL = {
  cultural: "agente de fit cultural",
  behavioral: "agente de fit comportamental",
  technical: "agente de fit tecnico",
};

export function useDefaultAgentsSeeder({
  accountId,
  agents,
  isLoading,
}: UseDefaultAgentsSeederArgs) {
  const queryClient = useQueryClient();
  const {
    hasQuestions,
    hasValues,
    isLoading: isLoadingValues,
    importQuestionsToAgent,
    importCriteriaToAgent,
  } = useValuesQuestionsForAgent();

  const seededForAccountRef = useRef<string | null>(null);

  const existingNames = new Set(agents.map((a) => norm(a.name)));
  const culturalExists = existingNames.has(CANONICAL.cultural);
  const behavioralExists = existingNames.has(CANONICAL.behavioral);
  const technicalExists = existingNames.has(CANONICAL.technical);

  const culturalPending = !culturalExists && (!hasValues || !hasQuestions);

  useEffect(() => {
    if (!accountId) return;
    if (isLoading || isLoadingValues) return;
    if (seededForAccountRef.current === accountId) return;

    const toCreate: Array<"behavioral" | "technical" | "cultural"> = [];
    if (!behavioralExists) toCreate.push("behavioral");
    if (!technicalExists) toCreate.push("technical");
    if (!culturalExists && hasValues && hasQuestions) toCreate.push("cultural");

    if (toCreate.length === 0) {
      seededForAccountRef.current = accountId;
      return;
    }

    seededForAccountRef.current = accountId;

    (async () => {
      const created: string[] = [];

      for (const kind of toCreate) {
        try {
          const payload =
            kind === "behavioral"
              ? {
                  account_id: accountId,
                  name: "Agente de Fit Comportamental",
                  description:
                    "Avalia perfil comportamental do candidato com base no DISC.",
                  type: "disc",
                  language: "pt-BR",
                  is_active: true,
                }
              : kind === "technical"
              ? {
                  account_id: accountId,
                  name: "Agente de Fit Técnico",
                  description:
                    "Agente adaptativo que conduz entrevistas técnicas dinâmicas com base na vaga.",
                  type: "adaptive",
                  language: "pt-BR",
                  is_active: true,
                }
              : {
                  account_id: accountId,
                  name: "Agente de Fit Cultural",
                  description:
                    "Avalia o alinhamento cultural do candidato com base nos Valores da empresa.",
                  type: "structured",
                  language: "pt-BR",
                  is_active: true,
                };

          const { data, error } = await supabase
            .from("recruitment_agents")
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .insert(payload as any)
            .select("id, name")
            .single();

          if (error) throw error;

          if (kind === "cultural" && data?.id) {
            try {
              await importQuestionsToAgent(data.id);
            } catch (e) {
              console.error("Seeder: falha ao importar perguntas de valores", e);
            }
            try {
              await importCriteriaToAgent(data.id);
            } catch (e) {
              console.error("Seeder: falha ao importar critérios de valores", e);
            }
          }

          created.push(payload.name);
        } catch (err) {
          console.error(`Seeder: falha ao criar agente ${kind}`, err);
        }
      }

      if (created.length > 0) {
        queryClient.invalidateQueries({ queryKey: ["recruitment-agents"] });
        toast.success(
          created.length === 1
            ? `${created[0]} criado automaticamente`
            : `Agentes padrão criados: ${created.join(", ")}`
        );
      }
    })();
  }, [
    accountId,
    isLoading,
    isLoadingValues,
    behavioralExists,
    technicalExists,
    culturalExists,
    hasValues,
    hasQuestions,
    importQuestionsToAgent,
    importCriteriaToAgent,
    queryClient,
  ]);

  // Reset memo if account changes
  useEffect(() => {
    return () => {
      // no-op
    };
  }, [accountId]);

  return { culturalPending };
}
