import { useQuery } from "@tanstack/react-query";

export interface CultureSessionData {
  id: string;
  status: "pending" | "in_progress" | "completed" | "cancelled" | "expired" | "abandoned";
  candidateName: string;
  candidateEmail: string;
  companyName: string;
  jobTitle: string;
  agentId: string | null;
  agentName: string | null;
  expiresAt: string | null;
  startedAt: string | null;
  canResume?: boolean;
  resumeCount?: number;
  resumeProgress?: { covered: number; total: number } | null;
  conductorEnabled?: boolean;
  isTest?: boolean;
}

export interface ValidateCultureSessionResult {
  valid: boolean;
  error?: string;
  message?: string;
  session?: CultureSessionData;
}

async function validateCultureSession(token: string): Promise<ValidateCultureSessionResult> {
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-interview-session`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ token }),
    }
  );

  const data = await response.json();
  return data;
}

export function useCultureInterviewSession(token: string | undefined) {
  return useQuery({
    queryKey: ["culture-session", token],
    queryFn: () => validateCultureSession(token!),
    enabled: !!token,
    retry: false,
    staleTime: 1000 * 60, // 1 minute
  });
}

export async function startCultureSession(token: string): Promise<{
  ephemeralToken: string;
  sessionId: string;
  jobTitle: string;
  candidateName: string;
  companyName: string;
} | { error: string; message: string }> {
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/start-culture-session`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ token }),
    }
  );

  return response.json();
}
