import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, User, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TranscriptEntry {
  timestamp: string;
  speaker: string;
  text: string;
  isAgent?: boolean;
  startSeconds?: number;
  endSeconds?: number;
  isEstimated?: boolean;
}

interface InterviewTranscriptTabProps {
  transcript: TranscriptEntry[];
}

export function InterviewTranscriptTab({ transcript }: InterviewTranscriptTabProps) {
  if (!transcript || transcript.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
        <MessageSquare className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-sm">Nenhuma transcrição disponível</p>
        <p className="text-xs text-muted-foreground/60 mt-1 text-center max-w-xs">
          A transcrição detalhada não estava habilitada quando esta entrevista foi realizada
        </p>
      </div>
    );
  }

  const formatDuration = (startSeconds?: number, endSeconds?: number): string => {
    if (startSeconds == null) return '';
    
    const formatSec = (s: number) => {
      const mins = Math.floor(s / 60);
      const secs = Math.floor(s % 60);
      return `${mins}:${String(secs).padStart(2, '0')}`;
    };
    
    if (endSeconds != null && endSeconds > startSeconds) {
      return `${formatSec(startSeconds)} - ${formatSec(endSeconds)}`;
    }
    
    return formatSec(startSeconds);
  };

  return (
    <ScrollArea className="h-[500px] pr-2">
      <div className="space-y-4">
        {transcript.map((entry, index) => (
          <div
            key={index}
            className={cn(
              "flex gap-3",
              !entry.isAgent && "flex-row-reverse"
            )}
          >
            <div 
              className={cn(
                "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-1",
                entry.isAgent 
                  ? "bg-primary/10" 
                  : "bg-green-500/10"
              )}
            >
              {entry.isAgent ? (
                <Bot className="h-4 w-4 text-primary" />
              ) : (
                <User className="h-4 w-4 text-green-600" />
              )}
            </div>
            <div 
              className={cn(
                "flex-1 rounded-lg p-3 max-w-[85%]",
                entry.isAgent 
                  ? "bg-muted/50" 
                  : "bg-primary/5 ml-auto"
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <p className="text-xs font-medium text-muted-foreground">
                  {entry.isAgent ? 'Entrevistador' : 'Candidato'}
                </p>
                <span className="text-xs text-muted-foreground/60">
                  {entry.isEstimated && '~ '}
                  {entry.startSeconds != null
                    ? formatDuration(entry.startSeconds, entry.isEstimated ? undefined : entry.endSeconds)
                    : entry.timestamp}
                  {entry.isEstimated && (
                    <span className="ml-1 italic">(aprox.)</span>
                  )}
                </span>
              </div>
              <p className="text-sm leading-relaxed">{entry.text}</p>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
