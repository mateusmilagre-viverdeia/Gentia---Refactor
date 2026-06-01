import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TechnicalTranscriptTabProps {
  transcript: string;
}

interface TranscriptMessage {
  speaker: 'ai' | 'candidate';
  text: string;
}

function parseTranscript(transcript: string): TranscriptMessage[] {
  if (!transcript) return [];
  
  const lines = transcript.split('\n').filter(line => line.trim());
  const messages: TranscriptMessage[] = [];
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    if (trimmedLine.startsWith('Entrevistador:') || trimmedLine.startsWith('Entrevistadora:') || trimmedLine.startsWith('Agente:') || trimmedLine.startsWith('AI:')) {
      const text = trimmedLine.replace(/^(Entrevistador|Entrevistadora|Agente|AI):/, '').trim();
      if (text) messages.push({ speaker: 'ai', text });
    } else if (trimmedLine.startsWith('Candidato:') || trimmedLine.startsWith('Candidata:') || trimmedLine.startsWith('User:')) {
      const text = trimmedLine.replace(/^(Candidato|Candidata|User):/, '').trim();
      if (text) messages.push({ speaker: 'candidate', text });
    } else if (messages.length > 0) {
      // Append to last message if it's a continuation
      messages[messages.length - 1].text += ' ' + trimmedLine;
    }
  }
  
  return messages;
}

export function TechnicalTranscriptTab({ transcript }: TechnicalTranscriptTabProps) {
  const messages = parseTranscript(transcript);

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        Transcrição não disponível
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px] pr-4">
      <div className="space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={cn(
              "flex gap-3",
              message.speaker === 'candidate' && "flex-row-reverse"
            )}
          >
            <div 
              className={cn(
                "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                message.speaker === 'ai' 
                  ? "bg-primary/10" 
                  : "bg-green-500/10"
              )}
            >
              {message.speaker === 'ai' ? (
                <Bot className="h-4 w-4 text-primary" />
              ) : (
                <User className="h-4 w-4 text-green-600" />
              )}
            </div>
            <div 
              className={cn(
                "flex-1 rounded-lg p-3 max-w-[80%]",
                message.speaker === 'ai' 
                  ? "bg-muted/50" 
                  : "bg-primary/5 ml-auto"
              )}
            >
              <p className="text-xs text-muted-foreground mb-1">
                {message.speaker === 'ai' ? 'Entrevistador' : 'Candidato'}
              </p>
              <p className="text-sm leading-relaxed">{message.text}</p>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
