import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Upload, FileAudio, Loader2 } from "lucide-react";
import { useOfflineInterviewUpload } from "@/hooks/useOfflineInterviewUpload";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface ImportOfflineInterviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string;
  jobId?: string;
  candidateId?: string | null;
  defaultExternalName?: string | null;
  defaultExternalEmail?: string | null;
  onComplete?: () => void;
}

const ACCEPT = "audio/*,video/mp4,video/webm,video/quicktime";
const MAX_BYTES = 200 * 1024 * 1024; // 200 MB

export function ImportOfflineInterviewDialog({
  open, onOpenChange, accountId, jobId: jobIdProp,
  candidateId: candidateIdProp, defaultExternalName, defaultExternalEmail, onComplete,
}: ImportOfflineInterviewDialogProps) {
  const [jobId, setJobId] = useState<string>(jobIdProp || "");
  const [candidateMode, setCandidateMode] = useState<"existing" | "external">(candidateIdProp ? "existing" : "external");
  const [candidateId, setCandidateId] = useState<string>(candidateIdProp || "");
  const [externalName, setExternalName] = useState<string>(defaultExternalName || "");
  const [externalEmail, setExternalEmail] = useState<string>(defaultExternalEmail || "");
  const [evalCultural, setEvalCultural] = useState(true);
  const [evalTechnical, setEvalTechnical] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [language, setLanguage] = useState<string>("pt");
  const [recordedAt, setRecordedAt] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const { importInterview, isPending, stage, progress, reset } = useOfflineInterviewUpload();

  useEffect(() => {
    if (!open) {
      // reset transient state when closing
      setTimeout(() => {
        if (!jobIdProp) setJobId("");
        if (!candidateIdProp) { setCandidateId(""); setCandidateMode("external"); }
        setFile(null); setNotes(""); setRecordedAt("");
        setEvalCultural(true); setEvalTechnical(false);
        reset();
      }, 200);
    } else {
      if (jobIdProp) setJobId(jobIdProp);
      if (candidateIdProp) { setCandidateId(candidateIdProp); setCandidateMode("existing"); }
    }
  }, [open]);

  // Load jobs for selector when no fixed jobId
  const { data: jobs } = useQuery({
    queryKey: ["offline-import-jobs", accountId],
    enabled: open && !jobIdProp && !!accountId,
    queryFn: async () => {
      const { data } = await supabase
        .from("recruitment_jobs")
        .select("id, title, status")
        .eq("account_id", accountId)
        .in("status", ["active", "draft", "closed"])
        .order("created_at", { ascending: false })
        .limit(200);
      return data || [];
    },
  });

  // Load candidates for selected job
  const { data: candidates } = useQuery({
    queryKey: ["offline-import-candidates", jobId],
    enabled: open && !!jobId && candidateMode === "existing" && !candidateIdProp,
    queryFn: async () => {
      const { data } = await supabase
        .from("recruitment_applications")
        .select("candidate_id, candidate_name, candidate_email")
        .eq("job_id", jobId)
        .order("created_at", { ascending: false })
        .limit(500);
      return data || [];
    },
  });

  const evaluationTypes: Array<"cultural" | "technical"> = [];
  if (evalCultural) evaluationTypes.push("cultural");
  if (evalTechnical) evaluationTypes.push("technical");

  const canSubmit =
    !!accountId && !!jobId && !!file && evaluationTypes.length > 0 && !isPending &&
    (candidateMode === "existing" ? !!candidateId : (!!externalName?.trim()));

  const handleFile = (f: File | null) => {
    if (!f) return setFile(null);
    if (f.size > MAX_BYTES) {
      alert("Arquivo excede o limite de 200 MB.");
      return;
    }
    setFile(f);
  };

  const stageLabel = () => {
    switch (stage) {
      case "signing": return "Preparando upload...";
      case "uploading": return "Enviando gravação...";
      case "processing": return "Transcrevendo e avaliando com IA...";
      case "done": return "Concluído!";
      case "error": return "Erro";
      default: return "";
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit || !file) return;
    try {
      await importInterview({
        accountId,
        jobId,
        candidateId: candidateMode === "existing" ? candidateId : null,
        externalCandidateName: candidateMode === "external" ? externalName.trim() : null,
        externalCandidateEmail: candidateMode === "external" ? (externalEmail.trim() || null) : null,
        evaluationTypes,
        file,
        language,
        recordedAt: recordedAt ? new Date(recordedAt).toISOString() : null,
        notes: notes.trim() || null,
      });
      onComplete?.();
      onOpenChange(false);
    } catch {
      // toast emitted by hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !isPending && onOpenChange(v)}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar entrevista presencial</DialogTitle>
          <DialogDescription>
            Suba a gravação (áudio ou vídeo) de uma entrevista feita fora da plataforma.
            A IA irá transcrever e avaliar conforme os objetivos selecionados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Job selector */}
          {!jobIdProp && (
            <div className="space-y-2">
              <Label>Vaga</Label>
              <Select value={jobId} onValueChange={setJobId}>
                <SelectTrigger><SelectValue placeholder="Selecione a vaga" /></SelectTrigger>
                <SelectContent>
                  {(jobs || []).map((j: any) => (
                    <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Candidate */}
          {!candidateIdProp && (
            <div className="space-y-2">
              <Label>Candidato</Label>
              <div className="flex gap-2 mb-2">
                <Button type="button" variant={candidateMode === "existing" ? "default" : "outline"} size="sm" onClick={() => setCandidateMode("existing")}>
                  Da vaga
                </Button>
                <Button type="button" variant={candidateMode === "external" ? "default" : "outline"} size="sm" onClick={() => setCandidateMode("external")}>
                  Externo
                </Button>
              </div>
              {candidateMode === "existing" ? (
                <Select value={candidateId} onValueChange={setCandidateId} disabled={!jobId}>
                  <SelectTrigger><SelectValue placeholder={jobId ? "Selecione o candidato" : "Selecione a vaga primeiro"} /></SelectTrigger>
                  <SelectContent>
                    {(candidates || []).map((c: any) => (
                      <SelectItem key={c.candidate_id} value={c.candidate_id}>
                        {c.candidate_name || c.candidate_email || c.candidate_id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Nome completo" value={externalName} onChange={(e) => setExternalName(e.target.value)} />
                  <Input placeholder="E-mail (opcional)" value={externalEmail} onChange={(e) => setExternalEmail(e.target.value)} />
                </div>
              )}
            </div>
          )}

          {/* Evaluation types */}
          <div className="space-y-2">
            <Label>Objetivo da avaliação</Label>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={evalCultural} onCheckedChange={(v) => setEvalCultural(!!v)} />
                <span className="text-sm">Fit Cultural</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={evalTechnical} onCheckedChange={(v) => setEvalTechnical(!!v)} />
                <span className="text-sm">Fit Técnico</span>
              </label>
            </div>
          </div>

          {/* File */}
          <div className="space-y-2">
            <Label>Gravação (áudio ou vídeo, até 200 MB)</Label>
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
              <input
                id="offline-file-input"
                type="file"
                accept={ACCEPT}
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0] || null)}
              />
              {file ? (
                <div className="flex items-center justify-center gap-3 text-sm">
                  <FileAudio className="h-5 w-5 text-primary" />
                  <span className="font-medium">{file.name}</span>
                  <span className="text-muted-foreground">({(file.size / 1024 / 1024).toFixed(1)} MB)</span>
                  <Button variant="ghost" size="sm" onClick={() => setFile(null)} disabled={isPending}>Remover</Button>
                </div>
              ) : (
                <label htmlFor="offline-file-input" className="cursor-pointer flex flex-col items-center gap-2">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Clique para selecionar o arquivo</span>
                </label>
              )}
            </div>
          </div>

          {/* Meta */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Idioma</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt">Português</SelectItem>
                  <SelectItem value="en">Inglês</SelectItem>
                  <SelectItem value="es">Espanhol</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data da entrevista (opcional)</Label>
              <Input type="datetime-local" value={recordedAt} onChange={(e) => setRecordedAt(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Observações (opcional)</Label>
            <Textarea rows={2} placeholder="Contexto, observações do recrutador..." value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          {isPending && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {stageLabel()}
              </div>
              <Progress value={progress} />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {isPending ? "Processando..." : "Importar e avaliar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
