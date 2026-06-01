import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useVision } from "@/contexts/VisionContext";
import { VisionAnalysis } from "@/types/vision.types";
import { Sparkles, RefreshCw, ArrowLeft } from "lucide-react";
import logoGentia from "@/assets/logo-gentia.png";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function VisionProcessing() {
  const { session, sessionRef, saveAnalysis, updateStage } = useVision();
  const hasProcessed = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const [isProcessing, setIsProcessing] = useState(true);
  const [showRetry, setShowRetry] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  
  useEffect(() => {
    // Auto-recovery: If analysis already exists, go directly to summary
    if (session?.analysis && session.analysis.visionInspirational) {
      console.log('🔄 VisionProcessing: Análise já existe, redirecionando para Summary...');
      toast.success('Análise encontrada! Continuando...', { duration: 2000 });
      setTimeout(() => updateStage(13), 500);
      return;
    }
    
    // Prevenir execução múltipla
    if (hasProcessed.current) return;
    if (!session?.id) return; // Esperar sessão carregar
    hasProcessed.current = true;
    
    const generateAnalysis = async () => {
      // Use sessionRef.current to avoid stale closure
      const currentSession = sessionRef.current;
      
      // Double-check: if analysis exists now, skip
      if (currentSession?.analysis && currentSession.analysis.visionInspirational) {
        console.log('🔄 VisionProcessing: Análise detectada antes da chamada, redirecionando...');
        setIsProcessing(false);
        updateStage(13);
        return;
      }
      
      console.log('🔍 VisionProcessing: Iniciando chamada à IA...', { 
        sessionId: currentSession?.id, 
        answersCount: Object.keys(currentSession?.answers || {}).length,
        attempt: attemptCount + 1
      });

      setIsProcessing(true);
      setShowRetry(false);

      try {
        // Get user session for authenticated request
        const { data: { session: authSession } } = await supabase.auth.getSession();
        if (!authSession?.access_token) {
          toast.error('Você precisa estar logado para gerar análises.');
          updateStage(11);
          return;
        }

        // Create AbortController for timeout (60 seconds for AI generation)
        abortControllerRef.current = new AbortController();
        const timeoutId = setTimeout(() => {
          console.log('⏰ VisionProcessing: Timeout de 60s atingido, abortando...');
          abortControllerRef.current?.abort();
        }, 60000); // 60 second timeout

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-vision`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authSession.access_token}`,
            },
            body: JSON.stringify({
              sessionId: currentSession?.id,
              answers: currentSession?.answers,
            }),
            signal: abortControllerRef.current.signal,
          }
        );

        clearTimeout(timeoutId);

        console.log('📡 VisionProcessing: Resposta recebida', { status: response.status });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('❌ VisionProcessing: Erro na resposta', { status: response.status, errorData });
          
          let errorMessage = 'Erro ao processar análise.';
          
          if (response.status === 429) {
            errorMessage = 'Limite de requisições atingido. Tente novamente em alguns instantes.';
          } else if (response.status === 402) {
            errorMessage = 'Créditos do Lovable AI esgotados. Por favor, adicione créditos no workspace.';
          }
          
          toast.error(errorMessage, { duration: 4000 });
          setIsProcessing(false);
          setShowRetry(true);
          return;
        }

        const aiResponse = await response.json();
        console.log('✅ VisionProcessing: Resposta da IA parseada:', aiResponse);

        // Validate response
        if (!aiResponse.vision_inspirational || !aiResponse.vision_measurable) {
          console.error('❌ VisionProcessing: Resposta da IA incompleta', aiResponse);
          throw new Error('Resposta da IA incompleta');
        }

        // Convert AI response to VisionAnalysis
        const analysis: VisionAnalysis = {
          id: crypto.randomUUID(),
          sessionId: currentSession?.id || '',
          visionInspirational: aiResponse.vision_inspirational,
          visionMeasurable: aiResponse.vision_measurable,
          keywords: aiResponse.keywords || [],
          insights: aiResponse.insights || [],
          createdAt: new Date().toISOString(),
        };

        console.log('💾 VisionProcessing: Salvando análise...', analysis);
        saveAnalysis(analysis);
        
        // Wait for state update then navigate
        setTimeout(() => {
          console.log('📝 VisionProcessing: Atualizando para stage 13');
          updateStage(13);
          console.log('✅ VisionProcessing: Processo concluído - navegando para Summary');
        }, 100);
        
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          console.error('⏰ VisionProcessing: Timeout - requisição abortada');
          toast.error('A análise demorou demais. Tente novamente.', { duration: 4000 });
          
          // Atualizar stage no banco para evitar estado inconsistente
          if (currentSession?.id) {
            console.log('🔄 VisionProcessing: Resetando stage para 11 no banco após timeout');
            await supabase
              .from('vision_sessions')
              .update({ stage: 11, updated_at: new Date().toISOString() })
              .eq('id', currentSession.id);
          }
        } else {
          console.error('❌ VisionProcessing: Erro ao gerar análise:', error);
          toast.error('Erro ao gerar análise.', { duration: 3000 });
        }
        
        setIsProcessing(false);
        setShowRetry(true);
      }
    };

    // Start processing after a short delay
    const timer = setTimeout(() => {
      generateAnalysis();
    }, 1500);
    
    return () => {
      clearTimeout(timer);
      abortControllerRef.current?.abort();
    };
  }, [session?.id, session?.analysis, attemptCount]); // Include attemptCount for retry
  
  const handleRetry = () => {
    hasProcessed.current = false;
    setAttemptCount(prev => prev + 1);
    setShowRetry(false);
    setIsProcessing(true);
  };

  const handleGoBack = () => {
    console.log('👤 Usuário voltando para revisão');
    updateStage(11);
  };
  
  return (
    <div className="flex items-center justify-center min-h-[600px]">
      <Card className="max-w-md w-full">
        <CardContent className="p-12 text-center space-y-6">
          <div className="flex justify-center mb-6">
            <img src={logoGentia} alt="Gent.IA" className="h-36 w-auto" />
          </div>
          
          <div className="flex justify-center">
            <Sparkles className={`h-16 w-16 text-black ${isProcessing ? 'animate-pulse' : ''}`} />
          </div>
          
          <div className="space-y-2">
            {isProcessing ? (
              <>
                <h3 className="text-2xl font-semibold">Analisando suas respostas...</h3>
                <p className="text-gray-600">
                  Nossa IA está identificando os elementos-chave da sua visão empresarial
                </p>
                <p className="text-sm text-gray-500">Aguarde alguns instantes...</p>
              </>
            ) : showRetry ? (
              <>
                <h3 className="text-2xl font-semibold">Algo deu errado</h3>
                <p className="text-gray-600">
                  A análise não pôde ser concluída. Você pode tentar novamente ou voltar para revisar suas respostas.
                </p>
              </>
            ) : (
              <>
                <h3 className="text-2xl font-semibold">Análise pronta!</h3>
                <p className="text-gray-600">Continuando para o resumo...</p>
              </>
            )}
          </div>

          {showRetry ? (
            <div className="flex flex-col gap-3 pt-4">
              <Button onClick={handleRetry} className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Tentar novamente
              </Button>
              <Button variant="outline" onClick={handleGoBack} className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar para revisão
              </Button>
            </div>
          ) : (
            <>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div className="bg-black h-full rounded-full animate-pulse" style={{ width: "100%" }} />
              </div>
              
              <button 
                onClick={handleGoBack}
                className="mt-4 text-sm text-gray-500 hover:text-black underline transition-colors"
              >
                Cancelar e voltar
              </button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
