import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Compute business days remaining between today and a future date (excludes Sat/Sun)
function businessDaysBetween(from: Date, to: Date): number {
  const sign = to > from ? 1 : -1;
  const start = sign > 0 ? new Date(from) : new Date(to);
  const end = sign > 0 ? new Date(to) : new Date(from);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  let days = 0;
  const cur = new Date(start);
  while (cur < end) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) days++;
    cur.setDate(cur.getDate() + 1);
  }
  return sign * days;
}

function classifySla(daysRemaining: number, hasShortlistDelivered: boolean): string {
  if (hasShortlistDelivered) return "concluido";
  if (daysRemaining < 0) return "atrasado";
  if (daysRemaining <= 3) return "atencao";
  return "no_prazo";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1) SLA: jobs with deadline + active status
    const { data: jobs, error: jobsErr } = await supabase
      .from("recruitment_jobs")
      .select("id, account_id, title, status, sla_status, data_limite_entrega, em_garantia, garantia_expira_em")
      .not("data_limite_entrega", "is", null)
      .in("status", ["active", "draft", "open"]);

    if (jobsErr) throw jobsErr;

    let slaUpdated = 0;
    let alertsCreated = 0;

    for (const job of jobs || []) {
      const deadline = new Date(job.data_limite_entrega as string);
      const daysRemaining = businessDaysBetween(today, deadline);
      const newStatus = classifySla(daysRemaining, false);
      const oldStatus = job.sla_status || "no_prazo";

      if (newStatus !== oldStatus) {
        await supabase
          .from("recruitment_jobs")
          .update({ sla_status: newStatus })
          .eq("id", job.id);
        slaUpdated++;

        // Create alert when transitioning into atencao or atrasado
        if (newStatus === "atencao" || newStatus === "atrasado") {
          const tipo = newStatus === "atencao" ? "proximo_vencimento" : "vencido";
          // dedupe: skip if active alert of same type already exists for this job
          const { data: existing } = await supabase
            .from("sla_alertas")
            .select("id")
            .eq("vaga_id", job.id)
            .eq("tipo_alerta", tipo)
            .eq("status", "ativo")
            .maybeSingle();

          if (!existing) {
            await supabase.from("sla_alertas").insert({
              account_id: job.account_id,
              vaga_id: job.id,
              tipo_alerta: tipo,
              dias_restantes: daysRemaining,
              status: "ativo",
            });
            alertsCreated++;
          }
        }
      }
    }

    // 2) Garantias: check expiration and create alerts 7 days before
    const { data: garantias, error: gErr } = await supabase
      .from("garantias_reposicao")
      .select("id, account_id, vaga_original_id, candidato_id, garantia_expira_em, status")
      .eq("status", "ativa");

    if (gErr) throw gErr;

    let garantiasExpired = 0;
    let garantiasAlerts = 0;

    for (const g of garantias || []) {
      const expira = new Date(g.garantia_expira_em as string);
      const daysToExpire = businessDaysBetween(today, expira);

      if (daysToExpire < 0) {
        // expired
        await supabase
          .from("garantias_reposicao")
          .update({ status: "expirada" })
          .eq("id", g.id);

        if (g.vaga_original_id) {
          await supabase
            .from("recruitment_jobs")
            .update({ em_garantia: false })
            .eq("id", g.vaga_original_id);
        }
        garantiasExpired++;
      } else if (daysToExpire <= 7) {
        // alert if no recent active alert exists (use sla_alertas with tipo='garantia_proxima_expiracao')
        const { data: existingAlert } = await supabase
          .from("sla_alertas")
          .select("id")
          .eq("vaga_id", g.vaga_original_id)
          .eq("tipo_alerta", "garantia_proxima_expiracao")
          .eq("status", "ativo")
          .maybeSingle();

        if (!existingAlert) {
          await supabase.from("sla_alertas").insert({
            account_id: g.account_id,
            vaga_id: g.vaga_original_id,
            tipo_alerta: "garantia_proxima_expiracao",
            dias_restantes: daysToExpire,
            status: "ativo",
          });
          garantiasAlerts++;
        }
      }
    }

    // 3) NPS pendentes do tipo 'hired' agendados para hoje ou antes — disparar
    let npsTriggered = 0;
    const { data: pendingNps } = await supabase
      .from("candidate_nps")
      .select("id, candidate_id, job_id, account_id, exit_stage")
      .eq("send_status", "pending")
      .eq("trigger", "hired")
      .lte("scheduled_for", new Date().toISOString());

    for (const nps of pendingNps || []) {
      try {
        await supabase.functions.invoke("nps-send", {
          body: {
            candidate_id: nps.candidate_id,
            job_id: nps.job_id,
            account_id: nps.account_id,
            trigger: "hired",
            existing_nps_id: nps.id,
          },
        });
        npsTriggered++;
      } catch (e) {
        console.error("[sla-monitor] nps-send failed for", nps.id, e);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        sla: { jobsScanned: jobs?.length || 0, slaUpdated, alertsCreated },
        garantias: { scanned: garantias?.length || 0, expired: garantiasExpired, alertsCreated: garantiasAlerts },
        nps: { triggered: npsTriggered, scanned: pendingNps?.length || 0 },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("[sla-monitor] error:", e);
    return new Response(
      JSON.stringify({ error: e.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
});
