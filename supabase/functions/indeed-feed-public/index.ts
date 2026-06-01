// Fase 7 — PR-G.3: indeed-feed-public
// Endpoint público que serve o XML do Indeed para o slug informado.
// Se o feed estiver desatualizado (>6h), regenera antes de servir.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STALE_HOURS = 6;

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get("slug");
    if (!slug) {
      return new Response("Missing slug", { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: config } = await supabase
      .from("indeed_feed_config")
      .select("account_id, last_generated_at, is_active")
      .eq("feed_slug", slug)
      .maybeSingle();

    if (!config || !(config as any).is_active) {
      return new Response("Feed not found or inactive", { status: 404 });
    }

    const accountId = (config as any).account_id as string;
    const lastGen = (config as any).last_generated_at
      ? new Date((config as any).last_generated_at).getTime()
      : 0;
    const isStale = Date.now() - lastGen > STALE_HOURS * 3600 * 1000;

    if (isStale) {
      try {
        await fetch(`${SUPABASE_URL}/functions/v1/generate-indeed-feed`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({ account_id: accountId }),
        });
      } catch (e) {
        console.warn("regen failed, serving stale", e);
      }
    }

    const path = `${accountId}/indeed.xml`;
    const { data: file, error } = await supabase.storage
      .from("indeed-feeds")
      .download(path);

    if (error || !file) {
      return new Response("Feed not yet generated", { status: 404 });
    }

    const xml = await file.text();
    return new Response(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (e) {
    console.error("indeed-feed-public error", e);
    return new Response("Internal error", { status: 500 });
  }
});
