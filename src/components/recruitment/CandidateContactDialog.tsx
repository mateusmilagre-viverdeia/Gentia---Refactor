import { useMemo } from "react";

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

import { useQuery, useQueryClient } from "@tanstack/react-query";

interface CandidateContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string;
  candidateId: string;
  candidateLabel?: string;
  jobId?: string | null;
  jobLabel?: string;
}

export function CandidateContactDialog(props: CandidateContactDialogProps) {
  const { open, onOpenChange, accountId, candidateId, candidateLabel, jobId, jobLabel } = props;
  const queryClient = useQueryClient();

  const prefsQueryKey = useMemo(
    () => ["candidate-contact-prefs", accountId, candidateId],
    [accountId, candidateId]
  );
  const exceptionQueryKey = useMemo(
    () => ["candidate-contact-exception", accountId, candidateId, jobId],
    [accountId, candidateId, jobId]
  );

  const { data: prefs, isLoading: prefsLoading } = useQuery({
    queryKey: prefsQueryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recruitment_candidate_contact_prefs")
        .select("id, opt_out_all")
        .eq("account_id", accountId)
        .eq("candidate_id", candidateId)
        .maybeSingle();

      if (error) throw error;
      return data as { id: string; opt_out_all: boolean } | null;
    },
    enabled: open,
  });

  const { data: exception, isLoading: exceptionLoading } = useQuery({
    queryKey: exceptionQueryKey,
    queryFn: async () => {
      if (!jobId) return null;
      const { data, error } = await supabase
        .from("recruitment_candidate_contact_exceptions")
        .select("id, allow_contact")
        .eq("account_id", accountId)
        .eq("candidate_id", candidateId)
        .eq("job_id", jobId)
        .maybeSingle();

      if (error) throw error;
      return data as { id: string; allow_contact: boolean } | null;
    },
    enabled: open && !!jobId,
  });

  const optOutAll = prefs?.opt_out_all ?? false;
  const allowContactForJob = exception?.allow_contact ?? false;

  const setOptOutAll = async (next: boolean) => {
    const { error } = await supabase
      .from("recruitment_candidate_contact_prefs")
      .upsert(
        {
          account_id: accountId,
          candidate_id: candidateId,
          opt_out_all: next,
        },
        { onConflict: "account_id,candidate_id" }
      );

    if (error) {
      toast.error("Não foi possível atualizar o opt-out.");
      return;
    }

    await queryClient.invalidateQueries({ queryKey: prefsQueryKey });
    toast.success(next ? "Opt-out global ativado." : "Opt-out global desativado.");
  };

  const setException = async (next: boolean) => {
    if (!jobId) return;
    const { error } = await supabase
      .from("recruitment_candidate_contact_exceptions")
      .upsert(
        {
          account_id: accountId,
          candidate_id: candidateId,
          job_id: jobId,
          allow_contact: next,
        },
        { onConflict: "account_id,candidate_id,job_id" }
      );

    if (error) {
      toast.error("Não foi possível atualizar a exceção da vaga.");
      return;
    }

    await queryClient.invalidateQueries({ queryKey: exceptionQueryKey });
    toast.success(next ? "Exceção aplicada (contato permitido)." : "Exceção removida.");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Preferências de contato</DialogTitle>
          <DialogDescription>
            Controle opt-out global e (opcionalmente) exceção por vaga para este candidato.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
            <div className="space-y-1">
              <div className="font-medium">Opt-out global</div>
              <div className="text-sm text-muted-foreground">
                {candidateLabel ? (
                  <span>
                    Candidato: <span className="font-medium text-foreground">{candidateLabel}</span>
                  </span>
                ) : (
                  "Bloqueia contatos automáticos por WhatsApp/Email para este candidato."
                )}
              </div>
            </div>

            {prefsLoading ? (
              <Skeleton className="h-6 w-11" />
            ) : (
              <Switch checked={optOutAll} onCheckedChange={setOptOutAll} />
            )}
          </div>

          {jobId ? (
            <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
              <div className="space-y-1">
                <div className="font-medium flex items-center gap-2">
                  Exceção por vaga
                  {jobLabel ? <Badge variant="outline">{jobLabel}</Badge> : null}
                </div>
                <div className="text-sm text-muted-foreground">
                  Permite contato nesta vaga mesmo com opt-out global ativo.
                </div>
              </div>

              {exceptionLoading ? (
                <Skeleton className="h-6 w-11" />
              ) : (
                <Switch checked={allowContactForJob} onCheckedChange={setException} />
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              Nenhuma vaga vinculada a este log — a exceção por vaga não está disponível aqui.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
