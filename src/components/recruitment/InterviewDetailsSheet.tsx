
import { RefreshCw } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { AudioPlayer } from './interview-details/AudioPlayer';
import { InterviewOverviewTab } from './interview-details/InterviewOverviewTab';
import { InterviewTranscriptTab } from './interview-details/InterviewTranscriptTab';
import { InterviewEvaluationTab } from './interview-details/InterviewEvaluationTab';
import { useInterviewDetails } from '@/hooks/useInterviewDetails';
import { useRetranscribeCultureInterview } from '@/hooks/useRetranscribeCultureInterview';
import { CopilotButton } from './copilot';
import { formatBRT } from "@/lib/datetime";

interface InterviewDetailsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  interviewId: string | null;
}

export function InterviewDetailsSheet({
  open,
  onOpenChange,
  interviewId,
}: InterviewDetailsSheetProps) {
  const { data: interview, isLoading, error } = useInterviewDetails(interviewId);
  const retranscribe = useRetranscribeCultureInterview();

  const formatSubtitle = () => {
    if (!interview) return '';
    const date = formatBRT(interview.completedAt, "d 'de' MMM");
    return `${interview.candidateName} • ${interview.jobTitle} • ${date}`;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[600px] overflow-y-auto">
        {isLoading ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-24 w-full" />
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          </div>
        ) : error || !interview ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">
              {error ? 'Erro ao carregar detalhes da entrevista' : 'Entrevista não encontrada'}
            </p>
          </div>
        ) : (
          <>
            <SheetHeader className="space-y-1 pr-6">
              <SheetTitle>Detalhes da entrevista</SheetTitle>
              <p className="text-sm text-muted-foreground">{formatSubtitle()}</p>
              <div className="pt-2">
                <CopilotButton
                  scope="candidate"
                  candidateId={interview.candidateId}
                  jobId={interview.jobId}
                  contextLabel={interview.candidateName}
                />
              </div>
            </SheetHeader>

            <div className="mt-6 space-y-6">
              {/* Audio Player */}
              <AudioPlayer 
                duration={interview.duration} 
                audioUrl={interview.audioUrl}
              />

              {/* Tabs */}
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                  <TabsTrigger value="transcript">Transcrição</TabsTrigger>
                  <TabsTrigger value="evaluation">Avaliação</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-4">
                  <InterviewOverviewTab interview={interview} />
                </TabsContent>

                <TabsContent value="transcript" className="mt-4">
                  <InterviewTranscriptTab transcript={interview.transcript} />
                  {interview.transcript.length === 0 && interview.audioUrl && (
                    <div className="flex justify-center mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => retranscribe.mutate(interview.id)}
                        disabled={retranscribe.isPending}
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${retranscribe.isPending ? 'animate-spin' : ''}`} />
                        {retranscribe.isPending ? 'Retranscrevendo...' : 'Retranscrever do áudio'}
                      </Button>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="evaluation" className="mt-4">
                  <InterviewEvaluationTab
                    interviewId={interview.id}
                    overallScore={interview.overallScore}
                    evaluationStatus={interview.evaluationStatus}
                    criteria={interview.criteria}
                    matchingAnalysis={interview.matchingAnalysis}
                    evaluationMeta={interview.evaluationMeta}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
