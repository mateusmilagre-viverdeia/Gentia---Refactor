import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import type { OnboardingStep } from "./useOnboardingProgress";

export type SetupStatus = Partial<Record<OnboardingStep, boolean>>;

/**
 * Auto-detecta quais etapas da Configuração inicial já foram cumpridas
 * com base em dados reais do banco. Usado para marcar etapas como concluídas
 * sem exigir clique do usuário.
 */
export function useRecruitmentSetupStatus() {
  const { currentAccount } = useOrganization();
  const accountId = currentAccount?.id;

  return useQuery<SetupStatus>({
    queryKey: ["recruitment-setup-status", accountId],
    enabled: !!accountId,
    staleTime: 30_000,
    queryFn: async () => {
      if (!accountId) return {};

      const status: SetupStatus = {};

      // PERFIL — logo + whatsapp
      const { data: company } = await supabase
        .from("companies")
        .select("logo_url, whatsapp")
        .eq("id", accountId)
        .maybeSingle();
      status.profile = !!(company?.logo_url && company?.whatsapp);

      // EQUIPE — ≥1 membro além do owner OU ≥1 convite enviado
      const { count: membersCount } = await supabase
        .from("account_members")
        .select("id", { count: "exact", head: true })
        .eq("account_id", accountId)
        .eq("is_active", true);
      const { count: invitesCount } = await supabase
        .from("account_invites")
        .select("id", { count: "exact", head: true })
        .eq("account_id", accountId);
      status.team = (membersCount ?? 0) > 1 || (invitesCount ?? 0) > 0;

      // PIPELINE — ≥1 funil de contratação com estágios
      const { data: funnels } = await supabase
        .from("hiring_funnels")
        .select("id")
        .eq("account_id", accountId)
        .limit(1);
      if (funnels && funnels.length > 0) {
        const { count: stagesCount } = await supabase
          .from("hiring_funnel_stages")
          .select("id", { count: "exact", head: true })
          .eq("funnel_id", funnels[0].id);
        status.pipeline = (stagesCount ?? 0) > 0;
      } else {
        status.pipeline = false;
      }

      // CARREIRAS — settings publicados
      const { data: careers } = await supabase
        .from("careers_page_settings")
        .select("id, is_published")
        .eq("account_id", accountId)
        .maybeSingle();
      status.careers = !!(careers?.id && careers.is_published);

      // CRÉDITOS — saldo > 0 OU assinatura ativa
      const { data: credits } = await supabase
        .from("recruitment_usage_credits")
        .select("balance")
        .eq("account_id", accountId)
        .maybeSingle();
      const { data: subs } = await supabase
        .from("org_credit_subscriptions")
        .select("status")
        .eq("org_id", accountId)
        .eq("status", "active")
        .limit(1);
      status.credits =
        (credits?.balance ?? 0) > 0 || !!(subs && subs.length > 0);

      // AGENTES — ≥1 agente ativo
      const { count: agentsCount } = await supabase
        .from("recruitment_agents")
        .select("id", { count: "exact", head: true })
        .eq("account_id", accountId)
        .eq("is_active", true);
      status.agent = (agentsCount ?? 0) > 0;

      // COMUNICAÇÃO — ≥1 mensagem WhatsApp já enviada (proxy de canal configurado)
      const msgRes: { count: number | null } = await (supabase as any)
        .from("whatsapp_message_logs")
        .select("id", { count: "exact", head: true })
        .eq("account_id", accountId)
        .limit(1);
      status.comms = (msgRes.count ?? 0) > 0;

      // CULTURA & DISC — Culture Code session existente E ≥1 perfil DISC
      const cultureRes: { count: number | null } = await (supabase as any)
        .from("culture_code_sessions")
        .select("id", { count: "exact", head: true })
        .eq("account_id", accountId);
      const discRes: { count: number | null } = await (supabase as any)
        .from("recruitment_disc_profiles")
        .select("id", { count: "exact", head: true })
        .eq("account_id", accountId);
      status.culture = (cultureRes.count ?? 0) > 0 && (discRes.count ?? 0) > 0;

      // DISTRIBUIÇÃO — ≥1 canal habilitado
      const { count: distCount } = await supabase
        .from("job_distribution_channels")
        .select("id", { count: "exact", head: true })
        .eq("account_id", accountId)
        .eq("is_enabled", true);
      status.distribution = (distCount ?? 0) > 0;

      return status;
    },
  });
}
