import { useCallback, useRef, useState } from "react";

interface RunArgs {
  jobId: string;
  candidateIds: string[];
  focus?: string;
}

const URL_FN = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/compare-finalists`;

export function useCompareFinalists() {
  const [output, setOutput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    setOutput("");
    setError(null);
  }, []);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsLoading(false);
  }, []);

  const run = useCallback(async (args: RunArgs) => {
    setOutput("");
    setError(null);
    setIsLoading(true);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      // Pega o JWT do usuário logado
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Sessão expirada. Faça login novamente.");

      const resp = await fetch(URL_FN, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(args),
        signal: ctrl.signal,
      });

      if (!resp.ok || !resp.body) {
        let msg = `Erro ${resp.status}`;
        try {
          const j = await resp.json();
          if (j?.error) msg = j.error;
        } catch { /* ignore */ }
        throw new Error(msg);
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let acc = "";
      let done = false;

      while (!done) {
        const r = await reader.read();
        if (r.done) break;
        buf += decoder.decode(r.value, { stream: true });

        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line || line.startsWith(":")) continue;
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") { done = true; break; }
          try {
            const obj = JSON.parse(payload);
            const delta = obj.choices?.[0]?.delta?.content as string | undefined;
            if (delta) {
              acc += delta;
              setOutput(acc);
            }
          } catch {
            // partial JSON — re-buffer
            buf = line + "\n" + buf;
            break;
          }
        }
      }
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      setError(e?.message || "Erro ao executar análise");
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, []);

  return { run, abort, reset, output, isLoading, error };
}
