# Infraestrutura e Escalabilidade — Gentia (Fase 1, Frente E)

> Entregável do contrato (Cláusula 1.3 "e) Infraestrutura e Escalabilidade").
> Ambiente: destino `tdyvuomybimgygjgvnrk` (sa-east-1, PG 17.6, compute `ci_small`).
> Avaliado com **dados reais** carregados (59 empresas, 181 candidatos, 73 MB).

## 1. Connection pooling
**Diagnóstico:** as **259 edge functions usam `supabase-js` (REST/PostgREST)** — **nenhuma abre conexão direta ao Postgres**. Ou seja, o acesso já passa pela camada REST, que é **pooled na plataforma** (PgBouncer/PostgREST). `max_connections = 90` (compute small), uso atual 12 ativas → folga; o risco de esgotamento é sob pico de carga direta.
**Pooler Supavisor disponível** (transaction mode): `aws-1-sa-east-1.pooler.supabase.com:6543` (SCRAM).
**Recomendações:**
- **Edge functions:** manter `supabase-js` (REST) — não migrar para PG direto. Pooling já resolvido nessa camada.
- **Acesso direto ao Postgres** (migrations, scripts, BI/externos, futuros workers): usar **sempre a string do Supavisor (porta 6543, transaction mode)**, nunca a conexão DIRECT (`db.<ref>...:5432`) — que também tem o problema de DNS/IPv6 (ver CLAUDE.md). Session mode (5432 pooler) só para operações que exigem sessão (ex.: `LISTEN/NOTIFY`).
- No cutover, ao dimensionar compute, o pool do Supavisor escala junto; monitorar `pg_stat_activity` vs `max_connections`.

## 2. Cache nos pontos críticos
**Hot path nº1 identificado:** `getConfiguredModel` é lido em **24 functions a cada chamada de IA** (resolve o modelo via `platform_ai_model_config`).
- ✅ **Implementado:** cache em memória (por instância warm) com **TTL 60s** em `_shared/ai-model-config.ts` — mudança de modelo no painel propaga em ≤60s; cold start repopula. Corta uma leitura ao banco por chamada de IA em 24 functions.
**Próximos alvos (mesmo padrão, documentado para estender):**
- `resolvePrompt` (`ai_prompts`) — 6 functions.
- `platform_credit_config` / `recruitment_credit_costs` — config de crédito lida em fluxos de billing.
- Catálogos estáticos (`badges`, `courses`, `survey_benchmarks`, etc.) — candidatos a cache de borda/HTTP.
**Padrão recomendado:** `Map<chave,{valor,exp}>` no escopo do módulo + TTL curto para config mutável; TTL maior (ou sem TTL) para catálogos imutáveis. Para o front, usar React Query com `staleTime` nesses catálogos.

## 3. Revisão e otimização das Edge Functions (lista documentada — §e)
- **Padrão de acesso saudável:** 259/283 functions usam `supabase-js` parametrizado → **sem SQL bruto = sem superfície de SQL injection** e com pooling REST.
- **Wrapper de IA** (`llm-tool-call.ts`) — refatorado para roteamento por provedor + retries + fallback (Frente F).
- **`culture-interview-complete`** — otimizada/corrigida (modelo confiável + fallback flash; ver `LLM_AUDIT §10`).
- **`getConfiguredModel`** — cacheada (acima).
- **Endpoints públicos de custo** (`firecrawl-*`, `help-assistant`) — protegidos com `require-caller` (Frente A).
- **Recomendações gerais (boas práticas, p/ novas functions):** reusar um único `createClient` por invocação (a maioria já faz); evitar N+1 (preferir `select` com joins/`in`); `maxTokens` enxuto nas chamadas de IA; logar via `_shared/structured-log.ts` sem PII; validar caller em endpoints públicos.

## 4. Estratégia de fallback / rollback (mudanças críticas — §e)
- **Migrations:** versionadas e idempotentes (`if not exists`, `on conflict`); rollback = migration reversa versionada. Nunca rodar destrutivo sem confirmação (CLAUDE.md §10).
- **Edge functions:** deploy é versionado pelo Supabase (cada deploy = nova versão; rollback = re-deploy da versão anterior do Git). Mudança em `_shared/*` só afeta functions ao redeploy → blast radius controlado.
- **IA:** desacoplamento atrás de flag **`LLM_DIRECT_PROVIDERS` (default OFF)** → rollback instantâneo (desligar a flag volta ao gateway). Modelo trocável sem deploy via `platform_ai_model_config` + **fallback por feature** no wrapper.
- **Config dinâmica:** `platform_ai_model_config`, `feature_llm_mapping`, `platform_credit_config` mudam comportamento sem deploy → ajuste/rollback rápido.
- **Banco:** PITR (Frente D) como rede de segurança para erro de dados.

## 5. Compute e escala (12 meses)
- **Atual:** `ci_small` (2 vCPU compartilhada / 2 GB). Banco 73 MB, ~30k+ linhas de domínio → folgado.
- **Gatilhos para subir compute** (`ci_medium`/`large`, via `PATCH /v1/projects/<ref>/billing/addons`): CPU sustentada > 70%, RAM/cache hit ratio caindo, `pg_stat_activity` perto de `max_connections`, disco IO alto. Monitorar pós-cutover.
- **Tabelas de alto volume futuras** (`ai_execution_logs`, `interview_token_usage`, telemetria): particionar por data + retenção quando passarem de dezenas de milhões de linhas.
- **Queries lentas:** `pg_stat_statements` **já habilitado** → após tráfego real, extrair top por tempo total/chamadas e indexar/otimizar. `unused_index` (590) e `multiple_permissive_policies` (848) → reavaliar/consolidar com tráfego real (ver `PERFORMANCE_AUDIT`).

## 6. Pendências para o cutover
- Dimensionar compute conforme métricas reais; confirmar pool size do Supavisor sob carga.
- Estender o cache aos demais hot paths (§2) se as métricas justificarem.
- Slow-query pass com `pg_stat_statements` (tráfego real) + consolidar `multiple_permissive_policies` nas tabelas quentes.
