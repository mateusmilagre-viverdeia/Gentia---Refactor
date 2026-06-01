import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, Send, Loader2, Check, User, Sparkles, RefreshCw, List } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  suggestedStatement?: string | null;
  suggestedStatements?: string[] | null;
  timestamp: string;
}

interface RefinementChatProps {
  type: "mission" | "vision";
  currentStatement: string;
  originalAnswers: Record<number, string>;
  keywords?: string[];
  onAcceptSuggestion: (statement: string) => void;
  storageKey: string;
}

export function RefinementChat({
  type,
  currentStatement,
  originalAnswers,
  keywords,
  onAcceptSuggestion,
  storageKey,
}: RefinementChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : [];
  });
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(messages));
  }, [messages, storageKey]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: messageText.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const conversationHistory = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const { data, error } = await supabase.functions.invoke("refine-statement", {
        body: {
          type,
          currentStatement,
          conversationHistory,
          userMessage: userMessage.content,
          originalAnswers,
          keywords,
        },
      });

      if (error) {
        throw error;
      }

      if (data.error) {
        toast.error(data.error);
        return;
      }

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.message,
        suggestedStatement: data.suggestedStatement,
        suggestedStatements: data.suggestedStatements,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error refining statement:", error);
      toast.error("Erro ao processar sua mensagem. Tente novamente.");
    } finally {
      setIsLoading(false);
      textareaRef.current?.focus();
    }
  };

  const handleSend = async () => {
    await sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleAccept = (statement: string) => {
    onAcceptSuggestion(statement);
    toast.success("Versão aceita e adicionada ao histórico!");
  };

  const handleQuickAction = (action: "new" | "three") => {
    const message = action === "new" 
      ? "Gere uma nova versão da declaração de missão, diferente da atual."
      : "Gere 3 versões diferentes da declaração de missão para eu escolher.";
    sendMessage(message);
  };

  const typeLabel = type === "mission" ? "Missão" : "Visão";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Refinar {typeLabel} com IA
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Converse com a IA para ajustar sua declaração. Ex: "Quero algo mais curto", "Adicione o conceito de inovação"
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {messages.length > 0 && (
          <ScrollArea className="h-[300px] pr-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {message.role === "assistant" && (
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    
                    {/* Single suggestion */}
                    {message.suggestedStatement && !message.suggestedStatements && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="mt-3 w-full"
                        onClick={() => handleAccept(message.suggestedStatement!)}
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Usar esta versão
                      </Button>
                    )}
                    
                    {/* Multiple suggestions */}
                    {message.suggestedStatements && message.suggestedStatements.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {message.suggestedStatements.map((stmt, index) => (
                          <div key={index} className="p-2 bg-background rounded border">
                            <p className="text-sm font-medium mb-2">"{stmt}"</p>
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full"
                              onClick={() => handleAccept(stmt)}
                            >
                              <Check className="h-4 w-4 mr-2" />
                              Usar esta versão
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {message.role === "user" && (
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                  <div className="bg-muted rounded-lg p-3">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        )}

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          <p className="w-full text-xs text-muted-foreground mb-1">Ações Rápidas:</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleQuickAction("new")}
            disabled={isLoading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Nova Sugestão
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleQuickAction("three")}
            disabled={isLoading}
          >
            <List className="h-4 w-4 mr-2" />
            Gerar 3 Opções
          </Button>
        </div>

        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite sua sugestão de ajuste..."
            className="min-h-[60px] resize-none"
            disabled={isLoading}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="px-3"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}