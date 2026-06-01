import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { 
  CultureCodeSession, 
  CultureCodeStructure, 
  CultureCodeSlide, 
  CultureCodeStage,
  CultureCodeInput 
} from '@/types/culture-code.types';
import type { VersionHistoryItem } from '@/components/cultura/shared/VersionHistoryCard';

const MAX_HISTORY = 30;
const AUTO_SAVE_INTERVAL = 5 * 60 * 1000; // 5 minutes

export interface CultureCodeVersionSnapshot {
  slides: CultureCodeSlide[];
  structure: CultureCodeStructure | null;
  company_history: string | null;
  slideCount: number;
  savedAt: string;
}

export function useCultureCode() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [session, setSession] = useState<CultureCodeSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [accountId, setAccountId] = useState<string | null>(null);
  
  // Undo/Redo state
  const historyRef = useRef<CultureCodeSlide[][]>([]);
  const futureRef = useRef<CultureCodeSlide[][]>([]);
  const [historyVersion, setHistoryVersion] = useState(0);
  
  // Version history state
  const [versionHistory, setVersionHistory] = useState<VersionHistoryItem[]>([]);
  const autoSaveRef = useRef<NodeJS.Timeout>();
  const lastSavedSlidesRef = useRef<string>('');

  // Load account ID
  useEffect(() => {
    const loadAccountId = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('id', user.id)
        .single();
      
      if (data?.account_id) {
        setAccountId(data.account_id);
      }
    };
    loadAccountId();
  }, [user]);

  // Load or create session
  useEffect(() => {
    const loadSession = async () => {
      if (!accountId) return;
      
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('culture_code_sessions')
          .select('*')
          .eq('account_id', accountId)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error loading session:', error);
        }

        if (data) {
          setSession({
            ...data,
            structure: data.structure as unknown as CultureCodeStructure | null,
            slides: (data.slides as unknown as CultureCodeSlide[]) || [],
            stage: data.stage as CultureCodeStage,
          });
        }
      } finally {
        setLoading(false);
      }
    };
    loadSession();
  }, [accountId]);

  // Save session
  const saveSession = useCallback(async (updates: Partial<CultureCodeSession>) => {
    if (!accountId) return;

    const sessionData = {
      account_id: accountId,
      company_history: updates.company_history ?? session?.company_history ?? null,
      structure: (updates.structure ?? session?.structure ?? null) as unknown as Record<string, unknown> | null,
      slides: (updates.slides ?? session?.slides ?? []) as unknown as Record<string, unknown>[],
      stage: updates.stage ?? session?.stage ?? 'history',
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('culture_code_sessions')
      .upsert(sessionData as any, { onConflict: 'account_id' })
      .select()
      .single();

    if (error) {
      console.error('Error saving session:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar os dados.',
        variant: 'destructive',
      });
      return;
    }

    if (data) {
      setSession({
        ...data,
        structure: data.structure as unknown as CultureCodeStructure | null,
        slides: (data.slides as unknown as CultureCodeSlide[]) || [],
        stage: data.stage as CultureCodeStage,
      });
    }
  }, [accountId, session, toast]);

  // Update history
  const updateHistory = useCallback((history: string) => {
    saveSession({ company_history: history });
  }, [saveSession]);

  // Update section in structure
  const updateSection = useCallback((sectionId: string, updates: Partial<{ name: string; description: string; estimatedSlides: number }>) => {
    if (!session?.structure) return;

    const updatedSections = session.structure.sections.map((section) =>
      section.id === sectionId ? { ...section, ...updates } : section
    );

    const newTotalSlides = updatedSections.reduce((sum, s) => sum + s.estimatedSlides, 0);

    const updatedStructure: CultureCodeStructure = {
      ...session.structure,
      sections: updatedSections,
      totalSlides: newTotalSlides,
    };

    saveSession({ structure: updatedStructure });
  }, [session?.structure, saveSession]);

  // Generate structure
  const generateStructure = useCallback(async (history: string, cultureData: CultureCodeInput) => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-culture-code-structure', {
        body: { companyHistory: history, cultureData },
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      await saveSession({ 
        company_history: history,
        structure: data as CultureCodeStructure, 
        stage: 'structure' 
      });

      toast({
        title: 'Estrutura gerada!',
        description: `${data.totalSlides} slides propostos.`,
      });

      return data as CultureCodeStructure;
    } catch (error) {
      console.error('Error generating structure:', error);
      toast({
        title: 'Erro ao gerar estrutura',
        description: error instanceof Error ? error.message : 'Tente novamente.',
        variant: 'destructive',
      });
      return null;
    } finally {
      setGenerating(false);
    }
  }, [saveSession, toast]);

  // Generate slides
  const generateSlides = useCallback(async (
    history: string, 
    cultureData: CultureCodeInput, 
    structure: CultureCodeStructure
  ) => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-culture-code-slides', {
        body: { companyHistory: history, cultureData, structure },
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      const slides = data.slides as CultureCodeSlide[];

      await saveSession({ 
        slides, 
        stage: 'slides' 
      });

      // Save initial version
      setTimeout(() => saveVersionSnapshot('initial'), 500);

      toast({
        title: 'Slides gerados!',
        description: `${slides.length} slides criados.`,
      });

      return slides;
    } catch (error) {
      console.error('Error generating slides:', error);
      toast({
        title: 'Erro ao gerar slides',
        description: error instanceof Error ? error.message : 'Tente novamente.',
        variant: 'destructive',
      });
      return null;
    } finally {
    setGenerating(false);
    }
  }, [saveSession, toast]);

  // Regenerate single slide with AI
  const regenerateSlide = useCallback(async (
    slideId: string,
    cultureData: CultureCodeInput,
    instruction?: string
  ) => {
    if (!session?.slides) return null;

    const slideIndex = session.slides.findIndex(s => s.id === slideId);
    if (slideIndex < 0) return null;

    const slide = session.slides[slideIndex];
    const previousSlide = slideIndex > 0 ? session.slides[slideIndex - 1] : undefined;
    const nextSlide = slideIndex < session.slides.length - 1 ? session.slides[slideIndex + 1] : undefined;

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('regenerate-single-slide', {
        body: { 
          slide, 
          previousSlide, 
          nextSlide, 
          instruction,
          cultureData,
        },
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      // Update the slide in the array
      const updatedSlides = session.slides.map(s =>
        s.id === slideId ? { ...s, ...data.regeneratedSlide } : s
      );

      await saveSession({ slides: updatedSlides });
      
      // Save version after regeneration
      setTimeout(() => saveVersionSnapshot('regenerate'), 500);

      toast({
        title: 'Slide regenerado!',
        description: 'O conteúdo foi atualizado com sucesso.',
      });

      return data.regeneratedSlide;
    } catch (error) {
      console.error('Error regenerating slide:', error);
      toast({
        title: 'Erro ao regenerar slide',
        description: error instanceof Error ? error.message : 'Tente novamente.',
        variant: 'destructive',
      });
      return null;
    } finally {
      setGenerating(false);
    }
  }, [session?.slides, saveSession, toast]);

  // Push current state to history before modification
  const pushToHistory = useCallback(() => {
    if (session?.slides) {
      historyRef.current = [...historyRef.current, session.slides].slice(-MAX_HISTORY);
      futureRef.current = []; // Clear redo stack on new action
      setHistoryVersion(v => v + 1);
    }
  }, [session?.slides]);

  // Undo last change
  const undo = useCallback(() => {
    if (historyRef.current.length === 0 || !session?.slides) return;
    
    // Save current state to future (for redo)
    futureRef.current = [...futureRef.current, session.slides];
    
    // Pop and apply previous state
    const previousState = historyRef.current[historyRef.current.length - 1];
    historyRef.current = historyRef.current.slice(0, -1);
    
    saveSession({ slides: previousState });
    setHistoryVersion(v => v + 1);
    
    toast({ title: 'Desfazer', description: 'Alteração desfeita.' });
  }, [session?.slides, saveSession, toast]);

  // Redo last undone change
  const redo = useCallback(() => {
    if (futureRef.current.length === 0 || !session?.slides) return;
    
    // Save current state to history
    historyRef.current = [...historyRef.current, session.slides];
    
    // Pop and apply next state
    const nextState = futureRef.current[futureRef.current.length - 1];
    futureRef.current = futureRef.current.slice(0, -1);
    
    saveSession({ slides: nextState });
    setHistoryVersion(v => v + 1);
    
    toast({ title: 'Refazer', description: 'Alteração refeita.' });
  }, [session?.slides, saveSession, toast]);

  // Update single slide
  const updateSlide = useCallback((slideId: string, updates: Partial<CultureCodeSlide>) => {
    if (!session?.slides) return;

    pushToHistory();
    
    const updatedSlides = session.slides.map(slide => 
      slide.id === slideId ? { ...slide, ...updates } : slide
    );

    saveSession({ slides: updatedSlides });
  }, [session?.slides, saveSession, pushToHistory]);

  // Delete slide
  const deleteSlide = useCallback((slideId: string) => {
    if (!session?.slides) return;

    pushToHistory();
    
    const updatedSlides = session.slides
      .filter(slide => slide.id !== slideId)
      .map((slide, index) => ({ ...slide, slideNumber: index + 1 }));

    saveSession({ slides: updatedSlides });
  }, [session?.slides, saveSession, pushToHistory]);

  // Add custom slide
  const addSlide = useCallback((afterSlideId: string, newSlide: Omit<CultureCodeSlide, 'id' | 'slideNumber'>) => {
    if (!session?.slides) return;

    pushToHistory();
    
    const index = session.slides.findIndex(s => s.id === afterSlideId);
    const insertIndex = index >= 0 ? index + 1 : session.slides.length;

    const slideToAdd: CultureCodeSlide = {
      ...newSlide,
      id: `slide-custom-${Date.now()}`,
      slideNumber: insertIndex + 1,
      isCustom: true,
    };

    const updatedSlides = [
      ...session.slides.slice(0, insertIndex),
      slideToAdd,
      ...session.slides.slice(insertIndex),
    ].map((slide, i) => ({ ...slide, slideNumber: i + 1 }));

    saveSession({ slides: updatedSlides });
  }, [session?.slides, saveSession, pushToHistory]);

  // Move slide
  const moveSlide = useCallback((slideId: string, direction: 'up' | 'down') => {
    if (!session?.slides) return;

    pushToHistory();
    
    const index = session.slides.findIndex(s => s.id === slideId);
    if (index < 0) return;
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= session.slides.length) return;

    const updatedSlides = [...session.slides];
    [updatedSlides[index], updatedSlides[newIndex]] = [updatedSlides[newIndex], updatedSlides[index]];
    
    const renumbered = updatedSlides.map((slide, i) => ({ ...slide, slideNumber: i + 1 }));

    saveSession({ slides: renumbered });
  }, [session?.slides, saveSession, pushToHistory]);

  // Reorder slides by new order of IDs
  const reorderSlides = useCallback((newOrder: string[]) => {
    if (!session?.slides) return;

    pushToHistory();
    
    const slideMap = new Map(session.slides.map(s => [s.id, s]));
    const reorderedSlides = newOrder
      .map(id => slideMap.get(id))
      .filter((s): s is CultureCodeSlide => s !== undefined)
      .map((slide, index) => ({ ...slide, slideNumber: index + 1 }));

    saveSession({ slides: reorderedSlides });
  }, [session?.slides, saveSession, pushToHistory]);

  // Go to stage
  const goToStage = useCallback((stage: CultureCodeStage) => {
    saveSession({ stage });
  }, [saveSession]);

  // Export to TXT
  const exportToTxt = useCallback(() => {
    if (!session?.slides) return;

    let content = '═══════════════════════════════════════════════════════════════\n';
    content += '                    CULTURE CODE\n';
    content += '═══════════════════════════════════════════════════════════════\n\n';

    let currentSection = '';

    session.slides.forEach(slide => {
      if (slide.sectionId !== currentSection) {
        currentSection = slide.sectionId;
        content += `\n═══════════════════════════════════════════════════════════════\n`;
        content += `SEÇÃO: ${currentSection.toUpperCase()}\n`;
        content += `═══════════════════════════════════════════════════════════════\n\n`;
      }

      content += `Slide ${slide.slideNumber}: ${slide.title}\n`;
      content += '───────────────────────────────────────────────────────────────\n';
      
      if (slide.type === 'value' && slide.valueData) {
        if (slide.valueData.mantra) {
          content += `"${slide.valueData.mantra}"\n\n`;
        }
        if (slide.valueData.dos?.length) {
          content += 'Como Vivemos:\n';
          slide.valueData.dos.forEach(d => content += `• ${d}\n`);
          content += '\n';
        }
        if (slide.valueData.donts?.length) {
          content += 'Como NÃO Vivemos:\n';
          slide.valueData.donts.forEach(d => content += `• ${d}\n`);
        }
      } else {
        slide.body.forEach(line => content += `${line}\n`);
      }
      
      content += '\n';
    });

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'culture-code.txt';
    a.click();
    URL.revokeObjectURL(url);
  }, [session?.slides]);

  // Copy all to clipboard
  const copyAll = useCallback(() => {
    if (!session?.slides) return;

    let content = '';
    session.slides.forEach(slide => {
      content += `[Slide ${slide.slideNumber}] ${slide.title}\n`;
      if (slide.type === 'value' && slide.valueData) {
        if (slide.valueData.mantra) content += `"${slide.valueData.mantra}"\n`;
        if (slide.valueData.dos?.length) {
          content += 'Como Vivemos:\n' + slide.valueData.dos.map(d => `• ${d}`).join('\n') + '\n';
        }
        if (slide.valueData.donts?.length) {
          content += 'Como NÃO Vivemos:\n' + slide.valueData.donts.map(d => `• ${d}`).join('\n') + '\n';
        }
      } else {
        content += slide.body.join('\n') + '\n';
      }
      content += '\n';
    });

    navigator.clipboard.writeText(content);
    toast({ title: 'Copiado!', description: 'Todos os slides foram copiados.' });
  }, [session?.slides, toast]);

  // Load version history from database
  const loadVersionHistory = useCallback(async () => {
    if (!session?.id) return;
    
    const { data, error } = await supabase
      .from('culture_code_version_history')
      .select('*')
      .eq('session_id', session.id)
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setVersionHistory(data as VersionHistoryItem[]);
    }
  }, [session?.id]);

  // Save version snapshot to database
  const saveVersionSnapshot = useCallback(async (variant: string = 'update') => {
    if (!session?.id || !session.slides?.length) return;
    
    const snapshot: CultureCodeVersionSnapshot = {
      slides: session.slides,
      structure: session.structure,
      company_history: session.company_history,
      slideCount: session.slides.length,
      savedAt: new Date().toISOString(),
    };
    
    // Check if this is different from last saved
    const currentHash = JSON.stringify(session.slides);
    if (variant === 'auto' && currentHash === lastSavedSlidesRef.current) {
      return; // No changes to save
    }
    
    const { error } = await supabase
      .from('culture_code_version_history')
      .insert({
        session_id: session.id,
        snapshot: snapshot as unknown as Record<string, unknown>,
        variant,
      } as any);
    
    if (!error) {
      lastSavedSlidesRef.current = currentHash;
      await loadVersionHistory();
      
      if (variant === 'manual') {
        toast({ title: 'Versão salva!', description: 'Seus slides foram salvos no histórico.' });
      }
    }
  }, [session, loadVersionHistory, toast]);

  // Restore version from history
  const restoreVersion = useCallback(async (versionId: string) => {
    const version = versionHistory.find(v => v.id === versionId);
    if (!version?.snapshot) return;
    
    const snapshot = version.snapshot as CultureCodeVersionSnapshot;
    
    // Save current version before restoring
    await saveVersionSnapshot('before_restore');
    
    // Restore slides
    await saveSession({
      slides: snapshot.slides,
      structure: snapshot.structure,
      company_history: snapshot.company_history,
    });
    
    toast({ 
      title: 'Versão restaurada!', 
      description: 'Os slides foram restaurados para a versão selecionada.'
    });
  }, [versionHistory, saveVersionSnapshot, saveSession, toast]);

  // Load version history when session loads
  useEffect(() => {
    if (session?.id) {
      loadVersionHistory();
    }
  }, [session?.id, loadVersionHistory]);

  // Auto-save periodically
  useEffect(() => {
    if (session?.slides?.length) {
      clearTimeout(autoSaveRef.current);
      autoSaveRef.current = setTimeout(() => {
        saveVersionSnapshot('auto');
      }, AUTO_SAVE_INTERVAL);
    }
    return () => clearTimeout(autoSaveRef.current);
  }, [session?.slides, saveVersionSnapshot]);

  return {
    session,
    loading,
    generating,
    accountId,
    updateHistory,
    updateSection,
    generateStructure,
    generateSlides,
    regenerateSlide,
    updateSlide,
    deleteSlide,
    addSlide,
    moveSlide,
    reorderSlides,
    goToStage,
    exportToTxt,
    copyAll,
    undo,
    redo,
    canUndo: historyRef.current.length > 0,
    canRedo: futureRef.current.length > 0,
    // Version history
    versionHistory,
    loadVersionHistory,
    saveVersionSnapshot,
    restoreVersion,
  };
}
