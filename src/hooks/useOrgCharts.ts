import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAccount } from '@/hooks/useAccount';
import { toast } from 'sonner';
import type { OrgChart, OrgChartNode, OrgChartNodeWithChildren, NodeTag, NodePerson, VacancyStatus, NodeType } from '@/types/org-chart.types';

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

// Helper to safely parse string array from JSON
const parseStringArray = (arr: unknown): string[] | null => {
  if (!arr) return null;
  if (Array.isArray(arr)) return arr as string[];
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
  node_type: (row.node_type as NodeType) || null,
  maturity_level: row.maturity_level as number | null,
  capacity_score: row.capacity_score as number | null,
  key_competencies: parseStringArray(row.key_competencies),
  competency_gaps: parseStringArray(row.competency_gaps),
  created_at: row.created_at as string,
});

export function useOrgCharts() {
  const { account } = useAccount();
  const [orgCharts, setOrgCharts] = useState<OrgChart[]>([]);
  const [selectedChart, setSelectedChart] = useState<OrgChart | null>(null);
  const [nodes, setNodes] = useState<OrgChartNode[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCharts = useCallback(async () => {
    if (!account?.id) {
      setOrgCharts([]);
      setSelectedChart(null);
      return;
    }
    
    const { data, error } = await supabase
      .from('org_charts')
      .select('*')
      .eq('account_id', account.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[useOrgCharts] Error loading charts:', { account_id: account.id, error });
      toast.error(`Erro ao carregar organogramas: ${error.message}`);
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
    if (!account?.id) {
      toast.error('Organização ainda não carregada. Aguarde e tente novamente.');
      return;
    }

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
      console.error('[useOrgCharts] Error creating chart:', { account_id: account.id, name, error });
      toast.error(`Erro ao criar organograma: ${error.message}`);
      return;
    }

    await loadCharts();
    setSelectedChart(data);
    toast.success('Organograma criado!');
  };

  const updateChart = async (chartId: string, updates: Partial<Pick<OrgChart, 'name' | 'description'>>) => {
    const { error } = await supabase
      .from('org_charts')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', chartId);

    if (error) {
      console.error('[useOrgCharts] Error updating chart:', { account_id: account?.id, chart_id: chartId, error });
      toast.error(`Erro ao atualizar organograma: ${error.message}`);
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
      console.error('[useOrgCharts] Error adding node:', { account_id: account?.id, chart_id: selectedChart.id, error });
      toast.error(`Erro ao adicionar cargo: ${error.message}`);
      return;
    }

    const mappedNode = mapDbRowToNode(data as Record<string, unknown>);
    setNodes(prev => [...prev, mappedNode]);
    toast.success('Cargo adicionado!');
    return mappedNode;
  };

  const updateNode = async (
    nodeId: string,
    updates: Partial<Pick<OrgChartNode, 'title' | 'person_name' | 'person_avatar' | 'roles' | 'color' | 'notes' | 'tags' | 'people' | 'vacancy_status' | 'node_type' | 'maturity_level' | 'capacity_score' | 'key_competencies' | 'competency_gaps'>>
  ) => {
    // Convert tags and people to JSON-compatible format for Supabase
    const dbUpdates = {
      ...updates,
      tags: updates.tags ? JSON.parse(JSON.stringify(updates.tags)) : undefined,
      people: updates.people ? JSON.parse(JSON.stringify(updates.people)) : undefined,
      key_competencies: updates.key_competencies !== undefined ? updates.key_competencies : undefined,
      competency_gaps: updates.competency_gaps !== undefined ? updates.competency_gaps : undefined,
    };

    const { error } = await supabase
      .from('org_chart_nodes')
      .update(dbUpdates)
      .eq('id', nodeId);

    if (error) {
      console.error('[useOrgCharts] Error updating node:', { account_id: account?.id, chart_id: selectedChart?.id, node_id: nodeId, error });
      toast.error(`Erro ao atualizar cargo: ${error.message}`);
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
      console.error('[useOrgCharts] Error moving node:', { account_id: account?.id, chart_id: selectedChart?.id, node_id: nodeId, error });
      toast.error(`Erro ao mover cargo: ${error.message}`);
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
