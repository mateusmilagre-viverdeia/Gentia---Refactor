# Fase 1: Database e Tipos

## 📋 O que contém
- SQL para criar as tabelas `org_charts` e `org_chart_nodes`
- TypeScript types para todo o organograma

---

## 1. SQL - Criar Tabelas

```sql
-- Tabela de organogramas
CREATE TABLE IF NOT EXISTS public.org_charts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de nós do organograma
CREATE TABLE IF NOT EXISTS public.org_chart_nodes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chart_id UUID NOT NULL REFERENCES public.org_charts(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.org_chart_nodes(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  title TEXT NOT NULL,
  person_name TEXT,
  person_avatar TEXT,
  roles TEXT[],
  color TEXT,
  notes TEXT,
  tags JSONB,
  people JSONB,
  vacancy_status TEXT DEFAULT 'active' CHECK (vacancy_status IN ('active', 'vacant')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_org_charts_account_id ON public.org_charts(account_id);
CREATE INDEX IF NOT EXISTS idx_org_chart_nodes_chart_id ON public.org_chart_nodes(chart_id);
CREATE INDEX IF NOT EXISTS idx_org_chart_nodes_parent_id ON public.org_chart_nodes(parent_id);

-- RLS (Row Level Security)
ALTER TABLE public.org_charts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_chart_nodes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS (adaptar conforme seu sistema de autenticação)
CREATE POLICY "Users can view org charts of their account"
  ON public.org_charts FOR SELECT
  USING (account_id IN (SELECT account_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert org charts in their account"
  ON public.org_charts FOR INSERT
  WITH CHECK (account_id IN (SELECT account_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update org charts of their account"
  ON public.org_charts FOR UPDATE
  USING (account_id IN (SELECT account_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete org charts of their account"
  ON public.org_charts FOR DELETE
  USING (account_id IN (SELECT account_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can view nodes of their org charts"
  ON public.org_chart_nodes FOR SELECT
  USING (chart_id IN (
    SELECT id FROM public.org_charts 
    WHERE account_id IN (SELECT account_id FROM public.profiles WHERE id = auth.uid())
  ));

CREATE POLICY "Users can insert nodes in their org charts"
  ON public.org_chart_nodes FOR INSERT
  WITH CHECK (chart_id IN (
    SELECT id FROM public.org_charts 
    WHERE account_id IN (SELECT account_id FROM public.profiles WHERE id = auth.uid())
  ));

CREATE POLICY "Users can update nodes in their org charts"
  ON public.org_chart_nodes FOR UPDATE
  USING (chart_id IN (
    SELECT id FROM public.org_charts 
    WHERE account_id IN (SELECT account_id FROM public.profiles WHERE id = auth.uid())
  ));

CREATE POLICY "Users can delete nodes in their org charts"
  ON public.org_chart_nodes FOR DELETE
  USING (chart_id IN (
    SELECT id FROM public.org_charts 
    WHERE account_id IN (SELECT account_id FROM public.profiles WHERE id = auth.uid())
  ));
```

---

## 2. TypeScript Types

**Arquivo: `src/types/org-chart.types.ts`**

```typescript
export type VacancyStatus = 'active' | 'vacant';

export interface NodeTag {
  text: string;
  color: string;
}

export interface NodePerson {
  name: string;
  avatar: string | null;
}

export interface OrgChart {
  id: string;
  account_id: string;
  name: string;
  description: string | null;
  is_default: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface OrgChartNode {
  id: string;
  chart_id: string;
  parent_id: string | null;
  position: number;
  title: string;
  person_name: string | null;
  person_avatar: string | null;
  roles: string[];
  color: string | null;
  notes: string | null;
  tags: NodeTag[] | null;
  people: NodePerson[] | null;
  vacancy_status: VacancyStatus;
  created_at: string;
}

export interface OrgChartNodeWithChildren extends OrgChartNode {
  children: OrgChartNodeWithChildren[];
}
```

---

## ✅ Checklist da Fase 1

- [ ] Executar SQL no banco de dados
- [ ] Criar arquivo `src/types/org-chart.types.ts`
- [ ] Adaptar RLS para o seu sistema de autenticação
- [ ] Criar bucket `avatars` no Supabase Storage (para fotos)

---

## 🔜 Próxima Fase
Fase 2: Hooks (`02-hooks.md`)
