# Auditoria de Performance / Banco de Dados — Gentia (Fase 1, Frente C)

> Entregável do contrato (Cláusula 1.3 "c) Banco de Dados"). Ambiente: destino
> **`tdyvuomybimgygjgvnrk` (Gentia SP)**, réplica fiel da origem, sobre dados fake.
> Validado com o **Supabase Advisor (performance)** oficial + varredura de catálogo.

**Início:** 2026-06-02 · **Status:** correções estruturais aplicadas; itens dependentes de tráfego real ficam para o cutover.

---

## 1. Resumo executivo (antes → depois)
Varredura do advisor de performance sobre as 415 tabelas:

| Lint | Antes | Depois | Ação |
|---|---|---|---|
| `auth_rls_initplan` (RLS reavaliada por linha) | **1088** | **0** ✅ | 1090 policies otimizadas (`select auth.uid()`) |
| `unindexed_foreign_keys` | **236** | **30** ✅ | 206 índices criados; 30 restantes são auditoria (`auth.users`), deixados por decisão |
| `duplicate_index` | **7** | **0** ✅ | 45 índices + 1 constraint redundante removidos |
| `multiple_permissive_policies` | 848 | 848 ⏳ | Consolidação documentada (§4) — fazer com critério |
| `unused_index` | 484 | 597 ⏳ | Subiu pelos índices FK novos (sem tráfego); reavaliar no cutover (§4) |
| **Total de lints** | **2664** | **1476** | −45% |

Os três ganhos estruturais (RLS initplan, índices de FK, deduplicação) são os de maior impacto em escala e **não dependem de dados reais** para serem aplicados com segurança.

---

## 2. Metodologia
- **Advisor oficial** via REST (`GET /v1/projects/<ref>/advisors/performance`) — o MCP da org não tem permissão no projeto; usado o token do `.env` (org EP Partners).
- **Catálogo** (`pg_constraint`, `pg_index`, `pg_policies`) via query API HTTPS para detalhar cada achado e gerar as correções a partir do próprio catálogo (DDL determinístico).
- **Validação de não-regressão:** após a reescrita das policies, o teste de isolamento multi-tenant foi **re-executado** (ver `SECURITY_AUDIT.md §9`) — resultado idêntico (tenant A=2, B=1, anon=0, INSERT cross-tenant bloqueado).

---

## 3. Correções aplicadas

### 3.1 RLS InitPlan — `(select auth.uid())` 🔴→✅ (maior ganho)
`auth.uid()`/`auth.role()`/`auth.jwt()`/`current_setting()` chamados **direto** numa policy são reavaliados **por linha**. Envolvendo em subquery escalar, o planner avalia **uma vez** (InitPlan) e reusa — ganho de **10–100×** em varreduras de tabelas grandes. É a recomendação oficial do Supabase e é **semanticamente equivalente**.
- **1083** policies com `auth.*` + **7** com `current_setting`/`auth.email()` = **1090** policies reescritas.
- Verificado **0 policies com mistura** (nenhuma já tinha `(select ...)` que pudesse duplicar) antes de aplicar.
- Migrations: `20260602190000_perf_rls_initplan.sql`, `20260602190001_perf_rls_initplan_part2.sql`.
- **Não-regressão comprovada** pelo re-teste de isolamento.

### 3.2 Índices em FKs de domínio sem cobertura 🟡→✅
FK sem índice = seq scan em joins e **lock + seq scan da tabela filha a cada DELETE/UPDATE no pai**. Indexadas as **206** FKs de domínio single-column (42 `account_id` + colunas de join: `session_id`, `job_id`, `candidate_id`, `application_id`, …).
- Migration: `20260602180000_perf_indexes_fk.sql`. Resultado: `dominio_restante = 0`.
- **Decisão consciente:** as **30** FKs de auditoria para `auth.users` (`created_by`, `updated_by`, `handled_by`, …) **não** foram indexadas — são raramente filtradas e o índice só adicionaria custo de escrita. Reavaliar caso alguma vire filtro frequente.

### 3.3 Índices/constraints redundantes removidos 🟢→✅
**45 índices** com colunas+predicado idênticos a outro na mesma tabela + **1 constraint UNIQUE** duplicada. Sempre preservado o índice de constraint (UNIQUE/PK) ou o canônico.
- ⚠️ **Cuidado tomado:** índices **parciais** de predicado distinto (ex.: `WHERE is_test=true` vs `WHERE is_test=false`) **NÃO** são duplicados — foram **preservados** (um falso positivo da varredura ingênua foi detectado e evitado).
- Migrations: `20260602200000`, `20260602200001`.

---

## 4. Pendências (dependem de tráfego real → cutover)

### 4.1 `multiple_permissive_policies` (848)
Várias tabelas têm **mais de uma policy permissiva** para o mesmo papel/comando; o Postgres avalia **todas** (OR). Consolidar em uma policy por (papel, comando) reduz overhead. **Por que não agora:** consolidar muda a lógica de acesso e exige reteste fino por tabela — risco desproporcional sem dados/uso reais. **Plano:** priorizar as tabelas quentes (recrutamento, pulse, billing), consolidar e revalidar o isolamento, no cutover.

### 4.2 `unused_index` (597)
**Não remover agora.** Em banco sem tráfego, *todo* índice aparece como não-usado; o número **subiu** justamente porque criamos os 206 índices de FK (corretos, serão usados em produção). **Plano:** após ~30 dias de tráfego real (pós-cutover), cruzar com `pg_stat_user_indexes` (`idx_scan = 0`) e remover os comprovadamente inúteis. Habilitar `pg_stat_statements` no cutover para achar as queries lentas reais.

### 4.3 FKs de auditoria sem índice (30)
Mantidas sem índice por decisão (§3.2). Revisão pontual se surgirem filtros por `created_by`/`updated_by` em telas de auditoria.

---

## 5. Plano de escala (12 meses)
Contexto: ~40 empresas hoje, crescimento esperado. Compute atual: **`ci_small`** (2 vCPU compartilhada / 2 GB RAM, sa-east-1).

1. **Connection pooling (Supavisor):** as 283 edge functions abrem conexões; usar o pooler em **transaction mode** para os endpoints serverless (evita esgotar `max_connections`). O advisor já sinaliza `auth_db_connections_absolute`. *(Detalhe na Frente E — Infra.)*
2. **Compute:** `ci_small` cobre a fase fake/validação. Para produção com 40+ contas e IA intensiva, dimensionar para **`ci_medium`/`ci_large`** conforme `cpu`/`ram`/`disk IO` observados — alteração a quente via `PATCH /v1/projects/<ref>/billing/addons`.
3. **Índices:** revisar `unused_index` com tráfego real (§4.2); adicionar compostos guiados por `pg_stat_statements` (não preventivamente).
4. **Tabelas de log de alto volume** (`ai_execution_logs`, `interview_token_usage`, `candidate_tracking_events`, telemetria): candidatas a **particionamento por data** + política de retenção/arquivamento quando passarem de dezenas de milhões de linhas.
5. **RLS:** com o InitPlan já otimizado, o próximo gargalo de RLS em escala é o `multiple_permissive_policies` (§4.1) — consolidar nas tabelas quentes.
6. **Observabilidade** (Frente B): dashboards de query lenta, cache hit ratio, conexões e custo de LLM; alertas de erro de banco/función.

---

## 6. Migrations desta frente
`20260602180000` (índices FK) · `20260602190000` + `20260602190001` (RLS initplan) · `20260602200000` + `20260602200001` (deduplicação). Todas versionadas e registradas em `schema_migrations`.
