# Segurança - Gentia Platform

## Visão Geral

Este documento descreve as políticas de segurança implementadas e as justificativas para decisões de design.

## Fase 1 - Correções Críticas Implementadas

### 1. ErrorBoundary Global
- **Arquivo:** `src/components/ErrorBoundary.tsx`
- **Propósito:** Captura erros de React e previne crashes totais da aplicação
- **Integração:** Envolve toda a aplicação em `App.tsx`

### 2. Logger Condicional
- **Arquivo:** `src/lib/logger.ts`
- **Propósito:** Suprime logs em produção para evitar vazamento de informações sensíveis
- **Uso:** Substituir `console.log/warn/error` por `logger.log/warn/error`

### 3. RLS Vulnerabilities Corrigidas
As seguintes tabelas tiveram suas políticas RLS corrigidas:

| Tabela | Vulnerabilidade | Correção |
|--------|-----------------|----------|
| `culture_interview_responses` | Acesso público a respostas | RLS restrito a membros da conta |
| `employees` | Dados sensíveis expostos | View segura `employees_public` criada |
| `recruitment_candidates` | Acesso público | RLS restrito a membros da conta |
| `talent_pool` | Acesso público | RLS restrito a membros da conta |
| `profiles` | Dados sensíveis expostos | View segura `profiles_public_safe` criada |

## Fase 2 - Funções SQL Corrigidas

### search_path Imutável
Funções de trigger corrigidas com `SET search_path = public`:
- `update_offboarding_updated_at()`
- `update_updated_at_column()`

## Políticas RLS Justificadas (Warnings Aceitos)

### 1. RLS Policy Always True (`SUPA_rls_policy_always_true`)
**Status:** ✅ Ignorado - Justificado

**Justificativa:** Políticas `USING (true)` são intencionais para:
- **Tabelas de catálogo:** `behaviors_reference`, `development_catalog`, `disc_questions` - dados de referência públicos
- **Badges e gamificação:** `badges` - catálogo de conquistas visível a todos
- **Storage objects:** Buckets públicos como avatares e logos

### 2. Leaked Password Protection (`SUPA_auth_leaked_password_protection`)
**Status:** ✅ Ignorado - Requer Ação Manual

**Justificativa:** Esta configuração deve ser habilitada manualmente:
1. Acessar Lovable Cloud → Auth → Settings
2. Habilitar "Leaked Password Protection"

### 3. Pulse De-anonymization (`pulse_deanonymization`)
**Status:** ✅ MITIGADO

**Risco Original:** Em equipes pequenas (< 5 pessoas), respostas anônimas podiam ser correlacionadas.

**Mitigação Implementada (Fase 4):**

1. **Threshold de Privacidade**: Função `can_view_team_responses()` verifica se equipe atinge mínimo de 5 membros
2. **View Agregada**: `pulse_responses_aggregated` agrupa respostas por semana para equipes pequenas
3. **Threshold Configurável**: Coluna `anonymity_threshold` em `pulse_schedule_rules` permite customização por conta
4. **Funções Helpers**: 
   - `get_team_size()` - retorna tamanho ativo da equipe
   - `get_account_anonymity_threshold()` - retorna threshold configurado
5. **UI Warning**: Componente `PulseSmallTeamWarning` alerta líderes sobre dados agregados
6. **Hook de Privacidade**: `usePulseTeamPrivacy` verifica status de privacidade por equipe

**Resultado:** Líderes de equipes < 5 membros veem apenas médias semanais, não respostas individuais.

### 4. Security Definer View (`SUPA_security_definer_view`)
**Status:** ✅ Ignorado - Intencional

**Justificativa:** A view `pulse_responses_aggregated` é propositalmente SECURITY DEFINER para:
- Garantir acesso controlado a dados agregados
- Aplicar lógica de privacidade consistente
- Funcionar com RLS policies existentes

## Manutenção Contínua

### Checklist de Segurança para Novas Features

- [ ] Tabelas novas têm RLS habilitado
- [ ] Políticas RLS usam `is_account_member()` ou similar
- [ ] Edge functions validam JWT quando necessário
- [ ] Dados sensíveis não são expostos em logs
- [ ] Views seguras são usadas para dados públicos

### Comandos de Verificação

```bash
# Rodar scan de segurança
# Use a ferramenta security--run_security_scan no Lovable

# Verificar policies RLS
# Use supabase--linter no Lovable
```

## Contatos

Para questões de segurança, contate a equipe de desenvolvimento.

---
*Última atualização: 2026-01-19*
