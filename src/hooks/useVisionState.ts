import { useState, useEffect, useRef, useCallback } from "react";
import { VisionSession, VisionAnalysis, VersionHistoryItem } from "@/types/vision.types";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Json } from "@/integrations/supabase/types";
import { useOrganization } from "@/contexts/OrganizationContext";

const createNewSession = (userId: string): VisionSession => ({
  id: crypto.randomUUID(),
  userId,
  stage: 1,
  answers: {},
  analysis: null,
  notes: "",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export function useVisionState() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { currentAccount } = useOrganization();
  const userId = user?.id;
  const accountId = currentAccount?.id;
  
  const [session, setSession] = useState<VisionSession | null>(null);
  const [versionHistory, setVersionHistory] = useState<VersionHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sessionRef = useRef<VisionSession | null>(null);
  const versionHistoryRef = useRef<VersionHistoryItem[]>([]);
  const isCreatingRef = useRef(false); // Prevent race conditions

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    versionHistoryRef.current = versionHistory;
  }, [versionHistory]);

  // Try to migrate data from localStorage
  const tryMigrateFromLocalStorage = async (dbSessionId: string, dbSession: any) => {
    // Check if DB session is empty (no answers or analysis)
    const dbAnswers = dbSession.answers as Record<string, unknown> || {};
    const hasDbData = Object.keys(dbAnswers).length > 0 || dbSession.analysis;
    
    if (hasDbData) {
      console.log('📊 Vision DB session has data, skipping localStorage migration');
      return null;
    }

    // Try multiple possible localStorage keys
    const possibleKeys = [
      `vision_session_demo_user`,
      `vision_session_${user?.email}`,
      `vision_session_guest`,
      // Also try without prefix
      'vision_session',
    ];

    for (const key of possibleKeys) {
      try {
        const storedData = localStorage.getItem(key);
        if (!storedData) continue;

        const parsedData = JSON.parse(storedData);
        const localSession = parsedData.session || parsedData;
        const localAnswers = localSession.answers || {};
        
        // Check if localStorage has actual data
        if (Object.keys(localAnswers).length === 0 && !localSession.analysis) {
          continue;
        }

        console.log(`🔍 Found vision data in localStorage key: ${key}`, localSession);

        // Migrate session data to database
        const { error: updateError } = await supabase
          .from('vision_sessions')
          .update({
            stage: localSession.stage || 1,
            answers: localAnswers as unknown as Json,
            analysis: localSession.analysis as unknown as Json,
            notes: localSession.notes || "",
            selected_vision_type: localSession.selectedVisionType,
            final_vision: localSession.finalVision,
          })
          .eq('id', dbSessionId);

        if (updateError) throw updateError;

        // Migrate version history if exists
        const localHistory = parsedData.versionHistory || [];
        if (localHistory.length > 0) {
          for (const version of localHistory) {
            await supabase
              .from('vision_version_history')
              .insert({
                session_id: dbSessionId,
                vision_inspirational: version.visionInspirational,
                vision_measurable: version.visionMeasurable,
                variant: version.variant || 'original',
              });
          }
        }

        // Clean localStorage after successful migration
        localStorage.removeItem(key);
        
        toast({
          title: "Dados recuperados!",
          description: "Seus dados anteriores de Visão foram restaurados com sucesso.",
        });

        console.log('✅ Vision data migrated from localStorage to database');
        
        return {
          session: localSession,
          versionHistory: localHistory,
        };
      } catch (e) {
        console.error(`Error parsing localStorage key ${key}:`, e);
      }
    }

    return null;
  };

  // Load session from database
  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    const loadSession = async () => {
      try {
        // First, try to find session by account_id (for team members)
        let existingSession = null;
        
        if (accountId) {
          const { data: accountSessions, error: accountError } = await supabase
            .from('vision_sessions')
            .select('*')
            .eq('account_id', accountId)
            .order('created_at', { ascending: true })
            .limit(1);
          
          if (accountError) throw accountError;
          existingSession = accountSessions?.[0] || null;
        }
        
        // If no session found by account and no accountId, try by user_id
        if (!existingSession && !accountId) {
          const { data: userSessions, error: userError } = await supabase
            .from('vision_sessions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: true })
            .limit(1);
          
          if (userError) throw userError;
          existingSession = userSessions?.[0] || null;
        }

        if (existingSession) {
          // Try to migrate from localStorage if DB is empty
          const migratedData = await tryMigrateFromLocalStorage(existingSession.id, existingSession);
          
          if (migratedData) {
            // Use migrated data
            const loadedSession: VisionSession = {
              id: existingSession.id,
              userId: existingSession.user_id,
              stage: migratedData.session.stage || 1,
              answers: migratedData.session.answers || {},
              analysis: migratedData.session.analysis || null,
              notes: migratedData.session.notes || "",
              selectedVisionType: migratedData.session.selectedVisionType,
              finalVision: migratedData.session.finalVision,
              createdAt: existingSession.created_at,
              updatedAt: new Date().toISOString(),
            };
            setSession(loadedSession);
            
            if (migratedData.versionHistory?.length > 0) {
              // Reload history from database after migration
              const { data: history } = await supabase
                .from('vision_version_history')
                .select('*')
                .eq('session_id', existingSession.id)
                .order('created_at', { ascending: false });

              if (history) {
                setVersionHistory(history.map(h => ({
                  id: h.id,
                  visionInspirational: h.vision_inspirational || "",
                  visionMeasurable: h.vision_measurable || "",
                  variant: h.variant as VersionHistoryItem['variant'],
                  timestamp: h.created_at,
                })));
              }
            }
          } else {
            // Use existing DB data
            let stageToUse = existingSession.stage || 1;
            const existingAnalysis = existingSession.analysis as unknown as VisionAnalysis | null;
            
            // Healing rule: if stage is 12 (Processing) but analysis exists, advance to 13
            if (stageToUse === 12 && existingAnalysis && existingAnalysis.visionInspirational) {
              console.log('🔄 Vision: Healing - stage 12 com análise existente, avançando para 13');
              stageToUse = 13;
              
              // Update database to fix the stuck state
              await supabase
                .from('vision_sessions')
                .update({ stage: 13 })
                .eq('id', existingSession.id);
            }
            
            // Healing rule inversa: stage 13 SEM análise → volta para 11 (review)
            if (stageToUse === 13 && (!existingAnalysis || !existingAnalysis.visionInspirational)) {
              console.log('🔄 Vision: Healing - stage 13 sem análise, voltando para 11');
              stageToUse = 11;
              
              // Update database to fix the stuck state
              await supabase
                .from('vision_sessions')
                .update({ stage: 11 })
                .eq('id', existingSession.id);
                
              toast({
                title: "Análise pendente",
                description: "Clique em 'Gerar Análise' para continuar.",
              });
            }
            
            // Healing rule: stage 12 (Processing) SEM análise → volta para 11
            // Isso acontece quando a requisição à IA falha ou dá timeout
            if (stageToUse === 12 && (!existingAnalysis || !existingAnalysis.visionInspirational)) {
              console.log('🔄 Vision: Healing - stage 12 sem análise (requisição falhou), voltando para 11');
              stageToUse = 11;
              
              await supabase
                .from('vision_sessions')
                .update({ stage: 11 })
                .eq('id', existingSession.id);
                
              toast({
                title: "Processamento interrompido",
                description: "Clique em 'Gerar Análise' para tentar novamente.",
              });
            }
            
            const loadedSession: VisionSession = {
              id: existingSession.id,
              userId: existingSession.user_id,
              stage: stageToUse,
              answers: (existingSession.answers as Record<number, string>) || {},
              analysis: existingAnalysis,
              notes: existingSession.notes || "",
              selectedVisionType: existingSession.selected_vision_type as 'inspirational' | 'measurable' | undefined,
              finalVision: existingSession.final_vision || undefined,
              createdAt: existingSession.created_at,
              updatedAt: existingSession.updated_at,
            };
            setSession(loadedSession);

            // Load version history
            const { data: history } = await supabase
              .from('vision_version_history')
              .select('*')
              .eq('session_id', existingSession.id)
              .order('created_at', { ascending: false });

            if (history) {
              setVersionHistory(history.map(h => ({
                id: h.id,
                visionInspirational: h.vision_inspirational || "",
                visionMeasurable: h.vision_measurable || "",
                variant: h.variant as VersionHistoryItem['variant'],
                timestamp: h.created_at,
              })));
            }
          }
        } else {
          // Don't create new session if we have an account but no session yet
          if (!accountId) {
            console.log('⏳ Waiting for account data before creating session...');
            return;
          }
          
          // Prevent race condition - don't create if already creating
          if (isCreatingRef.current) {
            console.log('⏳ Vision session creation already in progress, skipping...');
            return;
          }
          isCreatingRef.current = true;
          
          // Verificar se existe sessão órfã do usuário (sem account_id)
          const { data: orphanSession } = await supabase
            .from('vision_sessions')
            .select('*')
            .eq('user_id', userId)
            .is('account_id', null)
            .limit(1)
            .maybeSingle();
          
          if (orphanSession) {
            // Atualizar sessão órfã com o account_id correto
            console.log('🔄 Found orphan vision session, updating with account_id...');
            const { error: updateError } = await supabase
              .from('vision_sessions')
              .update({ account_id: accountId })
              .eq('id', orphanSession.id);
            
            if (updateError) {
              console.error('Error updating orphan vision session:', updateError);
              isCreatingRef.current = false;
              throw updateError;
            }
            
            const loadedSession: VisionSession = {
              id: orphanSession.id,
              userId: orphanSession.user_id,
              stage: orphanSession.stage || 1,
              answers: (orphanSession.answers as Record<number, string>) || {},
              analysis: orphanSession.analysis as unknown as VisionAnalysis | null,
              notes: orphanSession.notes || "",
              selectedVisionType: orphanSession.selected_vision_type as 'inspirational' | 'measurable' | undefined,
              finalVision: orphanSession.final_vision || undefined,
              createdAt: orphanSession.created_at,
              updatedAt: new Date().toISOString(),
            };
            setSession(loadedSession);
            isCreatingRef.current = false;
            return;
          }
          
          // Create new session only if no session exists for this account
          const newSession = createNewSession(userId);
          const { data: created, error: createError } = await supabase
            .from('vision_sessions')
            .insert({
              user_id: userId,
              account_id: accountId,
              stage: 1,
              answers: {},
              notes: "",
            })
            .select()
            .single();

          if (createError) {
            isCreatingRef.current = false;
            throw createError;
          }
          
          const dbSession = {
            ...newSession,
            id: created.id,
          };
          
          // Try to migrate from localStorage for new session too
          const migratedData = await tryMigrateFromLocalStorage(created.id, { answers: {}, analysis: null });
          
          if (migratedData) {
            setSession({
              ...dbSession,
              stage: migratedData.session.stage || 1,
              answers: migratedData.session.answers || {},
              analysis: migratedData.session.analysis || null,
              notes: migratedData.session.notes || "",
              selectedVisionType: migratedData.session.selectedVisionType,
              finalVision: migratedData.session.finalVision,
            });
          } else {
            setSession(dbSession);
          }
        }
      } catch (error) {
        console.error('Error loading vision session:', error);
        toast({
          title: "Erro ao carregar",
          description: "Não foi possível carregar sua sessão de visão.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadSession();
  }, [userId, accountId, toast]);

  // Save to database
  const saveToDatabase = useCallback(async (updatedSession: VisionSession) => {
    if (!userId || !updatedSession.id) {
      console.error('💾 Vision: Não é possível salvar - dados ausentes', { 
        hasUserId: !!userId, 
        hasSessionId: !!updatedSession.id 
      });
      return;
    }

    console.log('💾 Vision: Salvando no banco...', {
      sessionId: updatedSession.id,
      stage: updatedSession.stage,
      answersCount: Object.keys(updatedSession.answers).length,
      hasAnalysis: !!updatedSession.analysis,
      hasFinalVision: !!updatedSession.finalVision,
      selectedVisionType: updatedSession.selectedVisionType
    });

    setIsSaving(true);
    try {
      const { error, data } = await supabase
        .from('vision_sessions')
        .update({
          stage: updatedSession.stage,
          answers: updatedSession.answers as unknown as Json,
          analysis: updatedSession.analysis as unknown as Json,
          notes: updatedSession.notes,
          selected_vision_type: updatedSession.selectedVisionType,
          final_vision: updatedSession.finalVision,
        })
        .eq('id', updatedSession.id)
        .select();

      if (error) throw error;
      console.log('✅ Vision session saved to database successfully', { 
        rowsAffected: data?.length,
        savedStage: updatedSession.stage 
      });
    } catch (error) {
      console.error('❌ Error saving vision session:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar. Tentando novamente...",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [userId, toast]);

  // Force sync to database - useful for debugging
  const forceSyncToDatabase = useCallback(async () => {
    const currentSession = sessionRef.current;
    if (!currentSession) {
      console.error('💾 Vision: Nenhuma sessão para sincronizar');
      return false;
    }

    console.log('🔄 Vision: Forçando sincronização...', {
      sessionId: currentSession.id,
      stage: currentSession.stage,
      answersCount: Object.keys(currentSession.answers).length,
      hasAnalysis: !!currentSession.analysis
    });

    try {
      const { error } = await supabase
        .from('vision_sessions')
        .update({
          stage: currentSession.stage,
          answers: currentSession.answers as unknown as Json,
          analysis: currentSession.analysis as unknown as Json,
          notes: currentSession.notes,
          selected_vision_type: currentSession.selectedVisionType,
          final_vision: currentSession.finalVision,
        })
        .eq('id', currentSession.id);

      if (error) throw error;
      
      toast({
        title: "Dados sincronizados!",
        description: "Sua visão foi atualizada no servidor.",
      });
      console.log('✅ Vision force sync completed');
      return true;
    } catch (error) {
      console.error('❌ Error force syncing vision:', error);
      toast({
        title: "Erro ao sincronizar",
        description: "Não foi possível sincronizar os dados.",
        variant: "destructive",
      });
      return false;
    }
  }, [toast]);

  const debouncedSave = useCallback((updatedSession: VisionSession) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveToDatabase(updatedSession);
    }, 1000);
  }, [saveToDatabase]);

  const saveAnswer = useCallback((questionNumber: number, answerText: string) => {
    setSession((currentSession) => {
      if (!currentSession) return null;
      
      const updatedSession: VisionSession = {
        ...currentSession,
        answers: {
          ...currentSession.answers,
          [questionNumber]: answerText,
        },
        updatedAt: new Date().toISOString(),
      };
      
      debouncedSave(updatedSession);
      return updatedSession;
    });
  }, [debouncedSave]);

  // Auto-save checkpoints for stages
  const saveCheckpointIfNeeded = useCallback(async (oldStage: number, newStage: number, currentSession: VisionSession | null) => {
    if (!currentSession) return;
    
    // Save when reaching review stage (stage 11)
    if (oldStage < 11 && newStage === 11) {
      if (currentSession.analysis) {
        try {
          await supabase
            .from('vision_version_history')
            .insert({
              session_id: currentSession.id,
              vision_inspirational: currentSession.analysis.visionInspirational || '',
              vision_measurable: currentSession.analysis.visionMeasurable || '',
              variant: 'step_questionario',
            });
          console.log('✅ Auto-save: Questionário de visão completo');
        } catch (error) {
          console.error('Error auto-saving checkpoint:', error);
        }
      }
    }
    // Save when reaching summary (stage 13)
    if (oldStage < 13 && newStage === 13) {
      try {
        await supabase
          .from('vision_version_history')
          .insert({
            session_id: currentSession.id,
            vision_inspirational: currentSession.analysis?.visionInspirational || currentSession.finalVision || '',
            vision_measurable: currentSession.analysis?.visionMeasurable || '',
            variant: 'step_visao_final',
          });
        console.log('✅ Auto-save: Visão finalizada');
      } catch (error) {
        console.error('Error auto-saving checkpoint:', error);
      }
    }
  }, []);

  const updateStage = useCallback((newStage: number) => {
    setSession((currentSession) => {
      if (!currentSession) return null;
      
      // Trigger auto-save checkpoint asynchronously
      saveCheckpointIfNeeded(currentSession.stage, newStage, currentSession);
      
      const updatedSession: VisionSession = {
        ...currentSession,
        stage: newStage,
        updatedAt: new Date().toISOString(),
      };
      
      saveToDatabase(updatedSession);
      return updatedSession;
    });
  }, [saveToDatabase, saveCheckpointIfNeeded]);

  const saveAnalysis = useCallback(async (analysis: VisionAnalysis) => {
    const currentSession = sessionRef.current;
    if (!currentSession) return;

    // Check if original version already exists
    const alreadyHasOriginal = versionHistoryRef.current.some(
      v => v.variant === 'original' && v.visionInspirational === analysis.visionInspirational
    );

    if (!alreadyHasOriginal) {
      try {
        const { data: historyEntry, error: historyError } = await supabase
          .from('vision_version_history')
          .insert({
            session_id: currentSession.id,
            vision_inspirational: analysis.visionInspirational,
            vision_measurable: analysis.visionMeasurable,
            variant: 'original',
          })
          .select()
          .single();

        if (historyError) throw historyError;

        const newVersion: VersionHistoryItem = {
          id: historyEntry.id,
          visionInspirational: analysis.visionInspirational,
          visionMeasurable: analysis.visionMeasurable || "",
          variant: 'original',
          timestamp: historyEntry.created_at,
        };

        setVersionHistory(prev => [newVersion, ...prev]);
      } catch (error) {
        console.error('Error saving version history:', error);
      }
    }

    setSession((currentSession) => {
      if (!currentSession) return null;
      
      const updatedSession: VisionSession = {
        ...currentSession,
        analysis,
        updatedAt: new Date().toISOString(),
      };
      
      saveToDatabase(updatedSession);
      return updatedSession;
    });
  }, [saveToDatabase]);

  const addVersion = useCallback(async (version: Omit<VersionHistoryItem, "id" | "timestamp">) => {
    const currentSession = sessionRef.current;
    if (!currentSession) return;

    try {
      const { data: historyEntry, error } = await supabase
        .from('vision_version_history')
        .insert({
          session_id: currentSession.id,
          vision_inspirational: version.visionInspirational,
          vision_measurable: version.visionMeasurable,
          variant: version.variant,
        })
        .select()
        .single();

      if (error) throw error;

      const newVersion: VersionHistoryItem = {
        id: historyEntry.id,
        visionInspirational: version.visionInspirational,
        visionMeasurable: version.visionMeasurable || "",
        variant: version.variant,
        timestamp: historyEntry.created_at,
      };

      setVersionHistory(prev => [newVersion, ...prev]);
    } catch (error) {
      console.error('Error adding version:', error);
    }
  }, []);

  const saveNotes = useCallback((notes: string) => {
    setSession((currentSession) => {
      if (!currentSession) return null;
      
      const updatedSession: VisionSession = {
        ...currentSession,
        notes,
        updatedAt: new Date().toISOString(),
      };
      
      debouncedSave(updatedSession);
      return updatedSession;
    });
  }, [debouncedSave]);

  const resetSession = useCallback(async () => {
    if (!userId) return;

    try {
      const currentSession = sessionRef.current;
      if (currentSession) {
        await supabase
          .from('vision_version_history')
          .delete()
          .eq('session_id', currentSession.id);

        await supabase
          .from('vision_sessions')
          .update({
            stage: 1,
            answers: {},
            analysis: null,
            notes: "",
            selected_vision_type: null,
            final_vision: null,
          })
          .eq('id', currentSession.id);

        setSession({
          ...currentSession,
          stage: 1,
          answers: {},
          analysis: null,
          notes: "",
          selectedVisionType: undefined,
          finalVision: undefined,
          updatedAt: new Date().toISOString(),
        });
        setVersionHistory([]);
      }
    } catch (error) {
      console.error('Error resetting session:', error);
    }
  }, [userId]);

  const selectFinalVision = useCallback((type: 'inspirational' | 'measurable') => {
    setSession((currentSession) => {
      if (!currentSession?.analysis) return currentSession;
      
      const finalVision = type === 'inspirational' 
        ? currentSession.analysis.visionInspirational 
        : currentSession.analysis.visionMeasurable;
      
      const updatedSession: VisionSession = {
        ...currentSession,
        selectedVisionType: type,
        finalVision,
        updatedAt: new Date().toISOString(),
      };
      
      saveToDatabase(updatedSession);
      return updatedSession;
    });
  }, [saveToDatabase]);

  const updateVisionStatement = useCallback((type: 'inspirational' | 'measurable', newVision: string) => {
    setSession((currentSession) => {
      if (!currentSession?.analysis) return currentSession;
      
      const updatedAnalysis = {
        ...currentSession.analysis,
        [type === 'inspirational' ? 'visionInspirational' : 'visionMeasurable']: newVision,
      };
      
      const updatedSession: VisionSession = {
        ...currentSession,
        analysis: updatedAnalysis,
        finalVision: currentSession.selectedVisionType === type ? newVision : currentSession.finalVision,
        updatedAt: new Date().toISOString(),
      };
      
      saveToDatabase(updatedSession);
      return updatedSession;
    });
  }, [saveToDatabase]);

  const updateKeywords = useCallback((newKeywords: string[]) => {
    setSession((currentSession) => {
      if (!currentSession?.analysis) return currentSession;
      
      const updatedAnalysis = {
        ...currentSession.analysis,
        keywords: newKeywords,
      };
      
      const updatedSession: VisionSession = {
        ...currentSession,
        analysis: updatedAnalysis,
        updatedAt: new Date().toISOString(),
      };
      
      saveToDatabase(updatedSession);
      return updatedSession;
    });
  }, [saveToDatabase]);

  // Return a default session if not loaded yet
  const effectiveSession = session || createNewSession(userId || 'guest');

  return {
    session: effectiveSession,
    sessionRef,
    versionHistory,
    isLoading,
    isSaving,
    saveAnswer,
    updateStage,
    saveAnalysis,
    addVersion,
    saveNotes,
    resetSession,
    selectFinalVision,
    updateVisionStatement,
    updateKeywords,
    forceSyncToDatabase,
  };
}
