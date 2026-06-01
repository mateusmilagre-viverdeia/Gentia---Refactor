import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";

const SIDEBAR_MODE_KEY = (accountId: string) => `recruitment_sidebar_mode:${accountId}`;
export const RECRUITMENT_MODE_EVENT = "recruitment-mode-changed";

export type OnboardingStep =
  | "profile"
  | "client"
  | "job"
  | "agent"
  | "candidate"
  | "team"
  | "pipeline"
  | "careers"
  | "credits"
  | "comms"
  | "culture"
  | "distribution";

export type OnboardingMode = "agency" | "self";

// Legacy (modo Agência)
export const ONBOARDING_STEPS: OnboardingStep[] = [
  "profile",
  "client",
  "job",
  "agent",
  "candidate",
];

// Modo Próprio (essenciais que aparecem no wizard modal)
export const SELF_ONBOARDING_STEPS: OnboardingStep[] = [
  "profile",
  "team",
  "pipeline",
  "careers",
  "credits",
];

// Itens recomendados — só no card do dashboard
export const EXTRA_RECOMMENDED_STEPS: OnboardingStep[] = [
  "agent",
  "comms",
  "culture",
  "distribution",
];

export function getStepsForMode(mode: OnboardingMode): OnboardingStep[] {
  return mode === "agency" ? ONBOARDING_STEPS : SELF_ONBOARDING_STEPS;
}

export interface OnboardingProgress {
  id: string;
  account_id: string;
  step_profile_done: boolean;
  step_client_done: boolean;
  step_job_done: boolean;
  step_agent_done: boolean;
  step_candidate_done: boolean;
  step_team_done: boolean;
  step_pipeline_done: boolean;
  step_careers_done: boolean;
  step_credits_done: boolean;
  step_comms_done: boolean;
  step_culture_done: boolean;
  step_distribution_done: boolean;
  completed_at: string | null;
  dismissed_at: string | null;
  dismissed_until: string | null;
  skipped_steps: string[] | null;
  created_at: string;
  updated_at: string;
}

const STEP_FIELD: Record<OnboardingStep, keyof OnboardingProgress> = {
  profile: "step_profile_done",
  client: "step_client_done",
  job: "step_job_done",
  agent: "step_agent_done",
  candidate: "step_candidate_done",
  team: "step_team_done",
  pipeline: "step_pipeline_done",
  careers: "step_careers_done",
  credits: "step_credits_done",
  comms: "step_comms_done",
  culture: "step_culture_done",
  distribution: "step_distribution_done",
};

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export function useOnboardingProgress() {
  const { currentAccount } = useOrganization();
  const queryClient = useQueryClient();
  const accountId = currentAccount?.id;

  // Sidebar override (Próprio/Agência toggle) takes precedence over companies.account_type
  const readSidebarMode = (): OnboardingMode | null => {
    if (typeof window === "undefined" || !accountId) return null;
    const v = localStorage.getItem(SIDEBAR_MODE_KEY(accountId));
    return v === "self" || v === "agency" ? v : null;
  };

  const [sidebarMode, setSidebarMode] = useState<OnboardingMode | null>(readSidebarMode);

  useEffect(() => {
    setSidebarMode(readSidebarMode());
    const handler = () => setSidebarMode(readSidebarMode());
    window.addEventListener(RECRUITMENT_MODE_EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(RECRUITMENT_MODE_EVENT, handler);
      window.removeEventListener("storage", handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  const accountTypeMode: OnboardingMode =
    (currentAccount as { account_type?: string } | null)?.account_type === "agency"
      ? "agency"
      : "self";
  const mode: OnboardingMode = sidebarMode ?? accountTypeMode;
  const steps = getStepsForMode(mode);

  const queryKey = ["onboarding-progress", accountId];

  const { data, isLoading } = useQuery({
    queryKey,
    enabled: !!accountId,
    queryFn: async () => {
      if (!accountId) return null;

      let { data: progress } = await supabase
        .from("account_onboarding_progress")
        .select("*")
        .eq("account_id", accountId)
        .maybeSingle();

      if (!progress) {
        const { data: created } = await supabase
          .from("account_onboarding_progress")
          .insert({ account_id: accountId })
          .select("*")
          .single();
        progress = created;
      }

      const { data: account } = await supabase
        .from("companies")
        .select("created_at")
        .eq("id", accountId)
        .maybeSingle();

      return {
        progress: progress as OnboardingProgress | null,
        accountCreatedAt: account?.created_at ?? null,
      };
    },
  });

  const progress = data?.progress ?? null;
  const accountCreatedAt = data?.accountCreatedAt ?? null;

  const completedSteps = progress
    ? steps.filter((s) => progress[STEP_FIELD[s]] === true).length
    : 0;

  const currentStep: OnboardingStep =
    steps.find((s) => progress && progress[STEP_FIELD[s]] === false) ??
    steps[0];

  const isFresh =
    !!accountCreatedAt &&
    Date.now() - new Date(accountCreatedAt).getTime() < SEVEN_DAYS_MS;

  const isDismissed =
    !!progress?.dismissed_until &&
    new Date(progress.dismissed_until).getTime() > Date.now();

  const shouldShow =
    !!progress && !progress.completed_at && isFresh && !isDismissed;

  const markStepMutation = useMutation({
    mutationFn: async (step: OnboardingStep) => {
      if (!accountId) throw new Error("No account");
      const { data, error } = await supabase.functions.invoke(
        "onboarding-complete-check",
        { body: { account_id: accountId, step } }
      );
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const dismissMutation = useMutation({
    mutationFn: async (hours: number) => {
      if (!accountId) throw new Error("No account");
      const { data, error } = await supabase.functions.invoke(
        "onboarding-complete-check",
        { body: { account_id: accountId, dismiss_until_hours: hours } }
      );
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const addSkippedStepMutation = useMutation({
    mutationFn: async (step: OnboardingStep) => {
      if (!accountId || !progress) throw new Error("No account/progress");
      const next = Array.from(new Set([...(progress.skipped_steps ?? []), step]));
      const { error } = await supabase
        .from("account_onboarding_progress")
        .update({ skipped_steps: next })
        .eq("account_id", accountId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    progress,
    isLoading,
    mode,
    steps,
    extraRecommendedSteps: EXTRA_RECOMMENDED_STEPS,
    currentStep,
    completedSteps,
    totalSteps: steps.length,
    shouldShow,
    markStep: (step: OnboardingStep) => markStepMutation.mutateAsync(step),
    dismiss: (hours: number) => dismissMutation.mutateAsync(hours),
    addSkippedStep: (step: OnboardingStep) =>
      addSkippedStepMutation.mutateAsync(step),
  };
}
