import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * Get the configured AI model for a given service key.
 * Falls back to the provided default if no config is found.
 */
export async function getConfiguredModel(
  serviceKey: string,
  defaultModel: string
): Promise<string> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      return defaultModel;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await supabase
      .from("platform_ai_model_config")
      .select("current_model")
      .eq("service_key", serviceKey)
      .single();

    if (error || !data?.current_model) {
      return defaultModel;
    }

    return data.current_model;
  } catch {
    return defaultModel;
  }
}
