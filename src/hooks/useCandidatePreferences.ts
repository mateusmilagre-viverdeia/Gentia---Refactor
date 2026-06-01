import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CandidatePreferences {
  allow_marketplace_sharing: boolean;
  opted_out_at: string | null;
  opt_out_reason: string | null;
}

export interface CandidateInfo {
  name: string;
  email: string;
}

export interface CandidateStats {
  total_views: number;
  interested_companies: number;
  unique_viewers?: number;
  unlock_count?: number;
  contacts_received?: number;
  views_by_week?: { week: string; count: number }[];
  last_viewed_at?: string | null;
}

export interface PreferencesData {
  preferences: CandidatePreferences;
  candidate: CandidateInfo;
  stats: CandidateStats;
}

export function useCandidatePreferences() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PreferencesData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchPreferences = async (token: string): Promise<PreferencesData | null> => {
    setLoading(true);
    setError(null);

    try {
      const { data: response, error: invokeError } = await supabase.functions.invoke(
        'update-candidate-preferences',
        {
          body: { action: 'get', token },
        }
      );

      if (invokeError) {
        throw new Error(invokeError.message);
      }

      if (response.error) {
        throw new Error(response.error);
      }

      setData(response);
      return response;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao carregar preferências";
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updatePreferences = async (
    token: string,
    allowSharing: boolean,
    reason?: string
  ): Promise<boolean> => {
    setLoading(true);

    try {
      const { data: response, error: invokeError } = await supabase.functions.invoke(
        'update-candidate-preferences',
        {
          body: {
            token,
            allow_marketplace_sharing: allowSharing,
            opt_out_reason: reason,
          },
        }
      );

      if (invokeError) {
        throw new Error(invokeError.message);
      }

      if (response.error) {
        throw new Error(response.error);
      }

      // Update local state
      if (data) {
        setData({
          ...data,
          preferences: {
            ...data.preferences,
            allow_marketplace_sharing: allowSharing,
            opted_out_at: allowSharing ? null : new Date().toISOString(),
            opt_out_reason: allowSharing ? null : reason || null,
          },
        });
      }

      toast.success(response.message);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao atualizar preferências";
      toast.error(message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    data,
    error,
    fetchPreferences,
    updatePreferences,
  };
}
