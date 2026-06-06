# CLAUDE.md — Projeto Gentia (Refactor / Auditoria de Backend & IA)

> Documento-mestre de contexto. Lido em toda sessão. Mantenha atualizado conforme o trabalho avança.
> Idioma de trabalho com o cliente/dono do projeto: **Português (PT-BR)**.

---

## 1. Contexto do Engajamento (o "porquê")

Este é um projeto de **um cliente** que contratou uma **revisão e refatoração completa do backend**, com foco em segurança, performance, migração de infraestrutura e racionalização do uso de IA.

O produto (**Gentia**) foi originalmente construído no **Lovable + Lovable Cloud**. O objetivo do engajamento é **profissionalizar e escalar** essa base.

### Objetivos do cliente (escopo macro)
1. **Revisar todo o backend** — qualidade de código, organização, dívida técnica.
2. **Melhorar queries** — performance, índices, N+1, RLS eficiente.
3. **Garantir segurança (cyber)** — RLS, secrets, JWT, superfície de ataque, hardening.
4. **Migrar de Lovable Cloud → Supabase próprio** — sair da infra gerenciada do Lovable para um Supabase dedicado, com **escala de servidor**.
5. **Auditar a IA do projeto** — o produto usa MUITA IA. Produzir um **relatório de IA** com inventário de uso, custos atuais e **alternativas de preço/provedor** (ex.: usar **Anthropic/Claude**, modelos mais baratos por tarefa, batching, etc.).

---

## 2. Escopo de Trabalho — Checklist Vivo

> Atualizar status conforme avançamos. (`[ ]` pendente · `[~]` em andamento · `[x]` concluído)

- [x] **Segurança backend** (Frente A ✅): RLS em 415/415 tabelas (com policy), vazamento de PII do portal fechado, endpoints públicos auditados (3 de alto risco corrigidos), isolamento multi-tenant provado. Ver §8.5 "Frente A" e `docs/SECURITY_AUDIT.md`. _(Revisão fina de `service_role` por função e auditoria de secrets vazados ocorre no cutover, com os secrets reais.)_
- [~] **Performance/queries** (Frente C): RLS InitPlan otimizado (1090 policies), 206 índices de FK criados, 46 redundâncias removidas (advisor 2664→1476). Planos/queries pesadas e `unused_index` dependem de tráfego real → cutover. Ver `docs/PERFORMANCE_AUDIT.md`.
- [ ] **Migração Lovable Cloud → Supabase dedicado**: migrar schema (477 migrations), 284 edge functions, secrets, storage, auth, cron jobs; validar paridade.
- [ ] **Escala/infra**: dimensionar instância, connection pooling (pgbouncer/supavisor), limites, observabilidade.
- [ ] **Auditoria de IA**: inventário de chamadas, modelos por feature, custo estimado, e **proposta de alternativas** (Anthropic, modelos econômicos, caching, batch).
- [ ] **Desacoplar do Lovable AI Gateway** (ver §6 — risco central da migração).
- [ ] **Trocar refs/URLs hardcoded** de `axumduklmiiptumdsgtu` (16 ocorrências: `chrome-extension/manifest.json`, `src/pages/careers/*`, `src/hooks/useJobDistribution.ts`) pelo novo backend ou pelas envs `VITE_SUPABASE_*`.

---

## 3. Visão Geral do Produto

**Gentia** é uma plataforma SaaS de **RH / People Tech** com forte automação por IA. Áreas funcionais identificadas no código:

- **Recrutamento & Hunting** — busca/sourcing de candidatos (GitHub, StackOverflow, LinkedIn via Apify, Clay, Evaboot, Apollo, Hunter), enriquecimento de perfis, ranking, crossmatch, talent pool, outreach automatizado (email/WhatsApp).
- **Entrevistas por IA** — entrevistas técnicas e de cultura, inclusive **por voz** (OpenAI Realtime), transcrição, avaliação automática, watchdog/heartbeat de sessão.
- **Cultura Organizacional** — culture code, DISC, pulse/clima (com anonimização), missão/visão/valores, rituais, maturidade de time, NPS, offboarding.
- **Billing & Créditos** — Stripe (checkout, portal, webhooks, seats, royalties) + sistema de créditos consumidos por uso de IA, auto-recarga, simuladores de preço.
- **Admin/Plataforma** — painel de pricing de LLM, configs de IA, health de contas, relatórios financeiros.
- **Extensão Chrome** — captura de perfis (`chrome-extension/`).

---

## 4. Stack Técnica

| Camada | Tecnologias |
|---|---|
| **Frontend** | Vite, React 18, TypeScript, shadcn-ui (Radix), Tailwind, React Query (`@tanstack`), Zustand, React Router, React Hook Form + Zod |
| **Backend** | Supabase (Postgres + Auth + Storage + Edge Functions em Deno) |
| **Edge Functions** | **284 funções** em `supabase/functions/` (Deno/TypeScript) |
| **Migrations** | **477 migrations** em `supabase/migrations/` |
| **Pagamentos** | Stripe |
| **Comunicação** | Resend (email), WhatsApp via Z-API, Discord webhooks |
| **IA** | Lovable AI Gateway, Google Gemini, OpenAI (inc. Realtime/voz), Anthropic Claude, embeddings/busca semântica (pgvector) |
| **Sourcing/Enriquecimento** | Apify, Firecrawl, Clay, Apollo, Hunter, Evaboot, NeverBounce, Snov, Clearbit |
| **Testes** | Playwright (e2e em `e2e/`) |
| **Origem** | Projeto Lovable: `03bda7c9-1064-4da9-93d3-180a6fc61a83` |

---

## 5. Backend Supabase — Estado Atual

- **Supabase de ORIGEM (Lovable Cloud)** — `project_id = axumduklmiiptumdsgtu` (ver `supabase/config.toml`).
- **284 edge functions**, **477 migrations**.
- `verify_jwt` é configurado por função em `config.toml` — **vários endpoints públicos** (`verify_jwt = false`); auditar quais legitimamente precisam ser públicos.

### Secrets/env mais usados nas edge functions
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (usado em ~180 funções — **alta superfície**), `SUPABASE_ANON_KEY`, `LOVABLE_API_KEY` (~90 refs), `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `CRON_SECRET`, `OPENAI_API_KEY`, `ZAPI_*` (WhatsApp), `FIRECRAWL_API_KEY`, `APOLLO_API_KEY`, `APIFY_*`, `CLEARBIT_API_KEY`, `HUNTER_API_KEY`, `EVABOOT_API_KEY`, `SNOV_*`, `TWILIO_*`, `PANDA_VIDEO_API_KEY`, `GITHUB_TOKEN`, `DISCORD_WEBHOOK_URL`, `SITE_URL`/`PUBLIC_SITE_URL`.

> ⚠️ **Nunca** colar valores reais de secrets neste arquivo (ele vai pro Git). Apenas nomes/refs.

---

## 6. Camada de IA — CRÍTICO para a migração

A IA é central no produto e é o **maior ponto de atenção da migração**.

### Provedor dominante hoje: **Lovable AI Gateway** (`LOVABLE_API_KEY`)
- Usado em **~120 arquivos** de edge functions.
- É o gateway gerenciado do Lovable que dá acesso a Gemini/GPT.
- 🔴 **Ao sair do Lovable Cloud, esse gateway deixa de existir.** Toda chamada via `LOVABLE_API_KEY` precisa ser **reapontada** para um provedor direto (OpenAI / Anthropic / Google) ou um gateway próprio (ex.: OpenRouter, ou SDK direto). **Este é o item de maior esforço/risco da migração.**

### Modelos em uso (por frequência no código)
- **Google Gemini (dominante)**: `gemini-2.5-flash` (~89), `gemini-3-flash-preview`, `gemini-2.5-flash-lite`, `gemini-2.5-pro`, `gemini-3-pro-preview`, `gemini-3.1-*-preview`.
- **OpenAI**: `gpt-5`, `gpt-5-mini`, `gpt-5-nano`, `gpt-5.2`, `gpt-4o`/`gpt-4o-mini`; **voz/Realtime**: `gpt-realtime`, `gpt-realtime-mini`, `gpt-4o-realtime-preview`, `gpt-4o-mini-transcribe`.
- **Anthropic**: `claude-sonnet-4-5`, `claude-opus-4` (já presentes em ~4 arquivos — base para expandir).
- **Embeddings**: `text-embedding-004` (Google), `text-embedding-3-small`/`-3-large` (OpenAI), `gemini-embedding-001` → busca semântica com pgvector.

### Onde a IA é usada (clusters)
- **Entrevistas por voz** (~18 funções `*realtime*`, `culture-interview-*`, `technical-interview-*`).
- **Geração de conteúdo** (`generate-*`: propostas, job descriptions, ICP, slides de culture code, ROI, etc.).
- **Análise/avaliação** (`analyze-*`, `audit-*`, `compute-quality-scores`, `screening-evaluate`).
- **Hunting/enriquecimento** (`hunting-*`, `enrich-*`) — sourcing + LLM rerank.
- **Busca semântica** (`generate-embedding`, `semantic-search-candidates`).

### Infra de custo/billing de IA já existente (reaproveitar na auditoria)
- Edge functions: `ai-billing-monitor`, `audit-ai-billing`, `validate-ai-billing`, `run-billing-audit`, `monitor-llm-pricing`, `monthly-llm-cost-report`, `llm-batch-dispatcher`, `poll-llm-batch-jobs`.
- Scripts: `scripts/check-ai-billing.ts`, `scripts/audit-voice-interview-billing.ts`, `scripts/check-llm-mapping.ts`.
- Admin UI de pricing: `src/components/admin/pricing/*` (LLM costs, margin matrix, model prices, simuladores).

### Direção pedida pelo cliente
Apresentar **alternativas de preço por provedor** — incluindo **Anthropic/Claude** — e por tarefa (escolher o modelo mais barato que atende a qualidade), além de técnicas de redução de custo (prompt caching, batch API, downgrade de modelo em tarefas simples, embeddings mais baratos).

---

## 7. Segurança — Estado Atual

Já existe trabalho prévio documentado em [`docs/SECURITY.md`](docs/SECURITY.md) (Fases 1–4):
- ErrorBoundary global + logger condicional (suprime logs em prod).
- Correções de **RLS** em tabelas sensíveis (`culture_interview_responses`, `employees`, `recruitment_candidates`, `talent_pool`, `profiles`) + views seguras (`employees_public`, `profiles_public_safe`).
- `search_path` imutável em funções de trigger.
- Mitigação de de-anonimização de pulse (threshold de 5 membros, view agregada).
- Pendência conhecida: **Leaked Password Protection** (habilitar manualmente no Auth).

> Este trabalho prévio é ponto de partida — **não** é a auditoria completa pedida. Reauditar tudo no contexto da migração (esp. `service_role` em ~180 funções e endpoints `verify_jwt=false`).

---

## 8. Conexões e Ambientes  ⚙️

> ⚠️ Guardar **apenas identificadores não-secretos** aqui (project ref, URL, nome do repo). Chaves/tokens vão para secrets do Supabase / `.env` local — **nunca** neste arquivo versionado.

### Git
- **Repositório de trabalho:** `https://github.com/mateusmilagre-viverdeia/Gentia---Refactor` (conta do dono; é o `origin` deste worktree, branch `main`). **Origem e destino do versionamento são o MESMO repo** — o refactor é versionado aqui.
  - ✅ **Push validado** (token fine-grained no `.env`, testado via `git push --dry-run` em 2026-06-01). `gh` CLI não instalado, mas dispensável (uso `git` + token via askpass efêmero, **sem** persistir no `.git/config`).
  - ⚠️ Esse token foi **exposto no chat** → **rotacionar** assim que estabilizar.
- ~~`ecpmais/culturecode`~~ — **descartado** (era engano; conta de terceiro, 404 sem acesso). O produto ainda é chamado "culture code" (logos `ep-partners` em `src/assets/`), mas o código mora no repo acima.

### Supabase
- **Conta/Org:** **"EP Partners PRO"** (`ketdvcuiagjnkxkqcmry`) — org do cliente (EP Partners), plano **Pro**. Operar via **Supabase CLI + access token** (no `.env`), *não* pelo MCP da org `viverdeia`.
- **DESTINO ✅ criado:** **"Gentia SP"** — ref **`tdyvuomybimgygjgvnrk`**, **sa-east-1 (São Paulo)**, PG17, compute **Small** (`ci_small`, 2GB RAM, ~$15/mês), `ACTIVE_HEALTHY` (2026-06-01). Banco vazio, a popular pela migração. Connection strings + senha (gerada localmente, nunca no chat) no `.env`. Compute alterado via `PATCH /v1/projects/{ref}/billing/addons`.
  - Projeto **"Gentia"/Oregon (`hcupedlkavszvevavufx`)** — criado por engano em West US; vazio, **a descartar** após validar o de SP (depois renomear "Gentia SP" → "Gentia").
- **ORIGEM (Lovable Cloud) ✅ confirmada = `axumduklmiiptumdsgtu`** (16 refs no repo: `config.toml`, `chrome-extension/manifest.json`, `src/pages/careers/*`, `src/hooks/useJobDistribution.ts`).
  - ⚠️ **Token da EP Partners NÃO acessa** esse projeto (é gerido pelo Lovable) → preciso da **connection string do banco de origem** (pegar no Lovable Cloud) p/ `pg_dump` de schema + dados. Schema/functions já estão no repo; faltam **dados, secrets, Auth e Storage**.
  - ❌ O **"Lovable Project"** (`vbwsxzpsmjjyztojhhhz`) na org EP Partners **NÃO é a origem** (não aparece no repo) — **não tocar**.

> ❗ **Regra de segurança operacional**: confirmar SEMPRE em qual ambiente (origem vs destino) uma ação roda antes de executar migrations, deploy de functions ou `execute_sql`. Não rodar nada destrutivo sem confirmação explícita do dono.

### Higiene de repositório (corrigido em 2026-06-01)
- **Não havia `.gitignore`** no projeto → criado (protege `.env`, `node_modules`, build, etc.). **Risco:** qualquer `.env` criado antes disso iria para o Git.
- **`.env.example`** criado na raiz = inventário completo de variáveis/secrets (frontend + edge functions), sem valores.

---

## 8.5 Progresso da Migração (LOG VIVO)

### Fase 1 — Schema ✅ **COMPLETA** (replay das 477 migrations no DESTINO `tdyvuomybimgygjgvnrk`)
- **415 tabelas, 4 views, 274 funções, 37 enums, 481 migrations aplicadas; RLS em 100% das tabelas.** Paridade com o schema real (`types.ts`): **0 drift de tabela e 0 de coluna** confirmado via `scripts/check_column_drift.ts` (faltava só `recruitment_credit_costs.usage_unit`, adicionada). (2026-06-02)
- **Auditoria de segurança iniciada** → `docs/SECURITY_AUDIT.md`. Achado 🔴 crítico: portal de cliente com 8 tabelas expostas a `anon` (PII de candidatos). Achado secundário: hook do portal (`src/hooks/usePortalData.ts`) usa colunas inexistentes → bug pré-existente do front (não drift).
- **Schema drift do Lovable** (objetos criados na origem fora de migration) — diagnosticado comparando `src/integrations/supabase/types.ts` (schema real) com as migrations:
  - **11 tabelas** (módulo franquias/billing): `ep_partners`, `partner_client_grants`, `partner_licenses`, `partner_royalties`, `platform_seat_pricing`, `platform_subscription_plans`, `promo_code_redemptions`, `recruitment_headcount_plan`, `recruitment_package_features`, `recruitment_source_spend`, `whatsapp_message_logs`.
  - **função `has_role`** (RBAC) + **extensão `unaccent`**.
- Fixes **versionados** em `supabase/migrations/20260114235730..235735_fix_drift_*.sql`.
- Gerador: **`scripts/gen_drift_tables.ts`** (rodar com **bun**, não deno) reconstrói as tabelas drift a partir do `types.ts`.
- ⚠️ Pendência: refinar **tipos** das tabelas drift na fase de dados (ex.: `stripe_*_id` é `text`, o gerador inferiu `uuid`).

### Fase 2 — Edge Functions ✅ **COMPLETA**
- **283/283 functions deployadas** no destino via `supabase functions deploy` (bulk; **sem Docker** — bundler nativo). Confirmado via API `GET /v1/projects/<ref>/functions`. (2026-06-02)
- ⚠️ Deployadas ≠ funcionais: ainda faltam **secrets** (Fase 3) e **dados** (Fase 4) para rodarem de fato.

### Frente A — Segurança ✅ **COMPLETA** (escopo do contrato, sobre dados fake no DESTINO)
> Execução do entregável "a) Segurança". Auditoria completa em `docs/SECURITY_AUDIT.md`; runbook em `docs/RUNBOOK_INCIDENTES.md`.
- **RLS**: 415/415 tabelas com RLS habilitado **e** com policy (`rls_sem_policy=0` global).
- **🔴 Vazamento de PII do portal** corrigido: 10 policies `anon USING(true)` em 8 tabelas removidas (`20260602120000`). Portal público agora só via edge function **`portal-data`** (valida token no servidor, service_role, devolve só os dados daquele cliente). Refatoração do front documentada (auditoria §7) — fora do escopo Fase 1.
- **🔴** `culture_interview_criteria_evaluations` (`public:ALL`) removido (`20260602130000`); prompts/config de IA sensíveis restringidos a super_admin (`20260602140000`).
- **🟡** 9 tabelas drift sem policy → policies de SELECT (`20260602150000`).
- **Endpoints públicos** (`verify_jwt=false`) auditados: 3 de ALTO risco (abuso de custo — `firecrawl-scrape/search`, `help-assistant`) corrigidos com helper `_shared/require-caller.ts`; 3 de risco MÉDIO documentados.
- **Isolamento multi-tenant PROVADO** (auditoria §9): RLS testada via `set local role authenticated` + `request.jwt.claims` com 2 tenants fake. Leitura **e** escrita isoladas; cross-tenant bloqueado (`ERROR 42501`). Dados de teste removidos.
- **Validado com o Supabase Advisor oficial** (REST, token EP Partners — o MCP é da org `viverdeia`, sem permissão). Revelou achados que a varredura manual não pegou: 🔴 **`employees_public`** (view SECURITY DEFINER + grant anon → vazava PII de funcionários, sem filtro de tenant) e `v_voice_interview_health_24h` → `security_invoker=true` + revoke anon (`20260602160000`); 🟡 **bucket `candidate-files`** (CVs/avatares) era público → privado + signed URLs no front (`20260602170000` + `src/lib/storageUrl.ts`, `MinhaBiografia`/`CandidateDetailsModal`); 6 funções `search_path` mutável fixadas. **Advisor segurança: 2 ERROR → 0.**
- Commits: `176b594`, `e9440f3`, `c265913`, `3b2e833`, `b8b1d7c`, `cd14ce9`.
- ⏳ Pendências documentadas (não-críticas, para o cutover): front do portal e do marketplace (signed URLs); endurecer INSERT público `WITH CHECK(true)`; revisar 140 funções definer executáveis por anon.

### Frente C — Banco de Dados / Performance ✅ **COMPLETA** (parte sem dados reais)
> Entregável "c) Banco de Dados". Relatório: `docs/PERFORMANCE_AUDIT.md`. Advisor performance: **2664 → 1476 lints**.
- **RLS InitPlan** (maior ganho): `auth.uid()`/`role`/`jwt`/`current_setting` → `(select …)` em **1090 policies** (`auth_rls_initplan` 1088→0). Semântica preservada — **isolamento re-testado** (idêntico). Migrations `20260602190000/190001`.
- **206 índices** criados em FKs de domínio sem cobertura (`unindexed_foreign_keys` 236→30; restantes = auditoria `auth.users`, por decisão). Migration `20260602180000`.
- **46 redundâncias** removidas (45 índices + 1 constraint; `duplicate_index` 7→0), **preservando índices parciais distintos** (`is_test` true/false — um falso-positivo evitado). Migrations `20260602200000/200001`.
- ⏳ Para o cutover (dependem de tráfego real): `multiple_permissive_policies` (848, consolidar nas tabelas quentes), `unused_index` (reavaliar com `pg_stat_user_indexes` + habilitar `pg_stat_statements`). Plano de escala 12 meses no relatório.
- Commits: `4471121`, `8d20df9`, `a8c55dc`, `92a5b81`, `442ffe7`.

### Frente B — Observabilidade ✅ **COMPLETA** (parte sem dados reais)
> Entregável "b) Observabilidade". Doc: `docs/OBSERVABILITY.md`. Reaproveita a infra existente (logger, `ai_execution_logs`, 6 crons pg_cron, alertas de domínio, Discord) e adiciona a camada **operacional**.
- **Métricas de IA**: views `v_ops_ai_*` (custo/dia, p95+erro% por função, por modelo, erros recentes) + RPC **`ops_ai_metrics(days)`** (super_admin) — `20260603120000`. Validado com dados fake.
- **Monitor + alertas**: tabela **`ops_alerts`** (`20260603130000`) + edge function **`ops-health-monitor`** (deployada): detecta custo de IA 24h > teto, taxa de erro alta, funções com muitas falhas → grava + Discord. **Validado e2e** (auth via `x-cron-secret`/service_role; 401 sem secret).
- **Log estruturado**: `_shared/structured-log.ts` (`fnLogger`, JSON, sem PII) para Log Drains.
- Commits: `b6de466`, `8748266`, `2e87aa5`.
- ⚠️ **Cutover**: os 6 crons + (a agendar) o `ops-health-monitor` apontam/apontarão para URL+keys que mudam; `CRON_SECRET` está com valor de TESTE (rotacionar). Checklist completo no doc.
- ⏳ **Próximas frentes**: E) Infra/Escala (pooling Supavisor, compute) → F) LLMs (inventário + Anthropic + desacoplar Lovable Gateway) → D) Backup/DR.

### Conectividade (IMPORTANTE)
- `psql` DIRECT (`db.<ref>.supabase.co`) tem **DNS/IPv6 intermitente** → para inspeção use a **query API HTTPS**: `POST https://api.supabase.com/v1/projects/<ref>/database/query` (estável). Para migrations, `supabase db push`.
- pg tools instaladas em `/opt/homebrew/opt/libpq/bin` (psql/pg_dump **18.4**). Runtimes JS: **bun** + node (deno ausente).

### ⚠️ Divergência de branch + sync do Lovable (2026-06-06)
- **`origin/main` divergiu da refatoração**: `main` = `b3808f3` (início) + commits do **Lovable** (produção continua lá); minha branch `claude/silly-mccarthy-8c0c30` = `b3808f3` + toda a refatoração (Frentes A/B/C). Merge-base = `b3808f3`. **No cutover, reconciliar main (Lovable) × refactor.**
- **Sync aplicado** do commit `07647c9` ("fix: function"): trazidos só os **arquivos de backend Supabase** (sem clobber das minhas functions) e deployados no destino — commit `4014971`. Conteúdo: `_shared/resolveCulturalAgent.ts` (novo) + **14 edge functions** (seats/checkout, culture-interview-*, interview-conductor/watchdog, detect-voice-anomalies…) v3 ACTIVE; migration `20260605135702` = **data-fix de DISC** (no-op no destino, não é RPC/schema). Deps de schema (9 tabelas) verificadas OK. **Front-end do 07647c9 (20 arquivos) NÃO trazido** (fora do pedido).
- ⚠️ **Secrets de runtime ausentes no destino**: só os 8 padrão + `CRON_SECRET` (teste). Functions que chamam APIs externas (Stripe em `create-seats-checkout`, LLM em `culture-interview-*`) deployam mas **dão erro até configurar os secrets** (Stripe/LLM/etc.) — passo do cutover.

## 9. Comandos Úteis

```sh
# Dev
npm run dev            # Vite dev server
npm run build          # build de produção
npm run lint           # eslint

# Auditoria de billing de IA (Deno)
npm run check:ai-billing            # scripts/check-ai-billing.ts
deno run --allow-read scripts/check-llm-mapping.ts

# Testes e2e
npx playwright test    # e2e/ (Playwright)

# Supabase (após CLI configurada para o projeto de DESTINO)
supabase functions list
supabase migration list
supabase db diff
```

---

## 10. Convenções e Regras de Trabalho (para o Claude)

1. **Idioma**: responder em **PT-BR** com o dono do projeto.
2. **Ambiente correto**: antes de qualquer migration/deploy/SQL, confirmar se é **origem** ou **destino** (§8). Nunca rodar destrutivo sem OK explícito.
3. **Secrets**: jamais escrever valores reais de chaves/tokens em arquivos versionados. Usar secrets do Supabase / `.env`.
4. **Migração da IA**: toda mudança que toca `LOVABLE_API_KEY` precisa de plano de substituição de provedor (§6).
5. **Segurança primeiro**: ao tocar edge functions, validar JWT/uso de `service_role`; ao tocar tabelas, validar RLS.
6. **Documentar**: decisões relevantes da auditoria/migração entram aqui ou em `docs/`.
7. **Escopo grande**: 284 functions + 477 migrations — preferir mapeamento/auditoria em lote (agentes/varreduras) antes de editar caso a caso.
8. **📋 Checklist de entrega (REGRA FIXA)**: o contrato (Fase 1) e seus entregáveis estão rastreados em **`docs/ENTREGA_CHECKLIST.md`** — fonte da verdade do aceite. **Sempre consultar antes de planejar** e **atualizar o status do(s) item(ns) correspondente(s) ao concluir qualquer trabalho** (frentes a–f, entregáveis g, critérios h). Não fazer nada da lista §i (fora do escopo) sem proposta apartada. Cada frente concluída → marcar `[x]` + evidência (arquivo/migration/commit).

---

*Última atualização: 2026-06-06 — Criado o checklist-mestre de entrega `docs/ENTREGA_CHECKLIST.md` (regra §10.8) mapeando todo o contrato. Status: Frentes A (Segurança) ✅, B (Observabilidade) ✅, C (Banco/Performance) 🟡 núcleo feito. Pendentes: D (Backup), E (Infra/Escala), F (LLMs). Secrets do cliente validados e 14 salvos no destino (`docs/SECRETS_INVENTORY.md`). Sync do Lovable (07647c9) integrado (front+back). Próximo foco: **Frente F — IA/custos/Claude**.*
