# Backup e Recuperação de Desastres (DR) — Gentia (Fase 1, Frente D)

> Entregável do contrato (Cláusula 1.3 "d) Backup e Recuperação").
> Ambiente: destino `tdyvuomybimgygjgvnrk` (Supabase Pro, sa-east-1).

## 1. Estado atual (verificado via API)
| Item | Estado |
|---|---|
| Backups diários automáticos | ✅ **Ativos — 7 backups** (retenção padrão do plano Pro) |
| WAL-G (infra de backup físico) | ✅ Ligado |
| **PITR** (Point-in-Time Recovery) | ⚠️ **Desabilitado** (é addon pago do Pro) |
| Compute addon | `ci_small` |

## 2. RPO / RTO
**RPO** (quanto de dado pode-se perder) e **RTO** (tempo para restabelecer):

| Cenário | RPO | RTO |
|---|---|---|
| **Hoje (só backups diários)** | **até 24h** (desde o último backup diário) | minutos (banco 73 MB restaura rápido; restore Supabase tipicamente < 1h) |
| **Com PITR habilitado (recomendado)** | **~2 min** (recuperação por WAL ao segundo) | minutos |

**Recomendação:** para uma plataforma com **dados de clientes/candidatos (PII)**, RPO de 24h é arriscado (um erro às 23h perde o dia inteiro). **Habilitar PITR** (≈US$100/mês) derruba o RPO para ~2 min. É **decisão de custo do cliente** — recomendado para go-live. Habilitação: Dashboard → Database → Backups → enable PITR (ou `PATCH /v1/projects/<ref>/billing/addons` com o addon `pitr`).

## 3. Plano de Recuperação de Desastres (DR)
| Cenário | Resposta |
|---|---|
| **Exclusão acidental / migration ruim** | Restaurar do backup mais recente (ou PITR para o instante anterior ao erro). Migrations são idempotentes e versionadas → reverter via migration reversa quando aplicável. |
| **Corrupção de dados** | Restore do último backup íntegro (ou PITR). |
| **Credencial comprometida / acesso indevido** | Rotacionar chaves (ver `RUNBOOK_INCIDENTES`), revisar logs (`impersonation_logs`, advisor), e restaurar de backup limpo se houve alteração maliciosa. |
| **Indisponibilidade da região (sa-east-1)** | A Supabase gerencia HA da infra. DR cross-region completo **não é padrão** → se exigido, avaliar réplica/export cross-region (fora do escopo desta fase; registrar como risco). |

Ligações: contenção e comunicação em `docs/RUNBOOK_INCIDENTES.md` (severidades, LGPD 24h).

## 4. Procedimento de restore (teste documentado)
> ⚠️ Restore **sobrescreve** o projeto — **nunca testar restore destrutivo no projeto de produção**. Testar em **clone/staging**.
**Procedimento (a executar antes do go-live, em ambiente de teste):**
1. Dashboard → Database → **Backups** → escolher um backup (ou ponto, se PITR) → **Restore** (em um projeto de teste/clone).
2. Validar pós-restore: contagem de tabelas-chave (`companies`, `recruitment_candidates`…), RLS 100%, isolamento (script de `SECURITY_AUDIT §9`), e uma consulta de sanidade por tenant.
3. Cronometrar o RTO real e registrar.
4. Documentar evidência (antes/depois) no aceite.

**Simulação lógica (já validável agora):** a integridade do schema + dados foi confirmada (RLS 416/416, 0 FKs órfãs, isolamento provado) — ou seja, um restore desse estado retornaria um banco íntegro e isolado.

## 5. Pendências para o cutover
- **Decisão do cliente:** habilitar **PITR** (RPO 24h → ~2min). Recomendado.
- **Teste de restore real** em clone/staging + cronometrar RTO (item de aceite).
- Reavaliar necessidade de **DR cross-region** conforme criticidade do negócio.
