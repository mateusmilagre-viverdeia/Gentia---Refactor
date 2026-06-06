# Guia de Boas Práticas — Desenvolvimento de Novas Funcionalidades (Gentia)

> Entregável do contrato (Cláusula 1.3 "g"). Regras práticas para manter
> segurança, multi-tenancy, custo e performance ao evoluir a plataforma.

## 1. Multi-tenancy & RLS (regra de ouro)
- **Toda tabela com dados de cliente DEVE ter `account_id` + RLS habilitada.**
- Policy de leitura/escrita escopada por **`is_account_member((select auth.uid()), account_id)`** (use sempre `(select auth.uid())`, não `auth.uid()` direto — performance InitPlan).
- Para oversight cross-tenant, adicionar `OR is_super_admin((select auth.uid()))` / `can_edit_client_project(...)`.
- **Nunca** `USING (true)` para `anon`/`public` em tabela com PII. Acesso público (portal) → via edge function que valida token no servidor (ex.: `portal-data`).
- Testar isolamento (`set local role authenticated` + `request.jwt.claims`) antes de subir — ver `SECURITY_AUDIT §9`.

## 2. Secrets & variáveis
- **Nunca** colocar chave/token em código ou Git. Ler de `Deno.env.get(...)`; configurar em Supabase → Edge Functions → Secrets.
- Endpoints públicos (`verify_jwt=false`) que custam dinheiro (API paga/LLM) → validar o chamador com `_shared/require-caller.ts`.

## 3. Edge functions
- Usar **`supabase-js` (REST)** — não abrir conexão Postgres direta (pooling já é na camada REST). Para scripts/externos, usar o **Supavisor** (`:6543`, transaction).
- Um `createClient` por invocação; evitar **N+1** (preferir `select` com join/`in`).
- Logar com **`_shared/structured-log.ts`** (JSON, **sem PII**). Erros: `e.message`, não o payload.
- Configs lidas a cada request → **cachear** (padrão `Map<chave,{valor,exp}>` + TTL; ver `ai-model-config.ts`).

## 4. IA / LLMs
- Chamar via **`_shared/llm-tool-call.ts`** (`callLLMTool`) — tool-calling p/ saída estruturada, retries, e roteamento por provedor (gateway hoje; direto com a flag).
- Definir o modelo por **config** (`platform_ai_model_config` via `getConfiguredModel`) — troca sem deploy. Registrar tokens médios em `feature_llm_mapping`.
- **Confiabilidade:** para schema grande + tool-calling, **usar modelos FLASH ou Claude** — os "pro"/preview do Google falham ("no tool_call") nesse caso (validado, `LLM_AUDIT §10`). Sempre ter **fallback** de modelo.
- **Custo:** modelo mais barato que atende a qualidade; Claude nos pareceres (qualidade+confiabilidade); voz na OpenAI Realtime. Sempre logar via `_shared/ai-logger.ts` (`ai_execution_logs`).
- Toda chamada cobrada → debitar crédito (`recruitment_credit_costs` → `recruitment_usage_credits`).

## 5. Migrations
- **Versionadas** em `supabase/migrations/` (timestamp); **idempotentes** (`if not exists`, `on conflict do nothing`).
- RLS + policies **na mesma migration** que cria a tabela.
- Funções `SECURITY DEFINER` → **`set search_path = ''`** (ou `public, pg_temp`) p/ evitar injection.
- Indexar **toda FK** usada em join/filtro (FK sem índice = seq scan + lock no delete do pai).
- Não rodar destrutivo sem confirmação; preferir migration reversa p/ rollback.

## 6. Performance
- `(select auth.uid())` nas policies (InitPlan).
- Índices em FKs e nas colunas de filtro (`account_id`, status, datas).
- Evitar múltiplas policies permissivas redundantes na mesma tabela/ação.
- Medir antes/depois com `pg_stat_statements` (habilitado).

## 7. Observabilidade
- Eventos críticos → alertar (custo de IA anormal, erro de função, falha de auth) via `ops-health-monitor`/`ops_alerts`.
- Dashboards/métricas de IA: views `v_ops_ai_*` + RPC `ops_ai_metrics` (super_admin).

## 8. Checklist rápido de PR
☐ Tabela nova tem `account_id` + RLS por `is_account_member`? · ☐ Sem secret no código? · ☐ Endpoint público valida o chamador? · ☐ IA via `callLLMTool` + modelo confiável + fallback + log? · ☐ FKs indexadas? · ☐ Migration idempotente + RLS junto? · ☐ Sem PII em log? · ☐ Isolamento testado?
