# Auditoria e Otimização de LLMs — Gentia (Fase 1, Frente F)

> Entregável do contrato (Cláusula 1.3 "f) Otimização de LLMs" + "g) Análise comparativa de LLMs com recomendação"). Ambiente: destino `tdyvuomybimgygjgvnrk`.
> **Status (2026-06-21):** inventário + recomendação prontos · comparativo de custo com **premissas documentadas** (volume/R$ real fecha no cutover) · **🟢 DESACOPLAMENTO DO LOVABLE GATEWAY = COMPLETO E IMPLEMENTADO** (não é mais "plano": todas as ~80 functions de IA chamam Gemini/Claude/OpenAI **direto**; 0 dependência do gateway). Inclui fixes validados ao vivo (§11). Resta só travar **R$ real** com a fatura no cutover.

---

## 1. Como a IA funciona hoje (pós-desacoplamento)
- **Dois caminhos, ambos DIRETOS ao provedor (sem Lovable Gateway):**
  - `_shared/ai-gateway.ts` (`aiFetch`, drop-in do fetch) — usado pelas ~77 functions que faziam fetch inline; roteia pelo `model` do body → Gemini/OpenAI/Claude e devolve resposta OpenAI-compatible.
  - `_shared/llm-tool-call.ts` (`callLLMTool`, tool-calling/saída estruturada) — usado pelos pareceres/match; força direto quando `LOVABLE_API_KEY` ausente.
- **Roteamento por prefixo do modelo:** `claude*`→Anthropic (Messages API nativa), `gpt*/openai*`→OpenAI, `gemini*/google*`→Google (endpoint OpenAI-compat); voz/transcrição já era direto na OpenAI.
- **Config sem deploy:** `platform_ai_model_config` (troca modelo por serviço) + `feature_llm_mapping` (feature→modelo+tokens médios). Trocar modelo/provedor **não** exige editar as functions.
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

## 6. Desacoplamento do Lovable Gateway — ✅ COMPLETO (todas as functions, gateway removido)
**Evolução:** começou atrás de flag em 4 functions (commit `302f927`, 12/jun) e foi **concluído** (15–21/jun). Hoje **todas as ~80 functions de IA chamam o provedor direto** e o gateway **não é mais usado** (`LOVABLE_API_KEY` removido do destino). Dois mecanismos, ambos diretos:
- **`_shared/ai-gateway.ts` (`aiFetch`)** — drop-in do `fetch`: as ~77 functions que faziam fetch inline ao gateway agora usam `aiFetch`, que roteia pelo `model` → Gemini/OpenAI/Claude e devolve resposta **OpenAI-compatible** (o parsing existente continua válido). O 2º endpoint Lovable (`api.lovable.dev/ai`) também foi convertido.
- **`_shared/llm-tool-call.ts` (`callLLMTool`)** — pareceres/match com tool-calling: força direto quando `LOVABLE_API_KEY` ausente; cliente Anthropic **nativo** (Messages API, não shim).

Roteamento por prefixo do modelo (implementado):

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
- **Estado atual (não é mais "ativação futura"):** `GEMINI_API_KEY` / `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` populadas no destino; `LOVABLE_API_KEY` **removido** → 100% direto. As ~80 functions deployadas e **validadas ao vivo** (entrevistas de voz + pareceres rodando no destino). `platform_ai_model_config` segue trocando modelo sem deploy.
- **Anthropic:** já temos `ANTHROPIC_API_KEY` (salva) + `_shared/anthropic-client.ts`. Tool-calling do Claude mapeia para o mesmo contrato (`tools`/`tool_choice`).
- Remove a dependência de `LOVABLE_API_KEY` (90 functions) — item de maior risco da migração (CLAUDE.md §6).

## 7. Fallback entre modelos/provedores (contrato §f) — ✅ IMPLEMENTADO
O wrapper `callLLMTool` aceita `fallbackModels[]` (commit `24fc9cb`): tenta o primário e, em erro **não-transiente**, percorre a cadeia (cross-provider). Cada modelo tem retry próprio em 429/5xx + parse defensivo de JSON. Em uso real: o parecer técnico usa `fallbackModels: ["claude-sonnet-4-5"]` (commit `31340f7`) — um 400 isolado **não zera mais** a avaliação. Estender as cadeias por feature onde fizer sentido.

## 8. Reduções de custo adicionais
- **Prompt caching:** prefixos estáveis (system + instruções + contexto da vaga) antes do conteúdo variável → leituras a ~0,1× (ver `shared/prompt-caching`). Útil em ranking/screening de muitos candidatos da mesma vaga (já há `cacheKey`/`prompt_cache_key` no wrapper).
- **Batch API:** avaliações não-interativas (screening em massa, reprocessamento) a **50% off**. Já há infra: `llm_batch_jobs`, `llm-batch-dispatcher`, `poll-llm-batch-jobs`.
- **Right-sizing:** screening em `gemini-flash-lite`/`gpt-5-nano`/`haiku`; reservar Sonnet para pareceres.
- **Downgrade dinâmico:** via `platform_ai_model_config` sem deploy, guiado pelas métricas de qualidade (`ai_execution_logs.quality_score`).

## 9. Pendências para o cutover
- Confirmar **preço público vigente** (Gemini/OpenAI/Perplexity) + **% de markup do Lovable** (fatura) → fechar o comparativo R$/mês com volume real.
- ~~Reescrita do wrapper + testar feature a feature~~ → **FEITO** (§6 e §11, validado ao vivo).
- ~~Definir cadeias de fallback~~ → base feita (§7); estender por feature se quiser.
- A/B de qualidade (Gemini×Claude) nos pareceres antes de subir pra Sonnet (opcional).
- **Re-embed** da busca semântica (o modelo de embedding mudou — §11).

## 10. Validação com dados reais (2026-06-06)
Cliente carregou dados reais no destino (59 empresas, 181 candidatos, 124 candidaturas, 193 usuários, **113 logs de IA**, 73 MB):
- **Integridade ✅** RLS 416/416, 0 tabelas sem policy, 0 FKs órfãs. **Isolamento multi-tenant PROVADO em contas reais** (usuário comum vê só a própria conta — A:105/0, B:31/0; `super_admin`+`head_cs` vê tudo **por design**; anon:0). Advisor de segurança **0 ERROR**.
- **🔴→✅ Confiabilidade do parecer:** os logs revelaram que `culture-interview-complete` falhou **~62%** no período em que usou modelos **"pro"** (gemini-2.5-pro **0%** ok; gemini-3-pro-preview ~20%) com erro "no tool_call"; os **flash funcionam 100%**. **Já mitigado em produção** (`current_model`=gemini-3-flash-preview desde ~25/mai; últimas 10 execuções 100% ok) e **blindado contra regressão** (commit `1ae8101`: default+fallback → flash; `default_model` da config → flash).
- **Volume/custo:** logs de IA poucos e concentrados em entrevistas (113 em 24 dias) → volume logado baixo (ou nem toda chamada é instrumentada). **A economia em R$ depende da fatura real do Lovable** — o maior ganho neste dataset é **confiabilidade + qualidade**, não custo absoluto.
- **Recomendação reforçada:** Claude nos pareceres não é só qualidade — é a opção **mais confiável** de tool-calling (os modelos "pro" do Google quebram no schema grande). No cutover, Claude entra como primary/fallback cross-provider do parecer.

## 11. Execução do desacoplamento — fixes validados AO VIVO (15–21/jun/2026)
O desacople (sair do gateway → direto) expôs e corrigiu bugs reais, todos comprovados em produção no destino:
- **🔴 `prompt_cache_key` (HTTP 400 no Gemini):** o wrapper enviava esse campo (exclusivo OpenAI) ao endpoint OpenAI-compat do Google, que rejeita campos desconhecidos → o **parecer técnico zerava** (`overall_score=0`, "Erro na avaliação automática") — **comprovado na sessão de teste do próprio cliente**. O gateway Lovable tolerava o campo; o desacople expôs. Corrigido (commit `31340f7`): só envia p/ OpenAI direto + `fallbackModels` (Claude) de rede de segurança. Reprocessamento da sessão → `status=success`.
- **⚡ Velocidade (thinking do Gemini):** os modelos Flash fazem "thinking" por padrão na API direta (o gateway rodava sem) → 3–4× mais lento (parecer de entrevista 9s→2s). Corrigido com `reasoning_effort="none"` p/ Flash não-pro (commit `f99acf3`).
- **🏷️ Taxonomia de agente:** filtros usavam valores inexistentes (`technical`/`cultural`) em `recruitment_agents.type` (real: `adaptive`=técnico, `disc`=comportamental, `structured`=cultural) → agente técnico pegava prompt errado. Alinhado em **todas** as functions (commits `5328c3a`/`b8b249e`).
- **🔢 Embeddings:** `text-embedding-004` foi **descontinuado** na API Gemini → migrado p/ `gemini-embedding-001`@768 (commit `e6ba54b`). ⚠️ Vetores antigos são de outro modelo → **re-embed** necessário no cutover (senão a busca semântica fica inconsistente).
- **🔁 Resiliência:** retry (429/5xx) centralizado no `aiFetch`.
- **✉️ Email (parte do desacople do Lovable, fora de LLM):** `send-outreach-email`, `process-email-queue` e `auth-email-hook` migrados p/ **Resend direto** (auth via **Supabase Send Email Hook nativo** + standardwebhooks). Testado: recuperação de senha enviada (`status=sent`, provider=resend).

> **Resultado:** dependência de código do Lovable (gateway LLM + endpoint `/ai` + conector de email) = **ZERO**. O que resta pro cutover é configuração (keys reais, fatura p/ fechar R$, re-embed), não código.
