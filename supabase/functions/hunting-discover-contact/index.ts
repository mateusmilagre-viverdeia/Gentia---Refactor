// Orquestrador de descoberta de contato com cascata de baixo custo.
// Etapas (short-circuit): cache → Apollo → Firecrawl Search → Firecrawl Scrape → IA extract → heurística.
// Cada provedor pago respeita toggles em hunting_provider_settings + circuit breaker diário.

import { createClient } from 'npm:@supabase/supabase-js@2';
import { aiFetch } from "../_shared/ai-gateway.ts";
import { consumeAICredits } from '../_shared/ai-credit-consumption.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type CascadeStep = {
  step: string;
  status: 'ok' | 'no_match' | 'error' | 'skipped' | 'limit_reached' | 'cache_hit';
  source?: string;
  email?: string | null;
  phone?: string | null;
  cost_credits?: number;
  detail?: string;
};

type DiscoveryResult = {
  email: string | null;
  email_source: string | null;
  email_confidence: 'verified' | 'risky' | 'invalid' | 'unknown';
  phone: string | null;
  phone_source: string | null;
  cascade: CascadeStep[];
  total_cost_credits: number;
  from_cache: boolean;
};

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
}

function nameCompanyHash(name: string, company: string): string {
  return `${normalize(name)}_${normalize(company)}`;
}

function cleanCompanyDomain(company: string): string {
  return company
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\b(ltda|s\.?a\.?|me|eireli|inc|llc|corp|corporation|company|co\.?|group|grupo|partners?|consultoria|consulting|tecnologia|tech|solutions?|solucoes)\b/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function extractEmailsFromText(text: string): string[] {
  const re = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  return Array.from(new Set((text.match(re) || []).map(e => e.toLowerCase())));
}

function extractPhonesFromText(text: string): string[] {
  // BR: +55 (11) 99999-9999, 11 99999-9999, 11999999999, etc.
  const re = /(?:\+?55\s?)?\(?\d{2}\)?[\s.-]?9?\d{4}[\s.-]?\d{4}/g;
  return Array.from(new Set((text.match(re) || []).map(p => p.replace(/[^\d+]/g, ''))));
}

async function incrementUsage(admin: any, accountId: string, provider: string, cost: number) {
  await admin.rpc('exec_sql' as any, {}).catch(() => null); // placeholder
  // Upsert manual
  const today = new Date().toISOString().slice(0, 10);
  const { data: existing } = await admin
    .from('hunting_daily_usage')
    .select('id, count, cost_credits')
    .eq('account_id', accountId)
    .eq('provider', provider)
    .eq('usage_date', today)
    .maybeSingle();
  if (existing) {
    await admin
      .from('hunting_daily_usage')
      .update({ count: existing.count + 1, cost_credits: Number(existing.cost_credits) + cost })
      .eq('id', existing.id);
  } else {
    await admin
      .from('hunting_daily_usage')
      .insert({ account_id: accountId, provider, count: 1, cost_credits: cost });
  }
}

async function getDailyUsage(admin: any, accountId: string, provider: string): Promise<number> {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await admin
    .from('hunting_daily_usage')
    .select('count')
    .eq('account_id', accountId)
    .eq('provider', provider)
    .eq('usage_date', today)
    .maybeSingle();
  return data?.count ?? 0;
}

async function getOrCreateSettings(admin: any, accountId: string) {
  const { data } = await admin
    .from('hunting_provider_settings')
    .select('*')
    .eq('account_id', accountId)
    .maybeSingle();
  if (data) return data;
  const { data: created } = await admin
    .from('hunting_provider_settings')
    .insert({ account_id: accountId })
    .select('*')
    .single();
  return created;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const {
      account_id,
      full_name,
      first_name,
      last_name,
      company,
      linkedin_url,
      email_override,
      phone_override,
    } = body as {
      account_id: string;
      full_name: string;
      first_name?: string;
      last_name?: string;
      company?: string;
      linkedin_url?: string;
      email_override?: string;
      phone_override?: string;
    };

    if (!account_id || !full_name) {
      return new Response(JSON.stringify({ error: 'account_id and full_name required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const settings = await getOrCreateSettings(admin, account_id);
    const cascade: CascadeStep[] = [];
    let totalCost = 0;

    const result: DiscoveryResult = {
      email: email_override ?? null,
      email_source: email_override ? 'override' : null,
      email_confidence: email_override ? 'unknown' : 'unknown',
      phone: phone_override ?? null,
      phone_source: phone_override ? 'override' : null,
      cascade,
      total_cost_credits: 0,
      from_cache: false,
    };

    if (email_override || phone_override) {
      cascade.push({ step: 'override', status: 'ok', email: email_override ?? null, phone: phone_override ?? null });
    }

    const fName = (first_name || full_name.trim().split(/\s+/)[0] || '').trim();
    const lName = (last_name || full_name.trim().split(/\s+/).slice(1).join(' ') || '').trim();
    const hash = company ? nameCompanyHash(full_name, company) : null;

    // ============ ETAPA 0: CACHE ============
    if (!result.email || !result.phone) {
      let cached: any = null;
      if (linkedin_url) {
        const { data } = await admin
          .from('hunting_contact_cache')
          .select('*')
          .eq('account_id', account_id)
          .eq('linkedin_url', linkedin_url)
          .gt('expires_at', new Date().toISOString())
          .maybeSingle();
        cached = data;
      }
      if (!cached && hash) {
        const { data } = await admin
          .from('hunting_contact_cache')
          .select('*')
          .eq('account_id', account_id)
          .eq('name_company_hash', hash)
          .gt('expires_at', new Date().toISOString())
          .maybeSingle();
        cached = data;
      }
      if (cached) {
        cascade.push({ step: 'cache', status: 'cache_hit', source: cached.email_source ?? cached.phone_source ?? 'cache', email: cached.email, phone: cached.phone });
        if (!result.email && cached.email) {
          result.email = cached.email;
          result.email_source = cached.email_source || 'cache';
          result.email_confidence = cached.email_confidence || 'unknown';
        }
        if (!result.phone && cached.phone) {
          result.phone = cached.phone;
          result.phone_source = cached.phone_source || 'cache';
        }
        result.from_cache = true;
        if (result.email && result.phone) {
          result.total_cost_credits = totalCost;
          return new Response(JSON.stringify({ success: true, discovery: result }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      } else {
        cascade.push({ step: 'cache', status: 'no_match' });
      }
    }

    // ============ ETAPA 1: APOLLO ============
    if (!result.email || !result.phone) {
      const apolloKey = Deno.env.get('APOLLO_API_KEY');
      if (!apolloKey) {
        cascade.push({ step: 'apollo', status: 'skipped', detail: 'APOLLO_API_KEY ausente' });
      } else {
        try {
          const apolloRes = await fetch('https://api.apollo.io/v1/people/match', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache', 'X-Api-Key': apolloKey },
            body: JSON.stringify({
              first_name: fName,
              last_name: lName,
              organization_name: company || undefined,
              linkedin_url: linkedin_url || undefined,
              reveal_personal_emails: true,
            }),
          });
          if (apolloRes.ok) {
            const apolloJson = await apolloRes.json();
            const person = apolloJson?.person ?? null;
            const email = person?.email ?? person?.personal_emails?.[0] ?? null;
            const phones = person?.phone_numbers ?? [];
            const phone = phones?.[0]?.sanitized_number ?? phones?.[0]?.raw_number ?? null;
            cascade.push({ step: 'apollo', status: (email || phone) ? 'ok' : 'no_match', source: 'apollo.io', email, phone });
            if (!result.email && email) { result.email = email; result.email_source = 'apollo'; result.email_confidence = 'unknown'; }
            if (!result.phone && phone) { result.phone = phone; result.phone_source = 'apollo'; }
          } else {
            const txt = await apolloRes.text();
            cascade.push({ step: 'apollo', status: 'error', detail: `${apolloRes.status}: ${txt.slice(0, 100)}` });
          }
        } catch (e) {
          cascade.push({ step: 'apollo', status: 'error', detail: (e as Error).message });
        }
      }
    } else {
      cascade.push({ step: 'apollo', status: 'skipped', detail: 'short-circuit' });
    }

    // Modo free_only com Firecrawl: respeita limite mas Firecrawl é usado (já é pago fixo)
    const allowFirecrawl = settings.mode !== 'free_only' || true; // firecrawl roda em todos os modos, só com limite
    const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');

    // ============ ETAPA 2: FIRECRAWL SEARCH ============
    let scrapedTexts: string[] = [];
    if ((!result.email || !result.phone) && firecrawlKey && allowFirecrawl) {
      const dailyLimit = settings.daily_firecrawl_limit ?? 100;
      const used = await getDailyUsage(admin, account_id, 'firecrawl');
      if (used >= dailyLimit) {
        cascade.push({ step: 'firecrawl_search', status: 'limit_reached', detail: `${used}/${dailyLimit} hoje` });
      } else {
        try {
          const query = `"${full_name}"${company ? ` "${company}"` : ''} (email OR contato OR contact)`;
          const fcRes = await fetch('https://api.firecrawl.dev/v2/search', {
            method: 'POST',
            headers: { Authorization: `Bearer ${firecrawlKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, limit: 5, scrapeOptions: { formats: ['markdown'] } }),
          });
          totalCost += 3;
          await incrementUsage(admin, account_id, 'firecrawl', 3);
          if (fcRes.ok) {
            const fcJson = await fcRes.json();
            const items: any[] = fcJson?.data || fcJson?.web?.results || [];
            const combinedText = items.map(i => `${i.title || ''}\n${i.description || ''}\n${i.markdown || ''}`).join('\n---\n');
            scrapedTexts.push(combinedText);
            const emails = extractEmailsFromText(combinedText).filter(e => !e.includes('example.') && !e.endsWith('.png') && !e.endsWith('.jpg'));
            const phones = extractPhonesFromText(combinedText);
            cascade.push({ step: 'firecrawl_search', status: emails.length || phones.length ? 'ok' : 'no_match', source: 'firecrawl/search', email: emails[0] || null, phone: phones[0] || null, cost_credits: 3, detail: `${items.length} resultados` });
            if (!result.email && emails[0]) { result.email = emails[0]; result.email_source = 'firecrawl_search'; result.email_confidence = 'unknown'; }
            if (!result.phone && phones[0]) { result.phone = phones[0]; result.phone_source = 'firecrawl_search'; }
          } else {
            cascade.push({ step: 'firecrawl_search', status: 'error', detail: `${fcRes.status}`, cost_credits: 0 });
          }
        } catch (e) {
          cascade.push({ step: 'firecrawl_search', status: 'error', detail: (e as Error).message });
        }
      }
    } else if (!firecrawlKey) {
      cascade.push({ step: 'firecrawl_search', status: 'skipped', detail: 'FIRECRAWL_API_KEY ausente' });
    } else if (result.email && result.phone) {
      cascade.push({ step: 'firecrawl_search', status: 'skipped', detail: 'short-circuit' });
    }

    // ============ ETAPA 3: FIRECRAWL SCRAPE site da empresa ============
    if ((!result.email || !result.phone) && firecrawlKey && company && allowFirecrawl) {
      const dailyLimit = settings.daily_firecrawl_limit ?? 100;
      const used = await getDailyUsage(admin, account_id, 'firecrawl');
      if (used >= dailyLimit) {
        cascade.push({ step: 'firecrawl_scrape', status: 'limit_reached', detail: `${used}/${dailyLimit} hoje` });
      } else {
        const cleanedCo = cleanCompanyDomain(company);
        const candidateUrls = cleanedCo.length >= 3
          ? [`https://${cleanedCo}.com.br/contato`, `https://${cleanedCo}.com/contact`]
          : [];
        for (const url of candidateUrls.slice(0, 2)) {
          try {
            const fcRes = await fetch('https://api.firecrawl.dev/v2/scrape', {
              method: 'POST',
              headers: { Authorization: `Bearer ${firecrawlKey}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ url, formats: ['markdown'], onlyMainContent: true }),
            });
            totalCost += 3;
            await incrementUsage(admin, account_id, 'firecrawl', 3);
            if (fcRes.ok) {
              const fcJson = await fcRes.json();
              const md = fcJson?.markdown || fcJson?.data?.markdown || '';
              if (md) scrapedTexts.push(md);
              const emails = extractEmailsFromText(md);
              const phones = extractPhonesFromText(md);
              cascade.push({ step: 'firecrawl_scrape', status: emails.length || phones.length ? 'ok' : 'no_match', source: url, email: emails[0] || null, phone: phones[0] || null, cost_credits: 3 });
              if (!result.email && emails[0]) { result.email = emails[0]; result.email_source = 'firecrawl_scrape'; result.email_confidence = 'unknown'; }
              if (!result.phone && phones[0]) { result.phone = phones[0]; result.phone_source = 'firecrawl_scrape'; }
              if (result.email && result.phone) break;
            } else {
              cascade.push({ step: 'firecrawl_scrape', status: 'no_match', detail: `${url} ${fcRes.status}`, cost_credits: 3 });
            }
          } catch (e) {
            cascade.push({ step: 'firecrawl_scrape', status: 'error', detail: (e as Error).message });
          }
        }
      }
    } else if (!company) {
      cascade.push({ step: 'firecrawl_scrape', status: 'skipped', detail: 'sem empresa' });
    } else if (result.email && result.phone) {
      cascade.push({ step: 'firecrawl_scrape', status: 'skipped', detail: 'short-circuit' });
    }

    // ============ ETAPA 4: IA EXTRACT do conteúdo coletado ============
    if ((!result.email || !result.phone) && scrapedTexts.length > 0) {
      const lovableKey = "direct";
      if (lovableKey) {
        try {
          const aiRes = await aiFetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: { Authorization: `Bearer ${lovableKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: 'google/gemini-3-flash-preview',
              messages: [
                { role: 'system', content: 'Extraia email e telefone (BR ou intl) de uma pessoa específica de textos coletados. Responda SOMENTE JSON: {"email":"...|null","phone":"...|null","confidence":"high|medium|low"}.' },
                { role: 'user', content: `Pessoa: ${full_name}${company ? ` (${company})` : ''}\n\nTextos:\n${scrapedTexts.join('\n---\n').slice(0, 8000)}` },
              ],
              response_format: { type: 'json_object' },
            }),
          });
          totalCost += 0.001;
          if (aiRes.ok) {
            const aiJson = await aiRes.json();
            await consumeAICredits({
              supabase: admin, accountId: account_id, aiData: aiJson,
              model: 'google/gemini-3-flash-preview',
              referenceType: 'hunting_discover_contact',
              description: `Extração de contato ${full_name}`,
            });
            const content = aiJson?.choices?.[0]?.message?.content || '{}';
            const parsed = JSON.parse(content);
            cascade.push({ step: 'ai_extract', status: parsed.email || parsed.phone ? 'ok' : 'no_match', source: 'gemini-3-flash', email: parsed.email || null, phone: parsed.phone || null, cost_credits: 0.001 });
            if (!result.email && parsed.email) { result.email = parsed.email; result.email_source = 'ai_extract'; result.email_confidence = parsed.confidence === 'high' ? 'unknown' : 'risky'; }
            if (!result.phone && parsed.phone) { result.phone = parsed.phone; result.phone_source = 'ai_extract'; }
          } else {
            cascade.push({ step: 'ai_extract', status: 'error', detail: `${aiRes.status}` });
          }
        } catch (e) {
          cascade.push({ step: 'ai_extract', status: 'error', detail: (e as Error).message });
        }
      }
    }

    // ============ ETAPA 5: HEURÍSTICA (sempre como fallback final) ============
    if (!result.email && company && fName) {
      const cleaned = cleanCompanyDomain(company);
      const nf = normalize(fName);
      const nl = normalize(lName);
      if (cleaned.length >= 3 && nf) {
        const guess = nl ? `${nf}.${nl}@${cleaned}.com.br` : `${nf}@${cleaned}.com.br`;
        result.email = guess;
        result.email_source = 'heuristic';
        result.email_confidence = 'risky';
        cascade.push({ step: 'heuristic', status: 'ok', source: 'pattern', email: guess });
      } else {
        cascade.push({ step: 'heuristic', status: 'no_match', detail: 'sem dados suficientes' });
      }
    } else if (!result.email) {
      cascade.push({ step: 'heuristic', status: 'skipped', detail: 'sem empresa ou nome' });
    }

    // ============ FASE C (Nível 2): provedores pay-as-you-go OFF por padrão ============
    // Hunter.io email finder (busca por domínio + nome) — só roda se ainda não há email
    if (!result.email && settings.enable_hunter && company && fName) {
      const hunterKey = Deno.env.get('HUNTER_API_KEY');
      if (!hunterKey) {
        cascade.push({ step: 'hunter', status: 'skipped', detail: 'HUNTER_API_KEY ausente' });
      } else {
        try {
          const cleaned = cleanCompanyDomain(company);
          const domainGuess = cleaned ? `${cleaned}.com.br` : '';
          const url = `https://api.hunter.io/v2/email-finder?domain=${encodeURIComponent(domainGuess)}&first_name=${encodeURIComponent(fName)}&last_name=${encodeURIComponent(lName)}&api_key=${hunterKey}`;
          const r = await fetch(url);
          totalCost += 0.04;
          await incrementUsage(admin, account_id, 'hunter', 0.04);
          if (r.ok) {
            const j = await r.json();
            const email = j?.data?.email ?? null;
            const score = j?.data?.score ?? 0;
            cascade.push({ step: 'hunter', status: email ? 'ok' : 'no_match', source: 'hunter.io', email, cost_credits: 0.04, detail: `score ${score}` });
            if (email) {
              result.email = email;
              result.email_source = 'hunter';
              result.email_confidence = score >= 80 ? 'verified' : score >= 50 ? 'risky' : 'unknown';
            }
          } else {
            cascade.push({ step: 'hunter', status: 'error', detail: `${r.status}`, cost_credits: 0.04 });
          }
        } catch (e) {
          cascade.push({ step: 'hunter', status: 'error', detail: (e as Error).message });
        }
      }
    }

    // Snov.io email finder fallback
    if (!result.email && settings.enable_snov && company && fName) {
      const snovUser = Deno.env.get('SNOV_CLIENT_ID');
      const snovSecret = Deno.env.get('SNOV_CLIENT_SECRET');
      if (!snovUser || !snovSecret) {
        cascade.push({ step: 'snov', status: 'skipped', detail: 'SNOV_CLIENT_ID/SECRET ausente' });
      } else {
        try {
          const tokRes = await fetch('https://api.snov.io/v1/oauth/access_token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `grant_type=client_credentials&client_id=${snovUser}&client_secret=${snovSecret}`,
          });
          const tokJson = await tokRes.json();
          const token = tokJson?.access_token;
          if (token) {
            const cleaned = cleanCompanyDomain(company);
            const domainGuess = cleaned ? `${cleaned}.com.br` : '';
            const findRes = await fetch('https://api.snov.io/v1/get-emails-from-names', {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `Bearer ${token}` },
              body: `firstName=${encodeURIComponent(fName)}&lastName=${encodeURIComponent(lName)}&domain=${encodeURIComponent(domainGuess)}`,
            });
            totalCost += 0.008;
            await incrementUsage(admin, account_id, 'snov', 0.008);
            if (findRes.ok) {
              const j = await findRes.json();
              const emailObj = j?.data?.[0]?.emails?.[0] ?? j?.emails?.[0] ?? null;
              const email = typeof emailObj === 'string' ? emailObj : emailObj?.email ?? null;
              cascade.push({ step: 'snov', status: email ? 'ok' : 'no_match', source: 'snov.io', email, cost_credits: 0.008 });
              if (email) {
                result.email = email;
                result.email_source = 'snov';
                result.email_confidence = 'unknown';
              }
            } else {
              cascade.push({ step: 'snov', status: 'error', detail: `${findRes.status}`, cost_credits: 0.008 });
            }
          } else {
            cascade.push({ step: 'snov', status: 'error', detail: 'token snov falhou' });
          }
        } catch (e) {
          cascade.push({ step: 'snov', status: 'error', detail: (e as Error).message });
        }
      }
    }

    // Twilio Lookup — confirma se phone é WhatsApp/válido
    if (result.phone && settings.enable_twilio) {
      const twSid = Deno.env.get('TWILIO_ACCOUNT_SID');
      const twToken = Deno.env.get('TWILIO_AUTH_TOKEN');
      if (!twSid || !twToken) {
        cascade.push({ step: 'twilio_lookup', status: 'skipped', detail: 'TWILIO_* ausentes' });
      } else {
        try {
          const auth = btoa(`${twSid}:${twToken}`);
          const phoneEnc = encodeURIComponent(result.phone.startsWith('+') ? result.phone : `+55${result.phone.replace(/\D/g, '')}`);
          const r = await fetch(`https://lookups.twilio.com/v2/PhoneNumbers/${phoneEnc}?Fields=line_type_intelligence`, {
            headers: { Authorization: `Basic ${auth}` },
          });
          totalCost += 0.005;
          await incrementUsage(admin, account_id, 'twilio', 0.005);
          if (r.ok) {
            const j = await r.json();
            const valid = j?.valid === true;
            const type = j?.line_type_intelligence?.type ?? null;
            cascade.push({ step: 'twilio_lookup', status: valid ? 'ok' : 'no_match', source: 'twilio', detail: `valid=${valid} type=${type}`, cost_credits: 0.005 });
          } else {
            cascade.push({ step: 'twilio_lookup', status: 'error', detail: `${r.status}`, cost_credits: 0.005 });
          }
        } catch (e) {
          cascade.push({ step: 'twilio_lookup', status: 'error', detail: (e as Error).message });
        }
      }
    }

    // ============ FASE B: Validação de email em cascata GRÁTIS ============
    // Cascata: Abstract API (3000/mês) → Hunter Verifier (50/mês) → MailboxLayer (100/mês) → NeverBounce (1000 grátis no signup)
    // Roda só se temos email e ele não foi explicitamente verified pela origem
    if (result.email && result.email_confidence !== 'verified') {
      const validators: Array<{ key: string; envKey: string; toggle?: keyof Settings; cost: number; fn: (email: string, k: string) => Promise<{ status: 'verified' | 'risky' | 'invalid' | 'unknown'; detail?: string }> }> = [
        {
          key: 'abstract_validate', envKey: 'ABSTRACT_EMAIL_API_KEY', cost: 0,
          fn: async (email, k) => {
            const r = await fetch(`https://emailvalidation.abstractapi.com/v1/?api_key=${k}&email=${encodeURIComponent(email)}`);
            if (!r.ok) return { status: 'unknown', detail: `${r.status}` };
            const j = await r.json();
            const deliverability = j?.deliverability; // DELIVERABLE | UNDELIVERABLE | RISKY | UNKNOWN
            const map: any = { DELIVERABLE: 'verified', UNDELIVERABLE: 'invalid', RISKY: 'risky', UNKNOWN: 'unknown' };
            return { status: map[deliverability] ?? 'unknown', detail: deliverability };
          },
        },
        {
          key: 'hunter_verify', envKey: 'HUNTER_API_KEY', cost: 0,
          fn: async (email, k) => {
            const r = await fetch(`https://api.hunter.io/v2/email-verifier?email=${encodeURIComponent(email)}&api_key=${k}`);
            if (!r.ok) return { status: 'unknown', detail: `${r.status}` };
            const j = await r.json();
            const res = j?.data?.result; // deliverable | undeliverable | risky | unknown
            const map: any = { deliverable: 'verified', undeliverable: 'invalid', risky: 'risky', unknown: 'unknown' };
            return { status: map[res] ?? 'unknown', detail: `score ${j?.data?.score}` };
          },
        },
        {
          key: 'mailboxlayer', envKey: 'MAILBOXLAYER_API_KEY', toggle: 'enable_mailboxlayer', cost: 0,
          fn: async (email, k) => {
            const r = await fetch(`https://apilayer.net/api/check?access_key=${k}&email=${encodeURIComponent(email)}&smtp=1&format=1`);
            if (!r.ok) return { status: 'unknown', detail: `${r.status}` };
            const j = await r.json();
            if (j?.format_valid === false) return { status: 'invalid', detail: 'format' };
            if (j?.smtp_check === true && j?.score >= 0.65) return { status: 'verified', detail: `score ${j.score}` };
            if (j?.smtp_check === false) return { status: 'invalid', detail: 'smtp_fail' };
            return { status: 'risky', detail: `score ${j?.score}` };
          },
        },
        {
          key: 'neverbounce', envKey: 'NEVERBOUNCE_API_KEY', toggle: 'enable_neverbounce', cost: 0.008,
          fn: async (email, k) => {
            const r = await fetch(`https://api.neverbounce.com/v4/single/check?key=${k}&email=${encodeURIComponent(email)}`);
            if (!r.ok) return { status: 'unknown', detail: `${r.status}` };
            const j = await r.json();
            const res = j?.result; // valid | invalid | disposable | catchall | unknown
            const map: any = { valid: 'verified', invalid: 'invalid', disposable: 'invalid', catchall: 'risky', unknown: 'unknown' };
            return { status: map[res] ?? 'unknown', detail: res };
          },
        },
      ];

      for (const v of validators) {
        const key = Deno.env.get(v.envKey);
        if (!key) {
          cascade.push({ step: v.key, status: 'skipped', detail: `${v.envKey} ausente` });
          continue;
        }
        if (v.toggle && !(settings as any)[v.toggle]) {
          cascade.push({ step: v.key, status: 'skipped', detail: 'toggle off' });
          continue;
        }
        try {
          const out = await v.fn(result.email!, key);
          if (v.cost > 0) {
            totalCost += v.cost;
            await incrementUsage(admin, account_id, v.key, v.cost);
          }
          cascade.push({ step: v.key, status: out.status === 'unknown' ? 'no_match' : 'ok', source: v.key, detail: out.detail, cost_credits: v.cost });
          if (out.status === 'verified') { result.email_confidence = 'verified'; break; }
          if (out.status === 'invalid') { result.email_confidence = 'invalid'; break; }
          if (out.status === 'risky') { result.email_confidence = 'risky'; /* continua tentando outro validador melhor */ }
        } catch (e) {
          cascade.push({ step: v.key, status: 'error', detail: (e as Error).message });
        }
      }
    }

    result.total_cost_credits = totalCost;

    // ============ Salva no cache ============
    if (result.email || result.phone) {
      const cachePayload: any = {
        account_id,
        linkedin_url: linkedin_url ?? null,
        name_company_hash: hash,
        email: result.email,
        email_confidence: result.email_confidence,
        email_source: result.email_source,
        phone: result.phone,
        phone_source: result.phone_source,
        cascade_log: cascade,
        total_cost_credits: totalCost,
      };
      // Tenta upsert por linkedin_url, senão por hash
      if (linkedin_url) {
        await admin.from('hunting_contact_cache').upsert(cachePayload, { onConflict: 'account_id,linkedin_url' }).select().maybeSingle();
      } else if (hash) {
        await admin.from('hunting_contact_cache').upsert(cachePayload, { onConflict: 'account_id,name_company_hash' }).select().maybeSingle();
      }
    }

    return new Response(JSON.stringify({ success: true, discovery: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('discover-contact error', error);
    return new Response(JSON.stringify({ error: (error as Error).message || 'unknown' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
