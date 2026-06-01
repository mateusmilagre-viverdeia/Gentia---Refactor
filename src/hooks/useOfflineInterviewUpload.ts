import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { invokeAuthenticatedFunction } from "@/lib/authenticatedFetch";
import { toast } from "sonner";
import { useState } from "react";

export interface OfflineUploadInput {
  accountId: string;
  jobId: string;
  candidateId?: string | null;
  externalCandidateName?: string | null;
  externalCandidateEmail?: string | null;
  evaluationTypes: Array<"cultural" | "technical">;
  file: File;
  language?: string;
  recordedAt?: string | null;
  notes?: string | null;
}

export type UploadStage = "idle" | "signing" | "uploading" | "processing" | "done" | "error";

export function useOfflineInterviewUpload() {
  const [stage, setStage] = useState<UploadStage>("idle");
  const [progress, setProgress] = useState(0);

  const mutation = useMutation({
    mutationFn: async (input: OfflineUploadInput) => {
      setStage("signing");
      setProgress(5);

      const signRes = await invokeAuthenticatedFunction<{
        uploadId: string; audioPath: string; signedUrl: string; token: string;
      }>("offline-interview-upload-url", {
        accountId: input.accountId,
        jobId: input.jobId,
        candidateId: input.candidateId || null,
        externalCandidateName: input.externalCandidateName || null,
        externalCandidateEmail: input.externalCandidateEmail || null,
        evaluationTypes: input.evaluationTypes,
        fileName: input.file.name,
        mimeType: input.file.type,
        language: input.language || "pt",
        recordedAt: input.recordedAt || null,
        notes: input.notes || null,
      });

      if (signRes.error || !signRes.data) {
        throw new Error(signRes.error || "Falha ao preparar upload");
      }
      const { uploadId, audioPath, token } = signRes.data;

      setStage("uploading");
      setProgress(15);

      // Upload using Supabase storage SDK with the signed token
      const { error: upErr } = await supabase.storage
        .from("offline-interviews")
        .uploadToSignedUrl(audioPath, token, input.file, {
          contentType: input.file.type || "application/octet-stream",
          upsert: false,
        });

      if (upErr) throw new Error(`Upload falhou: ${upErr.message}`);

      setStage("processing");
      setProgress(60);

      const procRes = await invokeAuthenticatedFunction<{
        success: boolean; cultureSessionId?: string; technicalSessionId?: string;
        cultureScore?: number; technicalScore?: number;
      }>("offline-interview-process", { uploadId });

      if (procRes.error || !procRes.data) {
        throw new Error(procRes.error || "Falha ao processar entrevista");
      }

      setStage("done");
      setProgress(100);
      return procRes.data;
    },
    onError: (e: any) => {
      setStage("error");
      toast.error(e?.message || "Erro ao importar entrevista");
    },
    onSuccess: (data) => {
      const parts: string[] = [];
      if (data.cultureScore != null) parts.push(`Cultural: ${Number(data.cultureScore).toFixed(1)}%`);
      if (data.technicalScore != null) parts.push(`Técnica: ${Number(data.technicalScore).toFixed(1)}%`);
      toast.success(`Entrevista importada e avaliada! ${parts.join(" • ")}`);
    },
  });

  return {
    importInterview: mutation.mutateAsync,
    isPending: mutation.isPending,
    stage,
    progress,
    reset: () => { setStage("idle"); setProgress(0); mutation.reset(); },
  };
}
