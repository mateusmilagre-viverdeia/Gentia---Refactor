# Runbook de Resposta a Incidentes — Gentia

> Entregável do contrato (Fase 1 · "a) Segurança"). Guia básico para reagir a
> vazamento de dados, exposição de credenciais, falha crítica, erro grave em
> produção ou comportamento anômalo. Ambiente: Supabase (projeto de produção).

## Severidades
| Nível | Critério | Resposta (SLA garantia: 8h p/ falha crítica) |
|---|---|---|
| **P0** | Vazamento de dados / credencial exposta / produção fora do ar | Imediata — contenção primeiro |
| **P1** | Erro grave afetando muitos usuários / custo de IA disparando | < 2h |
| **P2** | Erro localizado / degradação | < 24h |
| **P3** | Anomalia sem impacto direto | próxima janela |

## Primeiros 15 minutos (qualquer P0/P1)
1. **Conter antes de investigar.** Pare o sangramento (revogar chave, desabilitar função, bloquear policy).
2. **Registrar** início, sintoma e quem está conduzindo.
3. **Comunicar** ao responsável técnico do cliente (LGPD: incidente com dados pessoais → notificar em **até 24h**, Cláusula 10.4).
4. Só então **diagnosticar** a causa raiz.

---

## Cenário 1 — Vazamento de dados (RLS / endpoint exposto)
**Detecção:** dados de um tenant aparecendo para outro; tabela/endpoint público retornando dados sensíveis.
**Contenção:**
1. Identificar a tabela/policy. Bloquear imediatamente a policy ofensora:
   ```sql
   -- via dashboard SQL ou query API
   alter policy "<policy>" on public.<tabela> using (false);   -- corta o acesso
   -- ou, se for exposição anon:  drop policy "<policy>" on public.<tabela>;
   ```
2. Rodar a auditoria de RLS (confirmar que não há outras):
   ```sql
   select tablename, policyname, roles, cmd from pg_policies
   where schemaname='public' and qual='true' and ('anon'=any(roles) or 'public'=any(roles));
   ```
3. Reaplicar a policy correta (escopada por `account_id`/`is_account_member`).
**Pós:** registrar tabelas afetadas, volume, e notificar (LGPD).

## Cenário 2 — Credencial / secret exposto
**Detecção:** chave em log, repo, chat, ou uso anômalo.
**Contenção:**
1. **Rotacionar a chave AGORA** no provedor (Stripe, OpenAI, Anthropic, Resend, Z-API, etc.).
2. Atualizar o secret no Supabase: *Settings → Edge Functions → Secrets* (ou `supabase secrets set`).
3. Redeploy das functions que usam, se necessário.
4. Auditar uso indevido no período de exposição.
> ⚠️ Secrets nunca em código/Git. `.env` é gitignored. Tokens deste engajamento que passaram por chat devem ser rotacionados.

## Cenário 3 — Produção fora do ar / falha crítica de banco
**Detecção:** app não responde; erros 5xx; conexões esgotadas.
**Diagnóstico:**
- Health: `GET https://api.supabase.com/v1/projects/<ref>/health`.
- Logs/erros: `GET /v1/projects/<ref>/analytics/endpoints/logs.all` ou dashboard → Logs.
- Conexões: dashboard → Database → connection pooling (esgotamento → escalar pooler/compute).
**Recuperação:**
- Connection storm → aumentar pool (Supavisor) / compute.
- Corrupção/erro de migração → restaurar via PITR (dashboard → Database → Backups), respeitando o RPO/RTO definidos.

## Cenário 4 — Custo de IA / API disparando (abuso)
**Detecção:** alerta de custo; pico em `ai_execution_logs` / faturas do provedor.
**Contenção:**
1. Identificar a function/feature pelo `ai_execution_logs` (account_id, function_name, model).
2. Se for endpoint público abusado, exigir auth (já feito em `firecrawl-*`/`help-assistant` via `_shared/require-caller.ts`) ou desabilitar temporariamente.
3. Throttle/limite no provedor; revisar `feature_llm_mapping` / `platform_ai_model_config` para downgrade de modelo.

## Cenário 5 — Comportamento anômalo / erro grave
1. Reproduzir e isolar (qual function, qual conta, desde quando — cruzar com último deploy/migração).
2. Reverter o deploy/migração suspeito se a correção não for imediata.
3. Aplicar fix + monitorar.

---

## Comandos úteis
```sh
# Advisors de segurança/performance do Supabase
curl -H "Authorization: Bearer $TOKEN" https://api.supabase.com/v1/projects/<ref>/advisors/security

# Query API (inspeção sem depender de DNS do banco)
curl -X POST https://api.supabase.com/v1/projects/<ref>/database/query \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  --data '{"query":"<SQL>"}'

# Functions
supabase functions deploy <nome> --project-ref <ref>
supabase functions list --project-ref <ref>
```

## Contatos
- **Responsável técnico (CONTRATADA):** Mateus Milagre — mateusgoncalvesmilagre@gmail.com
- **Responsável (CONTRATANTE/EP Partners):** gg@ecpmais.com.br
- Garantia (Cláusula 4.2): resposta a falha crítica em **8h**, plano em **24h**, correção de falha crítica em **48h**.
