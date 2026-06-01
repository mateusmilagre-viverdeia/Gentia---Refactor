import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useValuesQuestionsForAgent } from "@/hooks/useValuesQuestionsForAgent";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RefreshCw, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { formatBRT } from "@/lib/datetime";

interface ValuesQuestionsSyncBannerProps {
  agentId: string;
  currentQuestionCount: number;
}

export const ValuesQuestionsSyncBanner = ({
  agentId,
  currentQuestionCount,
}: ValuesQuestionsSyncBannerProps) => {
  const queryClient = useQueryClient();
  const {
    hasQuestions,
    questions: valuesQuestions,
    valuesSessionUpdatedAt,
    syncQuestionsToAgent,
    isLoading,
  } = useValuesQuestionsForAgent();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Read agent's last sync timestamp
  const { data: agentMeta } = useQuery({
    queryKey: ["recruitment-agent-sync-meta", agentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recruitment_agents")
        .select("last_values_sync_at")
        .eq("id", agentId)
        .single();
      if (error) throw error;
      return data as { last_values_sync_at: string | null };
    },
    enabled: !!agentId,
  });

  if (isLoading || !hasQuestions) return null;

  const lastSyncAt = agentMeta?.last_values_sync_at;
  const valuesUpdatedAt = valuesSessionUpdatedAt;

  // Outdated if values were updated after last sync (or never synced)
  const isOutdated =
    !!valuesUpdatedAt &&
    (!lastSyncAt || new Date(valuesUpdatedAt) > new Date(lastSyncAt));

  const handleConfirmSync = async () => {
    setIsSyncing(true);
    try {
      const count = await syncQuestionsToAgent(agentId);
      await queryClient.invalidateQueries({ queryKey: ["recruitment-agent", agentId] });
      await queryClient.invalidateQueries({ queryKey: ["recruitment-agent-sync-meta", agentId] });
      toast.success(`${count} pergunta(s) sincronizada(s) com sucesso`);
      setConfirmOpen(false);
    } catch (err) {
      console.error("Sync error:", err);
      toast.error("Erro ao sincronizar perguntas");
    } finally {
      setIsSyncing(false);
    }
  };

  const formatDate = (iso: string) =>
    formatBRT(new Date(iso), "dd/MM/yyyy 'às' HH:mm");

  return (
    <>
      <Alert variant={isOutdated ? "destructive" : "default"} className="mb-4">
        {isOutdated ? (
          <AlertCircle className="h-4 w-4" />
        ) : (
          <CheckCircle2 className="h-4 w-4" />
        )}
        <AlertTitle>
          {isOutdated
            ? "Perguntas Baseadas em Valores foram atualizadas"
            : "Perguntas sincronizadas com o módulo de Valores"}
        </AlertTitle>
        <AlertDescription className="flex flex-col gap-3 mt-2">
          <div className="text-sm">
            {isOutdated ? (
              <>
                O módulo de Perguntas Baseadas em Valores foi atualizado em{" "}
                <strong>{valuesUpdatedAt ? formatDate(valuesUpdatedAt) : "—"}</strong>.
                {lastSyncAt
                  ? ` Última sincronização deste agente: ${formatDate(lastSyncAt)}.`
                  : " Este agente ainda não foi sincronizado."}
              </>
            ) : (
              <>
                Última sincronização:{" "}
                <strong>{lastSyncAt ? formatDate(lastSyncAt) : "—"}</strong>.
              </>
            )}
          </div>
          <div>
            <Button
              size="sm"
              variant={isOutdated ? "default" : "outline"}
              onClick={() => setConfirmOpen(true)}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Sincronizar com Perguntas de Valores
            </Button>
          </div>
        </AlertDescription>
      </Alert>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sincronizar perguntas?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá <strong>substituir as {currentQuestionCount} pergunta(s)
              atuais</strong> deste agente pelas <strong>{valuesQuestions.length} pergunta(s)</strong>{" "}
              configuradas no módulo de Perguntas Baseadas em Valores.
              <br />
              <br />
              Quaisquer perguntas adicionadas ou editadas manualmente neste agente
              serão removidas. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSyncing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSync} disabled={isSyncing}>
              {isSyncing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmar sincronização
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
