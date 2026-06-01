import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, Send, Loader2, User, Bot } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface PlanChatProps {
  onRefine: (message: string) => Promise<void>;
  isRefining: boolean;
}

export const PlanChat = ({ onRefine, isRefining }: PlanChatProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isRefining) return;

    const userMsg: ChatMessage = { role: 'user', content: text, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');

    try {
      await onRefine(text);
      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: 'Plano atualizado com sucesso! As alterações já foram aplicadas na timeline acima.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      const errorMsg: ChatMessage = {
        role: 'assistant',
        content: 'Erro ao processar o ajuste. Tente novamente.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          Ajustar Plano com IA
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Solicite ajustes no plano — altere prazos, prioridades ou qualquer detalhe.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {messages.length > 0 && (
          <div className="max-h-60 overflow-y-auto space-y-3 border rounded-md p-3 bg-muted/20">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot className="h-3.5 w-3.5 text-primary" />
                  </div>
                )}
                <div
                  className={`text-xs rounded-lg px-3 py-2 max-w-[80%] ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <div className="prose prose-xs dark:prose-invert">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                </div>
                {msg.role === 'user' && (
                  <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}

        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ex: Reduzir a etapa de Cultura para 1 mês..."
            className="min-h-[60px] text-sm resize-none"
            disabled={isRefining}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || isRefining}
            className="flex-shrink-0 self-end"
          >
            {isRefining ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
