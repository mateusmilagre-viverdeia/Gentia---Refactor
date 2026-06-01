import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useInterviewInvite } from "@/hooks/useInterviewInvite";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface InviteCandidateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentId?: string;
  agentName?: string;
  jobId?: string;
}

const languages = [
  { value: "pt", label: "Português (Brasil)" },
  { value: "en", label: "English (United States)" },
  { value: "es", label: "Español" },
];

const defaultMessage = `Olá!

Você foi convidado para completar uma breve entrevista conosco. Leva cerca de 15-20 minutos e você pode fazer quando for conveniente.

Obrigado!`;

export function InviteCandidateDialog({
  open,
  onOpenChange,
  agentId,
  agentName = "Agente",
  jobId,
}: InviteCandidateDialogProps) {
  const { currentAccount } = useOrganization();
  const { sendInvite, isSending } = useInterviewInvite();
  const [selectedCandidate, setSelectedCandidate] = useState("");
  const [selectedJob, setSelectedJob] = useState(jobId || "");
  const [language, setLanguage] = useState<"pt" | "en" | "es">("pt");
  const [message, setMessage] = useState(defaultMessage);
  const [candidateOpen, setCandidateOpen] = useState(false);
  const [jobOpen, setJobOpen] = useState(false);

  const { data: candidates = [], isLoading: isLoadingCandidates } = useQuery({
    queryKey: ["recruitment-candidates-select", currentAccount?.id],
    queryFn: async () => {
      if (!currentAccount?.id) return [];
      const { data, error } = await supabase
        .from("recruitment_candidates")
        .select("id, first_name, last_name, email")
        .eq("account_id", currentAccount.id)
        .order("first_name");
      if (error) throw error;
      return data.map((c) => ({
        id: c.id,
        name: `${c.first_name} ${c.last_name || ""}`.trim(),
        email: c.email || "",
      }));
    },
    enabled: !!currentAccount?.id && open,
  });

  const { data: jobs = [], isLoading: isLoadingJobs } = useQuery({
    queryKey: ["recruitment-jobs-select", currentAccount?.id],
    queryFn: async () => {
      if (!currentAccount?.id) return [];
      const { data, error } = await supabase
        .from("recruitment_jobs")
        .select("id, title")
        .eq("account_id", currentAccount.id)
        .in("status", ["active", "draft"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!currentAccount?.id && open && !jobId,
  });

  const selectedCandidateData = candidates.find((c) => c.id === selectedCandidate);
  const selectedJobData = jobs.find((j) => j.id === selectedJob);

  const handleSubmit = async () => {
    if (!selectedCandidate) {
      toast.error("Selecione um candidato");
      return;
    }
    if (!selectedJob) {
      toast.error("Selecione uma vaga");
      return;
    }

    try {
      await sendInvite.mutateAsync({
        candidate_id: selectedCandidate,
        job_id: selectedJob,
        agent_id: agentId,
        custom_message: message !== defaultMessage ? message : undefined,
        language,
      });
      
      onOpenChange(false);
      // Reset form
      setSelectedCandidate("");
      if (!jobId) setSelectedJob("");
      setLanguage("pt");
      setMessage(defaultMessage);
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
    // Reset form
    setSelectedCandidate("");
    if (!jobId) setSelectedJob("");
    setLanguage("pt");
    setMessage(defaultMessage);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Convidar candidato para entrevista</DialogTitle>
          <DialogDescription>
            Envie um convite de entrevista{agentName !== "Agente" ? ` para o agente "${agentName}"` : ""}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Select Candidate */}
          <div className="space-y-2">
            <Label>Selecionar candidato</Label>
            <Popover open={candidateOpen} onOpenChange={setCandidateOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={candidateOpen}
                  className="w-full justify-between"
                  disabled={isLoadingCandidates}
                >
                  {isLoadingCandidates ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Carregando...
                    </span>
                  ) : selectedCandidateData ? (
                    `${selectedCandidateData.name} (${selectedCandidateData.email})`
                  ) : (
                    "Selecionar candidato..."
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[450px] p-0">
                <Command>
                  <CommandInput placeholder="Buscar por nome ou email..." />
                  <CommandList>
                    <CommandEmpty>
                      {candidates.length === 0
                        ? "Nenhum candidato cadastrado."
                        : "Nenhum candidato encontrado."}
                    </CommandEmpty>
                    <CommandGroup>
                      {candidates.map((candidate) => (
                        <CommandItem
                          key={candidate.id}
                          value={`${candidate.name} ${candidate.email}`}
                          onSelect={() => {
                            setSelectedCandidate(candidate.id);
                            setCandidateOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedCandidate === candidate.id
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          <div>
                            <p className="font-medium">{candidate.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {candidate.email}
                            </p>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Select Job (if not pre-selected) */}
          {!jobId && (
            <div className="space-y-2">
              <Label>Selecionar vaga</Label>
              <Popover open={jobOpen} onOpenChange={setJobOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={jobOpen}
                    className="w-full justify-between"
                    disabled={isLoadingJobs}
                  >
                    {isLoadingJobs ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Carregando...
                      </span>
                    ) : selectedJobData ? (
                      selectedJobData.title
                    ) : (
                      "Selecionar vaga..."
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[450px] p-0">
                  <Command>
                    <CommandInput placeholder="Buscar vaga..." />
                    <CommandList>
                      <CommandEmpty>
                        {jobs.length === 0
                          ? "Nenhuma vaga disponível."
                          : "Nenhuma vaga encontrada."}
                      </CommandEmpty>
                      <CommandGroup>
                        {jobs.map((job) => (
                          <CommandItem
                            key={job.id}
                            value={job.title}
                            onSelect={() => {
                              setSelectedJob(job.id);
                              setJobOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedJob === job.id
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            {job.title}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* Email Language */}
          <div className="space-y-2">
            <Label>Idioma do email</Label>
            <Select value={language} onValueChange={(v) => setLanguage(v as "pt" | "en" | "es")}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o idioma" />
              </SelectTrigger>
              <SelectContent>
                {languages.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              O email de convite será enviado no idioma selecionado.
            </p>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label>Mensagem (Opcional)</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Digite uma mensagem personalizada..."
              className="min-h-[120px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isSending}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSending}>
            {isSending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              "Enviar Convite"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
