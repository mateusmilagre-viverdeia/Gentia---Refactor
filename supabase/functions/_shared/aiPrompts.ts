// Shared helper for loading editable AI prompt overrides stored in `public.ai_prompts`.
// Edge functions call `loadPromptOverride(key)` and, if a row exists with a non-null template,
// use that as the system prompt (after running `interpolate` against runtime variables).
// Otherwise they fall back to the hardcoded default already in the function.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export interface PromptOverride {
  template: string;
  model: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
}

let cachedClient: ReturnType<typeof createClient> | null = null;
function admin() {
  if (cachedClient) return cachedClient;
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  cachedClient = createClient(url, key, { auth: { persistSession: false } });
  return cachedClient;
}

export async function loadPromptOverride(key: string): Promise<PromptOverride | null> {
  try {
    const sb = admin();
    if (!sb) return null;
    const { data, error } = await sb
      .from("ai_prompts")
      .select("template, model, updated_at, updated_by")
      .eq("key", key)
      .maybeSingle();
    if (error || !data) return null;
    if (!data.template && !data.model) return null;
    return {
      template: data.template ?? "",
      model: (data.model as string | null) ?? null,
      updatedAt: data.updated_at ?? null,
      updatedBy: data.updated_by ?? null,
    };
  } catch (e) {
    console.warn(`[aiPrompts] loadPromptOverride(${key}) failed:`, e);
    return null;
  }
}

/**
 * Replace `{{var}}` placeholders with values from `vars`.
 * Unknown placeholders are left intact (so authors notice typos in the UI preview).
 */
export function interpolate(template: string, vars: Record<string, unknown>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, k) => {
    if (vars[k] === undefined || vars[k] === null) return match;
    return String(vars[k]);
  });
}

/**
 * Convenience: returns the override template interpolated with vars, or `fallback` unchanged.
 * Use this when your fallback is the literal ${interpolated} string the function already built.
 */
export async function resolvePrompt(
  key: string,
  vars: Record<string, unknown>,
  fallback: string,
): Promise<string> {
  const override = await loadPromptOverride(key);
  if (!override || !override.template) return fallback;
  return interpolate(override.template, vars);
}

/**
 * Returns the override model for a voice prompt, or `fallback` if none configured.
 * Used to swap Realtime model (e.g. gpt-realtime vs gpt-realtime-mini) without redeploy.
 */
export async function resolveModel(key: string, fallback: string): Promise<string> {
  const override = await loadPromptOverride(key);
  if (!override || !override.model) return fallback;
  return override.model;
}
