// portal-data — Endpoint público do PORTAL DE CLIENTE, validado por TOKEN no servidor.
//
// Substitui o acesso anônimo direto (que tinha RLS `USING(true)` → vazamento de PII).
// Toda leitura é escopada ao `cliente_id`/`account_id` do token, usando service_role.
// O frontend (hooks usePortalAuth/usePortalData) chama esta function em vez de SELECT direto.
//
// Segurança: requer `token` válido e `ativo=true` em portal_clientes_acesso.
// Config: verify_jwt = false (acesso público por token — ver supabase/config.toml).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const APP_STATUSES = ["shortlisted", "hired", "rejected", "interview", "offer"];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { token, resource, params } = await req.json().catch(() => ({}));
    if (!token || !resource) return json({ error: "token e resource são obrigatórios" }, 400);

    // 1) Validar o token (servidor) — base de todo o isolamento do portal
    const { data: access } = await supabase
      .from("portal_clientes_acesso")
      .select("id, account_id, cliente_id, contato_id, email, ativo")
      .eq("token_acesso", token)
      .eq("ativo", true)
      .maybeSingle();
    if (!access) return json({ error: "Acesso inválido ou expirado" }, 401);

    const clienteId = access.cliente_id as string;

    // Monta um candidato na forma que o front espera; campos legados (sumidos do
    // schema) retornam null/[] → UI não quebra (degradação graciosa).
    const mapApp = (app: any, jobs: any[]) => ({
      id: app.id,
      status: app.status,
      applied_at: app.applied_at,
      created_at: app.applied_at,
      job_id: app.job_id,
      jobTitle: jobs?.find((j) => j.id === app.job_id)?.title ?? "—",
      recruitment_candidates: app.recruitment_candidates
        ? {
            id: app.recruitment_candidates.id,
            name: [app.recruitment_candidates.first_name, app.recruitment_candidates.last_name]
              .filter(Boolean).join(" ") || app.recruitment_candidates.email,
            email: app.recruitment_candidates.email,
            phone: app.recruitment_candidates.phone,
            avatar_url: app.recruitment_candidates.avatar_url,
            linkedin_url: app.recruitment_candidates.linkedin_url,
            // campos legados que não existem mais no schema (UI degrada graciosamente):
            city: null, current_company: null, current_position: null,
            qualification_score: null, qualification_tags: [], qualification_summary: null,
            strengths: [], concerns: [],
          }
        : null,
    });

    switch (resource) {
      case "auth": {
        await supabase.from("portal_clientes_acesso")
          .update({ ultimo_acesso: new Date().toISOString() }).eq("id", access.id);
        const { data: client } = await supabase.from("clientes_consultoria")
          .select("id, razao_social, nome_fantasia, logo_url, status").eq("id", clienteId).maybeSingle();
        if (!client) return json({ error: "Cliente não encontrado" }, 404);
        let contact = null;
        if (access.contato_id) {
          const { data } = await supabase.from("clientes_contatos")
            .select("id, nome, cargo, email").eq("id", access.contato_id).maybeSingle();
          contact = data;
        }
        return json({
          access: { id: access.id, account_id: access.account_id, cliente_id: access.cliente_id, contato_id: access.contato_id, email: access.email },
          client, contact, accountId: access.account_id,
        });
      }
      case "jobs": {
        const { data } = await supabase.from("recruitment_jobs")
          .select("*").eq("cliente_id", clienteId).order("created_at", { ascending: false });
        return json(data ?? []);
      }
      case "candidates": {
        const { data: jobs } = await supabase.from("recruitment_jobs").select("id, title").eq("cliente_id", clienteId);
        const jobIds = (jobs ?? []).map((j) => j.id);
        if (!jobIds.length) return json([]);
        const { data: apps } = await supabase.from("recruitment_applications")
          .select("id, status, applied_at, job_id, recruitment_candidates(id, first_name, last_name, email, phone, avatar_url, linkedin_url)")
          .in("job_id", jobIds).in("status", APP_STATUSES);
        return json((apps ?? []).map((a) => mapApp(a, jobs ?? [])));
      }
      case "shortlist": {
        const jobId = params?.jobId;
        if (!jobId) return json([]);
        const { data: job } = await supabase.from("recruitment_jobs").select("id, title, cliente_id").eq("id", jobId).maybeSingle();
        if (!job || job.cliente_id !== clienteId) return json({ error: "Vaga não pertence a este portal" }, 403);
        const { data: apps } = await supabase.from("recruitment_applications")
          .select("id, status, applied_at, job_id, recruitment_candidates(id, first_name, last_name, email, phone, avatar_url, linkedin_url)")
          .eq("job_id", jobId).eq("status", "shortlisted");
        return json((apps ?? []).map((a) => mapApp(a, [job])));
      }
      case "feedbacks": {
        const { data } = await supabase.from("portal_feedbacks").select("*").eq("cliente_id", clienteId);
        return json(data ?? []);
      }
      case "submit_feedback": {
        const f = params ?? {};
        if (!f.vaga_id || !f.candidato_id || !f.decisao) return json({ error: "vaga_id, candidato_id e decisao são obrigatórios" }, 400);
        // account_id/cliente_id/contato_id vêm SEMPRE do token (não confiar no client)
        const { data, error } = await supabase.from("portal_feedbacks").insert({
          account_id: access.account_id, cliente_id: clienteId, contato_id: access.contato_id,
          vaga_id: f.vaga_id, candidato_id: f.candidato_id, decisao: f.decisao,
          motivo: f.motivo ?? null, nota: f.nota ?? null,
        }).select().maybeSingle();
        if (error) return json({ error: error.message }, 400);
        return json(data);
      }
      case "notify_recruiter": {
        // "Preciso de mais candidatos" / "Tenho dúvidas": notifica o recrutador por
        // WhatsApp. Telefone e destinatário ficam SEMPRE no servidor (não vão ao client).
        const jobId = (params as any)?.jobId;
        const message = (params as any)?.message;
        const type = (params as any)?.type;
        if (!jobId || !message) return json({ error: "jobId e message são obrigatórios" }, 400);
        const { data: job } = await supabase.from("recruitment_jobs")
          .select("account_id, title, cliente_id").eq("id", jobId).maybeSingle();
        if (!job || job.cliente_id !== clienteId) return json({ error: "Vaga não pertence a este portal" }, 403);
        const { data: members } = await supabase.from("account_members")
          .select("user_id, role").eq("account_id", access.account_id);
        const owner = (members ?? []).find((m: any) => m.role === "owner") ?? (members ?? [])[0];
        if (!owner?.user_id) return json({ ok: false, reason: "sem destinatário" });
        const { data: emp } = await supabase.from("employees")
          .select("phone").eq("user_id", owner.user_id).maybeSingle();
        if (!emp?.phone) return json({ ok: false, reason: "sem telefone" });
        const { data: cli } = await supabase.from("clientes_consultoria")
          .select("razao_social").eq("id", clienteId).maybeSingle();
        const clientName = cli?.razao_social ?? "Cliente";
        const prefix = type === "duvida"
          ? `❓ O cliente "${clientName}" tem uma dúvida sobre a vaga "${job.title}"`
          : `📋 O cliente "${clientName}" solicitou mais candidatos para a vaga "${job.title}"`;
        await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/whatsapp-send`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
          body: JSON.stringify({ provider: "zapi", toPhoneE164: emp.phone, message: `${prefix}:\n\n"${message}"` }),
        }).catch(() => { /* best effort */ });
        return json({ ok: true });
      }
      default:
        return json({ error: `resource desconhecido: ${resource}` }, 400);
    }
  } catch (e) {
    console.error("portal-data error:", e);
    return json({ error: e instanceof Error ? e.message : "Erro interno" }, 500);
  }
});
