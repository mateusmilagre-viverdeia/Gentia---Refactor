import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { StrategicProject, PerspectiveId, Segment } from '@/types/projects.types';
import { toast } from 'sonner';
import { useOrganization } from '@/contexts/OrganizationContext';
import { VersionHistoryItem } from '@/components/cultura/shared/VersionHistoryCard';
import { createLogger } from '@/lib/logger';

const log = createLogger('ProjectsContext');

interface ProjectDetails {
  importance?: string;
  linked_indicator?: string[];
  responsible?: string;
  involved_members?: string[];
  start_quarter?: string;
}

interface ProjectsContextType {
  projects: StrategicProject[];
  segment: Segment | null;
  stage: number;
  currentProjectIndex: number;
  loading: boolean;
  saving: boolean;
  versionHistory: VersionHistoryItem[];
  setSegment: (segment: Segment) => void;
  setStage: (stage: number) => void;
  setCurrentProjectIndex: (index: number) => void;
  loadProjects: () => Promise<void>;
  addProject: (name: string, perspective: PerspectiveId, isCustom: boolean) => Promise<void>;
  toggleProject: (name: string, perspective: PerspectiveId, isCustom: boolean) => Promise<void>;
  restoreVersion: (versionId: string) => Promise<void>;
  updateProject: (id: string, data: { project_name?: string; description?: string; perspective?: PerspectiveId }) => Promise<void>;
  updateProjectDetails: (id: string, details: ProjectDetails) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  clearAllProjects: () => Promise<void>;
  saveVersionSnapshot: (variant?: string) => Promise<void>;
  loadVersionHistory: () => Promise<void>;
}

const ProjectsContext = createContext<ProjectsContextType | null>(null);

export function ProjectsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { currentAccount } = useOrganization();
  const [projects, setProjects] = useState<StrategicProject[]>([]);
  const [segment, setSegmentState] = useState<Segment | null>(null);
  const [stage, setStageState] = useState(1);
  const [currentProjectIndex, setCurrentProjectIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [versionHistory, setVersionHistory] = useState<VersionHistoryItem[]>([]);

  const loadProjects = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      let query = supabase.from('strategic_projects').select('*');
      if (currentAccount?.id) {
        query = query.eq('account_id', currentAccount.id);
      } else {
        query = query.eq('user_id', user.id);
      }
      
      const { data, error } = await query.order('created_at', { ascending: true });

      if (error) throw error;
      
      const typedData = (data || []).map(p => ({
        ...p,
        is_custom: p.is_custom ?? true,
        perspective: p.perspective as PerspectiveId,
        segment: p.segment as Segment | null
      })) as StrategicProject[];
      
      setProjects(typedData);
      
      if (typedData.length > 0 && typedData[0].segment) {
        setSegmentState(typedData[0].segment);
      }

      if (typedData.length > 0) {
        const hasDetails = typedData.some(p => p.importance || p.linked_indicator || p.responsible || p.start_quarter);
        if (hasDetails) {
          const allHaveDetails = typedData.every(p => p.importance);
          if (allHaveDetails) {
            setStageState(5);
          } else {
            setStageState(4);
          }
        }
      }
      
      if (currentAccount?.id) {
        await loadVersionHistoryForAccount(currentAccount.id);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
      toast.error('Erro ao carregar projetos');
    } finally {
      setLoading(false);
    }
  }, [user, currentAccount]);

  useEffect(() => {
    if (user) {
      loadProjects();
    }
  }, [user, loadProjects]);

  const setSegment = useCallback((newSegment: Segment) => {
    setSegmentState(newSegment);
  }, []);

  const setStage = useCallback((newStage: number) => {
    setStageState(newStage);
    if (newStage === 4) {
      setCurrentProjectIndex(0);
    }
  }, []);

  const addProject = useCallback(async (name: string, perspective: PerspectiveId, isCustom: boolean) => {
    if (!user || !segment) return;

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('strategic_projects')
        .insert({
          user_id: user.id,
          account_id: currentAccount?.id,
          project_name: name.trim(),
          perspective,
          is_custom: isCustom,
          segment,
          description: null
        })
        .select()
        .single();

      if (error) throw error;
      
      const typedData = {
        ...data,
        is_custom: data.is_custom ?? true,
        perspective: data.perspective as PerspectiveId,
        segment: data.segment as Segment | null
      } as StrategicProject;
      
      setProjects(prev => [...prev, typedData]);
      toast.success('Projeto adicionado!');
    } catch (error) {
      console.error('Error adding project:', error);
      toast.error('Erro ao adicionar projeto');
    } finally {
      setSaving(false);
    }
  }, [user, currentAccount, segment]);

  const toggleProject = useCallback(async (name: string, perspective: PerspectiveId, isCustom: boolean) => {
    if (!user || !segment) return;

    const existing = projects.find(
      p => p.project_name === name && p.perspective === perspective
    );

    if (existing) {
      setSaving(true);
      try {
        const { error } = await supabase
          .from('strategic_projects')
          .delete()
          .eq('id', existing.id);

        if (error) throw error;
        setProjects(prev => prev.filter(p => p.id !== existing.id));
      } catch (error) {
        console.error('Error removing project:', error);
        toast.error('Erro ao remover projeto');
      } finally {
        setSaving(false);
      }
    } else {
      await addProject(name, perspective, isCustom);
    }
  }, [user, currentAccount, segment, projects, addProject]);

  const updateProject = useCallback(async (id: string, data: { project_name?: string; description?: string; perspective?: PerspectiveId }) => {
    setSaving(true);
    try {
      const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (data.project_name !== undefined) updateData.project_name = data.project_name.trim();
      if (data.description !== undefined) updateData.description = data.description.trim() || null;
      if (data.perspective !== undefined) updateData.perspective = data.perspective;

      const { error } = await supabase
        .from('strategic_projects')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      setProjects(prev => prev.map(p => 
        p.id === id ? { ...p, ...updateData } as StrategicProject : p
      ));
      toast.success('Projeto atualizado!');
    } catch (error) {
      console.error('Error updating project:', error);
      toast.error('Erro ao atualizar projeto');
    } finally {
      setSaving(false);
    }
  }, []);

  const updateProjectDetails = useCallback(async (id: string, details: ProjectDetails) => {
    setSaving(true);
    try {
      const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (details.importance !== undefined) updateData.importance = details.importance.trim() || null;
      if (details.linked_indicator !== undefined) updateData.linked_indicator = details.linked_indicator.length > 0 ? details.linked_indicator : null;
      if (details.responsible !== undefined) updateData.responsible = details.responsible.trim() || null;
      if (details.involved_members !== undefined) updateData.involved_members = details.involved_members.length > 0 ? details.involved_members : [];
      if (details.start_quarter !== undefined) updateData.start_quarter = details.start_quarter || null;

      const { error } = await supabase
        .from('strategic_projects')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      setProjects(prev => prev.map(p => 
        p.id === id ? { ...p, ...updateData } as StrategicProject : p
      ));
    } catch (error) {
      console.error('Error updating project details:', error);
      toast.error('Erro ao atualizar detalhes do projeto');
    } finally {
      setSaving(false);
    }
  }, []);

  const deleteProject = useCallback(async (id: string) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('strategic_projects')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setProjects(prev => prev.filter(p => p.id !== id));
      toast.success('Projeto removido!');
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error('Erro ao remover projeto');
    } finally {
      setSaving(false);
    }
  }, []);

  const clearAllProjects = useCallback(async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const deleteQuery = supabase.from('strategic_projects').delete();
      const { error } = currentAccount?.id
        ? await deleteQuery.eq('account_id', currentAccount.id)
        : await deleteQuery.eq('user_id', user.id);

      if (error) throw error;
      setProjects([]);
      setSegmentState(null);
      setStageState(1);
      toast.success('Todos os projetos foram removidos!');
    } catch (error) {
      console.error('Error clearing projects:', error);
      toast.error('Erro ao limpar projetos');
    } finally {
      setSaving(false);
    }
  }, [user]);

  const loadVersionHistoryForAccount = async (accountId: string) => {
    try {
      const { data, error } = await supabase
        .from('projects_version_history')
        .select('*')
        .eq('account_id', accountId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVersionHistory((data || []) as VersionHistoryItem[]);
    } catch (error) {
      console.error('Error loading projects version history:', error);
    }
  };

  const loadVersionHistory = async () => {
    if (!currentAccount?.id) return;
    await loadVersionHistoryForAccount(currentAccount.id);
  };

  const saveVersionSnapshot = async (variant: string = 'update') => {
    if (!currentAccount?.id) return;

    try {
      const snapshot = {
        projects: projects.map(p => ({
          project_name: p.project_name,
          perspective: p.perspective,
          segment: p.segment,
          importance: p.importance,
          linked_indicator: p.linked_indicator,
          responsible: p.responsible,
          involved_members: p.involved_members,
          start_quarter: p.start_quarter,
          is_custom: p.is_custom,
        })),
        stage,
        savedAt: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('projects_version_history')
        .insert({
          account_id: currentAccount.id,
          snapshot,
          variant,
        });

      if (error) throw error;
      await loadVersionHistory();
    } catch (error) {
      console.error('Error saving projects version snapshot:', error);
    }
  };

  const restoreVersion = useCallback(async (versionId: string) => {
    if (!user || !currentAccount?.id) return;

    try {
      await saveVersionSnapshot('before_restore');

      const version = versionHistory.find(v => v.id === versionId);
      if (!version) return;

      const snapshot = version.snapshot as { projects?: { project_name: string; perspective: PerspectiveId; segment: Segment; importance?: string; linked_indicator?: string[]; responsible?: string; involved_members?: string[]; start_quarter?: string; is_custom: boolean }[] };

      if (!snapshot.projects) return;

      // Delete all current projects
      await supabase.from('strategic_projects').delete().eq('account_id', currentAccount.id);

      // Re-insert from snapshot
      if (snapshot.projects.length > 0) {
        await supabase.from('strategic_projects').insert(
          snapshot.projects.map(p => ({
            user_id: user.id,
            account_id: currentAccount.id,
            project_name: p.project_name,
            perspective: p.perspective,
            segment: p.segment,
            importance: p.importance || null,
            linked_indicator: p.linked_indicator || null,
            responsible: p.responsible || null,
            involved_members: p.involved_members || [],
            start_quarter: p.start_quarter || null,
            is_custom: p.is_custom,
          }))
        );
      }

      await loadProjects();
      setStageState(5);
      toast.success('Versão restaurada com sucesso!');
    } catch (error) {
      console.error('Error restoring version:', error);
      toast.error('Erro ao restaurar versão');
    }
  }, [user, currentAccount, versionHistory, saveVersionSnapshot, loadProjects]);

  return (
    <ProjectsContext.Provider value={{
      projects,
      segment,
      stage,
      currentProjectIndex,
      loading,
      saving,
      versionHistory,
      setSegment,
      setStage,
      setCurrentProjectIndex,
      loadProjects,
      addProject,
      toggleProject,
      updateProject,
      updateProjectDetails,
      deleteProject,
      clearAllProjects,
      saveVersionSnapshot,
      loadVersionHistory,
      restoreVersion,
    }}>
      {children}
    </ProjectsContext.Provider>
  );
}

export function useProjects() {
  const context = useContext(ProjectsContext);
  if (!context) {
    throw new Error('useProjects must be used within ProjectsProvider');
  }
  return context;
}
