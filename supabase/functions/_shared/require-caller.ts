import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * Garante que a chamada vem de um USUÁRIO AUTENTICADO ou de uma FUNCTION INTERNA
 * (service_role). Bloqueia chamadas anônimas/públicas — essencial para endpoints
 * verify_jwt=false que consomem APIs pagas / LLM (evita abuso de custo).
 *
 * Importante: a anon key é PÚBLICA, então `verify_jwt=true` sozinho não impede
 * abuso. Esta checagem exige um JWT de usuário real (auth.getUser) OU a
 * service_role key (chamadas function->function).
 *
 * Uso:
 *   const caller = await requireCaller(req);
 *   if (!caller.ok) return new Response(JSON.stringify({ error: caller.error }),
 *     { status: caller.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
 */
export async function requireCaller(req: Request): Promise<
  | { ok: true; userId: string | null; internal: boolean }
  | { ok: false; status: number; error: string }
> {
  const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!jwt) return { ok: false, status: 401, error: "Autenticação requerida" };

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (serviceKey && jwt === serviceKey) return { ok: true, userId: null, internal: true };

  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data, error } = await sb.auth.getUser(jwt);
    if (error || !data?.user) return { ok: false, status: 401, error: "Autenticação inválida" };
    return { ok: true, userId: data.user.id, internal: false };
  } catch {
    return { ok: false, status: 401, error: "Falha ao validar autenticação" };
  }
}
