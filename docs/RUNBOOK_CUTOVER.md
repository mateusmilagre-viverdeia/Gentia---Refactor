# Runbook de Cutover (Go-Live) — Gentia: Lovable → Supabase próprio

> Passo a passo **executável** da virada. Origem = Lovable Cloud (`axumduklmiiptumdsgtu`).
> Destino = `tdyvuomybimgygjgvnrk` (Supabase SP). Cada fase tem **gate de validação** —
> não avance sem o ✅. Plano de **rollback** no fim. Resumo em `HANDOFF.md §5`.
> ⚠️ Secrets/keys **nunca** neste arquivo — use placeholders e o `.env`/painel.

## Pré-requisitos (ter em mãos antes de começar)
- [ ] `SUPABASE_ACCESS_TOKEN` (org EP Partners) — já no `.env`.
- [ ] Todas as **keys reais** (lista em `SECRETS_INVENTORY.md`): IA (Gemini real), Stripe, Resend, ZAPI, Twilio, Clearbit, Clay, Hunter, Snov, NeverBounce, Postmark, Google Indexing.
- [ ] **Export dos dados de produção** do Lovable (o Lovable Cloud não expõe a connection string → exportar de dentro do Lovable; ver CLAUDE.md §6).
- [ ] **Janela de downtime** combinada (o sistema antigo sai do ar durante a virada — algumas horas).
- [ ] Decisão sobre **PITR** (≈US$100/mês) — recomendado.

> Variáveis usadas abaixo: `REF=tdyvuomybimgygjgvnrk`, `API=https://api.supabase.com/v1/projects/$REF`, `Q=$API/database/query`.

---

## Fase 0 — Preparação (sistema antigo AINDA no ar)
1. **Comunicar** a janela de manutenção aos usuários.
2. **Backup do destino** (estado atual, pré-virada): Dashboard → Database → Backups (ou aguardar o diário). Anotar timestamp.
3. **Confirmar** que migrations e functions estão na última versão do Git:
   ```sh
   supabase migration list --project-ref $REF
   supabase functions list --project-ref $REF   # esperado: 285 functions
   ```
**Gate 0:** branch `claude/silly-mccarthy-8c0c30` mergeada/atualizada + backup recente existe.

## Fase 1 — Freeze + dados reais finais
1. **Tirar o sistema antigo do ar** (Lovable) — início do downtime (evita novos dados perdidos).
2. **Exportar** os dados de produção do Lovable (snapshot final) e **importar no destino**. *(O cliente já validou uma carga de teste nesta fase 1 — repetir com o snapshot final.)*
3. **Storage**: migrar buckets (CVs/avatares/etc.) origem→destino. **⚠️ Após importar, RE-CHECAR a PRIVACIDADE dos buckets** — a importação pode resetar `public` (achado real: deixou `candidate-files` público; corrigido em `20260606170000`). Devem ser **privados**: `candidate-files`, `external-resumes`, `project-documents`, `technical-interview-audio`, `culture-interview-audio`, `offline-interviews` → `update storage.buckets set public=false where id in (...);`.
4. **Auth**: migrar usuários (`auth.users`) se ainda não vierem no export. **Preservar os hashes `encrypted_password`** no export do schema `auth` (pg_dump) → assim os usuários mantêm a senha e o passo 5 funciona.
5. **Forçar troca de senha de TODOS (estratégia de migração)** — gate de front `must_change_password` (`ProtectedRoute`, commit `87f78f1`; reusa o flag/tela `/conta/perfil` que limpa o flag ao trocar):
   - **Se as senhas MIGRARAM** (hashes vieram): o usuário loga com a senha antiga e é **obrigado** a trocar no 1º acesso. Setar o flag em todos:
     ```sql
     update auth.users set raw_user_meta_data = coalesce(raw_user_meta_data,'{}'::jsonb)
       || '{"must_change_password": true}'::jsonb;   -- opcional: ... where email <> 'dev@viverdeia.ai';  (não trancar o admin)
     ```
     ⚠️ Requer o **front da Fase 6 no ar** (o gate é código de front) — só ativa depois do build do Lovable com `87f78f1`. Candidatos usam outro fluxo (não passam pelo gate).
   - **Se as senhas NÃO migraram** (ninguém consegue logar → o gate nunca dispara): em vez do flag, **disparar recovery a TODOS** (email "redefina sua senha"), com throttle p/ o limite do Resend. (Email já desacoplado → Resend direto.)
**Gate 1:** contagens batem com produção:
```sh
# template
curl -s -H "Authorization: Bearer $TOKEN" -X POST "$Q" -H "Content-Type: application/json" \
  --data '{"query":"select (select count(*) from companies) c,(select count(*) from recruitment_candidates) cand,(select count(*) from auth.users) u"}'
```

## Fase 2 — Secrets reais
1. **Carregar todas as keys reais** (substituem placeholders). Template (repetir por secret, **valor real fora do Git**):
   ```sh
   curl -s -X POST "$API/secrets" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
     --data '[{"name":"GEMINI_API_KEY","value":"<REAL>"},{"name":"STRIPE_SECRET_KEY","value":"<REAL>"}]'
   ```
2. **Rotacionar** `CRON_SECRET` (hoje é de teste) e quaisquer tokens que circularam em chat/arquivo.
3. Conferir nomes (sem valores):
   ```sh
   curl -s -H "Authorization: Bearer $TOKEN" "$API/secrets" | python3 -c "import json,sys;print(sorted(s['name'] for s in json.load(sys.stdin)))"
   ```
**Gate 2:** todos os secrets da "lista A" do `SECRETS_INVENTORY` presentes; `GEMINI_API_KEY` é real (não `PENDING_`).

## Fase 3 — Ativar IA direta (desacoplar do Lovable Gateway)
1. Ligar a flag:
   ```sh
   curl -s -X POST "$API/secrets" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
     --data '[{"name":"LLM_DIRECT_PROVIDERS","value":"true"}]'
   ```
2. **Redeploy** das functions de IA (pegam a flag em runtime, mas redeploy garante consistência):
   ```sh
   for f in culture-interview-complete technical-interview-complete reprocess-culture-evaluation analyze-cv-job-match; do
     supabase functions deploy "$f" --project-ref $REF; done
   ```
3. **Testar o Gemini direto** (o caminho não-testado): rodar 1 entrevista/parecer e conferir em `ai_execution_logs` status=success + `model` esperado. Se "no tool_call" → o endpoint OpenAI-compat do Google difere; ajustar (ex.: `tool_choice`/`max_tokens`) — ver `LLM_AUDIT §6`.
4. (Opcional) Apontar pareceres para **Claude** em `platform_ai_model_config` (qualidade+confiabilidade).
**Gate 3:** chamadas de IA com `status='success'` via provedor direto; **fatura do Lovable cai** (medir nos dias seguintes → fechar economia real).
> **Rollback rápido:** `LLM_DIRECT_PROVIDERS=false` volta tudo ao gateway.

## Fase 4 — Backup/PITR
1. **Habilitar PITR** (RPO 24h → ~2min): Dashboard → Database → Backups → enable PITR (ou addon via `PATCH $API/billing/addons`).
2. **Teste de restore** em um **clone** (não no destino): restaurar um backup → validar contagens + RLS + isolamento (`SECURITY_AUDIT §9`) → cronometrar RTO → registrar evidência.
**Gate 4:** PITR ativo (`pitr_enabled=true`) + evidência do teste de restore documentada.

## Fase 5 — Crons + URLs hardcoded
1. **Reapontar crons + agendar monitor:** rodar o script pronto **`scripts/cutover_repoint_crons.sql`** (substituir `<DEST_ANON_KEY>` e `<CRON_SECRET>` reais). Ele reaponta os **4 crons** que chamavam a origem (`calculate-account-health`, `expire-trials`, `generate-indeed-feed`, `sla-monitor`), **preserva os 2 SQL-puro** (`daily-expire-proposals`, `process-one-on-one-recurrences`) e **agenda o `ops-health-monitor`** (Frente B). Verificação inclusa no fim do script.
2. **Atualizar a chrome-extension** (`manifest.json` host_permissions + `popup.js` `SUPABASE_URL`) p/ o destino e **republicar** (o front já é env-driven — careers/feed usam `VITE_SUPABASE_URL`, commit `a69ff69`).
**Gate 5:** nenhum cron aponta p/ a origem; `grep -r axumduklmiiptumdsgtu` no repo = 0 (fora de docs/migrations históricas).

## Fase 6 — Front
1. Configurar `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` do destino no build **+ `VITE_PUBLIC_ORIGIN=https://gentia.tech`** (domínio canônico configurável, commit `f60bc55`: vazio durante os testes no Lovable; `gentia.tech` no go-live — senão os links públicos não viram pro domínio certo). Configurar tb o **Send Email Hook** + `SEND_EMAIL_HOOK_SECRET` (auth-email-hook nativo) se ainda não estiver.
2. Aplicar **signed URLs** no portal e marketplace (consumir `portal-data` / `getSignedFileUrl`) — `SECURITY_AUDIT §7` e §10.1.
3. Build + smoke test do front apontando para o destino.
**Gate 6:** login, listar candidatos, abrir CV (signed URL), portal por token — todos OK.

## Fase 7 — Virada (DNS/produção)
1. Apontar o domínio/produção para o novo backend (destino).
2. Renomear projeto "Gentia SP" → "Gentia"; **descartar** o projeto Oregon (`hcupedlkavszvevavufx`) vazio.
**Gate 7:** tráfego real chegando no destino; sem 5xx.

## Fase 8 — Validação pós-cutover
```sh
# Segurança: advisor 0 ERROR
curl -s -H "Authorization: Bearer $TOKEN" "$API/advisors/security" | python3 -c "import json,sys;from collections import Counter;l=json.load(sys.stdin).get('lints',[]);print(Counter(x['level'] for x in l))"
```
- [ ] Isolamento multi-tenant (script `SECURITY_AUDIT §9`) com contas reais.
- [ ] Métricas de IA fluindo (`v_ops_ai_*` / `ops_ai_metrics`); `ops_alerts` sem críticos.
- [ ] Smoke das jornadas: candidatura, entrevista (voz + parecer), DISC, billing/crédito.
- [ ] Conexões `pg_stat_activity` saudáveis vs `max_connections`.
**Gate 8:** todos os smokes ✅; advisor 0 ERROR; sem erro anormal em `ai_execution_logs`.

## Fase 9 — Estabilização (24–72h)
- Monitorar `ops_alerts`, custo de IA, erros de função, conexões.
- Rodar **slow-query pass** (`pg_stat_statements`) com tráfego real → indexar/otimizar; reavaliar `unused_index` e consolidar `multiple_permissive_policies` nas tabelas quentes (`PERFORMANCE_AUDIT §4`).
- Fechar a **economia real de IA** (fatura Lovable antes × custo direto depois) → atualizar `LLM_AUDIT §5.1`.

---

## 🔙 Rollback (se algo crítico falhar)
- **NÃO descomissionar o Lovable** até a Fase 9 concluída e estável. Ele é o fallback.
- IA: `LLM_DIRECT_PROVIDERS=false` (volta ao gateway) — se a flag estiver ativa e o gateway ainda existir.
- Virada: reapontar DNS/produção de volta ao Lovable.
- Dados: como o antigo ficou congelado (Fase 1), ele permanece íntegro para retorno; perdas = só o que entrou no destino durante a janela.
- Erro de dados no destino: restaurar via PITR/backup (Fase 4).

## Pós-go-live
- Rotacionar **todas** as credenciais que passaram por chat/arquivo (incl. token GitHub).
- Descartar projeto Oregon vazio.
- Reunião de handoff (pauta em `HANDOFF.md §7`).
