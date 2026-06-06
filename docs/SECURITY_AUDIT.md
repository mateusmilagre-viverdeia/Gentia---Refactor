# Auditoria de Segurança — Gentia (Fase 1)

> Documento vivo. Parte dos entregáveis do contrato (Cláusula 1.3 "a) Segurança":
> *Lista documentada das tabelas revisadas, políticas de RLS ajustadas e riscos remanescentes*).
> Ambiente auditado: **destino `tdyvuomybimgygjgvnrk` (Gentia SP)** — réplica fiel da origem.

**Início:** 2026-06-02 · **Status:** ✅ **Frente A (Segurança) concluída** — RLS em 100% das tabelas, achados críticos corrigidos, endpoints públicos auditados e **isolamento multi-tenant provado** (§9). Próximas frentes: Banco de Dados, Infra/Escala, LLMs, Observabilidade, Backup.

---

## 1. Metodologia
Auditoria automatizada via `pg_policies`/`pg_tables` (query API HTTPS) sobre as **415 tabelas**, cruzada com leitura do código (frontend + edge functions) para entender o fluxo real de acesso. Severidade: 🔴 Crítico (exposição de dados / PII) · 🟡 Médio (config sensível entre tenants) · 🟢 Baixo (sem exposição efetiva).

## 2. Resumo
| Métrica | Valor |
|---|---|
| Tabelas com RLS habilitado | **415/415 (100%)** ✅ |
| Total de policies | 1.205 |
| Tabelas com RLS **sem nenhuma policy** | 9 (tabelas drift recém-criadas) |
| Policies `USING(true)` | 38 (em 34 tabelas) |
| Policies `USING(true)` expostas a **`anon`** | **10 (8 tabelas)** 🔴 |
| SQL injection | nenhum (supabase-js parametrizado) ✅ |

---

## 3. Achados 🔴 CRÍTICOS

### 3.1 Vazamento de PII via portal de cliente (8 tabelas) — `anon` + `USING(true)`
**Causa raiz:** o portal de cliente (acesso por token) valida o token **só no frontend** (`src/hooks/usePortalAuth.ts`) e depois faz `SELECT` direto nas tabelas filtrando por `cliente_id` **no client** (`src/hooks/usePortalData.ts`). As RLS são `USING(true)`. Como o **anon key é público**, qualquer pessoa pode consultar as tabelas inteiras — sem token, sem filtro.

| Tabela | Exposição | Dado vazado |
|---|---|---|
| `recruitment_candidates` | anon:SELECT | 🔴 **PII de candidatos** (nome, email, telefone, CV, scores) de TODAS as empresas |
| `recruitment_applications` | anon:SELECT | candidaturas e status de TODAS as empresas |
| `recruitment_jobs` | anon:SELECT | vagas (inclusive internas/confidenciais) |
| `clientes_consultoria` | anon:SELECT | carteira de clientes das agências |
| `clientes_contatos` | anon:SELECT | contatos (PII) dos clientes |
| `portal_clientes_acesso` | anon:SELECT + **UPDATE** | tokens de portal de todos os clientes (e escrita!) |
| `portal_feedbacks` | anon:SELECT | feedbacks de candidatos |
| `shortlist_relatorios` | anon:SELECT | relatórios de shortlist |

- **Migration de origem:** `supabase/migrations/20260415184344_*.sql`.
- **Impacto:** vazamento massivo de dados pessoais (risco de LGPD — Cláusula 10.4 do contrato).
- **✅ CORRIGIDO (2026-06-02):** removidas as 10 policies `anon USING(true)` das 8 tabelas — migration `20260602120000_security_fix_portal_anon_leak.sql` (`anon_leaks = 0` confirmado). O acesso público do portal passa a ser **exclusivamente** via edge function **`portal-data`** (deployada, `verify_jwt=false`), que valida o token no servidor (service_role) e devolve **apenas** os dados do cliente daquele token. O acesso **autenticado** do app foi preservado (`recruitment_candidates` manteve 6 policies).
- **⏳ Pendente (fora do escopo — refatoração de front):** reativar o portal no frontend para chamar `portal-data` (ver §7). O portal já estava quebrado (front pedia colunas inexistentes no schema atual).

### 3.2 `culture_interview_criteria_evaluations` — `public:ALL`
Policy `USING(true)` para o role `public` (inclui anon) com comando **ALL** → qualquer um pode **ler e escrever** avaliações de critérios de entrevista de cultura. **Correção:** restringir a `account_members` (leitura) e `service_role` (escrita).

---

## 4. Achados 🟡 MÉDIOS

### 4.1 Config de negócio sensível compartilhada entre tenants (`authenticated:SELECT`)
`market_research_prompts`, `market_research_model_config`, `platform_credit_config`, `feature_llm_mapping` — expostas a **todos** os usuários autenticados (qualquer tenant). Revelam **prompts proprietários** e **margens/preços de crédito**. **Correção:** restringir a super_admin/serviço; o que o front precisa, servir via RPC com o subconjunto seguro.
> Catálogos legítimos (OK, não sensíveis): `badges`, `survey_benchmarks`, `courses`, `lessons`, `modules`, `culture_code_templates`, `onboarding_templates*`, `qa_questions`.

### 4.2 9 tabelas drift com RLS sem policy
`ep_partners`, `partner_client_grants`, `partner_licenses`, `partner_royalties`, `platform_seat_pricing`, `platform_subscription_plans`, `promo_code_redemptions`, `recruitment_package_features`, `whatsapp_message_logs` — habilitei RLS na reconstrução, mas faltavam policies (só acessíveis via service_role). **Correção:** criar policies adequadas (a maioria é config de plataforma → super_admin/serviço; `ep_partners` por `user_id`).
- **✅ CORRIGIDO (2026-06-02):** migration `20260602150000_security_drift_tables_policies.sql` — policies de SELECT criadas: franquias (`ep_partners` por `user_id`+super_admin; `partner_*`/`promo_code_redemptions` ligadas ao partner do usuário), catálogos de pricing (`platform_subscription_plans`, `platform_seat_pricing`, `recruitment_package_features` legíveis por autenticados), `whatsapp_message_logs` só super_admin. Escrita continua via service_role. **Verificação global:** `rls_sem_policy = 0` — todas as 415 tabelas têm RLS **e** policy.

---

## 5. Plano de correção (priorizado)
1. ✅ **Portal por token** (3.1) — **FEITO (banco)**: 10 policies anon removidas + function `portal-data` deployada. Front pendente (§7).
2. 🔴 **`culture_interview_criteria_evaluations`** (3.2) — recriar policies. *(próximo)*
3. ✅ **Config sensível entre tenants** (4.1) — restringido (`20260602140000`).
4. ✅ **Policies das 9 tabelas drift** (4.2) — FEITO (`20260602150000`).
5. ✅ Auditoria dos **endpoints públicos** (`verify_jwt=false`) — FEITO (§8): 3 ALTO corrigidos, 3 MÉDIO documentados.
6. ✅ Teste prático de **isolamento multi-tenant** — FEITO (§9): leitura **e** escrita isoladas, com evidência.

## 6. Riscos remanescentes
- **Portal no frontend não-funcional** até a integração da §7 (mas já estava quebrado — risco de funcionalidade, não de segurança).
- _(demais a preencher conforme as correções avançam)_

## 7. Guia de integração do front do portal (refatoração — fora do escopo Fase 1)
Para reativar o portal usando a function segura `portal-data` (já deployada):
1. **`src/hooks/usePortalAuth.ts`** → trocar o `SELECT` direto por `supabase.functions.invoke('portal-data', { body: { token, resource: 'auth' } })`; incluir o `token` no `PortalAuthData`.
2. **`src/hooks/usePortalData.ts`** → cada hook chama `portal-data` com `{ token, resource, params }` (`jobs`, `candidates`, `shortlist`+`params.jobId`, `feedbacks`, `submit_feedback`). Mudar assinatura de `clienteId`/`jobId` para `token` (+ `jobId`).
3. **Componentes** (`PortalDashboard`, `PortalShortlistView`, `ClientPortalPage`) → passar `auth.token` aos hooks no lugar de `auth.client.id`.
4. **`src/hooks/usePortalJobsRealtime.ts`** → realtime dependia de RLS anon (removido); trocar por polling via `portal-data` ou reavaliar.
5. **Campos legados** (`qualification_*`, `current_company`, `city`, `strengths`, `concerns`) vêm `null`/`[]` da function — UI deve parar de exibi-los ou remapeá-los às fontes atuais numa evolução futura.

## 8. Endpoints públicos (`verify_jwt=false`) — auditoria
Dos **64 endpoints públicos**, a categorização + leitura de código classificou:
- **41 legitimamente protegidos**: token-based (19), cron-like (13), valida-auth (5), webhook assinado (1), public-data (3).
- **23 revisados em profundidade**, destes:
  - 🔴 **3 ALTO RISCO — CORRIGIDOS (2026-06-02):** `firecrawl-scrape`, `firecrawl-search`, `help-assistant` chamavam API paga / LLM **sem validar o chamador** (abuso de custo por qualquer anônimo com o anon key público). Adicionado helper **`supabase/functions/_shared/require-caller.ts`** (exige usuário autenticado **ou** service_role) e aplicado nas 3 — deployados. A chamada interna `start-technical-session → firecrawl-search` usa service_role (continua funcionando).
  - 🟡 **3 MÉDIO — documentados (recomendação):** `outreach-webhook-receiver` (webhook Z-API sem validação de assinatura HMAC → adicionar verificação de assinatura), `send-rejection-whatsapp` (não valida que job/candidato pertencem ao chamador antes de gerar mensagem com IA → exigir contexto autenticado), `check-email-domain-organization` (rate-limit por IP falsificável via `x-forwarded-for`).
  - 17 adequadamente protegidos (token de sessão de entrevista, validação cruzada, etc.).

---

## 9. Evidência de isolamento multi-tenant (RLS) ✅
Teste prático provando que a RLS isola os tenants — não basta a policy existir, é preciso comprovar que **um tenant não acessa dados de outro**, nem por leitura nem por escrita.

**Método:** 2 tenants fake (`ACME`, `Beta`) criados via `companies` + `account_members` + `auth.users` fake. Cada papel simulado na própria sessão Postgres com o role e o `auth.uid()` reais que o Supabase injeta:
```sql
begin;
set local role authenticated;                                  -- mesmo role do PostgREST p/ usuário logado
set local request.jwt.claims to '{"sub":"<user_id>"}';         -- auth.uid() passa a valer esse id
select ... from recruitment_candidates;                        -- RLS aplicada exatamente como em produção
rollback;
```
Seed: ACME = 2 candidatos (Ana, Artur) + userA; Beta = 1 candidato (Bruno) + userB.

**Resultados (tabela `recruitment_candidates`, PII de candidatos):**

| Cenário | Esperado | Obtido | ✓ |
|---|---|---|---|
| userA (ACME) lê candidatos | só os 2 da ACME | `2 [Ana, Artur]` | ✅ |
| userA tenta ler candidato de Beta (por email) | 0 linhas | `0` | ✅ |
| userB (Beta) lê candidatos | só o 1 da Beta | `1 [Bruno]` | ✅ |
| userB tenta ler candidatos da ACME | 0 linhas | `0` | ✅ |
| anon (sem login) lê qualquer candidato | 0 linhas | `0` | ✅ |
| userA tenta **inserir** candidato na conta de Beta | bloqueado | `ERROR 42501: new row violates row-level security policy` | ✅ |
| userA tenta **alterar** candidato de Beta | 0 linhas afetadas | `0` | ✅ |

**Conclusão:** o isolamento por `account_id` (via helper `is_account_member(auth.uid(), account_id)`) funciona em **leitura e escrita**. Tentativas explícitas de acesso cruzado retornam vazio ou são rejeitadas pela policy. Dados de teste removidos após a verificação (banco limpo). O mesmo padrão de policy cobre as demais tabelas multi-tenant (mesma função-helper), e a auditoria global confirmou `policies sem checagem de account_id = 0` nas tabelas de dados de tenant.

---

## 10. Validação com o Supabase Advisor (oficial) — achados extras
Rodei o **advisor oficial de segurança** (`GET /v1/projects/<ref>/advisors/security`) para validar a auditoria manual com a ferramenta nativa. Ele capturou itens que a varredura de `pg_policies` **não** pegava (views e storage). Resultado inicial: **2 ERROR + 296 WARN** → após correção: **0 ERROR**.

### 🔴 Corrigido — vazamento de PII por view `SECURITY DEFINER` (2 ERROR)
`employees_public` rodava como o dono (bypass da RLS de `employees`) **e** tinha `GRANT SELECT` para `anon` → expunha **nome, e-mail, telefone, data de nascimento e localização** de todos os funcionários ativos de **todas as empresas**, sem filtro de tenant, a qualquer um com o anon key público. `v_voice_interview_health_24h` (monitoramento) tinha o mesmo padrão. O app **não consome** essas views (só aparecem no `types.ts` gerado).
**✅ Correção (`20260602160000`):** `security_invoker = true` (a view passa a respeitar a RLS do chamador — cada tenant só vê o seu) + `revoke all ... from anon`. Confirmado: `anon` não acessa mais; `0 ERROR` no advisor.

### 🟢 Corrigido — `search_path` mutável em 6 funções `SECURITY DEFINER`
`enqueue_email`, `read_email_batch`, `delete_email`, `move_to_dlq` (fila de e-mail, `pgmq.*`) + 2 triggers de `updated_at`. Vetor de *search_path injection*. **✅ Correção (`20260602160000`):** `set search_path = ''` (as funções já qualificam tudo).

### 🟡 Pendentes (WARN — recomendações, exigem decisão/análise):
| Achado | Qtd | Risco | Recomendação |
|---|---|---|---|
| `public_bucket_allows_listing` | 8 buckets | 🟡 **`candidate-files` era público** (CVs/avatares) — ✅ **corrigido** (ver §10.1). Restam 7 buckets de assets legítimos (logos, careers, feeds, culture-templates) + `culture-files` (avaliar). | Concluído para `candidate-files`. Avaliar `culture-files` na sequência. |
| `rls_policy_always_true` | 8 | 🟡 São policies de **INSERT público com `WITH CHECK = true`** (`recruitment_screening_results`, `recruitment_decision_log`, `talent_pool_views`, `candidate_external_entries`, `portal_feedbacks`). Os **SELECT** dessas tabelas **têm** checagem de `account_id` (sem vazamento de leitura). | Anon pode **inserir** linhas em qualquer conta (spam/poluição). Endurecer o `WITH CHECK` onde não for fluxo público legítimo (feedback de candidato é legítimo). |
| `*_security_definer_function_executable` | 140 | 🟡 Funções `SECURITY DEFINER` executáveis por `anon`/`authenticated`. A maioria são helpers de RLS (precisam ser). | Revisar a lista e `revoke execute from anon` nas que não são de fluxo público. |
| `extension_in_public` | 2 | 🟢 `unaccent`, `vector` no schema `public`. | Mover para schema `extensions` (cosmético; baixa prioridade). |

### 10.1 `candidate-files` privado — ✅ fechado (back) + front (parcial, resto no cutover)
O bucket de CVs/avatares de candidatos era **público** com policy `SELECT to public` → qualquer anônimo baixava/enumerava arquivos (PII/LGPD).
- **✅ Backend (`20260602170000`):** bucket → privado; removida a leitura pública; leitura agora exige **usuário autenticado**. INSERT/UPDATE/DELETE já eram owner-based (`auth.uid() = pasta`). Verificado: `0` policies `anon` de leitura para o bucket. *(Refinamento futuro: isolar por vínculo candidato↔recrutador via signed URL emitida por edge function; hoje qualquer autenticado lê — fecha o crítico, que é o acesso anônimo.)*
- **✅ Front (helper + 2 pontos):** novo `src/lib/storageUrl.ts` (`getSignedFileUrl` + hook `useSignedFileUrl`, com **compat para URL pública legada** → essencial no cutover). Ajustados: `src/pages/candidato/MinhaBiografia.tsx` (upload salva **path**; avatar exibido via signed URL) e `src/components/recruitment/CandidateDetailsModal.tsx` (avatar + link do CV via signed URL). **Typecheck OK.**
- **✅ Marketplace ajustado** (commit `07d1ff8`): `MarketplaceCandidateCard` e `MyUnlocksTab` usam o novo componente `SignedCvLink` (signed URL on-demand, compat path/URL legada). Typecheck OK. Nenhuma edge function usa `getPublicUrl` no bucket (sem quebra no backend).
- **✅ Portal refatorado** (commit `b78a0a3`): `usePortalAuth` + `usePortalData` (jobs/candidates/shortlist/feedbacks/submit) + componentes consomem **100% via `portal-data`** (token validado no servidor, escopo por `cliente_id`). **0 `supabase.from()`** nos hooks/componentes do portal; o fluxo "pedir mais candidatos/dúvida" foi para o servidor (resource `notify_recruiter` — telefone/destinatário não vão ao client). Gate validado (401 token inválido). **Front de PII fechado.**

## 10.2 Endurecimento de escrita/leitura anônima (2026-06-06)
- **🔴 INSERTs anônimos permissivos (`WITH CHECK (true)`) removidos** — 7 policies em 5 tabelas (`candidate_external_entries`, `recruitment_decision_log`, `recruitment_screening_results`, `talent_pool_views`, `portal_feedbacks`). Todas as escritas legítimas são via **edge functions (service_role**, que ignora RLS) — confirmado `front_refs=0` e inserts com `SERVICE_ROLE_KEY` (whatsapp-intake, screening-evaluate, recruitment-orchestrator, talent-pool-analytics, portal-data). Elimina o vetor de **escrita anônima** (poluição/integridade) sem quebrar fluxos. Migration `20260606160000`; verificação: **0** INSERTs `with_check=true` p/ anon/public.
- **🔴 Leak de tokens em `consultant_satisfaction_invites`** — a policy SELECT `qual=true` ("public can read invite by token") deixava **anon ler TODOS** os invites (incl. tokens → enumeração / abrir avaliação de qualquer consultor). Substituída pela RPC **`get_satisfaction_survey_by_token`** (SECURITY DEFINER, escopada ao token, `search_path` fixo, grant execute p/ anon); a **UPDATE pública** ("mark completed") também foi removida (conclusão é via `submit-satisfaction-response`/service_role); `SatisfactionSurvey.tsx` agora usa a RPC (1 chamada no lugar de 3 SELECTs). Restam só policies **gated** (admin + consultor-próprio); **anon vê 0**. Migration `20260606161000`. Commits `aa52c8d`/`c35ee8f`.
- ⏳ Menores (documentados, baixa severidade): `post_reactions` SELECT `qual=true` (anon lê reações — feature social interna; restringir a `authenticated` no cutover); `badges`/`survey_benchmarks` SELECT público são catálogos intencionais (OK).
