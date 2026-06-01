import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useMission } from "@/contexts/MissionContext";
import { Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export function MissionProcessing() {
  const { session, sessionRef, saveAnalysis, updateStage } = useMission();
  const { toast } = useToast();
  const [progress, setProgress] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    if (hasStarted) return;
    if (!session?.id) return; // Esperar sessão carregar

    const timer = setTimeout(() => {
      setHasStarted(true);
      generateAnalysis();
    }, 3000);

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + 10;
      });
    }, 500);

    return () => {
      clearTimeout(timer);
      clearInterval(progressInterval);
    };
  }, [hasStarted, session?.id]);

  const generateAnalysis = async () => {
    try {
      // Usar sessionRef.current para evitar closure stale
      const currentSession = sessionRef.current;
      
      console.log('🚀 Starting mission analysis generation...');
      console.log('📋 Session answers:', currentSession?.answers);
      console.log('📋 Questionnaire version:', currentSession?.questionnaireVersion);
      
      // Validate that we have answers before calling the API
      if (!currentSession?.answers || Object.keys(currentSession.answers).length === 0) {
        console.error('❌ No answers found in session');
        toast({
          title: "Erro ao gerar análise",
          description: "Nenhuma resposta encontrada. Por favor, volte e responda as perguntas.",
          variant: "destructive",
        });
        updateStage(14);
        return;
      }

      const version = currentSession.questionnaireVersion || 1;
      
      // Get user session for authenticated request
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession?.access_token) {
        toast({
          title: "Sessão expirada",
          description: "Você precisa estar logado para gerar análises.",
          variant: "destructive",
        });
        updateStage(14);
        return;
      }

      // Chamar generate-mission
      const missionResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-mission`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authSession.access_token}`,
          },
          body: JSON.stringify({
            sessionId: currentSession.id,
            answers: currentSession.answers,
            version: version,
            segment: currentSession.segment,
          }),
        }
      );

      if (missionResponse.status === 429) {
        toast({
          title: "Limite de requisições excedido",
          description: "Por favor, tente novamente em alguns instantes.",
          variant: "destructive",
        });
        updateStage(14);
        return;
      }

      if (missionResponse.status === 402) {
        toast({
          title: "Créditos insuficientes",
          description: "Por favor, adicione créditos ao seu workspace Lovable AI.",
          variant: "destructive",
        });
        updateStage(14);
        return;
      }

      if (!missionResponse.ok) {
        const errorText = await missionResponse.text();
        console.error('❌ Mission generation error:', missionResponse.status, errorText);
        throw new Error(`Erro na geração: ${missionResponse.status}`);
      }

      const missionResult = await missionResponse.json();
      console.log('✅ Mission generated:', missionResult);

      // Para V2, chamar também analyze-mission em paralelo
      let analysisResult = null;
      if (version === 2) {
        try {
          const analyzeResponse = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-mission`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authSession.access_token}`,
              },
              body: JSON.stringify({
                missionStatement: missionResult.mission_statement,
                answers: currentSession.answers,
                segment: currentSession.segment,
              }),
            }
          );

          if (analyzeResponse.ok) {
            analysisResult = await analyzeResponse.json();
            console.log('✅ Mission analysis complete:', analysisResult);
          }
        } catch (analyzeError) {
          console.error('⚠️ Analysis failed, continuing with mission only:', analyzeError);
          // Continuar mesmo se a análise falhar
        }
      }

      setProgress(100);

      const analysis = {
        id: crypto.randomUUID(),
        sessionId: session.id,
        missionStatement: missionResult.mission_statement,
        keywords: missionResult.keywords || [],
        insights: missionResult.insights || [],
        notes: missionResult.notes || '',
        createdAt: new Date().toISOString(),
        // V2 analysis fields
        ...(analysisResult && {
          score: analysisResult.score,
          diagnosis: analysisResult.diagnosis,
          pillars: analysisResult.pillars,
          lengthFeedback: analysisResult.lengthFeedback,
          recommendations: analysisResult.recommendations,
          benchmarks: analysisResult.benchmarks,
        }),
      };

      saveAnalysis(analysis);
      
      setTimeout(() => {
        updateStage(16);
      }, 500);

    } catch (error) {
      console.error('❌ Error generating mission analysis:', error);
      toast({
        title: "Erro ao gerar análise",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
      updateStage(14);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[600px]">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <Sparkles className="h-16 w-16 text-primary animate-pulse" />
              <div className="absolute inset-0 animate-ping">
                <Sparkles className="h-16 w-16 text-primary opacity-75" />
              </div>
            </div>
          </div>
          <CardTitle className="text-2xl">Gerando sua Declaração de Missão</CardTitle>
          <CardDescription className="text-base">
            Nossa IA está analisando suas respostas e criando uma declaração de missão
            inspiradora e estratégica para sua empresa...
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Progress value={progress} className="h-2" />
          
          <div className="text-center text-sm text-muted-foreground">
            <p className="mb-2">Este processo pode levar alguns segundos</p>
            <p className="text-xs">Estamos identificando seu propósito central e impacto desejado</p>
          </div>

          <div className="flex justify-center pt-4">
            <img 
              src="/src/assets/logo-gentia.png" 
              alt="Gent.IA" 
              className="h-36 w-auto opacity-50"
            />
          </div>

          <div className="flex justify-center">
            <Button
              variant="outline"
              onClick={() => updateStage(14)}
            >
              Cancelar e voltar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
