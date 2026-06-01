import { useState, useEffect, useRef, useCallback } from "react";
import { MissionSession, MissionAnalysis, MissionVersionHistoryItem } from "@/types/mission.types";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Json } from "@/integrations/supabase/types";
import { useOrganization } from "@/contexts/OrganizationContext";

const createNewSession = (userId: string): MissionSession => ({
  id: crypto.randomUUID(),
  userId,
  stage: 1,
  answers: {},
  analysis: null,
  notes: "",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  questionnaireVersion: 2, // Novas sessões usam v2
});

export const useMissionState = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { currentAccount } = useOrganization();
  const userId = user?.id;
  const accountId = currentAccount?.id;
  
  const [session, setSession] = useState<MissionSession | null>(null);
  const [versionHistory, setVersionHistory] = useState<MissionVersionHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sessionRef = useRef<MissionSession | null>(null);
  const versionHistoryRef = useRef<MissionVersionHistoryItem[]>([]);
  const isCreatingRef = useRef(false);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    versionHistoryRef.current = versionHistory;
  }, [versionHistory]);

  // Try to migrate data from localStorage
  const tryMigrateFromLocalStorage = async (dbSessionId: string, dbSession: any) => {
    const dbAnswers = dbSession.answers as Record<string, unknown> || {};
    const hasDbData = Object.keys(dbAnswers).length > 0 || dbSession.analysis;
    
    if (hasDbData) {
      console.log('📊 Mission DB session has data, skipping localStorage migration');
      return null;
    }

    const possibleKeys = [
      `mission_session_demo_user`,
      `mission_session_${user?.email}`,
      `mission_session_guest`,
      'mission_session',
    ];

    for (const key of possibleKeys) {
      try {
        const storedData = localStorage.getItem(key);
        if (!storedData) continue;

        const parsedData = JSON.parse(storedData);
        const localSession = parsedData.session || parsedData;
        const localAnswers = localSession.answers || {};
        
        if (Object.keys(localAnswers).length === 0 && !localSession.analysis) {
          continue;
        }

        console.log(`🔍 Found mission data in localStorage key: ${key}`, localSession);

        const { error: updateError } = await supabase
          .from('mission_sessions')
          .update({
            stage: localSession.stage || 1,
            answers: localAnswers as unknown as Json,
            analysis: localSession.analysis as unknown as Json,
            notes: localSession.notes || "",
          })
          .eq('id', dbSessionId);

        if (updateError) throw updateError;

        const localHistory = parsedData.versionHistory || [];
        if (localHistory.length > 0) {
          for (const version of localHistory) {
            await supabase
              .from('mission_version_history')
              .insert({
                session_id: dbSessionId,
                mission_statement: version.missionStatement,
                variant: version.variant || 'original',
              });
          }
        }

        localStorage.removeItem(key);
        
        toast({
          title: "Dados recuperados!",
          description: "Seus dados anteriores de Missão foram restaurados com sucesso.",
        });

        console.log('✅ Mission data migrated from localStorage to database');
        
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
        let existingSession = null;
        
        if (accountId) {
          const { data: accountSessions, error: accountError } = await supabase
            .from('mission_sessions')
            .select('*')
            .eq('account_id', accountId)
            .order('created_at', { ascending: true })
            .limit(1);
          
          if (accountError) throw accountError;
          existingSession = accountSessions?.[0] || null;
        }
        
        if (!existingSession && !accountId) {
          const { data: userSessions, error: userError } = await supabase
            .from('mission_sessions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: true })
            .limit(1);
          
          if (userError) throw userError;
          existingSession = userSessions?.[0] || null;
        }

        if (existingSession) {
          const migratedData = await tryMigrateFromLocalStorage(existingSession.id, existingSession);
          
          if (migratedData) {
            const loadedSession: MissionSession = {
              id: existingSession.id,
              userId: existingSession.user_id,
              stage: migratedData.session.stage || 1,
              answers: migratedData.session.answers || {},
              analysis: migratedData.session.analysis || null,
              notes: migratedData.session.notes || "",
              createdAt: existingSession.created_at,
              updatedAt: new Date().toISOString(),
              questionnaireVersion: existingSession.questionnaire_version || 1,
              segment: existingSession.segment,
            };
            setSession(loadedSession);
            
            if (migratedData.versionHistory?.length > 0) {
              const { data: history } = await supabase
                .from('mission_version_history')
                .select('*')
                .eq('session_id', existingSession.id)
                .order('created_at', { ascending: false });

              if (history) {
                setVersionHistory(history.map(h => ({
                  id: h.id,
                  missionStatement: h.mission_statement,
                  variant: h.variant as MissionVersionHistoryItem['variant'],
                  timestamp: h.created_at,
                })));
              }
            }
          } else {
            const loadedSession: MissionSession = {
              id: existingSession.id,
              userId: existingSession.user_id,
              stage: existingSession.stage || 1,
              answers: (existingSession.answers as Record<number, string>) || {},
              analysis: existingSession.analysis as unknown as MissionAnalysis | null,
              notes: existingSession.notes || "",
              createdAt: existingSession.created_at,
              updatedAt: existingSession.updated_at,
              questionnaireVersion: existingSession.questionnaire_version || 1,
              segment: existingSession.segment,
            };
            setSession(loadedSession);

            const { data: history } = await supabase
              .from('mission_version_history')
              .select('*')
              .eq('session_id', existingSession.id)
              .order('created_at', { ascending: false });

            if (history) {
              setVersionHistory(history.map(h => ({
                id: h.id,
                missionStatement: h.mission_statement,
                variant: h.variant as MissionVersionHistoryItem['variant'],
                timestamp: h.created_at,
              })));
            }
          }
        } else {
          if (!accountId) {
            console.log('⏳ Waiting for account data before creating session...');
            return;
          }
          
          if (isCreatingRef.current) {
            console.log('⏳ Mission session creation already in progress, skipping...');
            return;
          }
          isCreatingRef.current = true;
          
          // Verificar se existe sessão órfã do usuário (sem account_id ou com account_id diferente)
          const { data: orphanSession } = await supabase
            .from('mission_sessions')
            .select('*')
            .eq('user_id', userId)
            .is('account_id', null)
            .limit(1)
            .maybeSingle();
          
          if (orphanSession) {
            // Atualizar sessão órfã com o account_id correto
            console.log('🔄 Found orphan mission session, updating with account_id...');
            const { error: updateError } = await supabase
              .from('mission_sessions')
              .update({ account_id: accountId })
              .eq('id', orphanSession.id);
            
            if (updateError) {
              console.error('Error updating orphan session:', updateError);
              isCreatingRef.current = false;
              throw updateError;
            }
            
            const loadedSession: MissionSession = {
              id: orphanSession.id,
              userId: orphanSession.user_id,
              stage: orphanSession.stage || 1,
              answers: (orphanSession.answers as Record<number, string>) || {},
              analysis: orphanSession.analysis as unknown as MissionAnalysis | null,
              notes: orphanSession.notes || "",
              createdAt: orphanSession.created_at,
              updatedAt: new Date().toISOString(),
              questionnaireVersion: (orphanSession.questionnaire_version as 1 | 2) || 1,
              segment: orphanSession.segment as 'industry' | 'services' | 'product' | undefined,
            };
            setSession(loadedSession);
            isCreatingRef.current = false;
            return;
          }
          
          const newSession = createNewSession(userId);
          const { data: created, error: createError } = await supabase
            .from('mission_sessions')
            .insert({
              user_id: userId,
              account_id: accountId,
              stage: 1,
              answers: {},
              notes: "",
              questionnaire_version: 2, // Novas sessões usam v2
            })
            .select()
            .single();

          if (createError) {
            isCreatingRef.current = false;
            throw createError;
          }
          
          const dbSession: MissionSession = {
            ...newSession,
            id: created.id,
            questionnaireVersion: 2,
          };
          
          const migratedData = await tryMigrateFromLocalStorage(created.id, { answers: {}, analysis: null });
          
          if (migratedData) {
            setSession({
              ...dbSession,
              stage: migratedData.session.stage || 1,
              answers: migratedData.session.answers || {},
              analysis: migratedData.session.analysis || null,
              notes: migratedData.session.notes || "",
            });
          } else {
            setSession(dbSession);
          }
        }
      } catch (error) {
        console.error('Error loading mission session:', error);
        toast({
          title: "Erro ao carregar",
          description: "Não foi possível carregar sua sessão de missão.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadSession();
  }, [userId, accountId, toast]);

  // Polling to sync ONLY stage changes
  useEffect(() => {
    if (!session?.id) return;

    const pollInterval = setInterval(async () => {
      try {
        const { data } = await supabase
          .from('mission_sessions')
          .select('stage')
          .eq('id', session.id)
          .single();

        if (data) {
          const stageChanged = data.stage !== sessionRef.current?.stage;
          
          if (stageChanged) {
            console.log(`🔄 Mission stage synced from database: ${data.stage}`);
            setSession(prev => prev ? { 
              ...prev, 
              stage: data.stage ?? prev.stage,
            } : null);
          }
        }
      } catch (error) {
        // Ignore polling errors silently
      }
    }, 500);

    return () => clearInterval(pollInterval);
  }, [session?.id]);

  // Debounced save to database
  const saveToDatabase = useCallback(async (updatedSession: MissionSession) => {
    if (!userId || !updatedSession.id) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('mission_sessions')
        .update({
          stage: updatedSession.stage,
          answers: updatedSession.answers as unknown as Json,
          analysis: updatedSession.analysis as unknown as Json,
          notes: updatedSession.notes,
          questionnaire_version: updatedSession.questionnaireVersion,
          segment: updatedSession.segment,
        })
        .eq('id', updatedSession.id);

      if (error) throw error;
      console.log('💾 Mission session saved to database');
    } catch (error) {
      console.error('Error saving mission session:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar. Tentando novamente...",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [userId, toast]);

  const debouncedSave = useCallback((updatedSession: MissionSession) => {
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
      
      const updatedSession: MissionSession = {
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

  const saveSegment = useCallback((segment: 'industry' | 'services' | 'product') => {
    setSession((currentSession) => {
      if (!currentSession) return null;
      
      const updatedSession: MissionSession = {
        ...currentSession,
        segment,
        updatedAt: new Date().toISOString(),
      };
      
      saveToDatabase(updatedSession);
      return updatedSession;
    });
  }, [saveToDatabase]);

  // Auto-save checkpoints for stages
  const CHECKPOINT_STAGES = [14, 16]; // 14=Review, 16=Summary
  
  const saveCheckpointIfNeeded = useCallback(async (oldStage: number, newStage: number) => {
    // Save when completing questionnaire (going to review)
    if (oldStage < 14 && newStage === 14) {
      const currentSession = sessionRef.current;
      if (currentSession?.analysis?.missionStatement) {
        try {
          await supabase
            .from('mission_version_history')
            .insert({
              session_id: currentSession.id,
              mission_statement: currentSession.analysis.missionStatement,
              variant: 'step_questionario',
            });
          console.log('✅ Auto-save: Questionário completo');
        } catch (error) {
          console.error('Error auto-saving checkpoint:', error);
        }
      }
    }
    // Save when reaching summary (final mission)
    if (oldStage < 16 && newStage === 16) {
      const currentSession = sessionRef.current;
      if (currentSession?.analysis?.missionStatement) {
        try {
          await supabase
            .from('mission_version_history')
            .insert({
              session_id: currentSession.id,
              mission_statement: currentSession.analysis.missionStatement,
              variant: 'step_missao_final',
            });
          console.log('✅ Auto-save: Missão finalizada');
        } catch (error) {
          console.error('Error auto-saving checkpoint:', error);
        }
      }
    }
  }, []);

  const updateStage = useCallback((newStage: number) => {
    setSession((currentSession) => {
      if (!currentSession) return null;
      
      // Trigger auto-save checkpoint asynchronously
      saveCheckpointIfNeeded(currentSession.stage, newStage);
      
      const updatedSession: MissionSession = {
        ...currentSession,
        stage: newStage,
        updatedAt: new Date().toISOString(),
      };
      
      saveToDatabase(updatedSession);
      return updatedSession;
    });
  }, [saveToDatabase, saveCheckpointIfNeeded]);

  const saveAnalysis = useCallback(async (analysis: MissionAnalysis) => {
    const currentSession = sessionRef.current;
    if (!currentSession) return;

    try {
      const { data: historyEntry, error: historyError } = await supabase
        .from('mission_version_history')
        .insert({
          session_id: currentSession.id,
          mission_statement: analysis.missionStatement,
          variant: 'original',
        })
        .select()
        .single();

      if (historyError) throw historyError;

      const newVersion: MissionVersionHistoryItem = {
        id: historyEntry.id,
        missionStatement: analysis.missionStatement,
        variant: 'original',
        timestamp: historyEntry.created_at,
      };

      setVersionHistory(prev => [newVersion, ...prev]);
    } catch (error) {
      console.error('Error saving version history:', error);
    }

    setSession((currentSession) => {
      if (!currentSession) return null;
      
      const updatedSession: MissionSession = {
        ...currentSession,
        analysis,
        updatedAt: new Date().toISOString(),
      };
      
      saveToDatabase(updatedSession);
      return updatedSession;
    });
  }, [saveToDatabase]);

  const addVersion = useCallback(async (version: Omit<MissionVersionHistoryItem, "id" | "timestamp">) => {
    const currentSession = sessionRef.current;
    if (!currentSession) return;

    try {
      const { data: historyEntry, error } = await supabase
        .from('mission_version_history')
        .insert({
          session_id: currentSession.id,
          mission_statement: version.missionStatement,
          variant: version.variant,
        })
        .select()
        .single();

      if (error) throw error;

      const newVersion: MissionVersionHistoryItem = {
        id: historyEntry.id,
        missionStatement: version.missionStatement,
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
      
      const updatedSession: MissionSession = {
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
        // Salvar backup da missão atual ANTES de resetar
        if (currentSession.analysis?.missionStatement) {
          await supabase
            .from('mission_version_history')
            .insert({
              session_id: currentSession.id,
              mission_statement: currentSession.analysis.missionStatement,
              variant: 'backup_before_reset',
            });
          console.log('✅ Backup saved before reset');
        }

        await supabase
          .from('mission_version_history')
          .delete()
          .eq('session_id', currentSession.id);

        await supabase
          .from('mission_sessions')
          .update({
            stage: 1,
            answers: {},
            analysis: null,
            notes: "",
          })
          .eq('id', currentSession.id);

        setSession({
          ...currentSession,
          stage: 1,
          answers: {},
          analysis: null,
          notes: "",
          updatedAt: new Date().toISOString(),
        });
        setVersionHistory([]);
      }
    } catch (error) {
      console.error('Error resetting session:', error);
    }
  }, [userId]);

  const upgradeToV2 = useCallback(async () => {
    const currentSession = sessionRef.current;
    if (!currentSession) return;

    try {
      // Salvar backup no version_history
      if (currentSession.analysis?.missionStatement) {
        await supabase
          .from('mission_version_history')
          .insert({
            session_id: currentSession.id,
            mission_statement: `[BACKUP v1] ${currentSession.analysis.missionStatement}`,
            variant: 'backup_v1',
          });
      }

      // Atualizar para v2
      await supabase
        .from('mission_sessions')
        .update({
          questionnaire_version: 2,
          stage: 1,
          answers: {},
          analysis: null,
          notes: currentSession.notes, // Manter notas
          segment: null,
        })
        .eq('id', currentSession.id);

      // Atualizar estado local
      setSession({
        ...currentSession,
        questionnaireVersion: 2,
        stage: 1,
        answers: {},
        analysis: null,
        segment: undefined,
        updatedAt: new Date().toISOString(),
      });

      toast({
        title: "Questionário atualizado!",
        description: "Você agora está usando o novo questionário com 9 perguntas.",
      });
    } catch (error) {
      console.error('Error upgrading to v2:', error);
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar para o novo questionário.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const updateKeywords = useCallback((keywords: string[]) => {
    setSession((currentSession) => {
      if (!currentSession?.analysis) return currentSession;
      
      const updatedSession: MissionSession = {
        ...currentSession,
        analysis: {
          ...currentSession.analysis,
          keywords,
        },
        updatedAt: new Date().toISOString(),
      };
      
      debouncedSave(updatedSession);
      return updatedSession;
    });
  }, [debouncedSave]);

  const updateMissionStatement = useCallback((newMission: string) => {
    setSession((currentSession) => {
      if (!currentSession?.analysis) return currentSession;
      
      const updatedSession: MissionSession = {
        ...currentSession,
        analysis: {
          ...currentSession.analysis,
          missionStatement: newMission,
        },
        updatedAt: new Date().toISOString(),
      };
      
      saveToDatabase(updatedSession);
      return updatedSession;
    });
  }, [saveToDatabase]);

  // Atualizar apenas campos específicos da análise (para reanálise)
  const updateAnalysisPartial = useCallback((partialAnalysis: Partial<MissionAnalysis>) => {
    setSession((currentSession) => {
      if (!currentSession?.analysis) return currentSession;
      
      const updatedSession: MissionSession = {
        ...currentSession,
        analysis: {
          ...currentSession.analysis,
          ...partialAnalysis,
        },
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
    saveSegment,
    updateStage,
    saveAnalysis,
    addVersion,
    saveNotes,
    resetSession,
    upgradeToV2,
    updateKeywords,
    updateMissionStatement,
    updateAnalysisPartial,
  };
};
