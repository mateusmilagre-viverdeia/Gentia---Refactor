# Observabilidade — Gentia (Fase 1, Frente B)

> Entregável do contrato (Cláusula 1.3 "b) Observabilidade"). Logs estruturados,
> alertas e dashboards. Ambiente: destino `tdyvuomybimgygjgvnrk`, sobre dados fake.

---

## 1. O que já existia (inventário)
O produto já tinha boa observabilidade **de domínio** — reaproveitada, não duplicada:

| Camada | Recursos existentes |
|---|---|
| **Logging (edge)** | `_shared/logger.ts` (níveis + prefixo; **silencia em prod**, exceto `error`). ~1.264 `console.*` nas functions. |
| **Log de IA** | `_shared/ai-logger.ts` → tabela **`ai_execution_logs`** (account, função, modelo, status, `duration_ms`, `tokens_used`, `estimated_cost`, `cached_tokens`, `quality_score`). É a fonte de verdade de custo/uso de IA. |
| **Alertas de domínio** | `sla_alertas`, `recruitment_metric_alerts`, `pulse_alerts`, `project_alerts`, `onboarding_alerts`, `llm_pricing_alerts`, `billing_notifications`… |
| **Auditoria** | `impersonation_logs`, `consultant_access_logs`, `client_portal_activity_log`, `email_send_log`, `job_distribution_logs`. |
| **Jobs agendados** | **pg_cron + pg_net** com 6 jobs diários: `daily-account-health`, `expire-trials-daily`, `daily-expire-proposals`, `indeed-feed-daily-regen`, `process-one-on-one-recurrences`, `sla-monitor-daily`. |
| **Notificação externa** | Discord (`DISCORD_WEBHOOK_URL`) via `notify-discord-intranet`, `monitor-llm-pricing`. |
| **Monitores** | `ai-billing-monitor`, `audit-ai-billing`, `sla-monitor`, `interview-watchdog`, `recruitment-metric-alerts`, `calculate-account-health`. |

**Lacuna identificada:** faltava a camada **operacional/infra** consolidada — métricas agregadas de IA para dashboard, e alerta automático de **anomalia de custo/erro**. É o que a Frente B adicionou.

---

## 2. O que foi adicionado (Frente B)
| Item | Arquivo | O quê |
|---|---|---|
| **Métricas de IA** | `migrations/20260603120000` | Views `v_ops_ai_cost_daily`, `v_ops_ai_by_function` (p95+erro%), `v_ops_ai_by_model`, `v_ops_ai_errors_recent` + RPC **`ops_ai_metrics(days)`** (super_admin) — resumo em JSON para o painel admin. |
| **Tabela de alertas** | `migrations/20260603130000` | **`ops_alerts`** (tipo, severidade, mensagem, detalhes); leitura super_admin, escrita service_role. |
| **Monitor operacional** | `functions/ops-health-monitor` | Cron que detecta **custo de IA 24h acima do teto**, **taxa de erro/timeout alta** e **funções com muitas falhas**; grava em `ops_alerts` e notifica Discord. Validado e2e. |
| **Log estruturado** | `functions/_shared/structured-log.ts` | `fnLogger(fn)` emite **JSON por evento** (parseável por Log Drains), sempre — para novos pontos críticos. **Sem PII.** |

### Thresholds do monitor (via env, com defaults)
`OPS_AI_COST_24H_LIMIT_USD` (50) · `OPS_AI_ERROR_RATE_PCT` (20) · `OPS_FN_ERROR_MIN` (5). Ajustar por env no cutover conforme o volume real.

---

## 3. Convenção de logging
- **Operacional/estruturado** (novos pontos, eventos de fluxo): `fnLogger` de `_shared/structured-log.ts` → JSON, sempre logado, parseável.
- **Diagnóstico verboso** (dev): `logger.ts` existente (silencia em prod).
- **Custo/uso de IA**: sempre via `ai-logger.ts` (`logAIExecution`) — alimenta métricas e alertas.
- 🚫 **Nunca logar PII** (nome, e-mail, telefone, CV, conteúdo). Logar IDs (`account_id`, `job_id`), métricas e status. Em erro, `e.message` — não o payload.

---

## 4. Dashboards
- **Nativo Supabase** (Reports): API/DB/Auth/Storage — already-on, sem custo.
- **Métricas de IA**: o painel admin (`src/components/admin/pricing/*`) pode consumir a RPC `ops_ai_metrics()` e as views (via service_role) para custo por dia/função/modelo, p95 de latência e taxa de erro.
- **Alertas operacionais**: tela simples lendo `ops_alerts` (não-resolvidos primeiro).

---

## 5. Setup no cutover (checklist)
1. **Reapontar os crons** — os 6 jobs do pg_cron chamam a **URL da ORIGEM** (`axumduklmiiptumdsgtu.supabase.co`) com o anon key da origem. No cutover, trocar URL+anon key para o destino. (Mesma classe de problema das 16 refs hardcoded — ver CLAUDE.md §2.)
2. **Rotacionar `CRON_SECRET`** — foi setado um valor de **teste** no destino (`test-cron-…rotate-at-cutover`). Trocar por um segredo forte e atualizar o comando do cron.
3. **Agendar o `ops-health-monitor`** (não agendado ainda; depende do secret/URL definitivos):
   ```sql
   select cron.schedule('ops-health-monitor-daily', '0 12 * * *', $$
     select net.http_post(
       url := 'https://<REF>.supabase.co/functions/v1/ops-health-monitor',
       headers := jsonb_build_object('Content-Type','application/json',
                  'Authorization','Bearer <ANON_KEY>', 'x-cron-secret','<CRON_SECRET>'),
       body := '{}'::jsonb) $$);
   ```
4. **Log Drains** (Supabase Pro): exportar os logs (JSON estruturado) para um destino externo (Datadog/Logflare/S3) para retenção e busca além da janela nativa.
5. **`DISCORD_WEBHOOK_URL`**: configurar o webhook real para os alertas chegarem ao canal de ops.
6. **Alertas nativos do Supabase**: habilitar no dashboard (uso de disco, CPU, conexões) com e-mail/Slack.

---

## 6. Operação (runbook rápido)
- **Ver custo/erros de IA**: `select * from v_ops_ai_cost_daily order by dia desc;` ou RPC `ops_ai_metrics(30)`.
- **Ver alertas abertos**: `select * from ops_alerts where not resolved order by created_at desc;`
- **Resolver alerta**: `update ops_alerts set resolved=true, resolved_at=now() where id='…';`
- **Rodar o monitor sob demanda**: `POST /functions/v1/ops-health-monitor` com header `x-cron-secret`.
- Resposta a incidentes: ver `docs/RUNBOOK_INCIDENTES.md`.
