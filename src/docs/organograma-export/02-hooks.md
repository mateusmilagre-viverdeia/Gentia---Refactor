# Fase 2: Hooks

## 📋 O que contém
- Hook `use-debounce` para debounce de valores
- Hook `useOrgChartZoom` para controle de zoom
- Hook `useOrgCharts` para CRUD completo

---

## 1. use-debounce

**Arquivo: `src/hooks/use-debounce.ts`**

```typescript
import { useEffect, useState } from "react";

export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
```

---

## 2. useOrgChartZoom

**Arquivo: `src/hooks/useOrgChartZoom.ts`**

```typescript
import { useState, useCallback, useEffect, RefObject } from 'react';

interface UseOrgChartZoomOptions {
  minZoom?: number;
  maxZoom?: number;
  zoomStep?: number;
  defaultZoom?: number;
}

interface UseOrgChartZoomReturn {
  zoomLevel: number;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  setZoom: (level: number) => void;
  canZoomIn: boolean;
  canZoomOut: boolean;
}

export function useOrgChartZoom(
  containerRef: RefObject<HTMLElement>,
  options: UseOrgChartZoomOptions = {}
): UseOrgChartZoomReturn {
  const {
    minZoom = 0.25,
    maxZoom = 2,
    zoomStep = 0.1,
    defaultZoom = 1,
  } = options;

  const [zoomLevel, setZoomLevel] = useState(defaultZoom);

  const zoomIn = useCallback(() => {
    setZoomLevel((prev) => Math.min(prev + zoomStep, maxZoom));
  }, [zoomStep, maxZoom]);

  const zoomOut = useCallback(() => {
    setZoomLevel((prev) => Math.max(prev - zoomStep, minZoom));
  }, [zoomStep, minZoom]);

  const resetZoom = useCallback(() => {
    setZoomLevel(defaultZoom);
  }, [defaultZoom]);

  const setZoom = useCallback(
    (level: number) => {
      setZoomLevel(Math.max(minZoom, Math.min(level, maxZoom)));
    },
    [minZoom, maxZoom]
  );

  // Handle Ctrl + Mouse Wheel zoom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -zoomStep : zoomStep;
        setZoomLevel((prev) => Math.max(minZoom, Math.min(prev + delta, maxZoom)));
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [containerRef, zoomStep, minZoom, maxZoom]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          zoomIn();
        } else if (e.key === '-') {
          e.preventDefault();
          zoomOut();
        } else if (e.key === '0') {
          e.preventDefault();
          resetZoom();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoomIn, zoomOut, resetZoom]);

  return {
    zoomLevel,
    zoomIn,
    zoomOut,
    resetZoom,
    setZoom,
    canZoomIn: zoomLevel < maxZoom,
    canZoomOut: zoomLevel > minZoom,
  };
}
```

---

## 3. useOrgCharts (Principal)

**Arquivo: `src/hooks/useOrgCharts.ts`**

> ⚠️ **ADAPTAR:** Substitua `useAccount` pelo seu hook de conta/organização

```typescript
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAccount } from '@/hooks/useAccount'; // ⚠️ ADAPTAR
import { toast } from 'sonner';
import type { OrgChart, OrgChartNode, OrgChartNodeWithChildren, NodeTag, NodePerson, VacancyStatus } from '@/types/org-chart.types';

// Helper to safely parse tags from JSON
const parseTags = (tags: unknown): NodeTag[] | null => {
  if (!tags) return null;
  if (Array.isArray(tags)) return tags as NodeTag[];
  return null;
};

// Helper to safely parse people from JSON
const parsePeople = (people: unknown): NodePerson[] | null => {
  if (!people) return null;
  if (Array.isArray(people)) return people as NodePerson[];
  return null;
};

// Helper to map database row to OrgChartNode
const mapDbRowToNode = (row: Record<string, unknown>): OrgChartNode => ({
  id: row.id as string,
  chart_id: row.chart_id as string,
  parent_id: row.parent_id as string | null,
  position: row.position as number,
  title: row.title as string,
  person_name: row.person_name as string | null,
  person_avatar: row.person_avatar as string | null,
  roles: (row.roles as string[]) || [],
  color: row.color as string | null,
  notes: row.notes as string | null,
  tags: parseTags(row.tags),
  people: parsePeople(row.people),
  vacancy_status: (row.vacancy_status as VacancyStatus) || 'active',
  created_at: row.created_at as string,
});

export function useOrgCharts() {
  const { account } = useAccount(); // ⚠️ ADAPTAR
  const [orgCharts, setOrgCharts] = useState<OrgChart[]>([]);
  const [selectedChart, setSelectedChart] = useState<OrgChart | null>(null);
  const [nodes, setNodes] = useState<OrgChartNode[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCharts = useCallback(async () => {
    if (!account?.id) return;
    
    const { data, error } = await supabase
      .from('org_charts')
      .select('*')
      .eq('account_id', account.id)
      .order('created_at', { ascending: true });

    if (error) {
      toast.error('Erro ao carregar organogramas');
      return;
    }

    setOrgCharts(data || []);
    
    if (data && data.length > 0 && !selectedChart) {
      const defaultChart = data.find(c => c.is_default) || data[0];
      setSelectedChart(defaultChart);
    }
  }, [account?.id, selectedChart]);

  const loadNodes = useCallback(async () => {
    if (!selectedChart?.id) {
      setNodes([]);
      return;
    }

    const { data, error } = await supabase
      .from('org_chart_nodes')
      .select('*')
      .eq('chart_id', selectedChart.id)
      .order('position', { ascending: true });

    if (error) {
      toast.error('Erro ao carregar nós do organograma');
      return;
    }

    setNodes((data || []).map(mapDbRowToNode));
  }, [selectedChart?.id]);

  useEffect(() => {
    if (account?.id) {
      setLoading(true);
      loadCharts().finally(() => setLoading(false));
    }
  }, [account?.id, loadCharts]);

  useEffect(() => {
    loadNodes();
  }, [loadNodes]);

  const createChart = async (name: string, description?: string) => {
    if (!account?.id) return;

    const { data, error } = await supabase
      .from('org_charts')
      .insert({
        account_id: account.id,
        name,
        description: description || null,
        is_default: orgCharts.length === 0,
      })
      .select()
      .single();

    if (error) {
      toast.error('Erro ao criar organograma');
      return;
    }

    setOrgCharts(prev => [...prev, data]);
    setSelectedChart(data);
    toast.success('Organograma criado!');
  };

  const updateChart = async (chartId: string, updates: Partial<Pick<OrgChart, 'name' | 'description'>>) => {
    const { error } = await supabase
      .from('org_charts')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', chartId);

    if (error) {
      toast.error('Erro ao atualizar organograma');
      return;
    }

    setOrgCharts(prev => prev.map(c => c.id === chartId ? { ...c, ...updates } : c));
    if (selectedChart?.id === chartId) {
      setSelectedChart(prev => prev ? { ...prev, ...updates } : null);
    }
    toast.success('Organograma atualizado!');
  };

  const deleteChart = async (chartId: string) => {
    const { error } = await supabase
      .from('org_charts')
      .delete()
      .eq('id', chartId);

    if (error) {
      toast.error('Erro ao excluir organograma');
      return;
    }

    const remaining = orgCharts.filter(c => c.id !== chartId);
    setOrgCharts(remaining);
    setSelectedChart(remaining[0] || null);
    toast.success('Organograma excluído!');
  };

  const addNode = async (
    title: string,
    parentId: string | null = null,
    personName?: string,
    roles?: string[],
    personAvatar?: string,
    people?: NodePerson[],
    vacancyStatus: VacancyStatus = 'active'
  ) => {
    if (!selectedChart?.id) return;

    const siblings = nodes.filter(n => n.parent_id === parentId);
    const position = siblings.length;

    const { data, error } = await supabase
      .from('org_chart_nodes')
      .insert({
        chart_id: selectedChart.id,
        parent_id: parentId,
        position,
        title,
        person_name: personName || null,
        roles: roles || [],
        person_avatar: personAvatar || null,
        people: people ? JSON.parse(JSON.stringify(people)) : [],
        vacancy_status: vacancyStatus,
      })
      .select()
      .single();

    if (error) {
      toast.error('Erro ao adicionar cargo');
      return;
    }

    const mappedNode = mapDbRowToNode(data as Record<string, unknown>);
    setNodes(prev => [...prev, mappedNode]);
    toast.success('Cargo adicionado!');
    return mappedNode;
  };

  const updateNode = async (
    nodeId: string,
    updates: Partial<Pick<OrgChartNode, 'title' | 'person_name' | 'person_avatar' | 'roles' | 'color' | 'notes' | 'tags' | 'people' | 'vacancy_status'>>
  ) => {
    // Convert tags and people to JSON-compatible format for Supabase
    const dbUpdates = {
      ...updates,
      tags: updates.tags ? JSON.parse(JSON.stringify(updates.tags)) : undefined,
      people: updates.people ? JSON.parse(JSON.stringify(updates.people)) : undefined,
    };

    const { error } = await supabase
      .from('org_chart_nodes')
      .update(dbUpdates)
      .eq('id', nodeId);

    if (error) {
      toast.error('Erro ao atualizar cargo');
      return;
    }

    setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, ...updates } : n));
  };

  const deleteNode = async (nodeId: string) => {
    // First, find all descendants
    const descendants = getDescendants(nodeId);
    const allIds = [nodeId, ...descendants.map(d => d.id)];

    const { error } = await supabase
      .from('org_chart_nodes')
      .delete()
      .in('id', allIds);

    if (error) {
      toast.error('Erro ao excluir cargo');
      return;
    }

    setNodes(prev => prev.filter(n => !allIds.includes(n.id)));
    toast.success('Cargo excluído!');
  };

  const getDescendants = (nodeId: string): OrgChartNode[] => {
    const children = nodes.filter(n => n.parent_id === nodeId);
    return children.flatMap(child => [child, ...getDescendants(child.id)]);
  };

  const moveNode = async (nodeId: string, newParentId: string | null) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    // Prevent moving to own descendant
    const descendants = getDescendants(nodeId);
    if (newParentId && descendants.some(d => d.id === newParentId)) {
      toast.error('Não é possível mover para um subordinado');
      return;
    }

    const siblings = nodes.filter(n => n.parent_id === newParentId && n.id !== nodeId);
    const newPosition = siblings.length;

    const { error } = await supabase
      .from('org_chart_nodes')
      .update({ parent_id: newParentId, position: newPosition })
      .eq('id', nodeId);

    if (error) {
      toast.error('Erro ao mover cargo');
      return;
    }

    setNodes(prev => prev.map(n => 
      n.id === nodeId ? { ...n, parent_id: newParentId, position: newPosition } : n
    ));
  };

  const getTreeStructure = useCallback((): OrgChartNodeWithChildren[] => {
    const buildTree = (parentId: string | null): OrgChartNodeWithChildren[] => {
      return nodes
        .filter(n => n.parent_id === parentId)
        .sort((a, b) => a.position - b.position)
        .map(node => ({
          ...node,
          children: buildTree(node.id),
        }));
    };

    return buildTree(null);
  }, [nodes]);

  return {
    orgCharts,
    selectedChart,
    setSelectedChart,
    nodes,
    loading,
    createChart,
    updateChart,
    deleteChart,
    addNode,
    updateNode,
    deleteNode,
    moveNode,
    getTreeStructure,
    loadNodes,
  };
}
```

---

## ✅ Checklist da Fase 2

- [ ] Criar `src/hooks/use-debounce.ts`
- [ ] Criar `src/hooks/useOrgChartZoom.ts`
- [ ] Criar `src/hooks/useOrgCharts.ts`
- [ ] Adaptar `useAccount` para seu hook de autenticação
- [ ] Instalar `sonner` para toasts: `npm install sonner`

---

## 🔜 Próxima Fase
Fase 3: Componentes Base (`03-componentes-base.md`)
