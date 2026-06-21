# ✅ Checklist de Entrega — Contrato Fase 1 (Gentia / EP Partners)

> **Documento-mestre de aceite.** Rastreia cada subitem do contrato (Cláusula 1.3,
> frentes a–f + entregáveis g + critérios de aceite h) contra o que foi efetivamente
> feito, com evidência. **Manter atualizado a cada avanço** (regra no CLAUDE.md §10).

**Contrato:** Prestação de Serviços de TI — Fase 1 · **R$ 6.000** (2×3.000) · **45 dias** desde 25/05/2026 (prazo ~09/07/2026) · checkpoint no 40º dia · garantia 30 dias.
**Partes:** Milagre Tech (CONTRATADA) × EP Partners Manager (CONTRATANTE).
**Legenda:** ✅ feito · 🟡 parcial · ⏳ depende do **cutover** (tráfego/secrets/dados reais) · ⬜ pendente.

---

## 📊 Resumo por frente
| Frente | Status | %  |
|---|---|---|
| a) Segurança | ✅ **Completa** | 100% |
| b) Observabilidade | ✅ Completa (resta config de cutover) | ~90% |
| c) Banco de Dados | 🟡 `BANCO_DADOS.md` (doc técnica + mapa de tabelas críticas); queries lentas reais no cutover | ~90% |
| d) Backup e Recuperação | 🟡 `BACKUP_DR.md`: 7 backups/dia + WAL-G; RPO/RTO + DR + restore doc; PITR (decisão custo) e teste real no cutover | ~70% |
| e) Infraestrutura e Escalabilidade | 🟡 `INFRA_ESCALA.md`: pooling + cache (impl.) + review + fallback; compute/slow-query no cutover | ~70% |
| f) Otimização de LLMs | ✅ **Desacoplamento COMPLETO** (todas ~80 functions → Gemini/Claude/OpenAI direto via `aiFetch`/wrapper, **0 dependência do Lovable Gateway**) + `LLM_AUDIT`/`PLANO_EFICIENCIA`/custo + fallback + prompt caching + fixes (prompt_cache_key, velocidade, taxonomia). R$ real no cutover c/ volume | ~95% |
| g) Entregáveis (artefatos) | ✅ 11/12 (relatório, banco, RLS, isolamento, functions, dashboards, backup, runbook, LLM, guia, handoff); falta só a **reunião** | ~90% |

---

## a) Segurança — ✅ COMPLETA
- [x] Auditoria completa do ambiente Supabase → `docs/SECURITY_AUDIT.md` + advisor oficial (2 ERROR→0)
- [x] Revisão e correção das RLS Policies em **todas** as tabelas → 415/415 com RLS+policy; 1090 policies; drift `20260602150000`
- [x] Análise de exposição de dados sensíveis → portal PII, `employees_public`, `candidate-files` (todos fechados)
- [x] Validação dos mecanismos de autenticação e autorização → JWT, `_shared/require-caller.ts`, isolamento
- [x] Tratamento de vulnerabilidade a injection → sem SQLi (supabase-js parametrizado), documentado (§2)
- [x] Gestão e revisão de secrets e variáveis de ambiente → `docs/SECRETS_INVENTORY.md` (54 vars validadas, 14 salvas) _(revisão fina de service_role no cutover)_
- [x] Teste prático de isolamento multi-tenant → `SECURITY_AUDIT.md §9` (leitura+escrita; cross-tenant `42501`)
- [x] Revisão de endpoints públicos, webhooks, Edge Functions, integrações externas → §8 (3 ALTO corrigidos, 3 MÉDIO documentados)
- [x] Lista documentada de tabelas, RLS ajustadas e riscos remanescentes → `SECURITY_AUDIT.md`
- [x] Runbook básico de resposta a incidentes → `docs/RUNBOOK_INCIDENTES.md`

## b) Observabilidade — ✅ COMPLETA (config final no cutover)
- [x] Logs estruturados nos pontos críticos → `_shared/structured-log.ts` (🟡 aplicar em mais functions é incremental)
- [x] Monitoramento de erros e exceções → `ops-health-monitor` + `v_ops_ai_errors_recent`
- [x] Alertas para falhas e comportamentos anômalos → `ops-health-monitor` + `ops_alerts` + Discord (validado e2e)
- [x] Eventos críticos que geram alerta (custo IA, erro de função, etc.) → definidos em `OBSERVABILITY.md`
- [x] Dashboards (banco, Edge Functions, custo LLM) → **custo LLM**: views `v_ops_ai_*` + RPC `ops_ai_metrics`; **banco**: RPC `ops_db_metrics` (conexões/size/cache/tabelas/slow queries); **edge**: `v_ops_ai_by_function` + Reports nativo
- [🟡] Visibilidade em tempo real → `ops_alerts`/views + dashboard nativo
- [⏳] Canais de alerta + responsáveis → Discord no código + responsáveis no runbook; **webhook real + agendar cron no cutover**
- [x] Documentação (onde ver logs/dashboards/erros/alertas/métricas) → `docs/OBSERVABILITY.md`

## c) Banco de Dados — 🟡 NÚCLEO FEITO
- [x] Análise da estrutura atual → `docs/PERFORMANCE_AUDIT.md`
- [🟡] Queries lentas + índices de performance → 206 índices FK + RLS InitPlan (1090) + **consolidação de policies (piloto `recruitment_candidates`, isolamento re-testado; `multiple_permissive_policies` 842→840)**; restante das tabelas quentes + queries lentas reais (`pg_stat_statements`) → cutover
- [x] Revisão de relacionamentos e integridade referencial → análise de FKs + 206 índices + drift FKs
- [x] **Documentação técnica completa do banco** → `docs/BANCO_DADOS.md`
- [x] **Mapeamento das tabelas críticas** → `BANCO_DADOS.md §3` (empresas, usuários/permissões, candidatos, vagas/candidaturas, entrevistas, avaliações/scores, créditos, IA, logs, pulse)
- [x] Registro de queries/índices criados + justificativa → `PERFORMANCE_AUDIT.md` + migrations
- [🟡] Evidência de performance antes/depois → advisor 2664→1476; **antes/depois por query no cutover**
- [x] Plano técnico de escala 12 meses → `PERFORMANCE_AUDIT.md §5`

## d) Backup e Recuperação — 🟡 documentado · `docs/BACKUP_DR.md`
- [x] Rotinas de backups automáticos → §1: **7 backups diários ativos** + WAL-G. PITR a habilitar (decisão de custo do cliente, ~US$100/mês, recomendado).
- [🟡] Testes de integridade dos backups → §4: simulação lógica feita (integridade validada com dados reais); **teste de restore real em clone** no cutover
- [x] Plano de recuperação de desastres (DR) → §3 (cenários + resposta + ligação ao runbook)
- [x] Teste/simulação documentada de recuperação → §4 (procedimento passo-a-passo; executar em clone no cutover)
- [x] Definição de RPO/RTO → §2 (hoje: RPO ≤24h / RTO min; com PITR: RPO ~2min)

## e) Infraestrutura e Escalabilidade — 🟡 documentado + cache implementado · `docs/INFRA_ESCALA.md`
- [x] Connection pooling → §1: functions usam REST (pooled); Supavisor 6543 (transaction) p/ acesso direto. Diagnóstico: 0 functions em PG direto, 12/90 conexões.
- [🟡] Ajuste de configs p/ maior volume → §5: plano de compute + gatilhos (CPU/RAM/conexões); aplicar dimensionamento no cutover
- [x] Otimização das Edge Functions → §3 (review + cache + correções de IA/segurança)
- [x] Cache nos pontos críticos → §2: **implementado** em `getConfiguredModel` (24 functions, TTL 60s) + padrão p/ estender
- [x] Revisão dos fluxos frontend ↔ Supabase ↔ Edge ↔ banco ↔ IA → §3
- [x] Lista documentada de Edge Functions revisadas/otimizadas → §3
- [x] Estratégia de fallback/rollback → §4 (flag de IA OFF, config sem deploy, migrations idempotentes, deploy versionado, PITR)

## f) Otimização de LLMs (Custo-Benefício) — 🟡 análise/plano feitos · `docs/LLM_AUDIT.md`
- [x] Análise do uso atual de LLMs → `LLM_AUDIT.md §1-2` (inventário feature×modelo×tokens, real)
- [x] Avaliação de modelos/provedores (custo × desempenho) → §4-5 (preços oficiais Claude + recomendação)
- [x] Otimização de prompts e consumo de tokens → §8 + **prompt caching do Claude implementado** (cache_control system+tools; validado: leu 8.640 tok do cache)
- [x] Cache de respostas + fallback entre modelos → **implementados** no wrapper (caching §8 + cadeia de fallback §7)
- [🟡] Projeção de custo por escala → §5.1 (tabela A–E com premissas; escala linear; números finais no cutover c/ volume real)
- [x] Mapeamento das chamadas LLM por fluxo → §2 (`feature_llm_mapping` + `v_ops_ai_by_function`)
- [x] Recomendação de modelo/provedor por tipo de tarefa (incl. **Claude**) → §5
- [🟡] Comparativo custo atual × projetado → §5.1 (tabela Gemini×direto×Claude em R$/mês e R$/ano; premissas documentadas; travar volume/markup no cutover)
- [x] Fallback p/ falhas de LLM → §7 + **implementado** no wrapper (`callLLMTool` aceita `fallbackModels[]`: primário→cadeia; commit `24fc9cb`)
- [x] **Desacoplar Lovable Gateway → provedores diretos** → ✅ **COMPLETO (2026-06-15/21)**. Helper `_shared/ai-gateway.ts` (`aiFetch`, drop-in) roteia por `model` → **Gemini/OpenAI/Claude DIRETO**; wrapper `llm-tool-call.ts` força direto (gateway removido). **Todas as ~80 functions** convertidas (incl. o 2º endpoint `api.lovable.dev/ai`); **0 fetch ao gateway morto**. Fixes do desacople, validados ao vivo: (a) **`prompt_cache_key`** não vai p/ Google (HTTP 400 zerava o parecer técnico — comprovado na sessão do cliente; corrigido); (b) **velocidade** `reasoning_effort=none` (Gemini Flash 3-4×); (c) **taxonomia** de agente {adaptive,disc,structured}; (d) **fallbackModels** no parecer; (e) **email** desacoplado do Lovable → Resend direto (`send-outreach-email`, `process-email-queue` ✅; `auth-email-hook` precisa de config do Supabase Auth Hook + teste — passo conjunto). ⏳ R$ real no cutover (volume).

## g) Entregáveis (artefatos para aceite)
- [x] Relatório de auditoria antes/depois → `SECURITY_AUDIT.md` + `PERFORMANCE_AUDIT.md`, consolidado em `HANDOFF.md §2`
- [x] Documentação técnica completa do banco → `docs/BANCO_DADOS.md`
- [x] Lista de tabelas revisadas e RLS ajustadas → `SECURITY_AUDIT.md`
- [x] Evidência de teste de isolamento multi-tenant → `SECURITY_AUDIT.md §9`
- [x] Lista de Edge Functions revisadas/corrigidas/otimizadas → `INFRA_ESCALA.md §3` (segurança + cache + IA)
- [x] Dashboards de observabilidade configurados → `OBSERVABILITY.md` + RPCs `ops_ai_metrics` (IA/custo) e `ops_db_metrics` (banco) + Reports nativo
- [x] Plano de backup e recuperação → `docs/BACKUP_DR.md`
- [x] Runbook básico de resposta a incidentes → `RUNBOOK_INCIDENTES.md`
- [x] Análise comparativa de LLMs com recomendação → `docs/LLM_AUDIT.md`
- [x] Guia de boas práticas para desenvolvimento de novas funcionalidades → `docs/GUIA_BOAS_PRATICAS.md`
- [x] Documento de handoff técnico (o que/onde/por que mudou + riscos + próxima fase) → `docs/HANDOFF.md`
- [⬜] Reunião de handoff ao término → **com o cliente** (pauta em `HANDOFF.md §7`)

## h) Critérios de Aceite (libera 2ª parcela) — espelho dos itens acima
✅ Relatório antes/depois · ✅ Banco documentado · 🟡 Queries críticas otimizadas · ✅ RLS revisado nas críticas · ✅ Isolamento testado e documentado · 🟡 Secrets/variáveis revisados · ✅ Edge Functions críticas revisadas · ✅ Logs e alertas configurados · ✅ Dashboards mínimos ativos · ✅ Mapeamento de chamadas LLM · ✅ Recomendações de modelos documentadas · ✅ Plano de backup entregue · ⬜ Reunião de handoff.

## i) FORA do escopo (não fazer — proposta apartada)
Novas funcionalidades · suporte pós-garantia · redesign UX/UI · novos módulos · **refatoração completa do front** · **migração completa p/ outra cloud/banco** · fine-tuning de IA próprio · agente de IA do zero · **pentest formal certificado** · **auditoria jurídica de LGPD** · suporte 24/7 · correção de bugs fora das frentes.
> ⚠️ A migração Lovable→Supabase dedicado que fizemos é **veículo** para viabilizar a auditoria/otimização — não a "migração completa" excluída. O cutover final é decisão do dono.

---

## ⏳ Pendências consolidadas para o CUTOVER / GO-LIVE (dados/secrets reais)
**Gate nº1 (do cliente):** 🔑 **connection string do banco de ORIGEM** (Lovable Cloud `axumduklmiiptumdsgtu`) → migração FINAL de dados+storage+Auth origem→destino. **Sem isso, virar o domínio = perder dados gerados desde a importação.**
1. **Dados:** migração final origem→destino (depende do gate nº1) + storage + Auth.
2. **Secrets faltantes** no destino: `ZAPI_*` (WhatsApp), `HUNTER_API_KEY`, `GITHUB_TOKEN` (+ confirmar `STRIPE_SECRET_KEY`=live, `SITE_URL`/`PUBLIC_SITE_URL`). Ver `SECRETS_INVENTORY.md`.
3. **Domínio:** no Lovable → build verde + `VITE_PUBLIC_ORIGIN=https://gentia.tech` + conectar `gentia.tech` ao projeto + DNS. (Front canônico já é configurável: commit `f60bc55`.)
4. **`auth-email-hook`:** sair do Lovable → configurar **Supabase Auth "Send Email Hook"** + `SEND_EMAIL_HOOK_SECRET` + testar recuperação/convite (código a finalizar nesse passo).
5. **Crons:** reapontar 6 crons + agendar `ops-health-monitor`; rotacionar `CRON_SECRET` (hoje em valor de teste).
6. **Performance:** queries lentas reais + `unused_index` (`pg_stat_statements` + tráfego).
7. **Busca semântica:** re-embed (vetores `text-embedding-004` → `gemini-embedding-001`).
8. **PITR** (decisão de custo do cliente, ~US$100/mês) + teste de restore real em clone.
9. Front: ✅ marketplace/careers/portal/canônico feitos. Resta só a **chrome-extension** → destino (republicação).

> Runbook executável da virada: `docs/RUNBOOK_CUTOVER.md`.

*Última atualização: 2026-06-21 — desacoplamento LLM **completo** (todas as functions + email send-outreach/queue → Resend); fixes de parecer (`prompt_cache_key`), velocidade, taxonomia e link canônico no ar. Falta: `auth-email-hook` (config Auth), secrets do cliente, e o gate de dados (connection string da origem) p/ a virada.*
