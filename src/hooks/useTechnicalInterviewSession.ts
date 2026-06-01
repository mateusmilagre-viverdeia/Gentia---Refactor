import { useQuery } from "@tanstack/react-query";

export interface TechnicalSessionData {
  id: string;
  status: "pending" | "in_progress" | "completed" | "cancelled" | "expired";
  candidateName: string;
  candidateEmail: string;
  companyName: string;
  companyLogo: string | null;
  jobTitle: string;
  jobMission: string;
  skills: string[];
  questionsCount: number;
  expiresAt: string;
  startedAt: string | null;
  overallScore?: number;
  recommendation?: string;
  canResume?: boolean;
  resumeCount?: number;
  resumeProgress?: { covered: number; total: number } | null;
}

export interface ValidateSessionResult {
  valid: boolean;
  error?: string;
  message?: string;
  session?: TechnicalSessionData;
}

async function validateTechnicalSession(token: string): Promise<ValidateSessionResult> {
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-technical-session`,
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

export function useTechnicalInterviewSession(token: string | undefined) {
  return useQuery({
    queryKey: ["technical-session", token],
    queryFn: () => validateTechnicalSession(token!),
    enabled: !!token,
    retry: false,
    staleTime: 1000 * 60, // 1 minute
  });
}

export async function startTechnicalSession(token: string): Promise<{
  ephemeralToken: string;
  sessionId: string;
  skills: string[];
  questionsCount: number;
  jobTitle: string;
  candidateName: string;
  companyName: string;
} | { error: string; message: string }> {
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/start-technical-session`,
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
