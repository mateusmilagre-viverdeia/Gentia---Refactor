// Cria dados de demonstração de Hunting (3 buscas, 15 resultados, 2 abordagens enviadas).
// Marcados com tag "demo" e flag em recruitment_hunting_searches.filters.demo=true
// para que possam ser limpos depois pelo Modo Demo padrão.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendWhatsAppViaZApi, isZApiConfigured } from "../_shared/whatsapp-zapi.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const DEMO_PROFILES = [
  { name: "Marina Costa",   role: "Tech Recruiter Sr.", company: "TalentLab",      city: "São Paulo, SP",   score: 92 },
  { name: "Rafael Souza",   role: "Headhunter Tech",    company: "TopHire",        city: "Rio de Janeiro",  score: 88 },
  { name: "Camila Ribeiro", role: "Senior Recruiter",   company: "Convoy R&S",     city: "Belo Horizonte",  score: 85 },
  { name: "Lucas Pereira",  role: "Talent Acquisition", company: "GrowthPeople",   city: "São Paulo, SP",   score: 82 },
  { name: "Beatriz Lima",   role: "Recruiter II",       company: "PeopleFirst",    city: "Curitiba",        score: 80 },
  { name: "André Martins",  role: "Sourcer Lead",       company: "DeepSource",     city: "Remoto",          score: 78 },
  { name: "Patrícia Alves", role: "Recruiter Pleno",    company: "HRTech",         city: "Florianópolis",   score: 76 },
  { name: "Diego Nunes",    role: "Tech Sourcer",       company: "Linker",         city: "Porto Alegre",    score: 74 },
  { name: "Fernanda Cruz",  role: "Recruiter",          company: "TalentBox",      city: "Recife",          score: 72 },
  { name: "Thiago Oliveira",role: "Recruiter Jr.",      company: "FirstHire",      city: "São Paulo, SP",   score: 68 },
  { name: "Juliana Pires",  role: "Senior Headhunter",  company: "Apex Search",    city: "São Paulo, SP",   score: 90 },
  { name: "Marcos Vieira",  role: "Tech Recruiter",     company: "ByteHire",       city: "Campinas",        score: 84 },
  { name: "Renata Souza",   role: "TA Specialist",      company: "PeopleX",        city: "Brasília",        score: 81 },
  { name: "Felipe Gomes",   role: "Recruiter Pleno",    company: "RHTech",         city: "Salvador",        score: 79 },
  { name: "Aline Barros",   role: "Talent Partner",     company: "MindHire",       city: "Remoto",          score: 75 },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "missing auth" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "invalid token" }, 401);
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const accountId: string | undefined = body.account_id;
    const action: "seed" | "clear" | "seed_job" | "clear_job" | "seed_real_approach" = body.action ?? "seed";
    if (!accountId) return json({ error: "account_id required" }, 400);

    // Verifica que o user é membro da conta
    const { data: member } = await admin
      .from("account_members")
      .select("user_id")
      .eq("account_id", accountId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!member) return json({ error: "not a member of account" }, 403);

    if (action === "clear") {
      // Apaga só dados marcados como demo
      const { data: demoSearches } = await admin
        .from("recruitment_hunting_searches")
        .select("id")
        .eq("account_id", accountId)
        .filter("filters->>demo", "eq", "true");
      const ids = (demoSearches ?? []).map((s) => s.id);
      if (ids.length > 0) {
        // Cascata apaga results e approaches via FK
        await admin.from("recruitment_hunting_searches").delete().in("id", ids);
      }
      return json({ success: true, removed_searches: ids.length });
    }

    if (action === "clear_job") {
      // Remove vagas demo desta conta (ICPs/approaches/results caem em cascata via FK)
      const { data: demoJobs } = await admin
        .from("recruitment_jobs")
        .select("id")
        .eq("account_id", accountId)
        .eq("is_demo", true)
        .ilike("title", "%(DEMO)%");
      const jobIds = (demoJobs ?? []).map((j) => j.id);
      if (jobIds.length > 0) {
        await admin.from("recruitment_communications_log").delete().in("job_id", jobIds);
        await admin.from("job_icps").delete().in("job_id", jobIds);
        await admin.from("recruitment_jobs").delete().in("id", jobIds);
      }
      return json({ success: true, removed_jobs: jobIds.length });
    }

    if (action === "seed_real_approach") {
      const linkedinUrl: string | undefined = body.linkedin_url;
      // phone/email são overrides opcionais. Se não vierem, descobrimos via waterfall.
      const phoneOverride: string | undefined = body.phone;
      const emailOverride: string | undefined = body.email;
      if (!linkedinUrl) return json({ error: "linkedin_url required" }, 400);

      const { data: demoJob } = await admin
        .from("recruitment_jobs")
        .select("id, title, description, account_id")
        .eq("account_id", accountId)
        .eq("is_demo", true)
        .ilike("title", "%(DEMO)%")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!demoJob) {
        return json({ error: "Vaga demo nao encontrada. Clique em 'Seed vaga demo' antes." }, 400);
      }

      const { data: icp } = await admin
        .from("job_icps")
        .select("*")
        .eq("job_id", demoJob.id)
        .maybeSingle();

      const apifyToken = Deno.env.get("APIFY_TOKEN");
      if (!apifyToken) return json({ error: "APIFY_TOKEN nao configurado" }, 500);

      console.log("Apify scrape para", linkedinUrl);
      const apifyRunRes = await fetch(
        `https://api.apify.com/v2/acts/harvestapi~linkedin-profile-scraper/runs?token=${apifyToken}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profileScraperMode: "Profile details no email ($4 per 1k)", queries: [linkedinUrl] }),
        }
      );
      if (!apifyRunRes.ok) {
        const t = await apifyRunRes.text();
        console.error("Apify start error", apifyRunRes.status, t);
        return json({ error: `Apify start failed (${apifyRunRes.status}): ${t.slice(0, 200)}` }, 500);
      }
      const runData = await apifyRunRes.json();
      const runId = runData?.data?.id;
      const datasetId = runData?.data?.defaultDatasetId;
      if (!runId || !datasetId) return json({ error: "Apify run sem id" }, 500);

      const start = Date.now();
      let status = "RUNNING";
      while (Date.now() - start < 90_000) {
        await new Promise((r) => setTimeout(r, 3000));
        const statusRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${apifyToken}`);
        const statusJson = await statusRes.json();
        status = statusJson?.data?.status ?? "UNKNOWN";
        console.log("Apify status:", status);
        if (status === "SUCCEEDED" || status === "FAILED" || status === "ABORTED" || status === "TIMED-OUT") break;
      }
      if (status !== "SUCCEEDED") {
        return json({ error: `Apify scrape nao completou (status=${status})` }, 500);
      }

      const itemsRes = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${apifyToken}&clean=true&limit=1`);
      const items = await itemsRes.json();
      if (!Array.isArray(items) || items.length === 0) {
        return json({ error: "Apify retornou 0 perfis" }, 500);
      }
      const profile = items[0] as Record<string, unknown>;
      const fullName = (profile.fullName ?? profile.name ?? "Guilherme Guimaraes") as string;
      const headline = (profile.headline ?? profile.title ?? "") as string;
      // Tenta múltiplas fontes para a empresa atual (resiliente quando o scrape vem incompleto)
      const experiences = (profile.experiences ?? profile.experience ?? []) as Array<Record<string, unknown>>;
      const firstExpCompany = (experiences[0]?.company ?? experiences[0]?.companyName ?? "") as string;
      // Heurística leve em headline tipo "CEO @ Empresa" ou "CEO at Empresa"
      const headlineRaw = (profile.headline ?? profile.title ?? "") as string;
      const headlineCompanyMatch = headlineRaw.match(/(?:@|\bat\b|\bna\b|\bda\b|\bdo\b)\s+([A-Z][\w\s&.-]{2,40})/);
      const headlineCompany = headlineCompanyMatch?.[1]?.trim() ?? "";
      const company = (
        (profile.currentCompany as Record<string, unknown> | undefined)?.name ??
        profile.companyName ??
        firstExpCompany ??
        headlineCompany ??
        ""
      ) as string;
      const location = (profile.location ?? profile.geoLocation ?? "") as string;
      const photoUrl = (profile.photo ?? profile.profilePicture ?? null) as string | null;

      const { data: search, error: searchErr } = await admin
        .from("recruitment_hunting_searches")
        .insert({
          account_id: accountId,
          job_id: demoJob.id,
          query: `Abordagem real - ${fullName}`,
          sources: ["linkedin"],
          filters: { demo: true, real_approach: true },
          results_count: 1,
          qualified_count: 1,
          status: "completed",
          created_by: userId,
          completed_at: new Date().toISOString(),
          desired_count: 1,
          min_score: 70,
        })
        .select("id")
        .single();
      if (searchErr || !search) {
        console.error("seed_real_approach search err", searchErr);
        return json({ error: searchErr?.message ?? "search insert failed" }, 500);
      }

      const mandatorySkills: string[] = (icp?.mandatory_skills as string[]) ?? [];
      const profileSkills = ((profile.skills ?? []) as Array<{ name?: string } | string>)
        .map((s) => (typeof s === "string" ? s : s?.name ?? ""))
        .filter(Boolean)
        .map((s) => s.toLowerCase());
      const headlineLower = headline.toLowerCase();
      let score = 60;
      for (const sk of mandatorySkills) {
        if (profileSkills.some((ps) => ps.includes(sk.toLowerCase())) || headlineLower.includes(sk.toLowerCase())) {
          score += 8;
        }
      }
      score = Math.min(score, 95);

      const { data: huntingResult, error: resultErr } = await admin
        .from("recruitment_hunting_results")
        .insert({
          search_id: search.id,
          source: "linkedin",
          source_url: linkedinUrl,
          extracted_data: {
            name: fullName,
            headline,
            company,
            location,
            photo: photoUrl,
            email: emailOverride ?? null,
            phone: phoneOverride ?? null,
            tags: ["demo", "real-approach"],
            raw_apify: profile,
          },
          match_score: score,
          score_breakdown: { role_fit: score, location_fit: 80, skills_overlap: score - 60 },
          match_reasoning: `Perfil real scrapeado do LinkedIn. Match com ICP "${icp?.role ?? demoJob.title}" baseado em skills e headline.`,
          status: "pending",
          pipeline_stage: "found",
          qualified: score >= 70,
          score_source: "apify_real",
          tags: ["demo", "real-approach"],
        })
        .select("id")
        .single();

      if (resultErr || !huntingResult) {
        console.error("hunting_result err", resultErr);
        return json({ error: resultErr?.message ?? "result insert failed" }, 500);
      }

      // ============ CASCATA: descoberta de contato (orquestrador) ============
      const nameParts = fullName.trim().split(/\s+/);
      const firstNameRaw = nameParts[0] ?? "";
      const lastNameRaw = nameParts.slice(1).join(" ");

      let cascade: any[] = [];
      let totalCost = 0;
      const discovery: {
        final_email: string | null;
        final_phone: string | null;
        final_email_source: string | null;
        final_phone_source: string | null;
        email_confidence: string;
        cascade: any[];
        total_cost_credits: number;
        from_cache: boolean;
      } = {
        final_email: emailOverride ?? null,
        final_phone: phoneOverride ?? null,
        final_email_source: emailOverride ? "override" : null,
        final_phone_source: phoneOverride ? "override" : null,
        email_confidence: "unknown",
        cascade: [],
        total_cost_credits: 0,
        from_cache: false,
      };

      try {
        const discRes = await admin.functions.invoke("hunting-discover-contact", {
          body: {
            account_id: accountId,
            full_name: fullName,
            first_name: firstNameRaw,
            last_name: lastNameRaw,
            company,
            linkedin_url: linkedinUrl,
            email_override: emailOverride,
            phone_override: phoneOverride,
          },
        });
        const d = (discRes.data as any)?.discovery;
        if (d) {
          discovery.final_email = d.email ?? null;
          discovery.final_phone = d.phone ?? null;
          discovery.final_email_source = d.email_source ?? null;
          discovery.final_phone_source = d.phone_source ?? null;
          discovery.email_confidence = d.email_confidence ?? "unknown";
          discovery.cascade = d.cascade ?? [];
          discovery.total_cost_credits = d.total_cost_credits ?? 0;
          discovery.from_cache = !!d.from_cache;
          cascade = d.cascade ?? [];
          totalCost = d.total_cost_credits ?? 0;
        }
      } catch (e) {
        console.error("discover-contact invoke failed", e);
      }

      // Persiste a cascata no resultado para a UI mostrar
      await admin
        .from("recruitment_hunting_results")
        .update({
          discovery_cascade: cascade,
          discovery_cost_credits: totalCost,
        } as any)
        .eq("id", huntingResult.id);

      // PASSO 4: Se nenhum contato, registrar como bloqueado e retornar
      if (!discovery.final_email && !discovery.final_phone) {
        await admin.from("recruitment_hunting_approaches").insert({
          hunting_result_id: huntingResult.id,
          account_id: accountId,
          icp_id: icp?.id ?? null,
          channel: "email",
          status: "blocked",
          message_generated: "(bloqueado — sem contato descoberto)",
          created_by: userId,
        });
        return json({
          success: true,
          blocked: true,
          reason: "contact_not_found",
          hunting_result_id: huntingResult.id,
          candidate: { name: fullName, headline, company, score },
          contact_discovery: discovery,
        });
      }

      const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
      const firstName = firstNameRaw || fullName.split(" ")[0];
      let whatsappMsg = `Ola ${firstName}! Vi seu perfil no LinkedIn e fiquei impressionado com sua trajetoria${company ? ` na ${company}` : ""}. Estamos com uma oportunidade de ${demoJob.title.replace(" (DEMO)", "")} que tem muito a ver com seu perfil. Topa um papo de 15min essa semana?`;
      let emailSubject = `Oportunidade ${demoJob.title.replace(" (DEMO)", "")} - quer conversar?`;
      let emailBody = whatsappMsg;

      if (lovableApiKey) {
        try {
          const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${lovableApiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [
                { role: "system", content: "Voce e um headhunter senior brasileiro. Gere mensagens curtas, naturais, em PT-BR, sem emojis, sem cliches. Tom: respeitoso, direto, valorizando o historico do candidato." },
                { role: "user", content: `Gere DUAS abordagens (uma WhatsApp curta de ate 350 chars, uma email com subject + corpo de ate 800 chars) para abordar este profissional para a vaga abaixo.\n\nPERFIL:\nNome: ${fullName}\nHeadline: ${headline}\nEmpresa atual: ${company}\nLocalizacao: ${location}\n\nVAGA:\nTitulo: ${demoJob.title.replace(" (DEMO)", "")}\nDescricao: ${(demoJob.description ?? "").slice(0, 500)}\nSkills buscadas: ${mandatorySkills.join(", ")}\n\nResponda APENAS com JSON valido neste formato exato:\n{"whatsapp": "...", "email_subject": "...", "email_body": "..."}` },
              ],
              response_format: { type: "json_object" },
            }),
          });
          if (aiRes.ok) {
            const aiJson = await aiRes.json();
            const content = aiJson?.choices?.[0]?.message?.content;
            if (content) {
              const parsed = JSON.parse(content);
              if (parsed.whatsapp) whatsappMsg = parsed.whatsapp;
              if (parsed.email_subject) emailSubject = parsed.email_subject;
              if (parsed.email_body) emailBody = parsed.email_body;
            }
          } else {
            console.error("Lovable AI error", aiRes.status, await aiRes.text());
          }
        } catch (e) {
          console.error("AI generation failed, fallback", e);
        }
      }

      const result: Record<string, unknown> = {
        success: true,
        hunting_result_id: huntingResult.id,
        candidate: { name: fullName, headline, company, score },
        contact_discovery: discovery,
        ai_messages: { whatsapp: whatsappMsg, email_subject: emailSubject, email_body: emailBody },
      };

      const phone = discovery.final_phone;
      const email = discovery.final_email;

      if (phone) {
        try {
          if (!isZApiConfigured()) throw new Error("ZAPI nao configurado (ZAPI_BASE_URL/ZAPI_INSTANCE_ID/ZAPI_TOKEN)");
          const zRes = await sendWhatsAppViaZApi({ toPhoneE164: phone, message: whatsappMsg });
          await admin.from("recruitment_hunting_approaches").insert({
            hunting_result_id: huntingResult.id,
            account_id: accountId,
            icp_id: icp?.id ?? null,
            channel: "whatsapp",
            status: "sent",
            message_generated: whatsappMsg,
            message_sent: whatsappMsg,
            phone_number: phone,
            generation_model: "google/gemini-2.5-flash",
            created_by: userId,
            approved_at: new Date().toISOString(),
            approved_by: userId,
            sent_at: new Date().toISOString(),
          });
          await admin.from("recruitment_communications_log").insert({
            account_id: accountId,
            job_id: demoJob.id,
            message_type: "hunting_outreach",
            channel: "whatsapp",
            recipient: phone,
            body: whatsappMsg,
            status: "sent",
            provider: "zapi",
            metadata: { hunting_result_id: huntingResult.id, demo_real_approach: true, zapi_status: zRes.status, contact_source: discovery.final_phone_source },
          });
          result.whatsapp_sent = true;
        } catch (e) {
          console.error("WhatsApp send failed", e);
          result.whatsapp_error = (e as Error).message;
        }
      }

      if (email) {
        try {
          const resendKey = Deno.env.get("RESEND_API_KEY");
          if (!resendKey) throw new Error("RESEND_API_KEY nao configurado");
          const fromEmail = "Gentia Hunting <onboarding@resend.dev>";
          const safeBody = emailBody.replace(/</g, "&lt;").replace(/\n/g, "<br>");
          const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px"><p style="white-space:pre-wrap;font-size:15px;line-height:1.6;color:#222">${safeBody}</p><hr style="border:none;border-top:1px solid #eee;margin:24px 0"><p style="font-size:12px;color:#888">Mensagem enviada via teste real do modulo Hunting da Gentia. Email descoberto via: ${discovery.final_email_source}.</p></div>`;
          const emailRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({ from: fromEmail, to: [email], subject: emailSubject, html }),
          });
          if (!emailRes.ok) {
            const errTxt = await emailRes.text();
            throw new Error(`Resend ${emailRes.status}: ${errTxt.slice(0, 200)}`);
          }
          await admin.from("recruitment_hunting_approaches").insert({
            hunting_result_id: huntingResult.id,
            account_id: accountId,
            icp_id: icp?.id ?? null,
            channel: "email",
            status: "sent",
            message_generated: `${emailSubject}\n\n${emailBody}`,
            message_sent: `${emailSubject}\n\n${emailBody}`,
            generation_model: "google/gemini-2.5-flash",
            created_by: userId,
            approved_at: new Date().toISOString(),
            approved_by: userId,
            sent_at: new Date().toISOString(),
          });
          await admin.from("recruitment_communications_log").insert({
            account_id: accountId,
            job_id: demoJob.id,
            message_type: "hunting_outreach",
            channel: "email",
            recipient: email,
            subject: emailSubject,
            body: emailBody,
            status: "sent",
            provider: "resend",
            metadata: { hunting_result_id: huntingResult.id, demo_real_approach: true, contact_source: discovery.final_email_source },
          });
          result.email_sent = true;
        } catch (e) {
          console.error("Email send failed", e);
          result.email_error = (e as Error).message;
        }
      }

      return json(result);
    }


    if (action === "seed_job") {
      // Cria 1 vaga publicada DEMO + 1 ICP completo
      const now = new Date().toISOString();
      const { data: jobRow, error: jobErr } = await admin
        .from("recruitment_jobs")
        .insert({
          account_id: accountId,
          title: "Tech Recruiter Sênior (DEMO)",
          description:
            "Vaga de demonstração criada pelo QA do Hunting. Buscamos um(a) Tech Recruiter Sênior remoto(a) para liderar sourcing técnico de alto volume, com foco em SaaS B2B. Stack de hunting: LinkedIn Recruiter, Apollo, Sales Navigator e ferramentas de automação de outreach.",
          department: "Recrutamento",
          location: "Remoto - Brasil",
          employment_type: "clt",
          work_modality: "remoto",
          status: "published",
          is_public: true,
          is_demo: true,
          published_at: now,
          min_hunting_score: 70,
        })
        .select("id")
        .single();

      if (jobErr || !jobRow) {
        console.error("seed_job error:", jobErr);
        return json({ error: jobErr?.message ?? "failed to create demo job" }, 500);
      }

      const { error: icpErr } = await admin.from("job_icps").insert({
        job_id: jobRow.id,
        account_id: accountId,
        role: "Tech Recruiter Sênior",
        seniority: "senior",
        mandatory_skills: [
          "Sourcing técnico",
          "Boolean search",
          "LinkedIn Recruiter",
          "Comunicação executiva",
        ],
        nice_to_have: ["Inglês fluente", "Experiência com SaaS B2B"],
        experience_years_min: 4,
        culture_traits_required: ["proatividade", "data-driven", "ownership"],
        communication_style: "direto",
        work_context: "remoto",
        target_title: "Tech Recruiter / Senior Recruiter",
        target_locations: ["Brasil", "São Paulo", "Remoto"],
        keywords: ["recrutamento técnico", "tech hiring", "sourcing"],
        search_keywords: ["tech recruiter", "senior recruiter", "headhunter"],
        target_sources: ["linkedin"],
        min_hunting_score: 70,
        confidence_threshold: 70,
        generated_by: "ai",
        is_active: true,
      });

      if (icpErr) {
        console.error("seed_job icp error:", icpErr);
        // Mantém vaga, mas sinaliza erro de ICP
        return json({ success: true, job_id: jobRow.id, icp_error: icpErr.message }, 200);
      }

      return json({ success: true, job_id: jobRow.id });
    }

    // Tenta achar uma vaga publicada para vincular
    const { data: job } = await admin
      .from("recruitment_jobs")
      .select("id, title")
      .eq("account_id", accountId)
      .eq("status", "published")
      .limit(1)
      .maybeSingle();

    const queries = [
      "Tech Recruiter Sr. - SaaS B2B",
      "Headhunter Sênior - Tecnologia",
      "Talent Acquisition Lead - Startup",
    ];

    const created: string[] = [];

    for (const query of queries) {
      const { data: search, error: searchErr } = await admin
        .from("recruitment_hunting_searches")
        .insert({
          account_id: accountId,
          job_id: job?.id ?? null,
          query,
          sources: ["linkedin"],
          filters: {
            demo: true,
            location: "Brasil",
            seniority: "Sênior",
          },
          results_count: 5,
          qualified_count: 5,
          status: "completed",
          created_by: userId,
          completed_at: new Date().toISOString(),
          desired_count: 5,
          min_score: 70,
        })
        .select("id")
        .single();

      if (searchErr || !search) {
        console.error("seed search err", searchErr);
        continue;
      }
      created.push(search.id);

      // 5 perfis por busca
      const slice = DEMO_PROFILES.slice(created.length === 1 ? 0 : created.length === 2 ? 5 : 10, created.length === 1 ? 5 : created.length === 2 ? 10 : 15);
      const resultsRows = slice.map((p) => ({
        search_id: search.id,
        source: "linkedin",
        source_url: `https://linkedin.com/in/demo-${p.name.toLowerCase().replace(/\s+/g, "-")}`,
        extracted_data: {
          name: p.name,
          headline: p.role,
          company: p.company,
          location: p.city,
          email: `${p.name.toLowerCase().replace(/\s+/g, ".")}@demo.gentia.tech`,
          phone: "+5511999990000",
          tags: ["demo"],
        },
        match_score: p.score,
        score_breakdown: {
          role_fit: p.score,
          location_fit: 80,
          experience_fit: p.score - 5,
        },
        match_reasoning: `Perfil demo gerado para validação. Score ${p.score} baseado em alinhamento com a vaga.`,
        status: "pending",
        pipeline_stage: "found",
        qualified: p.score >= 70,
        score_source: "demo",
        tags: ["demo"],
      }));

      const { data: insertedResults } = await admin
        .from("recruitment_hunting_results")
        .insert(resultsRows)
        .select("id, extracted_data, match_score");

      // Para a primeira busca, marca 2 resultados com abordagem enviada
      if (created.length === 1 && insertedResults && insertedResults.length >= 2) {
        for (let i = 0; i < 2; i++) {
          const r = insertedResults[i];
          const profile = (r.extracted_data ?? {}) as Record<string, unknown>;
          const name = (profile.name as string) ?? "Candidato";
          await admin.from("recruitment_hunting_approaches").insert({
            hunting_result_id: r.id,
            account_id: accountId,
            channel: "whatsapp",
            status: "sent",
            message_generated: `Olá ${name}! Vi seu perfil e acredito que pode fazer sentido conhecer uma oportunidade que estamos conduzindo. Topa um papo de 15min?`,
            message_sent: `Olá ${name}! Vi seu perfil e acredito que pode fazer sentido conhecer uma oportunidade que estamos conduzindo. Topa um papo de 15min?`,
            phone_number: "+5511999990000",
            generation_model: "demo",
            created_by: userId,
            approved_at: new Date().toISOString(),
            approved_by: userId,
            sent_at: new Date().toISOString(),
          });
        }
      }
    }

    return json({
      success: true,
      created_searches: created.length,
      created_results: created.length * 5,
      created_approaches: 2,
    });
  } catch (err) {
    console.error("hunting-demo-seed error:", err);
    return json({ error: (err as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
