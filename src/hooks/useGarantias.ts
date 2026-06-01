import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { toast } from "sonner";

export interface Garantia {
  id: string;
  account_id: string;
  vaga_original_id: string | null;
  vaga_reposicao_id: string | null;
  candidato_id: string;
  cliente_id: string | null;
  data_contratacao: string;
  data_desligamento: string | null;
  prazo_garantia_dias: number;
  garantia_expira_em: string;
  status: string;
  motivo_desligamento: string | null;
  observacoes: string | null;
  acionada_em: string | null;
  concluida_em: string | null;
  created_at: string;
  updated_at: string;
}

export interface GarantiaEnriched extends Garantia {
  candidato_nome?: string;
  vaga_titulo?: string;
  cliente_nome?: string;
}

export const useGarantiasByClient = (clientId: string | undefined) => {
  return useQuery({
    queryKey: ["garantias", "cliente", clientId],
    queryFn: async (): Promise<GarantiaEnriched[]> => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from("garantias_reposicao")
        .select("*, recruitment_candidates:candidato_id(first_name, last_name), recruitment_jobs:vaga_original_id(title)")
        .eq("cliente_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((g: any) => ({
        ...g,
        candidato_nome: [g.recruitment_candidates?.first_name, g.recruitment_candidates?.last_name].filter(Boolean).join(" ") || undefined,
        vaga_titulo: g.recruitment_jobs?.title,
      }));
    },
    enabled: !!clientId,
  });
};

export const useGarantiasByJob = (jobId: string | undefined) => {
  return useQuery({
    queryKey: ["garantias", "job", jobId],
    queryFn: async (): Promise<GarantiaEnriched[]> => {
      if (!jobId) return [];
      const { data, error } = await supabase
        .from("garantias_reposicao")
        .select("*, recruitment_candidates:candidato_id(first_name, last_name)")
        .eq("vaga_original_id", jobId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((g: any) => ({
        ...g,
        candidato_nome: [g.recruitment_candidates?.first_name, g.recruitment_candidates?.last_name].filter(Boolean).join(" ") || undefined,
      }));
    },
    enabled: !!jobId,
  });
};

export const useAllGarantias = (filters?: { status?: string }) => {
  const { currentOrganization } = useOrganization();
  const accountId = currentOrganization?.id;
  return useQuery({
    queryKey: ["garantias", accountId, filters],
    queryFn: async (): Promise<GarantiaEnriched[]> => {
      if (!accountId) return [];
      let query = supabase
        .from("garantias_reposicao")
        .select("*, recruitment_candidates:candidato_id(first_name, last_name), recruitment_jobs:vaga_original_id(title), clientes_consultoria:cliente_id(razao_social, nome_fantasia)")
        .eq("account_id", accountId)
        .order("created_at", { ascending: false });
      if (filters?.status && filters.status !== "all") query = query.eq("status", filters.status);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map((g: any) => ({
        ...g,
        candidato_nome: [g.recruitment_candidates?.first_name, g.recruitment_candidates?.last_name].filter(Boolean).join(" ") || undefined,
        vaga_titulo: g.recruitment_jobs?.title,
        cliente_nome: g.clientes_consultoria?.nome_fantasia || g.clientes_consultoria?.razao_social,
      }));
    },
    enabled: !!accountId,
  });
};

export const useCreateGarantia = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      account_id: string;
      vaga_original_id: string;
      candidato_id: string;
      cliente_id: string | null;
      data_contratacao: string;
      prazo_garantia_dias: number;
    }) => {
      const expira = new Date(input.data_contratacao);
      expira.setDate(expira.getDate() + input.prazo_garantia_dias);
      const { data, error } = await supabase
        .from("garantias_reposicao")
        .insert({
          ...input,
          garantia_expira_em: expira.toISOString(),
          status: "ativa",
        })
        .select()
        .single();
      if (error) throw error;

      // Mark job as in warranty
      await supabase
        .from("recruitment_jobs")
        .update({ em_garantia: true, garantia_expira_em: expira.toISOString() })
        .eq("id", input.vaga_original_id);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["garantias"] });
    },
  });
};

export const useAcionarGarantia = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      garantia: Garantia;
      data_desligamento: string;
      motivo_desligamento: string;
      observacoes?: string;
    }) => {
      const { garantia, data_desligamento, motivo_desligamento, observacoes } = params;

      // Validate within warranty window
      if (new Date(data_desligamento) > new Date(garantia.garantia_expira_em)) {
        throw new Error("Data de desligamento fora do prazo de garantia");
      }

      // Fetch original job to clone
      const { data: originalJob, error: jobErr } = await supabase
        .from("recruitment_jobs")
        .select("*")
        .eq("id", garantia.vaga_original_id!)
        .single();
      if (jobErr) throw jobErr;

      // Get client deadline for new job
      let prazoEntrega = 15;
      if (garantia.cliente_id) {
        const { data: cli } = await supabase
          .from("clientes_consultoria")
          .select("prazo_entrega_dias")
          .eq("id", garantia.cliente_id)
          .single();
        prazoEntrega = cli?.prazo_entrega_dias || 15;
      }

      const today = new Date();
      const limite = new Date(today);
      limite.setDate(limite.getDate() + prazoEntrega);

      // Create reposition job (clone ICP)
      const { id: _id, created_at: _c, updated_at: _u, status: _s, em_garantia: _g,
        garantia_expira_em: _ge, salario_contratado: _sc, data_contratacao: _dc,
        fee_acordado: _fa, ...jobClone } = originalJob as any;

      const { data: newJob, error: insErr } = await supabase
        .from("recruitment_jobs")
        .insert({
          ...jobClone,
          title: `${originalJob.title} (Reposição)`,
          status: "active",
          fee_acordado: 0,
          data_abertura_cliente: today.toISOString(),
          data_limite_entrega: limite.toISOString(),
          reposicao_da_vaga_id: garantia.vaga_original_id,
          em_garantia: false,
          sla_status: "no_prazo",
        })
        .select()
        .single();
      if (insErr) throw insErr;

      // === Herança de candidatos rejeitados (não reabordar) ===
      // Copia applications da vaga original, marcando reprovados como "do_not_reapproach"
      try {
        const { data: originalApps } = await supabase
          .from("recruitment_applications")
          .select("candidate_id, status, score, source")
          .eq("job_id", garantia.vaga_original_id!)
          .eq("account_id", garantia.account_id);

        const toClone = (originalApps || [])
          .filter((a: any) => a.candidate_id)
          .map((a: any) => ({
            candidate_id: a.candidate_id,
            job_id: newJob.id,
            account_id: garantia.account_id,
            status: "rejected",
            score: a.score,
            source: a.source || "inherited_from_warranty",
            do_not_reapproach: true,
            inherited_from_job_id: garantia.vaga_original_id,
            applied_at: new Date().toISOString(),
          }));

        if (toClone.length > 0) {
          await supabase.from("recruitment_applications").insert(toClone);
        }

        // Nota automática persistente no histórico da vaga de reposição
        await (supabase as any).from("recruitment_job_notes").insert({
          account_id: garantia.account_id,
          job_id: newJob.id,
          author_id: null,
          note_type: "warranty_replacement",
          content: `Vaga de reposição criada automaticamente a partir da vaga "${originalJob.title}" (acionamento de garantia). Motivo do desligamento: ${motivo_desligamento}. ${toClone.length} candidato(s) já avaliado(s) foram herdados com flag "não reabordar".`,
          metadata: {
            original_job_id: garantia.vaga_original_id,
            garantia_id: garantia.id,
            inherited_count: toClone.length,
            motivo_desligamento,
            data_desligamento,
          },
        });

        // Notificação interna ao recrutador
        const recruiterId = (originalJob as any).recruiter_id || (originalJob as any).owner_id;
        if (recruiterId) {
          await supabase.from("notifications").insert({
            account_id: garantia.account_id,
            user_id: recruiterId,
            type: "warranty_replacement_created",
            title: `Vaga de reposição criada: ${originalJob.title}`,
            message: `${toClone.length} candidato(s) já avaliado(s) foram herdados com flag "não reabordar".`,
            target_url: `/atracao-contratacao/recrutamento/jobs/${newJob.id}`,
            entity_type: "recruitment_job",
            entity_id: newJob.id,
            priority: "normal",
          });
        }
      } catch (heritageErr) {
        // Falha na herança não deve bloquear o acionamento da garantia
        console.error("Falha ao herdar candidatos/nota:", heritageErr);
      }

      // Update warranty record
      const { error: updErr } = await supabase
        .from("garantias_reposicao")
        .update({
          status: "acionada",
          data_desligamento,
          motivo_desligamento,
          observacoes,
          acionada_em: new Date().toISOString(),
          vaga_reposicao_id: newJob.id,
        })
        .eq("id", garantia.id);
      if (updErr) throw updErr;

      // Mark original job as no longer in warranty
      await supabase
        .from("recruitment_jobs")
        .update({ em_garantia: false })
        .eq("id", garantia.vaga_original_id!);

      // Create zero-fee record
      await supabase.from("fees_historico").insert({
        account_id: garantia.account_id,
        vaga_id: newJob.id,
        cliente_id: garantia.cliente_id,
        valor_fee: 0,
        status: "reposicao_gratuita",
        observacoes: `Reposição da vaga ${garantia.vaga_original_id}. Motivo: ${motivo_desligamento}`,
      });

      return newJob;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["garantias"] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["fees-history"] });
      toast.success("Garantia acionada e vaga de reposição criada");
    },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });
};
