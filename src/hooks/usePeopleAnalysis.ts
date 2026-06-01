import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAccount } from '@/hooks/useAccount';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useToast } from '@/hooks/use-toast';
import type { 
  PeopleAnalysis, 
  PeopleAnalysisMember, 
  PeopleAnalysisRating,
  PeopleAnalysisVersionHistory,
  FilterOption,
  PeopleAnalysisFilterOptions
} from '@/types/people-analysis.types';

export function usePeopleAnalysis() {
  const { isAdmin, isOwner, isAdminRH, loading: accountLoading } = useAccount();
  const { currentAccount: account, isConsultantMode } = useOrganization();
  const { toast } = useToast();
  
  const [analyses, setAnalyses] = useState<PeopleAnalysis[]>([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState<PeopleAnalysis | null>(null);
  const [members, setMembers] = useState<PeopleAnalysisMember[]>([]);
  const [ratings, setRatings] = useState<PeopleAnalysisRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [versionHistory, setVersionHistory] = useState<PeopleAnalysisVersionHistory[]>([]);

  // Filter states
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [selectedFunctionId, setSelectedFunctionId] = useState<string | null>(null);
  const [filterOptions, setFilterOptions] = useState<PeopleAnalysisFilterOptions>({
    teams: [],
    functions: []
  });

  const canAccess = isAdmin || isOwner || isAdminRH || isConsultantMode;

  // Load all analyses for the account
  const loadAnalyses = useCallback(async () => {
    // Wait for account to finish loading before checking access
    if (accountLoading) return;
    
    if (!account?.id || !canAccess) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('people_analyses')
        .select('*')
        .eq('account_id', account.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const parsed = (data || []).map(item => ({
        ...item,
        values_snapshot: typeof item.values_snapshot === 'string' 
          ? JSON.parse(item.values_snapshot) 
          : item.values_snapshot || []
      }));
      
      setAnalyses(parsed);
      
      // Auto-select first analysis if none selected
      if (parsed.length > 0 && !selectedAnalysis) {
        setSelectedAnalysis(parsed[0]);
      }
    } catch (error) {
      console.error('Error loading analyses:', error);
    } finally {
      setLoading(false);
    }
  }, [account?.id, canAccess, selectedAnalysis, accountLoading]);

  // Load members and ratings for selected analysis
  const loadMembersAndRatings = useCallback(async () => {
    if (!selectedAnalysis) {
      setMembers([]);
      setRatings([]);
      return;
    }

    try {
      // Load members with joined data for teams and org_nodes
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = supabase as any;
      const { data: membersData, error: membersError } = await client
        .from('people_analysis_members')
        .select(`
          *,
          team:pulse_teams(id, name),
          org_node:org_chart_nodes(id, title)
        `)
        .eq('analysis_id', selectedAnalysis.id)
        .order('position', { ascending: true });

      if (membersError) throw membersError;
      setMembers(membersData || []);

      // Load ratings for all members
      if (membersData && membersData.length > 0) {
        const memberIds = membersData.map((m: PeopleAnalysisMember) => m.id);
        const { data: ratingsData, error: ratingsError } = await supabase
          .from('people_analysis_ratings')
          .select('*')
          .in('member_id', memberIds);

        if (ratingsError) throw ratingsError;
        setRatings(ratingsData || []);
      } else {
        setRatings([]);
      }
    } catch (error) {
      console.error('Error loading members/ratings:', error);
    }
  }, [selectedAnalysis]);

  // Load filter options from members
  const loadFilterOptions = useCallback(() => {
    if (!members.length) {
      setFilterOptions({ teams: [], functions: [] });
      return;
    }

    // Get unique teams from members
    const teamsMap = new Map<string, { name: string; count: number }>();
    const functionsMap = new Map<string, { name: string; count: number }>();

    members.forEach(member => {
      // Count teams
      if (member.team_id && member.team) {
        const existing = teamsMap.get(member.team_id);
        if (existing) {
          existing.count++;
        } else {
          teamsMap.set(member.team_id, { name: member.team.name, count: 1 });
        }
      }

      // Count functions (org_nodes)
      if (member.org_node_id && member.org_node) {
        const existing = functionsMap.get(member.org_node_id);
        if (existing) {
          existing.count++;
        } else {
          functionsMap.set(member.org_node_id, { name: member.org_node.title, count: 1 });
        }
      }
    });

    const teams: FilterOption[] = Array.from(teamsMap.entries()).map(([id, data]) => ({
      id,
      name: data.name,
      memberCount: data.count
    })).sort((a, b) => a.name.localeCompare(b.name));

    const functions: FilterOption[] = Array.from(functionsMap.entries()).map(([id, data]) => ({
      id,
      name: data.name,
      memberCount: data.count
    })).sort((a, b) => a.name.localeCompare(b.name));

    setFilterOptions({ teams, functions });
  }, [members]);

  useEffect(() => {
    loadFilterOptions();
  }, [loadFilterOptions]);

  // Filtered members based on selected filters
  const filteredMembers = useMemo(() => {
    let result = members;

    if (selectedTeamId) {
      result = result.filter(m => m.team_id === selectedTeamId);
    }

    if (selectedFunctionId) {
      result = result.filter(m => m.org_node_id === selectedFunctionId);
    }

    return result;
  }, [members, selectedTeamId, selectedFunctionId]);

  useEffect(() => {
    loadAnalyses();
  }, [loadAnalyses]);

  useEffect(() => {
    loadMembersAndRatings();
  }, [loadMembersAndRatings]);

  // Reset filters when changing analysis
  useEffect(() => {
    setSelectedTeamId(null);
    setSelectedFunctionId(null);
  }, [selectedAnalysis?.id]);

  // Create new analysis
  const createAnalysis = async (name: string, description: string, valuesSnapshot: { label: string }[]) => {
    if (!account?.id) return null;

    try {
      const { data, error } = await supabase
        .from('people_analyses')
        .insert({
          account_id: account.id,
          name,
          description: description || null,
          values_snapshot: valuesSnapshot
        })
        .select()
        .single();

      if (error) throw error;

      const parsed = {
        ...data,
        values_snapshot: typeof data.values_snapshot === 'string'
          ? JSON.parse(data.values_snapshot)
          : data.values_snapshot || []
      };

      setAnalyses(prev => [parsed, ...prev]);
      setSelectedAnalysis(parsed);
      
      toast({ title: 'Análise criada com sucesso!' });
      return parsed;
    } catch (error) {
      console.error('Error creating analysis:', error);
      toast({ title: 'Erro ao criar análise', variant: 'destructive' });
      return null;
    }
  };

  // Update analysis
  const updateAnalysis = async (id: string, updates: Partial<Pick<PeopleAnalysis, 'name' | 'description' | 'values_snapshot'>>) => {
    try {
      const { error } = await supabase
        .from('people_analyses')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      setAnalyses(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
      if (selectedAnalysis?.id === id) {
        setSelectedAnalysis(prev => prev ? { ...prev, ...updates } : null);
      }
      
      toast({ title: 'Análise atualizada!' });
    } catch (error) {
      console.error('Error updating analysis:', error);
      toast({ title: 'Erro ao atualizar análise', variant: 'destructive' });
    }
  };

  // Delete analysis
  const deleteAnalysis = async (id: string) => {
    try {
      const { error } = await supabase
        .from('people_analyses')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setAnalyses(prev => prev.filter(a => a.id !== id));
      if (selectedAnalysis?.id === id) {
        const remaining = analyses.filter(a => a.id !== id);
        setSelectedAnalysis(remaining.length > 0 ? remaining[0] : null);
      }
      
      toast({ title: 'Análise excluída!' });
    } catch (error) {
      console.error('Error deleting analysis:', error);
      toast({ title: 'Erro ao excluir análise', variant: 'destructive' });
    }
  };

  // Add member with optional team and function data
  const addMember = async (
    name: string, 
    userId?: string, 
    teamId?: string, 
    orgNodeId?: string
  ) => {
    if (!selectedAnalysis) return;

    try {
      const maxPosition = members.length > 0 
        ? Math.max(...members.map(m => m.position)) 
        : -1;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = supabase as any;
      const { data, error } = await client
        .from('people_analysis_members')
        .insert({
          analysis_id: selectedAnalysis.id,
          name,
          position: maxPosition + 1,
          user_id: userId || null,
          team_id: teamId || null,
          org_node_id: orgNodeId || null
        })
        .select(`
          *,
          team:pulse_teams(id, name),
          org_node:org_chart_nodes(id, title)
        `)
        .single();

      if (error) throw error;

      setMembers(prev => [...prev, data]);
      toast({ title: 'Pessoa adicionada!' });
    } catch (error) {
      console.error('Error adding member:', error);
      toast({ title: 'Erro ao adicionar pessoa', variant: 'destructive' });
    }
  };

  // Update member
  const updateMember = async (id: string, name: string) => {
    try {
      const { error } = await supabase
        .from('people_analysis_members')
        .update({ name })
        .eq('id', id);

      if (error) throw error;

      setMembers(prev => prev.map(m => m.id === id ? { ...m, name } : m));
      toast({ title: 'Pessoa atualizada!' });
    } catch (error) {
      console.error('Error updating member:', error);
      toast({ title: 'Erro ao atualizar pessoa', variant: 'destructive' });
    }
  };

  // Delete member
  const deleteMember = async (id: string) => {
    try {
      const { error } = await supabase
        .from('people_analysis_members')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setMembers(prev => prev.filter(m => m.id !== id));
      setRatings(prev => prev.filter(r => r.member_id !== id));
      toast({ title: 'Pessoa removida!' });
    } catch (error) {
      console.error('Error deleting member:', error);
      toast({ title: 'Erro ao remover pessoa', variant: 'destructive' });
    }
  };

  // Set rating (upsert)
  const setRating = async (memberId: string, valueLabel: string, score: number) => {
    try {
      const existingRating = ratings.find(
        r => r.member_id === memberId && r.value_label === valueLabel
      );

      if (existingRating) {
        const { error } = await supabase
          .from('people_analysis_ratings')
          .update({ score })
          .eq('id', existingRating.id);

        if (error) throw error;

        setRatings(prev => prev.map(r => 
          r.id === existingRating.id ? { ...r, score } : r
        ));
      } else {
        const { data, error } = await supabase
          .from('people_analysis_ratings')
          .insert({
            member_id: memberId,
            value_label: valueLabel,
            score
          })
          .select()
          .single();

        if (error) throw error;

        setRatings(prev => [...prev, data]);
      }
    } catch (error) {
      console.error('Error setting rating:', error);
      toast({ title: 'Erro ao salvar avaliação', variant: 'destructive' });
    }
  };

  // Get rating for a member and value
  const getRating = (memberId: string, valueLabel: string): number | null => {
    const rating = ratings.find(
      r => r.member_id === memberId && r.value_label === valueLabel
    );
    return rating ? rating.score : null;
  };

  // Calculate total for a member
  const getMemberTotal = (memberId: string): number => {
    const memberRatings = ratings.filter(r => r.member_id === memberId);
    return memberRatings.reduce((sum, r) => sum + r.score, 0);
  };

  // Load version history for selected analysis
  const loadVersionHistory = useCallback(async () => {
    if (!selectedAnalysis) {
      setVersionHistory([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('people_analysis_version_history')
        .select('*')
        .eq('analysis_id', selectedAnalysis.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVersionHistory(data || []);
    } catch (error) {
      console.error('Error loading version history:', error);
    }
  }, [selectedAnalysis]);

  useEffect(() => {
    loadVersionHistory();
  }, [loadVersionHistory]);

  // Save version snapshot
  const saveVersionSnapshot = async () => {
    if (!selectedAnalysis) return;

    try {
      const snapshot = {
        members: members.map(m => ({ 
          id: m.id, 
          name: m.name, 
          position: m.position,
          user_id: m.user_id,
          team_id: m.team_id,
          org_node_id: m.org_node_id
        })),
        ratings: ratings.map(r => ({ 
          member_id: r.member_id, 
          value_label: r.value_label, 
          score: r.score 
        })),
        values_snapshot: selectedAnalysis.values_snapshot
      };

      const { error } = await supabase
        .from('people_analysis_version_history')
        .insert({
          analysis_id: selectedAnalysis.id,
          snapshot,
          variant: 'manual'
        });

      if (error) throw error;

      await loadVersionHistory();
      toast({ title: 'Versão salva com sucesso!' });
    } catch (error) {
      console.error('Error saving version:', error);
      toast({ title: 'Erro ao salvar versão', variant: 'destructive' });
    }
  };

  // Restore a version from history
  const restoreVersion = async (version: PeopleAnalysisVersionHistory) => {
    if (!selectedAnalysis) return;

    try {
      const snapshot = version.snapshot as {
        members: { id: string; name: string; position: number; user_id?: string; team_id?: string; org_node_id?: string }[];
        ratings: { member_id: string; value_label: string; score: number }[];
      };

      // Delete current members (cascades to ratings)
      await supabase
        .from('people_analysis_members')
        .delete()
        .eq('analysis_id', selectedAnalysis.id);

      // Recreate members with optional filter fields
      const memberIdMap = new Map<string, string>();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = supabase as any;
      for (const member of snapshot.members) {
        const { data, error } = await client
          .from('people_analysis_members')
          .insert({
            analysis_id: selectedAnalysis.id,
            name: member.name,
            position: member.position,
            user_id: member.user_id || null,
            team_id: member.team_id || null,
            org_node_id: member.org_node_id || null
          })
          .select()
          .single();

        if (error) throw error;
        memberIdMap.set(member.id, data.id);
      }

      // Recreate ratings with new member IDs
      for (const rating of snapshot.ratings) {
        const newMemberId = memberIdMap.get(rating.member_id);
        if (newMemberId) {
          await supabase
            .from('people_analysis_ratings')
            .insert({
              member_id: newMemberId,
              value_label: rating.value_label,
              score: rating.score
            });
        }
      }

      await loadMembersAndRatings();
      toast({ title: 'Versão restaurada!' });
    } catch (error) {
      console.error('Error restoring version:', error);
      toast({ title: 'Erro ao restaurar versão', variant: 'destructive' });
    }
  };

  return {
    analyses,
    selectedAnalysis,
    setSelectedAnalysis,
    members,
    filteredMembers,
    ratings,
    loading: loading || accountLoading,
    canAccess,
    createAnalysis,
    updateAnalysis,
    deleteAnalysis,
    addMember,
    updateMember,
    deleteMember,
    setRating,
    getRating,
    getMemberTotal,
    versionHistory,
    saveVersionSnapshot,
    restoreVersion,
    reload: loadAnalyses,
    // Filter-related exports
    filterOptions,
    selectedTeamId,
    setSelectedTeamId,
    selectedFunctionId,
    setSelectedFunctionId,
  };
}
