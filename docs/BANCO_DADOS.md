# Documentação Técnica do Banco de Dados — Gentia (Fase 1, Frente C)

> Entregável do contrato (Cláusula 1.3 "c) Banco de Dados": documentação técnica
> completa + mapa das tabelas críticas). Complementa `PERFORMANCE_AUDIT.md`
> (índices/queries) e `SECURITY_AUDIT.md` (RLS/isolamento). Ambiente: `tdyvuomybimgygjgvnrk` (PG 17.6).

## 1. Visão geral
- **416 tabelas**, **~274 funções**, **37 enums**, **4 views** · **RLS em 100%** das tabelas.
- **216 tabelas têm `account_id`** → são **multi-tenant** (escopo por empresa). As demais são catálogos globais, config de plataforma e tabelas de auth.
- Organização por **módulo** (prefixo): `recruitment` (59), `pulse` (29), `candidate` (15), `values` (14), `onboarding` (12), `consultant` (11), `project` (10), `org`/`culture`/`job` (9), `platform`/`survey` (8), `hunting`/`account`/`ai` (7)…
- Acesso 100% via `supabase-js` (REST/PostgREST) — sem SQL bruto (sem superfície de injection).

## 2. Modelo multi-tenant (a espinha dorsal)
```
auth.users ──< account_members >── companies (TENANT)
                  (user_id, account_id,        ▲
                   role, is_active)             │ account_id (em 216 tabelas)
user_roles (super_admin, head_cs, ...)   [dados de cada empresa]
```
- **`companies`** = o tenant (a "empresa"/conta). Toda tabela de dados de cliente referencia `account_id → companies.id`.
- **`account_members`** = vínculo usuário↔empresa (com `role` e `is_active`). É a base da RLS.
- **`user_roles`** = papéis **globais** (`super_admin`, `head_cs`) — oversight cross-tenant **por design**.
- **Helpers de RLS** (SECURITY DEFINER): `is_account_member(uid, account_id)`, `is_super_admin(uid)`, `is_head_cs(uid)`, `can_edit_client_project(uid, account_id)`, `is_consultant_for_account(...)`, `get_user_account_id(uid)`.
- **Isolamento provado** em dados reais (usuário comum vê só a própria conta; admin vê tudo por design) — `SECURITY_AUDIT §9`.

## 3. Mapa de tabelas CRÍTICAS (por domínio)
> (✅ = multi-tenant via `account_id`. Volumes = dados reais carregados.)

### 🏢 Empresas / Clientes
| Tabela | Papel |
|---|---|
| `companies` ✅ | Tenant principal (59) — empresa/conta |
| `clientes_consultoria`, `clientes_contatos` ✅ | Carteira de clientes das agências/consultorias |
| `ep_partners`, `partner_*` ✅ | Módulo franquias/parceiros (EP Partners) |

### 👤 Usuários & Permissões
| Tabela | Papel |
|---|---|
| `auth.users` | Identidade (193) |
| `profiles` ✅ | Perfil do usuário (193) |
| `account_members` ✅ | Vínculo usuário↔empresa + role + is_active (87) |
| `user_roles` | Papéis globais (super_admin, head_cs) |
| `account_invites`, `permission_templates` ✅ | Convites e modelos de permissão |

### 🧑‍💼 Candidatos
| Tabela | Papel |
|---|---|
| `recruitment_candidates` ✅ | Candidato (181) — PII (nome/email/telefone/CV) |
| `candidate_profiles`, `candidate_education`, `candidate_work_history` | Biografia/histórico |
| `candidate_cv_intelligence`, `candidate_cv_job_match` | CV parseado + match com vaga |
| `talent_pool` ✅ | Banco de talentos |

### 📋 Vagas & Candidaturas
| Tabela | Papel |
|---|---|
| `recruitment_jobs` ✅ | Vagas (39) |
| `recruitment_applications` ✅ | Candidaturas (124) — funil |
| `recruitment_job_workflow_steps` ✅ | Etapas do processo (inclui etapa cultural→agent) |

### 🎤 Entrevistas
| Tabela | Papel |
|---|---|
| `culture_interview_sessions` ✅ | Entrevista de cultura (170) |
| `technical_interview_sessions` ✅ | Entrevista técnica |
| `recruitment_interviews` ✅ | Entrevistas agendadas/realizadas |
| `voice_interview_events` ✅ | Telemetria da voz em tempo real (5.411) |
| `interview_token_usage` ✅ | Consumo de tokens por entrevista (142) |

### 📊 Respostas / Avaliações / Scores
| Tabela | Papel |
|---|---|
| `disc_sessions` / `disc_responses` / `disc_results` | Avaliação DISC (sessão→32 respostas→resultado) |
| `culture_interview_criteria_evaluations` ✅ | Avaliação por critério (o parecer) |
| `recruitment_screening_results` ✅ | Resultado de screening |
| `recruitment_evaluations` ✅ | Avaliações de recrutamento |
| `values_questions_sessions` ✅ | Avaliação de valores |

### 💳 Créditos & Billing
| Tabela | Papel |
|---|---|
| `recruitment_credit_costs` | Custo em créditos por ação (ai_interview=10, disc=5…) |
| `recruitment_credit_packages` | Pacotes vendidos (preço/crédito R$1,39–1,99) |
| `recruitment_usage_credits` ✅ | Saldo/consumo por conta |
| `org_credit_subscriptions` ✅ | Assinaturas de crédito |
| `platform_credit_config` | Valor do crédito (R$1,39) + margem (50%) + câmbio |
| `billing_invoices`, `billing_events` ✅ | Faturas e eventos (Stripe) |

### 🤖 IA (config & custo)
| Tabela | Papel |
|---|---|
| `ai_execution_logs` ✅ | **Log de cada chamada de IA** (modelo, status, tokens, custo) — base de custo/observabilidade |
| `feature_llm_mapping` | Feature→modelo + tokens médios |
| `platform_ai_model_config` | Modelo por serviço (troca sem deploy) + cache |
| `ai_prompts` | Prompts versionados |

### 📜 Logs & Auditoria
| Tabela | Papel |
|---|---|
| `ai_execution_logs` ✅ | Execuções de IA |
| `impersonation_logs` ✅ | Auditoria de impersonação (454) |
| `recruitment_communications_log` ✅ | Comunicações enviadas (400) |
| `candidate_tracking_events` ✅ | Eventos de candidato (362) |
| `recruitment_usage_log` ✅ | Uso/consumo (309) |
| `recruitment_decision_log` ✅ | Decisões do funil (127) |
| `ops_alerts` | Alertas operacionais (Frente B) |

### 🌡️ Pulse / Cultura (clima)
`pulse_responses` (1.322), `pulse_culture_questions` (962), `pulse_daily_assignments` (177), `pulse_metrics_daily`, `pulse_culture_metrics_daily` ✅ — clima/cultura com anonimização (threshold de 5).

## 4. Relacionamentos-chave (fluxos principais)
- **Funil de recrutamento:** `companies` → `recruitment_jobs` → `recruitment_applications` → `recruitment_candidates` (+ `recruitment_job_workflow_steps`).
- **Entrevista → avaliação:** `culture_interview_sessions` → `voice_interview_events` (telemetria) → `culture_interview_criteria_evaluations` (parecer) → score no candidato.
- **DISC:** `disc_sessions` → `disc_responses` (32) → `disc_results` (D/I/S/C normalizado).
- **Créditos:** ação (ex. `ai_interview`) consome `recruitment_credit_costs` → debita `recruitment_usage_credits` → registra em `recruitment_usage_log`/`billing_events`.
- **IA:** function → `feature_llm_mapping`/`platform_ai_model_config` (modelo) → `ai_execution_logs` (custo/tokens/status).

## 5. Integridade & performance (resumo — detalhes nos outros docs)
- **Integridade referencial:** validada com dados reais — **0 FKs órfãs** nas tabelas-chave; **206 índices de FK** criados (`PERFORMANCE_AUDIT`).
- **RLS:** 416/416 com policy; **InitPlan otimizado** (1090 policies); isolamento provado.
- **Advisor:** segurança **0 ERROR**; performance 2664→1476 lints.

## 6. Convenções e observações
- `account_id` é o eixo de tenant — **toda nova tabela de dados de cliente deve ter `account_id` + RLS por `is_account_member`**.
- IDs `uuid` (default `gen_random_uuid()`); timestamps `timestamptz`; `is_active`/`is_test` como flags comuns.
- Catálogos globais (sem `account_id`): `badges`, `courses`, `survey_benchmarks`, `*_catalog` — leitura por autenticados.
- `search_path` imutável nas funções SECURITY DEFINER (segurança).
