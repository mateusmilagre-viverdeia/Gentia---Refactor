import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface BiographyGateState {
  loading: boolean;
  complete: boolean;
  missing: string[];
  hasProfile: boolean;
  reload: () => Promise<void>;
}

const REQUIRED_FIELDS: Array<{ key: string; label: string }> = [
  { key: "first_name", label: "Nome" },
  { key: "last_name", label: "Sobrenome" },
  { key: "birth_date", label: "Data de Nascimento" },
  { key: "phone", label: "Telefone" },
  { key: "city", label: "Cidade" },
  { key: "state", label: "Estado (UF)" },
];

/**
 * Checks whether the currently authenticated candidate has filled the
 * mandatory biographical fields. Used to gate the start of any voice
 * interview (cultural, technical, DISC) — because these data points are
 * already collected here and must not be asked by the AI.
 */
export function useBiographyGate(): BiographyGateState {
  const [loading, setLoading] = useState(true);
  const [complete, setComplete] = useState(false);
  const [missing, setMissing] = useState<string[]>([]);
  const [hasProfile, setHasProfile] = useState(false);

  const check = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setComplete(false);
        setMissing(REQUIRED_FIELDS.map((f) => f.label));
        setHasProfile(false);
        return;
      }

      const { data } = await supabase
        .from("candidate_profiles")
        .select("first_name, last_name, full_name, birth_date, phone, city, state" as any)
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!data) {
        setComplete(false);
        setMissing(REQUIRED_FIELDS.map((f) => f.label));
        setHasProfile(false);
        return;
      }

      setHasProfile(true);

      const profile = data as any;
      const missingList: string[] = [];

      // first_name / last_name fall back to full_name split (legacy rows)
      const fullParts = (profile.full_name || "").trim().split(/\s+/);
      const firstName = profile.first_name || fullParts[0] || "";
      const lastName = profile.last_name || fullParts.slice(1).join(" ") || "";

      if (!firstName.trim()) missingList.push("Nome");
      if (!lastName.trim()) missingList.push("Sobrenome");
      if (!profile.birth_date) missingList.push("Data de Nascimento");
      if (!profile.phone?.toString().trim()) missingList.push("Telefone");
      if (!profile.city?.toString().trim()) missingList.push("Cidade");
      if (!profile.state?.toString().trim()) missingList.push("Estado (UF)");

      setMissing(missingList);
      setComplete(missingList.length === 0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  return { loading, complete, missing, hasProfile, reload: check };
}
