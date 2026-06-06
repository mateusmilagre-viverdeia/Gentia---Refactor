import { createClient } from "npm:@supabase/supabase-js@2";

// Cache em memória (por instância warm da edge function) — getConfiguredModel é
// lido em ~24 functions a CADA chamada de IA. TTL curto: mudança de modelo no
// painel propaga em até 60s. Cold start repopula. (Frente E — cache.)
const _modelCache = new Map<string, { model: string; exp: number }>();
const TTL_MS = 60_000;

/**
 * Get the configured AI model for a given service key.
 * Falls back to the provided default if no config is found. Resultado cacheado por 60s.
 */
export async function getConfiguredModel(
  serviceKey: string,
  defaultModel: string,
): Promise<string> {
  const now = Date.now();
  const hit = _modelCache.get(serviceKey);
  if (hit && hit.exp > now) return hit.model;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) return defaultModel;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await supabase
      .from("platform_ai_model_config")
      .select("current_model")
      .eq("service_key", serviceKey)
      .single();

    const model = error || !data?.current_model ? defaultModel : data.current_model;
    _modelCache.set(serviceKey, { model, exp: now + TTL_MS }); // só cacheia resultado válido obtido
    return model;
  } catch {
    return defaultModel; // não cacheia erro
  }
}
