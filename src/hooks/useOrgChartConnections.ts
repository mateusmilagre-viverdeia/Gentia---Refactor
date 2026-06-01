import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface OrgChartConnection {
  id: string;
  chart_id: string;
  source_node_id: string;
  target_node_id: string;
  line_style: 'solid' | 'dashed' | 'dotted';
  label: string | null;
  color: string | null;
  created_at: string;
}

export function useOrgChartConnections(chartId: string | null) {
  const [connections, setConnections] = useState<OrgChartConnection[]>([]);
  const [loading, setLoading] = useState(false);

  const loadConnections = useCallback(async () => {
    if (!chartId) {
      setConnections([]);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('org_chart_connections')
      .select('*')
      .eq('chart_id', chartId);

    if (error) {
      console.error('Error loading connections:', error);
      toast.error('Erro ao carregar conexões');
      setLoading(false);
      return;
    }

    setConnections((data || []) as OrgChartConnection[]);
    setLoading(false);
  }, [chartId]);

  useEffect(() => {
    loadConnections();
  }, [loadConnections]);

  const addConnection = async (
    sourceNodeId: string,
    targetNodeId: string,
    lineStyle: 'solid' | 'dashed' | 'dotted' = 'dashed',
    label?: string,
    color?: string
  ) => {
    if (!chartId) return null;

    // Check if connection already exists
    const exists = connections.some(
      c => 
        (c.source_node_id === sourceNodeId && c.target_node_id === targetNodeId) ||
        (c.source_node_id === targetNodeId && c.target_node_id === sourceNodeId)
    );

    if (exists) {
      toast.error('Esta conexão já existe');
      return null;
    }

    const { data, error } = await supabase
      .from('org_chart_connections')
      .insert({
        chart_id: chartId,
        source_node_id: sourceNodeId,
        target_node_id: targetNodeId,
        line_style: lineStyle,
        label: label || null,
        color: color || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding connection:', error);
      toast.error('Erro ao criar conexão');
      return null;
    }

    const newConnection = data as OrgChartConnection;
    setConnections(prev => [...prev, newConnection]);
    toast.success('Conexão criada!');
    return newConnection;
  };

  const updateConnection = async (
    connectionId: string,
    updates: Partial<Pick<OrgChartConnection, 'line_style' | 'label' | 'color'>>
  ) => {
    const { error } = await supabase
      .from('org_chart_connections')
      .update(updates)
      .eq('id', connectionId);

    if (error) {
      console.error('Error updating connection:', error);
      toast.error('Erro ao atualizar conexão');
      return;
    }

    setConnections(prev => 
      prev.map(c => c.id === connectionId ? { ...c, ...updates } : c)
    );
  };

  const deleteConnection = async (connectionId: string) => {
    const { error } = await supabase
      .from('org_chart_connections')
      .delete()
      .eq('id', connectionId);

    if (error) {
      console.error('Error deleting connection:', error);
      toast.error('Erro ao excluir conexão');
      return;
    }

    setConnections(prev => prev.filter(c => c.id !== connectionId));
    toast.success('Conexão removida!');
  };

  const deleteConnectionsByNode = async (nodeId: string) => {
    const { error } = await supabase
      .from('org_chart_connections')
      .delete()
      .or(`source_node_id.eq.${nodeId},target_node_id.eq.${nodeId}`);

    if (error) {
      console.error('Error deleting node connections:', error);
      return;
    }

    setConnections(prev => 
      prev.filter(c => c.source_node_id !== nodeId && c.target_node_id !== nodeId)
    );
  };

  return {
    connections,
    loading,
    addConnection,
    updateConnection,
    deleteConnection,
    deleteConnectionsByNode,
    loadConnections,
  };
}
