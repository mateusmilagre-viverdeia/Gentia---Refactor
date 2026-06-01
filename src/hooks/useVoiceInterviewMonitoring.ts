import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type InterviewType = "cultural" | "technical";

export interface VoiceKPIs {
  total: number;
  last_24h: number;
  completed: number;
  aborted: number;
  qualified: number;
  avg_duration_seconds: number;
  active_accounts: number;
}

export interface DailyRow {
  day: string;
  total: number;
  completed: number;
}

export interface RecentInterview {
  id: string;
  created_at: string;
  account_id: string | null;
  account_name: string | null;
  job_id: string | null;
  job_title: string | null;
  candidate_id: string | null;
  candidate_name: string | null;
  status: string;
  duration_seconds: number | null;
  score: number | null;
  recommendation: string | null;
}

export interface AccountUsage {
  account_id: string | null;
  account_name: string | null;
  total: number;
  completed: number;
  qualified: number;
  avg_duration_seconds: number;
  last_activity_at: string | null;
}

interface Filters {
  type: InterviewType;
  start: Date;
  end: Date;
  accountId?: string;
}

export function useVoiceKPIs(f: Filters) {
  return useQuery({
    queryKey: ["voice-mon-kpis", f.type, f.start.toISOString(), f.end.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_voice_interview_kpis", {
        p_type: f.type, p_start: f.start.toISOString(), p_end: f.end.toISOString(),
      });
      if (error) throw error;
      return data as unknown as VoiceKPIs;
    },
    staleTime: 60_000,
  });
}

export function useVoiceDaily(f: Filters) {
  return useQuery({
    queryKey: ["voice-mon-daily", f.type, f.start.toISOString(), f.end.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_voice_interview_daily", {
        p_type: f.type, p_start: f.start.toISOString(), p_end: f.end.toISOString(),
      });
      if (error) throw error;
      return (data || []) as unknown as DailyRow[];
    },
    staleTime: 60_000,
  });
}

export function useVoiceRecent(f: Filters) {
  return useQuery({
    queryKey: ["voice-mon-recent", f.type, f.start.toISOString(), f.end.toISOString(), f.accountId ?? null],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_voice_interview_recent", {
        p_type: f.type, p_start: f.start.toISOString(), p_end: f.end.toISOString(),
        p_account_id: f.accountId ?? null, p_limit: 50,
      });
      if (error) throw error;
      return (data || []) as unknown as RecentInterview[];
    },
    staleTime: 60_000,
  });
}

export function useVoiceByAccount(f: Filters) {
  return useQuery({
    queryKey: ["voice-mon-by-account", f.type, f.start.toISOString(), f.end.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_voice_interview_by_account", {
        p_type: f.type, p_start: f.start.toISOString(), p_end: f.end.toISOString(),
      });
      if (error) throw error;
      return (data || []) as unknown as AccountUsage[];
    },
    staleTime: 60_000,
  });
}

export function useVoiceDetail(type: InterviewType, sessionId: string | null) {
  return useQuery({
    queryKey: ["voice-mon-detail", type, sessionId],
    enabled: !!sessionId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_voice_interview_detail", {
        p_type: type, p_session_id: sessionId!,
      });
      if (error) throw error;
      return data as any;
    },
  });
}
