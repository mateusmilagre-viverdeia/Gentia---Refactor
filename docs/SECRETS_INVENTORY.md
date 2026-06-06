# Inventário de Secrets — Gentia (validação CSV × código)

> ⚠️ **Este arquivo contém apenas NOMES de variáveis — nunca valores.** Valores
> moram só nos secrets do Supabase / `.env` local.
> Validação feita cruzando o CSV do cliente (`Secrets API KEY.xlsx`) com o que as
> **edge functions realmente leem** (`Deno.env.get(...)` → 54 vars distintas).

**Data:** 2026-06-06 · Destino: `tdyvuomybimgygjgvnrk`.

## Veredito sobre "só as que passei estão em uso"
**Parcialmente verdade.** Das 15 com valor no CSV, **14 são usadas** (salvas). Mas:
- **1 com valor NÃO é usada**: `ELEVENLABS_API_KEY` (nenhuma function a lê — voz usa OpenAI Realtime). Não salva.
- **Há lacunas críticas**: o código usa secrets que estão **vazios** no CSV ou **ausentes** dele — com destaque para **`LOVABLE_API_KEY` (usada por ~90 functions) que veio VAZIA**.

## ✅ Salvas no destino (CSV com valor + usadas no código) — 14
`ANTHROPIC_API_KEY` · `OPENAI_API_KEY` · `PERPLEXITY_API_KEY` · `STRIPE_SECRET_KEY` · `STRIPE_WEBHOOK_SECRET` · `RESEND_API_KEY` · `RESEND_API_KEY_1` · `FIRECRAWL_API_KEY` · `APOLLO_API_KEY` · `APIFY_TOKEN` · `APIFY_API_TOKEN` · `EVABOOT_API_KEY` · `PANDA_VIDEO_API_KEY` · `DISCORD_WEBHOOK_URL`
> Nota: `STRIPE_SECRET_KEY` e `LOVABLE_API_KEY` vinham no CSV com sufixo "Lovable" colado no nome (artefato da planilha) — normalizados.

## ⚠️ CSV tem valor, mas o código NÃO usa — 1 (não salva)
`ELEVENLABS_API_KEY` — provavelmente legado. Confirmar com o cliente se pode descartar.

## 🔴 Usadas no código mas SEM valor / AUSENTES — o cliente precisa fornecer
**Vazias no CSV (nome listado, valor em branco):**
`LOVABLE_API_KEY` 🔥 (~90 functions) · `ZAPI_TOKEN` · `ZAPI_INSTANCE_ID` · `ZAPI_BASE_URL` (WhatsApp) · `TWILIO_ACCOUNT_SID` · `TWILIO_AUTH_TOKEN` · `SNOV_CLIENT_ID` · `SNOV_CLIENT_SECRET` · `HUNTER_API_KEY` · `NEVERBOUNCE_API_KEY` · `GOOGLE_INDEXING_SERVICE_ACCOUNT` · `CRON_SECRET` (hoje com valor de TESTE).

**Nem aparecem no CSV (chaves de terceiros):**
`CLEARBIT_API_KEY` · `CLAY_API_KEY` · `CLAY_WEBHOOK_URL` · `STACKEXCHANGE_KEY` · `GITHUB_TOKEN` (sourcing) · `POSTMARK_INBOUND_TOKEN` · `WHATSAPP_VERIFY_TOKEN` · `APIFY_API_KEY` (3ª variante de Apify usada por 1 function).

## ⚙️ Config de ambiente (URLs) — definir no cutover, não são "secrets"
`SITE_URL` · `PUBLIC_SITE_URL` · `PUBLIC_BASE_URL` · `PUBLIC_APP_URL` · `FRONTEND_URL` · `OUTREACH_INBOUND_DOMAIN` · `LOVABLE_API_URL` · `LOVABLE_AI_GATEWAY_URL` · `LOVABLE_AI_GATEWAY_KEY` · `LOVABLE_SEND_URL`. Apontar para o domínio/destino novos.

## ⚪ Ignorados (vazios no CSV e não usados no código)
`ABSTRACT_EMAIL_API_KEY` · `MAILBOXLAYER_API_KEY` · `ZAPI_WEBHOOK_SECRET`.

## 🧹 Dívidas técnicas detectadas (Frente F / limpeza)
- **Variantes redundantes** de um mesmo provedor no código: Apify (`APIFY_TOKEN` / `APIFY_API_TOKEN` / `APIFY_API_KEY`), Resend (`RESEND_API_KEY` / `RESEND_API_KEY_1`), Lovable (`LOVABLE_API_KEY` / `LOVABLE_AI_GATEWAY_KEY` / `*_URL`). Consolidar num nome só por provedor.
- **`LOVABLE_API_KEY`** é o maior acoplamento (90 functions). É exatamente o alvo da **Frente F** (desacoplar o Lovable Gateway → provedores diretos). Sem essa key, ~90 functions de IA não rodam hoje.

## 🔐 Ações de segurança
- **Rotacionar no go-live** todas as chaves que circularam em planilha/chat.
- Secrets de produção compartilhados (Stripe/Resend/ZAPI) estão agora também no destino — **armazenados, não disparados**. Cuidado ao testar functions com efeito real.
