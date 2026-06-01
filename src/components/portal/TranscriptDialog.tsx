import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, MessageSquare } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateId: string;
  candidateName: string;
  jobId: string;
}

export function TranscriptDialog({ open, onOpenChange, candidateId, candidateName, jobId }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["candidate-transcripts", candidateId, jobId],
    queryFn: async () => {
      // Cultural interview
      const { data: cultural } = await supabase
        .from("culture_interview_sessions")
        .select("partial_transcript, matching_analysis, completed_at")
        .eq("candidate_id", candidateId)
        .eq("job_id", jobId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Technical interview
      const { data: technical } = await supabase
        .from("technical_interview_sessions")
        .select("transcript, completed_at")
        .eq("candidate_id", candidateId)
        .eq("job_id", jobId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      return { cultural, technical };
    },
    enabled: open,
  });

  const renderTranscript = (transcript: any) => {
    if (!transcript) return <p className="text-sm text-muted-foreground italic">Sem transcrição disponível.</p>;
    if (typeof transcript === "string") {
      return <pre className="text-sm whitespace-pre-wrap font-sans">{transcript}</pre>;
    }
    if (Array.isArray(transcript)) {
      return (
        <div className="space-y-3">
          {transcript.map((m: any, i: number) => (
            <div key={i} className="text-sm">
              <span className="font-semibold capitalize text-primary">{m.role || m.speaker || "—"}: </span>
              <span className="text-foreground/90">{m.content || m.text || ""}</span>
            </div>
          ))}
        </div>
      );
    }
    return <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(transcript, null, 2)}</pre>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Transcrição — {candidateName}
          </DialogTitle>
          <DialogDescription>
            Conteúdo completo das entrevistas realizadas.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <Tabs defaultValue="cultural">
            <TabsList>
              <TabsTrigger value="cultural" className="gap-1.5">
                <MessageSquare className="h-3.5 w-3.5" /> Cultural
              </TabsTrigger>
              <TabsTrigger value="technical" className="gap-1.5">
                <MessageSquare className="h-3.5 w-3.5" /> Técnica
              </TabsTrigger>
              <TabsTrigger value="analysis">Análise IA</TabsTrigger>
            </TabsList>

            <TabsContent value="cultural">
              <ScrollArea className="h-[50vh] pr-4 mt-3">
                {renderTranscript((data?.cultural as any)?.partial_transcript)}
              </ScrollArea>
            </TabsContent>
            <TabsContent value="technical">
              <ScrollArea className="h-[50vh] pr-4 mt-3">
                {renderTranscript(data?.technical?.transcript)}
              </ScrollArea>
            </TabsContent>
            <TabsContent value="analysis">
              <ScrollArea className="h-[50vh] pr-4 mt-3">
                {(data?.cultural as any)?.matching_analysis ? (
                  <div className="text-sm whitespace-pre-wrap text-foreground/90">
                    {(data!.cultural as any).matching_analysis}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Sem análise disponível.</p>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
