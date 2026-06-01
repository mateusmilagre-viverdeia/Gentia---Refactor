import { useEffect, useRef, useState } from "react";

export interface TechnicalCoverageStatus {
  total: number;
  covered: number;
  missing: Array<{ index: number; skill: string; type: "required" | "desired" }>;
  canEnd: boolean;
}

export function useTechnicalInterviewCoverage(sessionId: string | null, intervalMs = 5000) {
  const [status, setStatus] = useState<TechnicalCoverageStatus | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;

    const fetchStatus = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/technical-interview-coverage-status?sessionId=${sessionId}`,
          { method: "GET", headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } },
        );
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setStatus({
          total: data.total ?? 0,
          covered: data.covered ?? 0,
          missing: data.missing ?? [],
          canEnd: !!data.canEnd,
        });
      } catch { /* swallow */ }
    };

    fetchStatus();
    timerRef.current = setInterval(fetchStatus, intervalMs);
    return () => {
      cancelled = true;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [sessionId, intervalMs]);

  return status;
}
