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

- [ ] **Segurança backend**: auditoria de RLS (todas as tabelas), políticas `USING(true)`, uso de `service_role`, validação de JWT em edge functions, exposição de dados sensíveis, secrets vazados.
- [ ] **Performance/queries**: índices, planos de execução, queries pesadas, paginação, N+1, views materializadas.
- [ ] **Migração Lovable Cloud → Supabase dedicado**: migrar schema (477 migrations), 284 edge functions, secrets, storage, auth, cron jobs; validar paridade.
- [ ] **Escala/infra**: dimensionar instância, connection pooling (pgbouncer/supavisor), limites, observabilidade.
- [ ] **Auditoria de IA**: inventário de chamadas, modelos por feature, custo estimado, e **proposta de alternativas** (Anthropic, modelos econômicos, caching, batch).
- [ ] **Desacoplar do Lovable AI Gateway** (ver §6 — risco central da migração).

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
- **ORIGEM:** `https://github.com/mateusmilagre-viverdeia/Gentia---Refactor` (branch `main`) — cópia atual exportada do Lovable; é onde estamos trabalhando.
- **DESTINO:** `https://github.com/ecpmais/culturecode` — repo do cliente (**EP / "ecpmais"**; o produto também é chamado **"culture code"**, ver logos `ep-partners` em `src/assets/`).

### Supabase
- **ORIGEM (Lovable Cloud):** project ref `axumduklmiiptumdsgtu`.
  - ⚠️ **Não está acessível pelo MCP conectado** (fica na infra/conta do Lovable). Schema e functions, porém, **já estão neste repo** (`supabase/migrations` + `supabase/functions`) → dá pra reconstruir o destino sem depender do Lovable. Falta da origem: **dados de produção, secrets, config de Auth e arquivos de Storage**.
- **DESTINO (novo, dedicado):** projeto **já criado pelo dono numa OUTRA conta Supabase** (≠ org `viverdeia` à qual o MCP atual está conectado). Dono fornece **project ref + URL + keys + Personal Access Token**.
  - ⚠️ Como está em outra conta, o **MCP atual não alcança** o destino → operar via **Supabase CLI + PAT** (`SUPABASE_ACCESS_TOKEN`) por Bash, ou reconfigurar o MCP para essa conta.
  - Estado do destino: **banco limpo**. Decisão do dono: **migrar tudo** da origem (schema + functions + dados + secrets + Auth + Storage) → paridade total.
  - Project ref / URL: `__________` (a fornecer).

> ❗ **Regra de segurança operacional**: confirmar SEMPRE em qual ambiente (origem vs destino) uma ação roda antes de executar migrations, deploy de functions ou `execute_sql`. Não rodar nada destrutivo sem confirmação explícita do dono.

### Higiene de repositório (corrigido em 2026-06-01)
- **Não havia `.gitignore`** no projeto → criado (protege `.env`, `node_modules`, build, etc.). **Risco:** qualquer `.env` criado antes disso iria para o Git.
- **`.env.example`** criado na raiz = inventário completo de variáveis/secrets (frontend + edge functions), sem valores.

---

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

---

*Última atualização: 2026-06-01 — criação inicial do documento de contexto.*
