import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RecruitmentLayout } from "@/components/layout/RecruitmentLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Mic, Loader2, AlertTriangle } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { toast } from "sonner";
import { AgentTestSession } from "@/components/recruitment/agents/AgentTestSession";

export default function AgentTestPage() {
  const { agentId } = useParams<{ agentId: string }>();
  const navigate = useNavigate();
  const { user } = useUser();

  const { data: agent, isLoading } = useQuery({
    queryKey: ["agent-for-test", agentId],
    enabled: !!agentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recruitment_agents")
        .select("id, name, type, description")
        .eq("id", agentId!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const defaultName = user?.firstName || user?.email?.split("@")[0] || "Teste";
  const [testerName, setTesterName] = useState(defaultName);
  const [starting, setStarting] = useState(false);
  const [session, setSession] = useState<{
    ephemeralToken: string;
    agentName: string;
    agentType: string;
    companyName: string;
  } | null>(null);

  const handleStart = async () => {
    if (!agentId) return;
    setStarting(true);
    try {
      const { data, error } = await supabase.functions.invoke("agent-test-realtime", {
        body: { agentId, testerName },
      });
      if (error) throw error;
      if (!data?.success || !data.ephemeralToken) {
        throw new Error(data?.message || "Falha ao iniciar teste");
      }
      setSession({
        ephemeralToken: data.ephemeralToken,
        agentName: data.agentName,
        agentType: data.agentType,
        companyName: data.companyName,
      });
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Não foi possível iniciar a demonstração");
    } finally {
      setStarting(false);
    }
  };

  return (
    <RecruitmentLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link to={`/atracao-contratacao/recrutamento/agents/${agentId}`}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Voltar ao agente
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5 text-primary" />
              Testar agente: {isLoading ? "..." : agent?.name}
            </CardTitle>
            <CardDescription>
              Inicie uma conversa de voz real com este agente, sem precisar publicar vaga ou criar candidato.
              Útil para ouvir o tom, as perguntas e a forma como ele conduz uma entrevista.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!session && (
              <>
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Esta conversa <strong>consome créditos de IA</strong> (modelo Realtime de voz). Recomendamos
                    encerrar assim que concluir a avaliação. Nenhum dado é salvo: a sessão de teste não cria
                    candidatura, não aparece em relatórios e não conta nas métricas do funil.
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label htmlFor="tester-name">Seu nome no teste</Label>
                  <Input
                    id="tester-name"
                    value={testerName}
                    onChange={(e) => setTesterName(e.target.value)}
                    placeholder="Como o agente vai te chamar"
                  />
                  <p className="text-xs text-muted-foreground">
                    O agente usará este nome durante a demonstração.
                  </p>
                </div>

                <Button onClick={handleStart} disabled={starting || !agentId} size="lg" className="w-full">
                  {starting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mic className="h-4 w-4 mr-2" />}
                  Iniciar entrevista de teste
                </Button>
              </>
            )}

            {session && (
              <AgentTestSession
                ephemeralToken={session.ephemeralToken}
                agentName={session.agentName}
                agentType={session.agentType}
                companyName={session.companyName}
                onEnd={() => {
                  setSession(null);
                  toast.success("Teste encerrado");
                }}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </RecruitmentLayout>
  );
}
