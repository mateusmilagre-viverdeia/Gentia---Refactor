# Plano de Eficiência e Operação com Ganho — Gentia

> Síntese estratégica: o que trocar na IA, qual o ganho, e como rodar o projeto com
> eficiência e margem. Baseado nos dados reais do produto (config de créditos,
> `feature_llm_mapping`, `recruitment_credit_costs`) + auditorias das Frentes A–F.

---

## 1. Onde está o "ganho" — a economia do produto (dado real)
O produto vende **créditos**; cada ação consome créditos. Config real (`platform_credit_config`):
- **Crédito vendido a R$ 1,39–1,99** (pacote grande → pequeno); valor-base **R$ 1,39**; **margem-alvo 50%**; câmbio R$ 5,65/US$.

Ações cobradas (`recruitment_credit_costs`) e receita por ação (a R$ 1,39/crédito):
| Ação | Créditos | Receita | Custo principal | Margem |
|---|--:|--:|---|---|
| `outreach` (100 msgs) | 15 | R$ 20,85 | Z-API/WhatsApp (não-LLM) | alta |
| `ai_interview` | 10 | R$ 13,90 | **voz Realtime (OpenAI)** + parecer | **alta** |
| `marketplace_unlock` | 8 | R$ 11,12 | Apollo/Clearbit (enriquecimento) | alta |
| `disc_assessment` | 5 | R$ 6,95 | LLM texto ~R$ 0,01–0,02 | **~99%** |
| `hunting_search` | 5 | R$ 6,95 | Firecrawl/Apify | alta |
| `profile_enrich` | 3 | R$ 4,17 | Apollo | alta |

**Dois insights que orientam tudo:**
1. **As ações cobradas já têm margem alta** — o custo de IA é centavos contra reais de receita. O produto é estruturalmente lucrativo em IA.
2. **O risco de margem está nas chamadas NÃO cobradas de alta frequência** — `screening_evaluation`, `candidate_ranking`, `cultural_match_llm` rodam no fluxo de recrutamento **sem cobrança direta de crédito**. São **centros de custo puro**. No volume, é aqui que o custo corrói a margem — e é exatamente onde otimizar paga mais.

> Tradução: **não precisamos de Claude para "economizar"** (Gemini Flash é barato). Precisamos de (a) **tirar o markup do gateway** e **right-sizing + cache/batch** nos centros de custo para proteger margem no scale, e (b) **Claude onde a qualidade do parecer vira valor de venda** (justifica/eleva o preço do crédito).

---

## 2. O que trocar na IA — e o ganho
### 2.1 Sair do Lovable Gateway → provedores diretos (maior ganho de custo)
- Hoje ~85 chamadas passam pelo gateway (`LOVABLE_API_KEY`) com markup. Indo **direto** (Gemini/OpenAI/Anthropic) o COGS de IA cai **~50%** (markup 2×; escala com o markup real). Implementação = **reescrever 1 wrapper** (`llm-tool-call.ts`, roteia por prefixo) — não 85 functions (ver `LLM_AUDIT.md §6`).
- **Ganho:** −33% a −50% no gasto de IA (`LLM_AUDIT.md §5.1`) + elimina o risco central da migração (dependência do gateway, CLAUDE.md §6).

### 2.2 Modelo certo por tarefa (híbrido — recomendado: estratégia C)
- **Centros de custo / alto volume** (screening, ranking, match) → **Gemini direto** (barato) + **cache** (mesma vaga → mesmo prefixo) + **Batch API** (50% off em massa).
- **Pareceres de entrevista** (cultura/técnica) → **Claude Haiku 4.5** (qualidade na decisão, ainda −33% vs hoje) ou **Sonnet 4.6** (+26%, topo) — A/B de qualidade decide.
- **Voz (Realtime)** → **fica na OpenAI** (Claude não faz). É o **maior custo do `ai_interview`** → monitorar via `ai_execution_logs`.
- **Ganho:** custo sob controle no volume + **qualidade do parecer ↑** (o parecer é o entregável que o cliente "compra" — melhora retenção e justifica preço do crédito).

### 2.3 Governança de modelo e fallback
- Trocar modelo **sem deploy** via `platform_ai_model_config`; medir qualidade com `ai_execution_logs.quality_score`; **downgrade dinâmico** em tarefa simples.
- **Fallback** por feature (timeout/JSON quebrado/indisponibilidade/custo anormal): ex. `sonnet → haiku → gemini-flash` (`LLM_AUDIT.md §7`).

---

## 3. Plano operacional para rodar com eficiência e margem
### 3.1 Camada de IA (custo + qualidade governados)
Wrapper direto com roteamento + fallback + cache; Batch para lotes; `feature_llm_mapping`/`platform_ai_model_config` como painel de controle. Meta: **cada feature no modelo mais barato que mantém o `quality_score`**.

### 3.2 Margem como métrica de primeira classe (novo)
Cruzar **custo de IA real** (`ai_execution_logs.estimated_cost`) com a **receita em crédito** da ação → **margem por feature**. Alertar quando uma feature degrada (modelo caro demais, tokens inchando, custo/crédito acima do teto). Já temos a base: views `v_ops_ai_*` + `ops-health-monitor` (alerta de custo 24h). Próximo: view `margem por feature` (receita_crédito − custo_IA).

### 3.3 Stack de terceiros = custo das ações cobradas não-LLM
`marketplace_unlock`/`hunting_search`/`profile_enrich`/`outreach` custam **APIs externas** (Apollo, Clearbit, Firecrawl, Apify, Z-API), não LLM. Eficiência aqui: **cache de enriquecimento** (não re-enriquecer o mesmo perfil), de-dup de buscas, validação de e-mail antes de gastar. Secrets faltantes mapeados em `SECRETS_INVENTORY.md`.

### 3.4 Infraestrutura e escala (Frente E — a fazer)
- **Connection pooling (Supavisor, transaction mode)** para as 283 edge functions (evita esgotar conexões).
- **Compute** `ci_small` cobre a fase atual; dimensionar para `ci_medium/large` conforme `cpu/ram/disk IO` reais.
- **Cache** nos pontos quentes (catálogos, configs, resultados determinísticos).
- Otimizar edge functions (reuso de client, menos round-trips). Plano de escala 12 meses em `PERFORMANCE_AUDIT.md §5`.

### 3.5 Observabilidade & alertas (Frente B — feito; ativar no cutover)
Métricas de IA (custo/dia, p95, erro%), `ops-health-monitor` (custo anormal, erro alto), `ops_alerts` + Discord. Cutover: reapontar crons, rotacionar `CRON_SECRET`, plugar webhook real, **agendar o monitor**.

### 3.6 Segurança & confiabilidade (Frente A — feito; D — a fazer)
RLS 100%, PII fechada, isolamento provado, advisor 0 ERROR (`SECURITY_AUDIT.md`). Falta **Backup/DR** (PITR, RPO/RTO, teste de restore) — Frente D.

### 3.7 Cadência operacional (mensal)
Revisar: custo de IA × margem por feature; `unused_index`/queries lentas reais (`pg_stat_statements`); modelos vs `quality_score`; faturas dos provedores; alertas abertos em `ops_alerts`. Já existe infra de relatório mensal (`monthly-llm-cost-report`, `llm_cost_monthly_snapshots`).

---

## 4. Sequência recomendada (roadmap)
1. **Fechar contrato (Fase 1):** Frente E (infra/pooling/cache) → D (backup/DR) → handoff. *(A, B, C, F já entregues no escopo sem dados reais.)*
2. **Cutover:** dados reais + secrets + reapontar crons/URLs; travar volume real e markup → **fechar os R$ do `LLM_AUDIT §5.1`**.
3. **Otimização de IA (pós-aceite/Fase 2):** reescrever o wrapper (sair do gateway) → ativar híbrido (Gemini direto + Claude pareceres) → cache + batch nos centros de custo → view de margem por feature + alertas.

---

## 5. Ganhos esperados (resumo)
| Alavanca | Ganho | Tipo |
|---|---|---|
| Sair do Lovable Gateway (direto) | **−33% a −50%** no gasto de IA | Custo (garantido) |
| Right-sizing + cache + batch nos centros de custo | Margem protegida no scale (alto volume) | Margem |
| Claude nos pareceres | Qualidade da decisão ↑ → retenção/preço do crédito | Receita/valor |
| Pooling + compute right-size (Frente E) | Suporta crescimento sem estouro de conexões/custo | Eficiência/escala |
| Cache de enriquecimento (terceiros) | Menos chamadas pagas Apollo/Firecrawl repetidas | Custo |
| Margem como métrica + alertas | Evita corrosão silenciosa de margem | Governança |

> Números de IA em `LLM_AUDIT.md §5.1` (premissas documentadas; fechar no cutover com volume/markup reais).
