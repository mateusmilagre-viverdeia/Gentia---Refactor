import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Briefcase, UserPlus, Mail, Phone, Linkedin, Check } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useConvertToCandidate, type TalentPoolScore } from "@/hooks/useTalentPoolScoring";
import type { TalentPoolEntry } from "@/hooks/useTalentPool";
import { cn } from "@/lib/utils";

interface ConvertToApplicationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: TalentPoolEntry | null;
  score?: TalentPoolScore;
}

interface Job {
  id: string;
  title: string;
  status: string;
  department?: string;
}

export function ConvertToApplicationDialog({
  open,
  onOpenChange,
  entry,
  score,
}: ConvertToApplicationDialogProps) {
  const { currentAccount } = useOrganization();
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const { mutate: convert, isPending } = useConvertToCandidate();

  // Fetch open jobs
  const { data: jobs = [], isLoading: isLoadingJobs } = useQuery({
    queryKey: ["recruitment-jobs-active", currentAccount?.id],
    queryFn: async (): Promise<Job[]> => {
      if (!currentAccount?.id) return [];

      const { data, error } = await supabase
        .from("recruitment_jobs")
        .select("id, title, status, department")
        .eq("account_id", currentAccount.id)
        .eq("status", "active")
        .order("title");

      if (error) throw error;
      return data || [];
    },
    enabled: open && !!currentAccount?.id,
  });

  useEffect(() => {
    if (open) {
      setNotes("");
      // Auto-select matching job if available
      if (score?.matchingJobs.length) {
        setSelectedJobId(score.matchingJobs[0].jobId);
      } else {
        setSelectedJobId("");
      }
    }
  }, [open, score]);

  const handleConvert = () => {
    if (!entry) return;

    convert(
      {
        entry,
        jobId: selectedJobId || undefined,
        notes: notes.trim() || undefined,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      }
    );
  };

  const matchingJobIds = new Set(score?.matchingJobs.map((j) => j.jobId) || []);

  if (!entry) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Converter para Candidato
          </DialogTitle>
          <DialogDescription>
            Converta esta entrada do Talent Pool em um candidato ativo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Entry Info */}
          <div className="p-4 bg-muted/50 rounded-lg space-y-2">
            <p className="font-medium">{entry.name}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {entry.email && (
                <span className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" />
                  {entry.email}
                </span>
              )}
              {entry.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" />
                  {entry.phone}
                </span>
              )}
              {entry.linkedin_url && (
                <span className="flex items-center gap-1">
                  <Linkedin className="h-3.5 w-3.5" />
                  LinkedIn
                </span>
              )}
            </div>
            {entry.areas_of_interest?.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {entry.areas_of_interest.map((area) => (
                  <Badge key={area} variant="secondary" className="text-xs">
                    {area}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Job Selection */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Associar a uma vaga (opcional)
            </Label>

            {isLoadingJobs ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : jobs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma vaga ativa no momento
              </p>
            ) : (
              <ScrollArea className="h-[200px] rounded-md border p-2">
                <RadioGroup value={selectedJobId} onValueChange={setSelectedJobId}>
                  {/* Option to not associate with a job */}
                  <div
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors mb-1",
                      !selectedJobId
                        ? "bg-primary/10 border border-primary"
                        : "hover:bg-muted/50 border border-transparent"
                    )}
                    onClick={() => setSelectedJobId("")}
                  >
                    <RadioGroupItem value="" id="job-none" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Apenas criar candidato</p>
                      <p className="text-xs text-muted-foreground">
                        Sem aplicação para vaga específica
                      </p>
                    </div>
                  </div>

                  {/* Job options */}
                  {jobs.map((job) => {
                    const isMatching = matchingJobIds.has(job.id);
                    const matchInfo = score?.matchingJobs.find((j) => j.jobId === job.id);

                    return (
                      <div
                        key={job.id}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors mb-1",
                          selectedJobId === job.id
                            ? "bg-primary/10 border border-primary"
                            : "hover:bg-muted/50 border border-transparent"
                        )}
                        onClick={() => setSelectedJobId(job.id)}
                      >
                        <RadioGroupItem value={job.id} id={`job-${job.id}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">{job.title}</p>
                            {isMatching && (
                              <Badge variant="secondary" className="text-xs shrink-0">
                                <Check className="h-3 w-3 mr-1" />
                                {matchInfo?.matchPercentage}% match
                              </Badge>
                            )}
                          </div>
                          {job.department && (
                            <p className="text-xs text-muted-foreground">{job.department}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </RadioGroup>
              </ScrollArea>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notas adicionais</Label>
            <Textarea
              id="notes"
              placeholder="Adicione observações sobre este candidato..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              disabled={isPending}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={handleConvert} disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Convertendo...
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                {selectedJobId ? "Converter e Aplicar" : "Converter Candidato"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
