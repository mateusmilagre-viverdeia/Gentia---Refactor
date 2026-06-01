import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';
import type { 
  SellingCompanySession, 
  SellingCompanyVersion, 
  WizardResponses,
  CultureContext,
  CompanyContext
} from '@/types/selling-company.types';

export function useSellingCompany() {
  const { user } = useAuth();
  const { currentAccount: account } = useOrganization();
  const [session, setSession] = useState<SellingCompanySession | null>(null);
  const [versions, setVersions] = useState<SellingCompanyVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [cultureContext, setCultureContext] = useState<CultureContext>({});
  const [companyContext, setCompanyContext] = useState<CompanyContext | null>(null);
  const [companyHistory, setCompanyHistory] = useState<string>('');

  // Load session and context
  useEffect(() => {
    if (account?.id && user?.id) {
      loadSession();
      loadCultureContext();
      loadCompanyContext();
      loadCompanyHistory();
    }
  }, [account?.id, user?.id]);

  const loadSession = async () => {
    if (!account?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('selling_company_sessions')
        .select('*')
        .eq('account_id', account.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setSession(data as SellingCompanySession);
        await loadVersions(data.id);
      }
    } catch (error) {
      console.error('Error loading session:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadVersions = async (sessionId: string) => {
    const { data, error } = await supabase
      .from('selling_company_versions')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading versions:', error);
      return;
    }
    setVersions((data || []) as SellingCompanyVersion[]);
  };

  const loadCultureContext = async () => {
    if (!account?.id) return;

    try {
      // Load mission
      const { data: missionData } = await supabase
        .from('mission_sessions')
        .select('analysis')
        .eq('account_id', account.id)
        .maybeSingle();

      // Load vision
      const { data: visionData } = await supabase
        .from('vision_sessions')
        .select('analysis, final_vision')
        .eq('account_id', account.id)
        .maybeSingle();

      // Load values with behaviors - query directly from behaviors table
      // This includes custom values that may not be in the catalog
      const { data: valuesSession } = await supabase
        .from('values_sessions')
        .select('id')
        .eq('account_id', account.id)
        .maybeSingle();

      let values: CultureContext['values'] = [];
      if (valuesSession?.id) {
        const { data: behaviors } = await supabase
          .from('values_behaviors_selections')
          .select('value_label, do_selected, dont_selected')
          .eq('session_id', valuesSession.id);

        if (behaviors && behaviors.length > 0) {
          values = behaviors.map(b => ({
            label: b.value_label,
            dos: b.do_selected || [],
            donts: b.dont_selected || [],
          }));
        }
      }

      setCultureContext({
        mission: (missionData?.analysis as any)?.mission || '',
        vision: visionData?.final_vision || (visionData?.analysis as any)?.vision_inspirational || '',
        values,
      });
    } catch (error) {
      console.error('Error loading culture context:', error);
    }
  };

  const loadCompanyContext = async () => {
    if (!account?.id) return;

    const { data, error } = await supabase
      .from('companies')
      .select('name, sector, employees_count, revenue_last_12_months, website, instagram')
      .eq('id', account.id)
      .single();

    if (!error && data) {
      setCompanyContext(data as CompanyContext);
    }
  };

  const loadCompanyHistory = async () => {
    if (!account?.id) return;

    const { data } = await supabase
      .from('culture_code_sessions')
      .select('company_history')
      .eq('account_id', account.id)
      .maybeSingle();

    if (data?.company_history) {
      setCompanyHistory(data.company_history);
    }
  };

  const createSession = async () => {
    if (!account?.id || !user?.id) return null;

    const { data, error } = await supabase
      .from('selling_company_sessions')
      .insert({
        account_id: account.id,
        user_id: user.id,
        stage: 'wizard',
        wizard_step: 1,
        responses: {},
        status: 'draft',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating session:', error);
      toast.error('Erro ao criar sessão');
      return null;
    }

    setSession(data as SellingCompanySession);
    return data as SellingCompanySession;
  };

  const updateSession = useCallback(async (updates: Partial<Omit<SellingCompanySession, 'responses'>> & { responses?: WizardResponses }) => {
    if (!session?.id) return;

    const dbUpdates: Record<string, unknown> = { 
      ...updates, 
      updated_at: new Date().toISOString() 
    };

    const { error } = await supabase
      .from('selling_company_sessions')
      .update(dbUpdates)
      .eq('id', session.id);

    if (error) {
      console.error('Error updating session:', error);
      return;
    }

    setSession(prev => prev ? { ...prev, ...updates } as SellingCompanySession : null);
  }, [session?.id]);

  const updateResponses = useCallback(async (responses: WizardResponses) => {
    await updateSession({ responses });
  }, [updateSession]);

  const nextStep = useCallback(async () => {
    if (!session) return;
    const newStep = Math.min(session.wizard_step + 1, 5);
    
    // Auto-save when completing wizard (step 5)
    if (newStep === 5 && session.wizard_step < 5) {
      console.log('✅ Auto-save: Wizard completo');
    }
    
    await updateSession({ wizard_step: newStep });
  }, [session, updateSession]);

  const prevStep = useCallback(async () => {
    if (!session) return;
    const newStep = Math.max(session.wizard_step - 1, 1);
    await updateSession({ wizard_step: newStep });
  }, [session, updateSession]);

  const generateContent = useCallback(async () => {
    if (!session) return null;

    setGenerating(true);
    await updateSession({ status: 'generating' });

    try {
      const response = await supabase.functions.invoke('generate-selling-company', {
        body: {
          companyData: companyContext,
          cultureData: cultureContext,
          wizardResponses: session.responses,
          companyHistory,
        },
      });

      if (response.error) throw response.error;

      const { content, model_used, prompt_used } = response.data;

      // Save version
      const { data: version, error: versionError } = await supabase
        .from('selling_company_versions')
        .insert({
          session_id: session.id,
          content,
          model_used: model_used || 'google/gemini-2.5-flash',
          prompt_used: prompt_used || '',
          approved: false,
        })
        .select()
        .single();

      if (versionError) throw versionError;

      setVersions(prev => [version as SellingCompanyVersion, ...prev]);
      await updateSession({ stage: 'chat', status: 'draft' });

      toast.success('Conteúdo gerado com sucesso!');
      return version as SellingCompanyVersion;
    } catch (error) {
      console.error('Error generating content:', error);
      toast.error('Erro ao gerar conteúdo. Tente novamente.');
      await updateSession({ status: 'draft' });
      return null;
    } finally {
      setGenerating(false);
    }
  }, [session, companyContext, cultureContext, companyHistory, updateSession]);

  const refineContent = useCallback(async (userMessage: string) => {
    if (!session || versions.length === 0) return null;

    setGenerating(true);
    try {
      const currentContent = versions[0].content;

      const response = await supabase.functions.invoke('refine-selling-company', {
        body: {
          currentContent,
          userMessage,
          context: { companyContext, cultureContext },
        },
      });

      if (response.error) throw response.error;

      const { content } = response.data;

      // Save new version
      const { data: version, error: versionError } = await supabase
        .from('selling_company_versions')
        .insert({
          session_id: session.id,
          content,
          model_used: 'google/gemini-2.5-flash',
          approved: false,
        })
        .select()
        .single();

      if (versionError) throw versionError;

      setVersions(prev => [version as SellingCompanyVersion, ...prev]);
      toast.success('Versão atualizada!');
      return version as SellingCompanyVersion;
    } catch (error) {
      console.error('Error refining content:', error);
      toast.error('Erro ao refinar conteúdo');
      return null;
    } finally {
      setGenerating(false);
    }
  }, [session, versions, companyContext, cultureContext]);

  const refineBlock = useCallback(async (blockId: string, userMessage: string) => {
    if (!session || versions.length === 0) return null;

    // Import parse/merge functions
    const { parseContentBlocks, mergeBlocks, serializeBlock } = await import('@/lib/parseContentBlocks');

    const currentContent = versions[0].content;
    const blocks = parseContentBlocks(currentContent);
    const targetBlock = blocks.find(b => b.id === blockId);

    if (!targetBlock) {
      toast.error('Bloco não encontrado');
      return null;
    }

    setGenerating(true);
    try {
      const response = await supabase.functions.invoke('refine-selling-company', {
        body: {
          blockId,
          blockContent: targetBlock.content,
          userMessage,
          context: { companyContext, cultureContext },
        },
      });

      if (response.error) throw response.error;

      const { content: refinedBlockContent } = response.data;
      const refined = (refinedBlockContent ?? '').trim();

      // If the AI already returned a marker, keep its content as-is.
      // Otherwise, wrap it with the marker + header preserving current title/emoji.
      let nextContent: string;
      if (/<!--\s*block:[a-z0-9-]+\s*-->/i.test(refined)) {
        nextContent = refined;
      } else {
        // Strip a leading "## ..." header from the AI output (the model often re-emits it)
        // and rebuild it from current emoji/title.
        const bodyOnly = refined.replace(/^\s*#{1,3}\s+[^\n]*\n+/, '');
        const cleanTitle = targetBlock.title.replace(/^\p{Extended_Pictographic}(?:\uFE0F)?\s*/u, '').trim();
        nextContent = serializeBlock(
          targetBlock.id,
          targetBlock.emoji,
          targetBlock.number,
          cleanTitle,
          bodyOnly,
        );
      }

      const updatedBlocks = blocks.map(b =>
        b.id === blockId ? { ...b, content: nextContent } : b
      );

      const mergedContent = mergeBlocks(updatedBlocks);

      // Save new version with updated block
      const { data: version, error: versionError } = await supabase
        .from('selling_company_versions')
        .insert({
          session_id: session.id,
          content: mergedContent,
          model_used: 'google/gemini-2.5-flash',
          approved: false,
        })
        .select()
        .single();

      if (versionError) throw versionError;

      setVersions(prev => [version as SellingCompanyVersion, ...prev]);
      toast.success('Bloco atualizado!');
      return version as SellingCompanyVersion;
    } catch (error) {
      console.error('Error refining block:', error);
      toast.error('Erro ao refinar bloco');
      return null;
    } finally {
      setGenerating(false);
    }
  }, [session, versions, companyContext, cultureContext]);

  const editBlock = useCallback(async (
    blockId: string,
    newTitle: string,
    newContent: string,
    newEmoji?: string,
  ) => {
    if (!session || versions.length === 0) return null;

    const { parseContentBlocks, mergeBlocks, serializeBlock } = await import('@/lib/parseContentBlocks');

    const currentContent = versions[0].content;
    const blocks = parseContentBlocks(currentContent);
    const targetBlock = blocks.find(b => b.id === blockId);

    if (!targetBlock) {
      toast.error('Bloco não encontrado');
      return null;
    }

    try {
      const emojiToUse = (newEmoji ?? targetBlock.emoji ?? '').trim();
      const newMarkdown = serializeBlock(
        blockId,
        emojiToUse,
        targetBlock.number,
        newTitle,
        newContent,
      );

      const updatedBlocks = blocks.map(b =>
        b.id === blockId
          ? {
              ...b,
              title: emojiToUse ? `${emojiToUse} ${newTitle}` : newTitle,
              emoji: emojiToUse,
              content: newMarkdown,
            }
          : b
      );

      const mergedContent = mergeBlocks(updatedBlocks);

      // Save new version
      const { data: version, error: versionError } = await supabase
        .from('selling_company_versions')
        .insert({
          session_id: session.id,
          content: mergedContent,
          model_used: 'manual-edit',
          approved: false,
        })
        .select()
        .single();

      if (versionError) throw versionError;

      setVersions(prev => [version as SellingCompanyVersion, ...prev]);
      toast.success('Bloco editado com sucesso!');
      return version as SellingCompanyVersion;
    } catch (error) {
      console.error('Error editing block:', error);
      toast.error('Erro ao salvar edição');
      return null;
    }
  }, [session, versions]);

  const approveVersion = useCallback(async (
    versionId: string, 
    orderedBlockIds?: string[], 
    hiddenBlockIds?: string[]
  ) => {
    // If we have order/hidden info, create a final version with correct structure
    if (orderedBlockIds && orderedBlockIds.length > 0) {
      const { parseContentBlocks, mergeBlocks } = await import('@/lib/parseContentBlocks');
      
      const currentVersion = versions.find(v => v.id === versionId);
      if (!currentVersion) {
        toast.error('Versão não encontrada');
        return;
      }

      const blocks = parseContentBlocks(currentVersion.content);
      const hiddenSet = new Set(hiddenBlockIds || []);
      
      // Filter and reorder blocks
      const finalBlocks = orderedBlockIds
        .map(id => blocks.find(b => b.id === id))
        .filter((b): b is NonNullable<typeof b> => b !== undefined && !hiddenSet.has(b.id))
        .map((block, index) => {
          // Renumber the block in the content
          const newNumber = index + 1;
          const updatedContent = block.content.replace(
            /^(##\s*[^\n]*?\s*)\d+\./m,
            `$1${newNumber}.`
          );
          return { ...block, number: newNumber, content: updatedContent };
        });

      const finalContent = mergeBlocks(finalBlocks);

      // Create final approved version
      const { data: finalVersion, error: insertError } = await supabase
        .from('selling_company_versions')
        .insert({
          session_id: session?.id,
          content: finalContent,
          model_used: 'final-approval',
          approved: true,
        })
        .select()
        .single();

      if (insertError) {
        toast.error('Erro ao criar versão final');
        return;
      }

      // Unapprove all other versions
      await supabase
        .from('selling_company_versions')
        .update({ approved: false })
        .eq('session_id', session?.id)
        .neq('id', finalVersion.id);

      setVersions(prev => [finalVersion as SellingCompanyVersion, ...prev.map(v => ({ ...v, approved: false }))]);
    } else {
      // Simple approval without reordering
      const { error } = await supabase
        .from('selling_company_versions')
        .update({ approved: true })
        .eq('id', versionId);

      if (error) {
        toast.error('Erro ao aprovar versão');
        return;
      }

      // Update all other versions to not approved
      await supabase
        .from('selling_company_versions')
        .update({ approved: false })
        .eq('session_id', session?.id)
        .neq('id', versionId);

      setVersions(prev => prev.map(v => ({ ...v, approved: v.id === versionId })));
    }

    await updateSession({ stage: 'summary', status: 'approved' });
    toast.success('Versão aprovada com sucesso!');
  }, [session, versions, updateSession]);

  const resetSession = useCallback(async () => {
    if (!session?.id) return;
    
    // Delete all versions
    await supabase
      .from('selling_company_versions')
      .delete()
      .eq('session_id', session.id);

    // Reset session
    await updateSession({
      stage: 'wizard',
      wizard_step: 1,
      responses: {},
      status: 'draft',
    });

    setVersions([]);
    toast.success('Sessão reiniciada!');
  }, [session, updateSession]);

  const hasCompanyHistory = !!companyHistory;
  const hasCultureData = !!(cultureContext.mission || cultureContext.vision || (cultureContext.values && cultureContext.values.length > 0));
  const approvedVersion = versions.find(v => v.approved);
  const latestVersion = versions[0];

  return {
    session,
    versions,
    loading,
    generating,
    cultureContext,
    companyContext,
    companyHistory,
    hasCompanyHistory,
    hasCultureData,
    approvedVersion,
    latestVersion,
    createSession,
    updateSession,
    updateResponses,
    nextStep,
    prevStep,
    generateContent,
    refineContent,
    refineBlock,
    editBlock,
    approveVersion,
    resetSession,
  };
}
