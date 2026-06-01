import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCredits } from "@/hooks/useCredits";

const ENRICHMENT_FEATURE_KEY = 'profile_enrich';

export interface EnrichedProfile {
  id: string;
  candidate_id: string;
  provider: string;
  current_company: string | null;
  current_title: string | null;
  seniority: string | null;
  linkedin_url: string | null;
  company_size: string | null;
  company_industry: string | null;
  company_location: string | null;
  twitter_url: string | null;
  github_url: string | null;
  work_email: string | null;
  personal_email: string | null;
  phone_numbers: string[] | null;
  enriched_at: string;
  expires_at: string;
}

interface EnrichResult {
  success: boolean;
  data?: EnrichedProfile;
  cached?: boolean;
  configured?: boolean;
  message?: string;
}

interface BatchResult {
  candidateId: string;
  success: boolean;
  message: string;
}

interface BatchEnrichResult {
  success: boolean;
  results: BatchResult[];
  summary: {
    total: number;
    success: number;
    failed: number;
  };
  message: string;
}

export function useEnrichCandidate() {
  const [loading, setLoading] = useState(false);
  const [enrichedData, setEnrichedData] = useState<EnrichedProfile | null>(null);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const { hasCredits, consumeCredits, getCost } = useCredits();

  const enrichProfile = useCallback(async (candidateId: string, forceRefresh = false): Promise<EnrichResult> => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Você precisa estar logado para enriquecer dados.");
        return { success: false, message: "Não autenticado" };
      }

      // Check if we need to consume credits (only for API calls, not cache hits)
      // First check if we have a valid cached result
      if (!forceRefresh) {
        const { data: cachedData } = await supabase
          .from("recruitment_enriched_profiles")
          .select("*")
          .eq("candidate_id", candidateId)
          .gt("expires_at", new Date().toISOString())
          .maybeSingle();
        
        if (cachedData) {
          setEnrichedData(cachedData as EnrichedProfile);
          return { success: true, data: cachedData as EnrichedProfile, cached: true, message: "Dados do cache" };
        }
      }

      // Check credits before making API call
      if (!hasCredits(ENRICHMENT_FEATURE_KEY)) {
        const cost = getCost(ENRICHMENT_FEATURE_KEY);
        toast.error(`Créditos insuficientes. Você precisa de ${cost?.credits_per_use || 3} créditos de Enriquecimento.`);
        return { success: false, message: "Créditos insuficientes" };
      }

      // Consume credits before API call
      const consumeResult = await consumeCredits({
        featureKey: ENRICHMENT_FEATURE_KEY,
        referenceId: candidateId,
        referenceType: 'candidate_enrichment',
        description: `Enriquecimento de perfil`,
      });

      if (!consumeResult.success) {
        toast.error(consumeResult.message || "Erro ao debitar créditos.");
        return { success: false, message: consumeResult.message || "Erro ao debitar créditos" };
      }

      const { data, error } = await supabase.functions.invoke("enrich-candidate-profile", {
        body: { candidateId, forceRefresh },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) {
        console.error("Enrich error:", error);
        toast.error("Erro ao enriquecer dados do candidato.");
        return { success: false, message: error.message };
      }

      if (data.configured === false) {
        setConfigured(false);
        return { success: false, configured: false, message: data.message };
      }

      setConfigured(true);
      
      if (data.success && data.data) {
        setEnrichedData(data.data);
        const creditsUsed = consumeResult.consumed || getCost(ENRICHMENT_FEATURE_KEY)?.credits_per_use || 3;
        toast.success(`Dados enriquecidos com sucesso! (${creditsUsed} créditos usados)`);
        return { success: true, data: data.data, cached: data.cached, message: data.message };
      }

      toast.error(data.message || "Não foi possível enriquecer dados.");
      return { success: false, message: data.message };

    } catch (err) {
      console.error("Enrich exception:", err);
      toast.error("Erro ao enriquecer dados.");
      return { success: false, message: "Erro inesperado" };
    } finally {
      setLoading(false);
    }
  }, []);

  const enrichBatch = useCallback(async (candidateIds: string[], forceRefresh = false): Promise<BatchEnrichResult | null> => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Você precisa estar logado.");
        return null;
      }

      const { data, error } = await supabase.functions.invoke("enrich-batch-candidates", {
        body: { candidateIds, forceRefresh },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) {
        console.error("Batch enrich error:", error);
        toast.error("Erro ao enriquecer candidatos em lote.");
        return null;
      }

      if (data.configured === false) {
        setConfigured(false);
        toast.error(data.message);
        return null;
      }

      setConfigured(true);
      
      if (data.success) {
        const { summary } = data;
        if (summary.success > 0) {
          toast.success(`${summary.success} candidatos enriquecidos!`);
        }
        if (summary.failed > 0) {
          toast.warning(`${summary.failed} candidatos não puderam ser enriquecidos.`);
        }
        return data;
      }

      return null;

    } catch (err) {
      console.error("Batch enrich exception:", err);
      toast.error("Erro ao processar lote.");
      return null;
    } finally {
      setLoading(false);
    }
  }, [hasCredits, consumeCredits, getCost]);

  const getEnrichedData = useCallback(async (candidateId: string): Promise<EnrichedProfile | null> => {
    try {
      const { data, error } = await supabase
        .from("recruitment_enriched_profiles")
        .select("*")
        .eq("candidate_id", candidateId)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

      if (error) {
        console.error("Error fetching enriched data:", error);
        return null;
      }

      if (data) {
        setEnrichedData(data as EnrichedProfile);
      }
      return data as EnrichedProfile | null;

    } catch (err) {
      console.error("Exception fetching enriched data:", err);
      return null;
    }
  }, []);

  const checkConfiguration = useCallback(async (): Promise<boolean> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return false;

      // Make a lightweight call to check if configured
      const { data } = await supabase.functions.invoke("enrich-candidate-profile", {
        body: { candidateId: "check-config-only" },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      const isConfigured = data?.configured !== false;
      setConfigured(isConfigured);
      return isConfigured;

    } catch {
      return false;
    }
  }, []);

  return {
    loading,
    enrichedData,
    configured,
    enrichProfile,
    enrichBatch,
    getEnrichedData,
    checkConfiguration,
  };
}
