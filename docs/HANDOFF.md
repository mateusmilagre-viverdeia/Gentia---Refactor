# Documento de Handoff Técnico — Gentia (Fase 1)

> Entregável do contrato (Cláusula 1.3 "g": handoff). Resume **o que foi alterado,
> onde, por quê, riscos remanescentes e a próxima fase (cutover)**. Índice de toda
> a documentação ao final. Fonte de verdade do aceite: `docs/ENTREGA_CHECKLIST.md`.

## 1. Contexto
Fase 1 (R$6k / 45 dias): estruturação de **Segurança, Banco, Infra/Escala, LLMs, Observabilidade e Backup** da plataforma Gentia. **Estratégia:** todo o trabalho feito sobre o **destino dedicado** (`tdyvuomybimgygjgvnrk`, Supabase próprio em SP) — primeiro com ambiente vazio, depois **validado com dados reais** carregados pelo cliente. A produção segue no Lovable até o **cutover**.

## 2. O que foi feito (por frente)
| Frente | Entregue | Doc |
|---|---|---|
| **a) Segurança** ✅ | RLS 416/416, vazamentos de PII fechados (portal, `employees_public`, bucket de CVs), endpoints públicos protegidos, isolamento multi-tenant **provado** (incl. dados reais), advisor **2 ERROR→0**, runbook de incidentes | `SECURITY_AUDIT.md`, `RUNBOOK_INCIDENTES.md` |
| **b) Observabilidade** ✅ | Métricas de IA (views + RPC), monitor `ops-health-monitor` + `ops_alerts` + Discord (validado e2e), log estruturado | `OBSERVABILITY.md` |
| **c) Banco de Dados** ✅ | Doc técnica + mapa de tabelas críticas, 206 índices de FK, RLS InitPlan (1090), advisor 2664→1476, integridade validada (0 FKs órfãs) | `BANCO_DADOS.md`, `PERFORMANCE_AUDIT.md` |
| **d) Backup/DR** ✅ | RPO/RTO, plano de DR, procedimento de restore (7 backups/dia ativos; PITR recomendado) | `BACKUP_DR.md` |
| **e) Infra/Escala** ✅ | Pooling (REST/Supavisor), **cache implementado** (`getConfiguredModel`), revisão de functions, fallback/rollback | `INFRA_ESCALA.md` |
| **f) LLMs** ✅ | Inventário + comparativo de custo + recomendação (Claude nos pareceres), **wrapper de desacoplamento implementado atrás de flag**, parecer blindado | `LLM_AUDIT.md`, `PLANO_EFICIENCIA_OPERACAO.md` |

## 3. O que MUDOU (e por quê)
- **Banco (migrations versionadas `supabase/migrations/2026*`):** fixes de RLS/PII, policies de tabelas drift, 206 índices de FK, otimização InitPlan (1090 policies), remoção de redundâncias, views/RPC de métricas, tabela `ops_alerts`. *Por quê:* fechar vazamentos, isolar tenants e dar performance/observabilidade.
- **Edge functions:** `_shared/require-caller.ts` (protege endpoints de custo), `portal-data` (portal por token no servidor), `ops-health-monitor` (alertas), `_shared/structured-log.ts`. **Wrapper de IA** (`_shared/llm-tool-call.ts`) reescrito p/ roteamento direto por provedor (Gemini/OpenAI/Claude) **atrás da flag `LLM_DIRECT_PROVIDERS` (default OFF)**. **Cache** em `_shared/ai-model-config.ts`. **`culture-interview-complete`** blindada contra modelos "pro" instáveis. *Por quê:* segurança, observabilidade, e desacoplar do Lovable Gateway (item central da migração) reduzindo custo + ganhando confiabilidade.
- **Front (parcial):** `src/lib/storageUrl.ts` + ajustes em `MinhaBiografia`/`CandidateDetailsModal` (signed URLs p/ CVs privados). Sync do Lovable (commit `07647c9`) integrado.
- **Secrets:** 14 secrets do cliente validados e salvos no destino; `GEMINI_API_KEY` criada (placeholder). Inventário em `SECRETS_INVENTORY.md`.

## 4. Riscos remanescentes
- **Front pendente (fora do escopo Fase 1):** portal de cliente e marketplace ainda precisam consumir signed URLs / a function `portal-data` (documentado em `SECURITY_AUDIT §7` e §10.1).
- **`multiple_permissive_policies` (848)** e **`unused_index`** → consolidar/reavaliar com **tráfego real** (cutover) — `PERFORMANCE_AUDIT §4`.
- **PITR desabilitado** → RPO 24h até habilitar (decisão de custo) — `BACKUP_DR`.
- **DR cross-region** não é padrão (registrar como risco se o negócio exigir).
- **Secrets faltantes** do cliente (hunting/WhatsApp/enriquecimento) — `SECRETS_INVENTORY` (lista A).
- **Tokens que circularam em chat/arquivo** → rotacionar no go-live.

## 5. Próxima fase — CUTOVER (checklist)
> **Roteiro executável completo (comandos, gates de validação e rollback): `docs/RUNBOOK_CUTOVER.md`.**
1. **Dados + secrets reais** de produção → destino; rotacionar `CRON_SECRET` (hoje é de teste) e tokens expostos.
2. **Ativar IA direta:** popular `GEMINI_API_KEY` real → `LLM_DIRECT_PROVIDERS=true` → redeploy → validar feature a feature → fechar a economia real com a fatura do Lovable.
3. **Habilitar PITR** (RPO 24h → ~2min) + **teste de restore real** em clone (cronometrar RTO).
4. **Reapontar** os 6 crons + agendar `ops-health-monitor` (hoje apontam p/ a origem `axumduklmiiptumdsgtu`); plugar `DISCORD_WEBHOOK_URL` real.
5. **Trocar refs hardcoded** de `axumduklmiiptumdsgtu` (16 ocorrências: chrome-extension, careers, useJobDistribution) p/ o novo backend.
6. **Front:** portal/marketplace via signed URLs.
7. **Dimensionar compute** + slow-query pass (`pg_stat_statements`) + consolidar policies nas tabelas quentes.

## 6. Índice da documentação (handoff)
`ENTREGA_CHECKLIST.md` (aceite) · `SECURITY_AUDIT.md` · `RUNBOOK_INCIDENTES.md` · `PERFORMANCE_AUDIT.md` · `BANCO_DADOS.md` · `OBSERVABILITY.md` · `INFRA_ESCALA.md` · `BACKUP_DR.md` · `LLM_AUDIT.md` · `PLANO_EFICIENCIA_OPERACAO.md` · `SECRETS_INVENTORY.md` · `GUIA_BOAS_PRATICAS.md` · **`RUNBOOK_CUTOVER.md`** (go-live) · `CLAUDE.md` (contexto-mestre).

## 7. Reunião de handoff (pauta sugerida)
Visão geral das 6 frentes → demonstração (advisor 0 ERROR, isolamento, métricas/alertas) → economia de IA + plano Claude → **plano de cutover** (seção 5) → riscos e decisões pendentes (PITR, secrets, front) → Q&A.
