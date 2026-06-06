# Auditoria e Otimização de LLMs — Gentia (Fase 1, Frente F)

> Entregável do contrato (Cláusula 1.3 "f) Otimização de LLMs" + "g) Análise comparativa de LLMs com recomendação"). Ambiente: destino `tdyvuomybimgygjgvnrk`.
> **Status:** inventário + recomendação + plano de desacoplamento prontos. Comparativo de custo com **premissas documentadas** (volume real só na produção Lovable → fechar no cutover). Reescrita do wrapper: **plano desenhado, não implementado** (decisão do dono).

---

## 1. Como a IA funciona hoje
- **Wrapper central:** `supabase/functions/_shared/llm-tool-call.ts` — formato **OpenAI-compatible** (`/v1/chat/completions` + tool-calling), modelos nomeados `provider/model`. Hoje aponta **tudo** para o **Lovable AI Gateway** (`ai.gateway.lovable.dev`, `LOVABLE_API_KEY`).
- **Roteamento:** ~85 chamadas via Lovable Gateway (chat+embeddings); voz/transcrição direto na OpenAI.
- **Config sem deploy:** `platform_ai_model_config` (troca o modelo por serviço) + `feature_llm_mapping` (feature→modelo+tokens médios). **Trocar de provedor não exige editar 85 functions** — é no wrapper + config.
- **Billing/observabilidade:** `ai_execution_logs`, `v_ops_ai_by_model/by_function` (Frente B), `ai_cost_baselines`, `llm_cost_monthly_snapshots`.

## 2. Inventário — finalidade × modelo × tokens (real, do `feature_llm_mapping`)
| Feature | Modelo atual | tokens in~ | tokens out~ | Tipo de tarefa |
|---|---|---:|---:|---|
| screening_evaluation | gemini-2.5-flash-**lite** | 800 | 200 | Classificação simples |
| cultural_match_llm | gemini-2.5-flash | 800 | 400 | Classificação/score |
| disc_evaluation | gemini-2.5-flash | 1500 | 500 | Avaliação estruturada |
| candidate_ranking | gemini-2.5-flash | 2000 | 800 | Ranking/rerank |
| culture_interview_evaluation | gemini-2.5-flash | 3000 | 1500 | **Parecer (qualidade)** |
| technical_interview_evaluation | gemini-2.5-flash | 3000 | 1500 | **Parecer (qualidade)** |
| job_description_generation | gemini-2.5-**pro** | 1000 | 2000 | Geração longa |
| market_research | perplexity/sonar-pro | 1500 | 2000 | Pesquisa web |
| culture_interview_realtime | openai/gpt-realtime-mini | — | — | **Voz (tempo real)** |
| technical_interview_realtime | openai/gpt-realtime-mini | — | — | **Voz (tempo real)** |

Modelos mais usados no código: `gemini-2.5-flash` (89), `gemini-3-flash-preview` (29), `gemini-2.5-flash-lite` (23), `gpt-realtime-mini` (15), `gemini-2.5-pro` (11), `gpt-5*` (12), `claude-sonnet-4-5` (3, já presente).

## 3. ⚠️ Insight central de custo (importante, evita decisão errada)
**Trocar Gemini→Claude NÃO é, por si só, redução de custo.** O Gemini 2.5 Flash é **mais barato por token** que o Claude Haiku. As economias vêm de:
1. 🥇 **Remover o markup do Lovable Gateway** — indo **direto** ao provedor (mesmo modelo, sem intermediário). Maior ganho garantido.
2. **Right-sizing por tarefa** — usar o modelo mais barato que entrega a qualidade (ex.: screening em modelo "nano/lite", não no "flash").
3. **Caching + Batch** — prompt caching (prefixos estáveis) e Batch API (50% off em tarefas não-interativas).

**Claude entra como jogada de QUALIDADE** (não de preço) onde a avaliação impacta o produto: **pareceres de entrevista (cultura/técnica), ranking e match** — onde um julgamento melhor vale mais que centavos por chamada.

## 4. Preços de referência (por 1M tokens)
| Provedor / Modelo | Input | Output | Fonte |
|---|---:|---:|---|
| **Claude Haiku 4.5** (`claude-haiku-4-5`) | **$1.00** | **$5.00** | Oficial (skill claude-api) |
| **Claude Sonnet 4.6** (`claude-sonnet-4-6`) | **$3.00** | **$15.00** | Oficial |
| **Claude Opus 4.8** (`claude-opus-4-8`) | $5.00 | $25.00 | Oficial |
| Gemini 2.5 Flash / Flash-Lite / Pro | ~$0.10–0.30 (blend) | — | Estimativa do `ai-logger.ts` — **confirmar preço público + markup Lovable no cutover** |
| OpenAI gpt-realtime-mini / transcribe | (voz) | — | Direto OpenAI |

## 5. Recomendação por tarefa (o "mais barato que atende a qualidade")
| Feature | Hoje | Recomendado | Por quê |
|---|---|---|---|
| screening_evaluation | gemini-flash-lite | **manter flash-lite** (direto) ou Haiku 4.5 | Classificação simples — modelo barato basta; ganho = tirar markup |
| cultural_match_llm | gemini-flash | flash (direto) ou **Haiku 4.5** | Volume alto; Haiku se quiser padronizar em Claude |
| disc_evaluation | gemini-flash | **Haiku 4.5** | Avaliação estruturada — Haiku entrega com tool-calling |
| candidate_ranking | gemini-flash | **Haiku 4.5** | Rerank — qualidade ajuda; Haiku custo-efetivo |
| **culture_interview_evaluation** | gemini-flash | **Sonnet 4.6** | 🎯 Parecer final — qualidade impacta decisão de contratação |
| **technical_interview_evaluation** | gemini-flash | **Sonnet 4.6** | 🎯 Idem |
| job_description_generation | gemini-pro | **Sonnet 4.6** ou gemini-pro | Geração longa — Sonnet escreve bem; comparar custo×qualidade |
| market_research | perplexity-sonar | manter Perplexity **ou** Claude + web_search | Perplexity já é especializado em web; avaliar |
| **voz (realtime)** | gpt-realtime-mini | **manter OpenAI** | Claude **não faz** realtime de voz — fora de escopo de troca |

Custo/chamada com Claude (preços oficiais, tokens do mapping):
- screening (Haiku): 0.8k×$1 + 0.2k×$5 = **~$0.0018**/call
- ranking (Haiku): 2k×$1 + 0.8k×$5 = **~$0.006**/call
- parecer cultura/técnica (Sonnet): 3k×$3 + 1.5k×$15 = **~$0.0315**/call · (Haiku: ~$0.0105)
- job description (Sonnet): 1k×$3 + 2k×$15 = **~$0.033**/call · (Haiku: ~$0.011)

> Comparativo R$/mês total fica para o cutover, multiplicando estes custos/chamada pelo **volume real** (`ai_execution_logs` da produção). Premissa: ao sair do gateway, o custo dos modelos **mantidos** cai pelo % do markup do Lovable (a confirmar com a fatura).

### 5.1 Comparativo de custo total (com premissas documentadas)
**Premissas (ajustáveis):** volume/mês ≈ **30,3k chamadas** (40 empresas): screening 15k · cultural_match 6k · candidate_ranking 3k · disc 2,5k · parecer cultura 1,5k · parecer técnico 1,5k · job description 0,8k. Tokens por feature = **reais** (`feature_llm_mapping`). **Claude = preço oficial**; **Gemini = referência pública (confirmar)**; **markup Lovable desconhecido (modelado 2×)**; câmbio **R$ 5,50/US$**. Totais **escalam linear com o volume**.

| Estratégia | US$/mês | R$/mês | R$/ano | vs. atual |
|---|--:|--:|--:|--:|
| **A. Hoje** — Gemini + markup ~2× | $106 | R$ 581 | R$ 6.974 | — |
| **B. Gemini DIRETO** (tira markup, mesmos modelos) | $53 | R$ 291 | R$ 3.487 | **−50%** |
| **C. Híbrido** — Gemini direto + Claude **Haiku** nos pareceres | $70 | R$ 387 | R$ 4.646 | **−33%** ✅ rec. |
| **D. Híbrido** — Gemini direto + Claude **Sonnet** nos pareceres | $133 | R$ 734 | R$ 8.804 | +26% |
| **E. Tudo Claude** (Haiku leve + Sonnet pareceres) | $193 | R$ 1.060 | R$ 12.718 | +82% |

**Custo/chamada (referência):** screening — Gemini-lite $0,00016 vs Haiku $0,0018 (~11×); parecer (3k/1,5k) — Gemini $0,0047 · Haiku $0,0105 · Sonnet $0,0315; job description (texto longo) — Haiku $0,011 **< Gemini Pro $0,021**.

**Conclusões:**
- 💰 **Economia de dinheiro vem de sair do gateway** (ir direto) — sozinho corta ~50% (com markup 2×; escala com o markup real). **Trocar tudo por Claude (E) custa MAIS** — Gemini Flash é mais barato por token.
- 🎯 **Claude é jogada de qualidade nos pareceres.** Estratégia **C** (Haiku nos pareceres) ainda economiza ~33% vs hoje **e** põe Claude na decisão que importa; **D** (Sonnet) é topo de qualidade a +26%.
- **Recomendação: C** (com opção de subir pareceres para Sonnet após A/B de qualidade).
- **Travar no cutover:** volume real (`ai_execution_logs`), % de markup (fatura Lovable), preço público vigente do Gemini.

## 6. Desacoplamento do Lovable Gateway — plano (NÃO implementado)
Como o wrapper já é OpenAI-compatible e os modelos são `provider/model`, a mudança é **localizada no `llm-tool-call.ts`** (roteia por prefixo), sem tocar as 85 functions:

```ts
// pseudo — resolver endpoint+key por prefixo do modelo
function route(model: string) {
  if (model.startsWith("claude") || model.startsWith("anthropic/"))
    return { url: "https://api.anthropic.com/v1/chat/completions", key: env("ANTHROPIC_API_KEY") }; // ou SDK
  if (model.startsWith("gpt") || model.startsWith("openai/"))
    return { url: "https://api.openai.com/v1/chat/completions", key: env("OPENAI_API_KEY") };
  if (model.startsWith("google/") || model.startsWith("gemini"))
    return { url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", key: env("GEMINI_API_KEY") };
  if (model.startsWith("perplexity/"))
    return { url: "https://api.perplexity.ai/chat/completions", key: env("PERPLEXITY_API_KEY") };
  // fallback: gateway atual enquanto migra
  return { url: LOVABLE_AI_URL, key: env("LOVABLE_API_KEY") };
}
```
- **Migração segura:** flag/env `LLM_DIRECT_PROVIDERS=true` para alternar gateway↔direto; começar pelas features de menor risco; `platform_ai_model_config` segue trocando modelo sem deploy.
- **Anthropic:** já temos `ANTHROPIC_API_KEY` (salva) + `_shared/anthropic-client.ts`. Tool-calling do Claude mapeia para o mesmo contrato (`tools`/`tool_choice`).
- Remove a dependência de `LOVABLE_API_KEY` (90 functions) — item de maior risco da migração (CLAUDE.md §6).

## 7. Fallback entre modelos/provedores (contrato §f)
Estender o wrapper para, em **timeout / JSON quebrado / 5xx / indisponibilidade / custo anormal**, cair para um modelo alternativo na ordem definida por feature. Ex.: `sonnet-4-6 → haiku-4-5 → gemini-2.5-flash`. Já existe base: retries em 429/5xx + parse defensivo de JSON. Registrar cada fallback em `ai_execution_logs.status='fallback'` (já suportado).

## 8. Reduções de custo adicionais
- **Prompt caching:** prefixos estáveis (system + instruções + contexto da vaga) antes do conteúdo variável → leituras a ~0,1× (ver `shared/prompt-caching`). Útil em ranking/screening de muitos candidatos da mesma vaga (já há `cacheKey`/`prompt_cache_key` no wrapper).
- **Batch API:** avaliações não-interativas (screening em massa, reprocessamento) a **50% off**. Já há infra: `llm_batch_jobs`, `llm-batch-dispatcher`, `poll-llm-batch-jobs`.
- **Right-sizing:** screening em `gemini-flash-lite`/`gpt-5-nano`/`haiku`; reservar Sonnet para pareceres.
- **Downgrade dinâmico:** via `platform_ai_model_config` sem deploy, guiado pelas métricas de qualidade (`ai_execution_logs.quality_score`).

## 9. Pendências para o cutover
- Confirmar **preço público vigente** (Gemini/OpenAI/Perplexity) + **% de markup do Lovable** (fatura) → fechar o comparativo R$/mês com volume real.
- Implementar a reescrita do wrapper (§6) + testar feature a feature com as keys diretas.
- Definir as cadeias de fallback por feature (§7).
- A/B de qualidade (Gemini×Claude) nos pareceres antes de virar 100%.
