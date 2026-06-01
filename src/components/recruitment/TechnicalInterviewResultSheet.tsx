
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
import { TechnicalOverviewTab } from './technical-interview-details/TechnicalOverviewTab';
import { TechnicalSkillsTab } from './technical-interview-details/TechnicalSkillsTab';
import { TechnicalTranscriptTab } from './technical-interview-details/TechnicalTranscriptTab';
import { useTechnicalInterviewDetails } from '@/hooks/useTechnicalInterviewDetails';
import { useReprocessTechnicalEvaluation } from '@/hooks/useReprocessTechnicalEvaluation';
import { Code, RefreshCw } from 'lucide-react';
import { InterviewIntegrityBanner } from './InterviewIntegrityBanner';
import { formatBRT } from "@/lib/datetime";

interface TechnicalInterviewResultSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string | null;
}

export function TechnicalInterviewResultSheet({
  open,
  onOpenChange,
  sessionId,
}: TechnicalInterviewResultSheetProps) {
  const { data: interview, isLoading, error } = useTechnicalInterviewDetails(sessionId);
  const reprocess = useReprocessTechnicalEvaluation();

  const formatSubtitle = () => {
    if (!interview) return '';
    const date = formatBRT(interview.completedAt, "d 'de' MMM");
    return `${interview.candidateName} • ${interview.jobTitle} • ${date}`;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[600px] overflow-y-auto">
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
              {error ? 'Erro ao carregar detalhes' : 'Entrevista não encontrada'}
            </p>
          </div>
        ) : (
          <>
            <SheetHeader className="space-y-1 pr-6">
              <div className="flex items-start justify-between gap-2">
                <SheetTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5 text-primary" />
                  Entrevista Técnica
                </SheetTitle>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={reprocess.isPending || !interview.transcript}
                  onClick={() => sessionId && reprocess.mutate(sessionId)}
                  className="gap-2"
                  title="Reavaliar com o evaluator atual (V3)"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${reprocess.isPending ? 'animate-spin' : ''}`} />
                  {reprocess.isPending ? 'Reprocessando...' : 'Reprocessar'}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">{formatSubtitle()}</p>
            </SheetHeader>

            <div className="mt-6 space-y-6">
              <InterviewIntegrityBanner
                type="technical"
                sessionId={interview.id}
                status={interview.status}
                isPartial={interview.isPartial}
                completedNaturally={interview.completedNaturally}
                abandonedReason={interview.abandonedReason}
                audioStatus={interview.audioStatus}
                hasAudio={!!interview.audioUrl}
                hasTranscript={!!interview.transcript && interview.transcript.length > 0}
                hasEvaluation={interview.overallScore > 0}
              />

              {/* Audio Player */}
              <AudioPlayer 
                duration={interview.duration} 
                audioUrl={interview.audioUrl || undefined}
              />

              {/* Tabs */}
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                  <TabsTrigger value="skills">Skills</TabsTrigger>
                  <TabsTrigger value="transcript">Transcrição</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-4">
                  <TechnicalOverviewTab interview={interview} />
                </TabsContent>

                <TabsContent value="skills" className="mt-4">
                  <TechnicalSkillsTab interview={interview} />
                </TabsContent>

                <TabsContent value="transcript" className="mt-4">
                  <TechnicalTranscriptTab transcript={interview.transcript} />
                </TabsContent>
              </Tabs>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
