# Auditoria de Segurança — Gentia (Fase 1)

> Documento vivo. Parte dos entregáveis do contrato (Cláusula 1.3 "a) Segurança":
> *Lista documentada das tabelas revisadas, políticas de RLS ajustadas e riscos remanescentes*).
> Ambiente auditado: **destino `tdyvuomybimgygjgvnrk` (Gentia SP)** — réplica fiel da origem.

**Início:** 2026-06-02 · **Status:** em andamento (RLS concluído; endpoints públicos, service_role e isolamento em sequência)

---

## 1. Metodologia
Auditoria automatizada via `pg_policies`/`pg_tables` (query API HTTPS) sobre as **415 tabelas**, cruzada com leitura do código (frontend + edge functions) para entender o fluxo real de acesso. Severidade: 🔴 Crítico (exposição de dados / PII) · 🟡 Médio (config sensível entre tenants) · 🟢 Baixo (sem exposição efetiva).

## 2. Resumo
| Métrica | Valor |
|---|---|
| Tabelas com RLS habilitado | **415/415 (100%)** ✅ |
| Total de policies | 1.205 |
| Tabelas com RLS **sem nenhuma policy** | 9 (tabelas drift recém-criadas) |
| Policies `USING(true)` | 38 (em 34 tabelas) |
| Policies `USING(true)` expostas a **`anon`** | **10 (8 tabelas)** 🔴 |
| SQL injection | nenhum (supabase-js parametrizado) ✅ |

---

## 3. Achados 🔴 CRÍTICOS

### 3.1 Vazamento de PII via portal de cliente (8 tabelas) — `anon` + `USING(true)`
**Causa raiz:** o portal de cliente (acesso por token) valida o token **só no frontend** (`src/hooks/usePortalAuth.ts`) e depois faz `SELECT` direto nas tabelas filtrando por `cliente_id` **no client** (`src/hooks/usePortalData.ts`). As RLS são `USING(true)`. Como o **anon key é público**, qualquer pessoa pode consultar as tabelas inteiras — sem token, sem filtro.

| Tabela | Exposição | Dado vazado |
|---|---|---|
| `recruitment_candidates` | anon:SELECT | 🔴 **PII de candidatos** (nome, email, telefone, CV, scores) de TODAS as empresas |
| `recruitment_applications` | anon:SELECT | candidaturas e status de TODAS as empresas |
| `recruitment_jobs` | anon:SELECT | vagas (inclusive internas/confidenciais) |
| `clientes_consultoria` | anon:SELECT | carteira de clientes das agências |
| `clientes_contatos` | anon:SELECT | contatos (PII) dos clientes |
| `portal_clientes_acesso` | anon:SELECT + **UPDATE** | tokens de portal de todos os clientes (e escrita!) |
| `portal_feedbacks` | anon:SELECT | feedbacks de candidatos |
| `shortlist_relatorios` | anon:SELECT | relatórios de shortlist |

- **Migration de origem:** `supabase/migrations/20260415184344_*.sql`.
- **Impacto:** vazamento massivo de dados pessoais (risco de LGPD — Cláusula 10.4 do contrato).
- **✅ CORRIGIDO (2026-06-02):** removidas as 10 policies `anon USING(true)` das 8 tabelas — migration `20260602120000_security_fix_portal_anon_leak.sql` (`anon_leaks = 0` confirmado). O acesso público do portal passa a ser **exclusivamente** via edge function **`portal-data`** (deployada, `verify_jwt=false`), que valida o token no servidor (service_role) e devolve **apenas** os dados do cliente daquele token. O acesso **autenticado** do app foi preservado (`recruitment_candidates` manteve 6 policies).
- **⏳ Pendente (fora do escopo — refatoração de front):** reativar o portal no frontend para chamar `portal-data` (ver §7). O portal já estava quebrado (front pedia colunas inexistentes no schema atual).

### 3.2 `culture_interview_criteria_evaluations` — `public:ALL`
Policy `USING(true)` para o role `public` (inclui anon) com comando **ALL** → qualquer um pode **ler e escrever** avaliações de critérios de entrevista de cultura. **Correção:** restringir a `account_members` (leitura) e `service_role` (escrita).

---

## 4. Achados 🟡 MÉDIOS

### 4.1 Config de negócio sensível compartilhada entre tenants (`authenticated:SELECT`)
`market_research_prompts`, `market_research_model_config`, `platform_credit_config`, `feature_llm_mapping` — expostas a **todos** os usuários autenticados (qualquer tenant). Revelam **prompts proprietários** e **margens/preços de crédito**. **Correção:** restringir a super_admin/serviço; o que o front precisa, servir via RPC com o subconjunto seguro.
> Catálogos legítimos (OK, não sensíveis): `badges`, `survey_benchmarks`, `courses`, `lessons`, `modules`, `culture_code_templates`, `onboarding_templates*`, `qa_questions`.

### 4.2 9 tabelas drift com RLS sem policy
`ep_partners`, `partner_client_grants`, `partner_licenses`, `partner_royalties`, `platform_seat_pricing`, `platform_subscription_plans`, `promo_code_redemptions`, `recruitment_package_features`, `whatsapp_message_logs` — habilitei RLS na reconstrução, mas faltam policies (hoje só acessíveis via service_role). **Correção:** criar policies adequadas (a maioria é config de plataforma → super_admin/serviço; `ep_partners` por `user_id`).

---

## 5. Plano de correção (priorizado)
1. ✅ **Portal por token** (3.1) — **FEITO (banco)**: 10 policies anon removidas + function `portal-data` deployada. Front pendente (§7).
2. 🔴 **`culture_interview_criteria_evaluations`** (3.2) — recriar policies. *(próximo)*
3. 🟡 **Config sensível entre tenants** (4.1) — restringir.
4. 🟡 **Policies das 9 tabelas drift** (4.2).
5. Auditoria dos **85 endpoints públicos** (`verify_jwt=false`).
6. Teste prático de **isolamento multi-tenant** (com tenants fake).

## 6. Riscos remanescentes
- **Portal no frontend não-funcional** até a integração da §7 (mas já estava quebrado — risco de funcionalidade, não de segurança).
- _(demais a preencher conforme as correções avançam)_

## 7. Guia de integração do front do portal (refatoração — fora do escopo Fase 1)
Para reativar o portal usando a function segura `portal-data` (já deployada):
1. **`src/hooks/usePortalAuth.ts`** → trocar o `SELECT` direto por `supabase.functions.invoke('portal-data', { body: { token, resource: 'auth' } })`; incluir o `token` no `PortalAuthData`.
2. **`src/hooks/usePortalData.ts`** → cada hook chama `portal-data` com `{ token, resource, params }` (`jobs`, `candidates`, `shortlist`+`params.jobId`, `feedbacks`, `submit_feedback`). Mudar assinatura de `clienteId`/`jobId` para `token` (+ `jobId`).
3. **Componentes** (`PortalDashboard`, `PortalShortlistView`, `ClientPortalPage`) → passar `auth.token` aos hooks no lugar de `auth.client.id`.
4. **`src/hooks/usePortalJobsRealtime.ts`** → realtime dependia de RLS anon (removido); trocar por polling via `portal-data` ou reavaliar.
5. **Campos legados** (`qualification_*`, `current_company`, `city`, `strengths`, `concerns`) vêm `null`/`[]` da function — UI deve parar de exibi-los ou remapeá-los às fontes atuais numa evolução futura.

## 8. Endpoints públicos (`verify_jwt=false`) — auditoria
Dos **64 endpoints públicos**, a categorização + leitura de código classificou:
- **41 legitimamente protegidos**: token-based (19), cron-like (13), valida-auth (5), webhook assinado (1), public-data (3).
- **23 revisados em profundidade**, destes:
  - 🔴 **3 ALTO RISCO — CORRIGIDOS (2026-06-02):** `firecrawl-scrape`, `firecrawl-search`, `help-assistant` chamavam API paga / LLM **sem validar o chamador** (abuso de custo por qualquer anônimo com o anon key público). Adicionado helper **`supabase/functions/_shared/require-caller.ts`** (exige usuário autenticado **ou** service_role) e aplicado nas 3 — deployados. A chamada interna `start-technical-session → firecrawl-search` usa service_role (continua funcionando).
  - 🟡 **3 MÉDIO — documentados (recomendação):** `outreach-webhook-receiver` (webhook Z-API sem validação de assinatura HMAC → adicionar verificação de assinatura), `send-rejection-whatsapp` (não valida que job/candidato pertencem ao chamador antes de gerar mensagem com IA → exigir contexto autenticado), `check-email-domain-organization` (rate-limit por IP falsificável via `x-forwarded-for`).
  - 17 adequadamente protegidos (token de sessão de entrevista, validação cruzada, etc.).
